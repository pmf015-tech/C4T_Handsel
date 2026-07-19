import type { Sql } from "postgres";
import { z } from "zod";

/**
 * E5 public projection — spec S2 visibility table. This module is the ONLY
 * read path for public profile pages, and it selects public-class fields
 * exclusively: no amounts, no term-sheet details, no counterparty user ids.
 * Acceptance criterion 1 is asserted against these schemas.
 */

export const PublicProfileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  role: z.enum(["creator", "brand"]),
  niche: z.string().nullable(),
  productCategory: z.string().nullable(),
});

export const PublicDealSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  state: z.string(),
  counterpartyDisplayName: z.string().nullable(),
  milestonesTotal: z.number().int(),
  milestonesApproved: z.number().int(),
  createdAt: z.coerce.date(),
});

export type PublicProfile = Readonly<z.infer<typeof PublicProfileSchema>>;
export type PublicDeal = Readonly<z.infer<typeof PublicDealSchema>>;

const PUBLIC_DEAL_STATES = [
  "SIGNED",
  "ACTIVE",
  "MILESTONE_MET",
  "PAYOUT_RELEASED",
  "COMPLETED",
] as const;

export async function findPublicProfile(
  sql: Sql,
  profileId: string,
): Promise<PublicProfile | null> {
  const rows = await sql`
    select id, display_name as "displayName", role, niche,
      product_category as "productCategory"
    from profiles
    where id = ${profileId}
  `;
  return rows[0] ? PublicProfileSchema.parse(rows[0]) : null;
}

/**
 * Track record: public, signed-or-later deals only. Draft/negotiating deals
 * and opted-private deals never appear (their existence stays private).
 */
export async function findPublicDealsForProfile(
  sql: Sql,
  profileId: string,
): Promise<readonly PublicDeal[]> {
  const rows = await sql`
    select
      d.id,
      d.title,
      d.state,
      counterparty_profile.display_name as "counterpartyDisplayName",
      (select count(*)::int from deal_milestones m where m.deal_id = d.id)
        as "milestonesTotal",
      (select count(*)::int from deal_milestones m
        where m.deal_id = d.id and m.state = 'APPROVED')
        as "milestonesApproved",
      d.created_at as "createdAt"
    from deals d
    join deal_parties me
      on me.deal_id = d.id
    join profiles my_profile
      on my_profile.clerk_user_id = me.clerk_user_id
      and my_profile.id = ${profileId}
    left join deal_parties counterparty
      on counterparty.deal_id = d.id
      and counterparty.clerk_user_id <> me.clerk_user_id
    left join profiles counterparty_profile
      on counterparty_profile.clerk_user_id = counterparty.clerk_user_id
    where d.is_public
      and d.state in ${sql(PUBLIC_DEAL_STATES)}
    order by d.created_at desc
    limit 50
  `;
  return rows.map((row) => PublicDealSchema.parse(row));
}

/** Either party can opt the deal private (spec E5). Idempotent. */
export async function setDealVisibility(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
  isPublic: boolean,
): Promise<boolean> {
  const rows = await sql`
    update deals set is_public = ${isPublic}
    where id = ${dealId}
      and exists (
        select 1 from deal_parties p
        where p.deal_id = deals.id and p.clerk_user_id = ${clerkUserId}
      )
    returning id
  `;
  return rows.length > 0;
}
