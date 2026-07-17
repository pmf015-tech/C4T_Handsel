import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { z } from "zod";

import {
  approveMilestone,
  deliverMilestone,
  rejectMilestone,
  type MilestonePartyRole,
  type MilestoneProjection,
  type MilestoneTransition,
} from "@/domain/milestone/milestone";

const MilestoneRowSchema = z.object({
  id: z.string().uuid(),
  state: z.enum(["PENDING", "DELIVERED", "APPROVED", "FROZEN"]),
  deliveredAt: z.coerce.date().nullable(),
  approvedAt: z.coerce.date().nullable(),
  frozenFromState: z.enum(["PENDING", "DELIVERED", "APPROVED"]).nullable(),
});

export class MilestoneNotFoundError extends Error {
  readonly name = "MilestoneNotFoundError";
  constructor() {
    super("Milestone not found for this party.");
  }
}

async function findPartyRole(
  sql: Sql | TransactionSql,
  dealId: string,
  clerkUserId: string,
): Promise<MilestonePartyRole | null> {
  const rows = await sql<{ role: MilestonePartyRole }[]>`
    select role from deal_parties
    where deal_id = ${dealId} and clerk_user_id = ${clerkUserId}
    limit 1
  `;
  return rows[0]?.role ?? null;
}

/**
 * Party-scoped read: the deal_id filter is what defends IDOR, so it must stay
 * in the query rather than being checked after the fact.
 */
async function findMilestone(
  sql: Sql | TransactionSql,
  dealId: string,
  milestoneId: string,
): Promise<MilestoneProjection | null> {
  const rows = await sql`
    select id, state, delivered_at as "deliveredAt", approved_at as "approvedAt",
      frozen_from_state as "frozenFromState"
    from deal_milestones
    where id = ${milestoneId} and deal_id = ${dealId}
    limit 1
  `;
  return rows[0] ? MilestoneRowSchema.parse(rows[0]) : null;
}

async function persistTransition(
  transaction: TransactionSql,
  dealId: string,
  clerkUserId: string,
  transition: MilestoneTransition,
): Promise<MilestoneProjection> {
  const { milestone, event } = transition;
  await transaction`
    update deal_milestones set
      state = ${milestone.state},
      delivered_at = ${milestone.deliveredAt},
      approved_at = ${milestone.approvedAt},
      frozen_from_state = ${milestone.frozenFromState}
    where id = ${milestone.id} and deal_id = ${dealId}
  `;
  if (event)
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (${randomUUID()}, ${dealId}, ${event.eventType}, ${clerkUserId},
        ${transaction.json({
          milestoneId: milestone.id,
          state: milestone.state,
          ...(event.reason ? { reason: event.reason } : {}),
        })})
    `;
  return milestone;
}

/**
 * Applies a domain transition inside one transaction: projection update and
 * its deal_events insert commit together, so the audit trail can never drift
 * from the state it describes.
 */
async function transitionMilestone(
  sql: Sql,
  dealId: string,
  milestoneId: string,
  clerkUserId: string,
  apply: (
    milestone: MilestoneProjection,
    role: MilestonePartyRole,
    now: Date,
  ) => MilestoneTransition,
  now: Date,
): Promise<MilestoneProjection> {
  return sql.begin(async (transaction) => {
    const role = await findPartyRole(transaction, dealId, clerkUserId);
    if (!role) throw new MilestoneNotFoundError();
    const milestone = await findMilestone(transaction, dealId, milestoneId);
    if (!milestone) throw new MilestoneNotFoundError();
    const transition = apply(milestone, role, now);
    return persistTransition(transaction, dealId, clerkUserId, transition);
  });
}

export async function markMilestoneDelivered(
  sql: Sql,
  dealId: string,
  milestoneId: string,
  clerkUserId: string,
  now = new Date(),
): Promise<MilestoneProjection> {
  return transitionMilestone(
    sql,
    dealId,
    milestoneId,
    clerkUserId,
    (milestone, role, at) => deliverMilestone(milestone, role, at),
    now,
  );
}

export async function markMilestoneApproved(
  sql: Sql,
  dealId: string,
  milestoneId: string,
  clerkUserId: string,
  now = new Date(),
): Promise<MilestoneProjection> {
  return transitionMilestone(
    sql,
    dealId,
    milestoneId,
    clerkUserId,
    (milestone, role, at) => approveMilestone(milestone, role, at),
    now,
  );
}

export async function markMilestoneRejected(
  sql: Sql,
  dealId: string,
  milestoneId: string,
  clerkUserId: string,
  reason: string,
  now = new Date(),
): Promise<MilestoneProjection> {
  return transitionMilestone(
    sql,
    dealId,
    milestoneId,
    clerkUserId,
    (milestone, role, at) => rejectMilestone(milestone, role, reason, at),
    now,
  );
}
