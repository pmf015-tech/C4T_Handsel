import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

// @next/env skips .env.local when NODE_ENV=test (vitest workers), so load it
// directly; existing process env still wins.
for (const line of readFileSync(
  path.resolve(process.cwd(), ".env.local"),
  "utf8",
).split("\n")) {
  const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (match?.[1] && match[2] !== undefined && !process.env[match[1]])
    process.env[match[1]] = match[2];
}

import { CreateDealInputSchema } from "@/lib/deals/input";
import { OnboardingInputSchema } from "@/lib/profile/onboarding";
import {
  saveDealDraft,
  createTermSheetVersion,
  findDealForParty,
} from "@/lib/db/deals";
import { createContractVersion, signContract } from "@/lib/db/contracts";
import { saveProfile } from "@/lib/db/profiles";
import { findPayoutsForDeal } from "@/lib/db/payouts";
import { fundMilestone, releasePayout } from "@/lib/stripe/payouts";
import {
  beginExpressOnboarding,
  syncConnectAccountStatus,
  findConnectAccount,
} from "@/lib/stripe/connect";

// Manual sandbox E2E against Stripe test mode. Run step by step:
//   SANDBOX_E2E=step1 npm run test:integration -- src/sandbox/escrow-sandbox.integration.test.ts
// Steps share ids via the state file; step2/step3 require the checkout /
// onboarding browser actions in between.
const step = process.env.SANDBOX_E2E ?? "";
const describeSandbox = step ? describe : describe.skip;

const STATE_FILE = "/tmp/handsel-sandbox-e2e.json";
const APP_URL = process.env.SANDBOX_APP_URL ?? "http://localhost:53100";

const sql = postgres(process.env.DATABASE_URL ?? "", { max: 1 });

type SandboxState = {
  dealId: string;
  milestoneId: string;
  payoutId: string;
  creatorId: string;
  brandId: string;
  checkoutUrl: string;
  onboardingUrl?: string;
  stripeAccountId?: string;
};

const loadState = async (): Promise<SandboxState> =>
  JSON.parse(await readFile(STATE_FILE, "utf8")) as SandboxState;

afterAll(async () => {
  await sql.end();
});

