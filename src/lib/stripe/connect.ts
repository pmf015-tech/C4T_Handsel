import type { Sql } from "postgres";
import type Stripe from "stripe";

import { getStripe } from "./client";

export type ConnectAccount = Readonly<{
  clerkUserId: string;
  stripeAccountId: string;
  onboardingComplete: boolean;
}>;

export async function findConnectAccount(
  sql: Sql,
  clerkUserId: string,
): Promise<ConnectAccount | null> {
  const rows = await sql`
    select
      clerk_user_id as "clerkUserId",
      stripe_account_id as "stripeAccountId",
      onboarding_complete as "onboardingComplete"
    from connect_accounts
    where clerk_user_id = ${clerkUserId}
  `;
  return (rows[0] as ConnectAccount | undefined) ?? null;
}

/**
 * Ensure the creator has a Stripe Connect Express account and return a fresh
 * onboarding link. Idempotent: reuses the stored account id.
 */
export async function beginExpressOnboarding(
  sql: Sql,
  clerkUserId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<{ url: string; stripeAccountId: string }> {
  const stripe = getStripe();
  const existing = await findConnectAccount(sql, clerkUserId);

  let accountId = existing?.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { clerk_user_id: clerkUserId },
    });
    accountId = account.id;
    await sql`
      insert into connect_accounts (clerk_user_id, stripe_account_id)
      values (${clerkUserId}, ${accountId})
      on conflict (clerk_user_id) do nothing
    `;
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
  return { url: link.url, stripeAccountId: accountId };
}

/** Refresh onboarding_complete from Stripe (called on return + webhook). */
export async function syncConnectAccountStatus(
  sql: Sql,
  stripeAccountId: string,
  account?: Stripe.Account,
): Promise<boolean> {
  const stripe = getStripe();
  const fresh = account ?? (await stripe.accounts.retrieve(stripeAccountId));
  const complete = Boolean(fresh.details_submitted && fresh.payouts_enabled);
  await sql`
    update connect_accounts
    set onboarding_complete = ${complete}, updated_at = now()
    where stripe_account_id = ${stripeAccountId}
  `;
  return complete;
}
