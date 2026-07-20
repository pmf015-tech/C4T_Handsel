import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import postgres from "postgres";
import Stripe from "stripe";

import {
  BRAND_EMAIL,
  CREATOR_EMAIL,
  criticalPathEnvReady,
  loadEnvLocal,
} from "./support";

/**
 * Spec Testing Plan journey 1: create deal → sign both sides → milestone
 * deliver/approve → fund via real Stripe Checkout (test mode) → WebhookLost
 * repair via the reconcile cron → release transfer to the creator.
 * No mocked Stripe (CLAUDE.md testing expectation).
 */

loadEnvLocal();
const envReady = criticalPathEnvReady();

const JOURNEY_TIMEOUT_MS = 420_000;
const STRIPE_TEST_CARD = "4242 4242 4242 4242";

async function signInAs(page: Page, email: string): Promise<void> {
  await page.goto("/");
  await setupClerkTestingToken({ page });
  await clerk.signIn({
    page,
    signInParams: { strategy: "email_code", identifier: email },
  });
}

async function ensureProfile(
  page: Page,
  payload: Record<string, unknown>,
): Promise<void> {
  const response = await page.request.post("/api/onboarding/profile", {
    data: payload,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

/**
 * Release needs a destination with an active `transfers` capability. Reuse any
 * such account in the test-mode workspace; otherwise create a prefilled test
 * Custom account (Stripe magic test values -> instant verification).
 */
async function ensureTransfersCapableAccount(stripe: Stripe): Promise<string> {
  const existing = await stripe.accounts.list({ limit: 50 });
  const capable = existing.data.find(
    (account) => account.capabilities?.transfers === "active",
  );
  if (capable) return capable.id;

  const created = await stripe.accounts.create({
    type: "custom",
    country: "HK",
    business_type: "individual",
    capabilities: { transfers: { requested: true } },
    business_profile: { mcc: "5734", product_description: "Creator payouts" },
    individual: {
      first_name: "E2E",
      last_name: "Creator",
      email: CREATOR_EMAIL,
      phone: "+85261234567",
      dob: { day: 1, month: 1, year: 1990 },
      address: { line1: "address_full_match", city: "Hong Kong" },
      id_number: "000000000",
    },
    external_account: {
      object: "bank_account",
      country: "HK",
      currency: "hkd",
      routing_number: "110-000",
      account_number: "000123456",
    },
    tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: "8.8.8.8" },
  });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const account = await stripe.accounts.retrieve(created.id);
    if (account.capabilities?.transfers === "active") return created.id;
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(
    `Custom account ${created.id} transfers capability never activated`,
  );
}

/** Transfers draw from the available balance; bypassPending tops it up now. */
async function topUpAvailableBalance(
  stripe: Stripe,
  amountMinorUnits: number,
): Promise<void> {
  await stripe.paymentIntents.create({
    amount: amountMinorUnits,
    currency: "hkd",
    payment_method: "pm_card_bypassPending",
    payment_method_types: ["card"],
    confirm: true,
  });
}

async function payStripeCheckout(page: Page, email: string): Promise<void> {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  const emailField = page.locator("input[name='email']");
  if (await emailField.isVisible().catch(() => false)) {
    if (!(await emailField.inputValue())) await emailField.fill(email);
  }
  // Adaptive pricing can preselect the payer's local currency; pin HKD when
  // the toggle is shown so amounts assert cleanly.
  const hkdToggle = page.getByRole("button", { name: /HK\$/ }).first();
  if (await hkdToggle.isVisible().catch(() => false)) await hkdToggle.click();
  await page.locator("input[name='cardNumber']").fill(STRIPE_TEST_CARD);
  await page.locator("input[name='cardExpiry']").fill("12 / 34");
  await page.locator("input[name='cardCvc']").fill("123");
  const nameField = page.locator("input[name='billingName']");
  if (await nameField.isVisible().catch(() => false))
    await nameField.fill("E2E Brand");
  await page.locator("button[type='submit']").first().click();
  await page.waitForURL(/\/deals\/[0-9a-f-]+\?funded=1/, { timeout: 90_000 });
}

test.describe("critical path: create → sign → milestone → payout", () => {
  test.skip(
    !envReady,
    "Requires CLERK_SECRET_KEY, STRIPE_SECRET_KEY, DATABASE_URL, CRON_SECRET",
  );
  test.describe.configure({ mode: "serial" });

  let sql: postgres.Sql;
  let stripe: Stripe;

  test.beforeAll(() => {
    sql = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  });

  test.afterAll(async () => {
    await sql?.end();
  });

  test("full journey through real Stripe test mode", async ({ browser }) => {
    test.setTimeout(JOURNEY_TIMEOUT_MS);

    const creatorContext = await browser.newContext();
    const creatorPage = await creatorContext.newPage();
    const brandContext = await browser.newContext();
    const brandPage = await brandContext.newPage();

    // ---- Creator signs in and completes onboarding ----
    await signInAs(creatorPage, CREATOR_EMAIL);
    await ensureProfile(creatorPage, {
      role: "creator",
      displayName: "E2E Creator",
      niche: "Lifestyle",
      followerCount: 42_000,
      engagementRateBasisPoints: 350,
      socials: ["https://instagram.com/e2e_creator"],
      preferredLanguage: "en",
    });
    const creatorClerkId = await creatorPage.evaluate(
      () =>
        (window as unknown as { Clerk?: { user?: { id?: string } } }).Clerk
          ?.user?.id,
    );
    expect(creatorClerkId).toBeTruthy();

    // ---- Create the deal through the builder UI ----
    await creatorPage.goto("/deals/new");
    await creatorPage.getByLabel("Deal title").fill("E2E Glow Ritual");
    await creatorPage.getByLabel("Counterparty name").fill("E2E Brightside");
    await creatorPage.getByLabel("Creator share (%)").fill("18");
    await creatorPage
      .getByLabel("Projected revenue (whole units)")
      .fill("100000");
    await creatorPage.getByLabel("Milestone title").first().fill("Launch post");
    await creatorPage
      .getByLabel("Milestone amount (whole units)")
      .first()
      .fill("150");
    await creatorPage.getByLabel("Due date").first().fill("2026-12-31");
    await creatorPage.getByRole("button", { name: "Save draft deal" }).click();
    await creatorPage.waitForURL(/\/deals\/[0-9a-f-]{36}$/);
    const dealId = creatorPage.url().split("/").at(-1) ?? "";
    expect(dealId).toMatch(/^[0-9a-f-]{36}$/);

    // ---- Lock a term sheet version (contract v1 derives from it) ----
    // Via request API: first-compile latency in dev exceeds ky's 10s client
    // timeout, so the UI button is flaky here while the server still succeeds.
    const termSheet = await creatorPage.request.post(
      `/api/deals/${dealId}/term-sheet`,
    );
    expect(termSheet.ok(), await termSheet.text()).toBe(true);

    // Warm-compile the action routes the UI clicks below (dev server compiles
    // per route on first hit; a 405 still compiles the module).
    await Promise.all(
      [
        `/api/deals/${dealId}/contract/sign`,
        `/api/deals/${dealId}/contract/invite`,
        `/api/deals/${dealId}/milestones/warmup`,
        `/api/deals/${dealId}/milestones/warmup/fund`,
        `/api/deals/${dealId}/milestones/warmup/release`,
      ].map((path) => creatorPage.request.get(path).catch(() => null)),
    );

    // ---- Creator click-signs and invites the counterparty ----
    await creatorPage.goto(`/deals/${dealId}/contract`);
    await creatorPage
      .getByRole("button", { name: "Click-sign this version" })
      .click();
    await expect(creatorPage.getByText("Signed").first()).toBeVisible();
    await creatorPage
      .getByRole("button", { name: "Create counterparty invite" })
      .click();
    const inviteMessage = creatorPage.getByRole("status");
    await expect(inviteMessage).toContainText("/contract/invite/");
    const inviteUrl = (await inviteMessage.innerText()).trim();

    // ---- Brand accepts the invite and signs ----
    await signInAs(brandPage, BRAND_EMAIL);
    await ensureProfile(brandPage, {
      role: "brand",
      displayName: "E2E Brightside",
      productCategory: "Skincare",
      website: "https://brightside.example.com",
      preferredLanguage: "en",
    });
    await brandPage.goto(inviteUrl);
    await brandPage.getByRole("button", { name: /Accept invitation/ }).click();
    await brandPage.waitForURL(new RegExp(`/deals/${dealId}/contract`));
    await brandPage
      .getByRole("button", { name: "Click-sign this version" })
      .click();
    await expect(brandPage.getByText("Signed")).toHaveCount(2);

    // ---- Milestone: creator delivers, brand approves ----
    await creatorPage.goto(`/deals/${dealId}?tab=milestones`);
    await creatorPage.getByRole("button", { name: "Mark delivered" }).click();
    await expect(
      creatorPage.getByText("Delivered / 已交付").first(),
    ).toBeVisible();

    await brandPage.goto(`/deals/${dealId}?tab=milestones`);
    await brandPage
      .getByRole("button", { name: "Approve deliverable" })
      .click();
    await expect(
      brandPage.getByText("Approved / 已批核").first(),
    ).toBeVisible();

    // ---- Fund through real Stripe Checkout ----
    await brandPage.getByRole("button", { name: /Fund milestone/ }).click();
    await payStripeCheckout(brandPage, BRAND_EMAIL);

    // ---- WebhookLost repair: age the payout, run the reconcile cron ----
    await sql`
      update milestone_payouts set updated_at = now() - interval '31 minutes'
      where deal_id = ${dealId}
    `;
    // Stripe's PaymentIntent search index is eventually consistent, so give
    // the cron a few passes before asserting the repair happened.
    let funded = false;
    for (let attempt = 0; attempt < 12 && !funded; attempt += 1) {
      const cron = await brandPage.request.get("/api/cron/payouts/reconcile", {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      expect(cron.ok(), await cron.text()).toBe(true);
      const rows = await sql`
        select state from milestone_payouts where deal_id = ${dealId}
      `;
      funded = rows[0]?.state === "FUNDED";
      if (!funded) await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
    expect(funded, "payout never reconciled to FUNDED").toBe(true);
    await brandPage.goto(`/deals/${dealId}?tab=milestones`);
    await expect(
      brandPage.getByText("Funds held in escrow / 資金已託管"),
    ).toBeVisible();

    // ---- Creator payout destination (test-mode Connect fixture) ----
    const accountId = await ensureTransfersCapableAccount(stripe);
    await topUpAvailableBalance(stripe, 20_000);
    // The reusable test account may belong to a previous fixture user; the
    // stripe_account_id column is unique, so free it before re-assigning.
    await sql`
      delete from connect_accounts
      where stripe_account_id = ${accountId}
        and clerk_user_id <> ${creatorClerkId ?? ""}
    `;
    await sql`
      insert into connect_accounts (clerk_user_id, stripe_account_id, onboarding_complete)
      values (${creatorClerkId ?? ""}, ${accountId}, true)
      on conflict (clerk_user_id) do update
      set stripe_account_id = excluded.stripe_account_id,
          onboarding_complete = true,
          updated_at = now()
    `;

    // ---- Release the escrowed payout ----
    await brandPage.getByRole("button", { name: /Release payout/ }).click();
    await expect(brandPage.getByText("Paid out / 已放款")).toBeVisible({
      timeout: 30_000,
    });

    // ---- Audit trail: the append-only event log tells the whole story ----
    const events = await sql`
      select event_type from deal_events
      where deal_id = ${dealId} order by created_at asc
    `;
    const types = events.map((event) => event.event_type as string);
    for (const expected of [
      "DEAL_DRAFT_CREATED",
      "CONTRACT_SIGNATURE_CREATED",
      "CONTRACT_INVITE_ACCEPTED",
      "DEAL_FULLY_SIGNED",
      "MILESTONE_DELIVERED",
      "MILESTONE_APPROVED",
      "PAYOUT_FUNDING_INTENT",
      "PAYOUT_FUNDED",
      "PAYOUT_RELEASE_INTENT",
      "PAYOUT_RELEASED",
    ]) {
      expect(types, `event log missing ${expected}`).toContain(expected);
    }

    await creatorContext.close();
    await brandContext.close();
  });
});