describeSandbox("Sandbox escrow E2E (Stripe test mode)", () => {
  it.runIf(step === "step1")(
    "step1: seeds a signed deal and opens a funding checkout",
    async () => {
      const suffix = Date.now().toString(36);
      const creatorId = `user_sandbox_creator_${suffix}`;
      const brandId = `user_sandbox_brand_${suffix}`;

      await saveProfile(
        sql,
        creatorId,
        OnboardingInputSchema.parse({
          role: "creator",
          displayName: "Sandbox Creator",
          niche: "Skincare",
          followerCount: 120_000,
          engagementRateBasisPoints: 480,
          socials: ["https://instagram.com/sandbox.creator"],
          preferredLanguage: "zh-Hant",
        }),
      );
      await saveProfile(
        sql,
        brandId,
        OnboardingInputSchema.parse({
          role: "brand",
          displayName: "Sandbox Brand",
          productCategory: "Beauty",
          website: "https://sandbox-brand.example",
          preferredLanguage: "en",
        }),
      );

      const draft = await saveDealDraft(
        sql,
        creatorId,
        CreateDealInputSchema.parse({
          title: "Sandbox escrow run",
          counterpartyName: "Sandbox Brand",
          currency: "HKD",
          creatorShareBasisPoints: 2_000,
          projectedRevenueMinorUnits: 1_000_000,
          milestones: [
            {
              title: "Launch content",
              amountMinorUnits: 15_000,
              dueAt: "2026-08-01T00:00:00.000Z",
            },
          ],
          disputeClause: "REFUND_BRAND",
        }),
      );
      await sql`insert into deal_parties (deal_id, clerk_user_id, role) values (${draft.id}, ${brandId}, 'brand')`;
      await createTermSheetVersion(sql, draft.id, creatorId);
      const contract = await createContractVersion(sql, draft.id, creatorId);
      if (!contract) throw new Error("contract fixture missing");
      await signContract(
        sql,
        draft.id,
        creatorId,
        contract.version.contentHash,
      );
      await signContract(sql, draft.id, brandId, contract.version.contentHash);
      // E3 delivery/approval belongs to a different journey; set the milestone
      // APPROVED directly so this run stays focused on the E4 money path.
      await sql`update deal_milestones set state = 'APPROVED', approved_at = now() where deal_id = ${draft.id}`;

      const deal = await findDealForParty(sql, draft.id, creatorId);
      const milestoneId = deal?.milestones[0]?.id;
      if (!milestoneId) throw new Error("milestone fixture missing");

      const { url, payoutId } = await fundMilestone(sql, {
        dealId: draft.id,
        milestoneId,
        actorClerkUserId: brandId,
        successUrl: `${APP_URL}/deals/${draft.id}?funding=success`,
        cancelUrl: `${APP_URL}/deals/${draft.id}?funding=cancelled`,
      });

      const state: SandboxState = {
        dealId: draft.id,
        milestoneId,
        payoutId,
        creatorId,
        brandId,
        checkoutUrl: url,
      };
      await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
      // eslint-disable-next-line no-console -- manual runbook output
      console.log(`\nCHECKOUT_URL=${url}\nPAYOUT_ID=${payoutId}\n`);
      expect(url).toContain("checkout.stripe.com");
    },
  );

  it.runIf(step === "step2")(
    "step2: reconciliation repairs the lost webhook and marks FUNDED",
    async () => {
      const state = await loadState();
      // Simulate WebhookLost: age the intent past the staleness window, then
      // exercise the real secret-gated cron route.
      await sql`update milestone_payouts set updated_at = now() - interval '31 minutes' where id = ${state.payoutId}`;
      const response = await fetch(`${APP_URL}/api/cron/payouts/reconcile`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      const body = (await response.json()) as {
        ok: boolean;
        repaired: string[];
      };
      expect(response.status).toBe(200);
      expect(body.repaired).toContain(state.payoutId);

      const payouts = await findPayoutsForDeal(sql, state.dealId);
      const payout = payouts.get(state.milestoneId);
      expect(payout?.state).toBe("FUNDED");
      expect(payout?.stripePaymentIntentId).toMatch(/^pi_/);
    },
  );

  it.runIf(step === "step3a")(
    "step3a: creates the creator Express account and prints onboarding URL",
    async () => {
      const state = await loadState();
      const { url, stripeAccountId } = await beginExpressOnboarding(
        sql,
        state.creatorId,
        `${APP_URL}/onboarding?connect=return`,
        `${APP_URL}/onboarding?connect=refresh`,
      );
      await writeFile(
        STATE_FILE,
        JSON.stringify(
          { ...state, onboardingUrl: url, stripeAccountId },
          null,
          2,
        ),
      );
      // eslint-disable-next-line no-console -- manual runbook output
      console.log(`\nONBOARDING_URL=${url}\n`);
      expect(url).toContain("connect.stripe.com");
    },
  );

  it.runIf(step === "step3b")(
    "step3b: releases the escrowed payout to the onboarded creator",
    async () => {
      const state = await loadState();
      if (!state.stripeAccountId) throw new Error("run step3a first");
      const complete = await syncConnectAccountStatus(
        sql,
        state.stripeAccountId,
      );
      expect(complete).toBe(true);
      const account = await findConnectAccount(sql, state.creatorId);
      expect(account?.onboardingComplete).toBe(true);

      const existing = (await findPayoutsForDeal(sql, state.dealId)).get(
        state.milestoneId,
      );
      if (existing?.state !== "RELEASED") {
        const released = await releasePayout(sql, {
          dealId: state.dealId,
          milestoneId: state.milestoneId,
          creatorClerkUserId: state.creatorId,
          actorClerkUserId: state.brandId,
        });
        expect(released.state).toBe("RELEASED");
      }
      const payout = (await findPayoutsForDeal(sql, state.dealId)).get(
        state.milestoneId,
      );
      expect(payout?.state).toBe("RELEASED");
      expect(payout?.stripeTransferId).toMatch(/^tr_/);

      const events = await sql`
        select event_type as "eventType", actor_clerk_user_id as "actor", created_at as "at"
        from deal_events where deal_id = ${state.dealId} order by created_at
      `;
      // eslint-disable-next-line no-console -- manual runbook output
      console.log("\nDEAL EVENT LOG:");
      for (const event of events)
        // eslint-disable-next-line no-console -- manual runbook output
        console.log(
          `  ${event.at.toISOString()}  ${event.eventType}  (${event.actor})`,
        );
      const eventTypes = events.map((event) => event.eventType);
      expect(eventTypes).toContain("PAYOUT_FUNDING_INTENT");
      expect(eventTypes).toContain("PAYOUT_FUNDED");
      expect(eventTypes).toContain("PAYOUT_RELEASE_INTENT");
      expect(eventTypes).toContain("PAYOUT_RELEASED");
    },
  );
});
