import { CLOCKS } from "@/domain/deal/types";

/**
 * Milestone deliver/approve state machine — spec-handsel-mvp.md E3.
 *
 *  PENDING ──deliver(creator)──▶ DELIVERED ──approve(brand)──────────▶ APPROVED
 *                                    │  └──auto-approve(system, 7d)──▶ APPROVED
 *                                    ▼ freeze(dispute)                 (terminal)
 *                                 FROZEN ──resolve──▶ (pre-freeze state)
 *
 * Pure module: no I/O, timestamps injected. Every transition returns the next
 * projection plus the event fact the lib layer must append to deal_events.
 * Auto-approve is idempotent: duplicate cron runs emit no second event
 * (spec E3 acceptance criterion 2).
 */

export type MilestoneState = "PENDING" | "DELIVERED" | "APPROVED" | "FROZEN";

export type MilestonePartyRole = "creator" | "brand";

export type MilestoneProjection = Readonly<{
  readonly id: string;
  readonly state: MilestoneState;
  readonly deliveredAt: Date | null;
  readonly approvedAt: Date | null;
  /** State to restore on dispute resolution; set only while FROZEN. */
  readonly frozenFromState: Exclude<MilestoneState, "FROZEN"> | null;
}>;

export type MilestoneEvent = Readonly<{
  readonly eventType:
    | "MILESTONE_DELIVERED"
    | "MILESTONE_APPROVED"
    | "MILESTONE_AUTO_APPROVED"
    | "MILESTONE_FROZEN"
    | "MILESTONE_UNFROZEN";
  readonly actorRole: MilestonePartyRole | "system";
  readonly occurredAt: Date;
}>;

export type MilestoneTransition = Readonly<{
  readonly milestone: MilestoneProjection;
  readonly event: MilestoneEvent | null;
}>;

export class InvalidMilestoneTransitionError extends Error {
  readonly name = "InvalidMilestoneTransitionError";
  constructor(from: MilestoneState, action: string) {
    super(`Cannot ${action} a milestone in state ${from}.`);
  }
}

export class MilestoneRoleError extends Error {
  readonly name = "MilestoneRoleError";
  constructor(role: MilestonePartyRole, action: string) {
    super(`The ${role} party cannot ${action} a milestone.`);
  }
}

const REVIEW_WINDOW_MS =
  CLOCKS.MILESTONE_REVIEW_AUTO_APPROVE_DAYS * 24 * 60 * 60 * 1000;

export function deliverMilestone(
  milestone: MilestoneProjection,
  actorRole: MilestonePartyRole,
  now: Date,
): MilestoneTransition {
  if (actorRole !== "creator")
    throw new MilestoneRoleError(actorRole, "deliver");
  if (milestone.state !== "PENDING")
    throw new InvalidMilestoneTransitionError(milestone.state, "deliver");
  return {
    milestone: { ...milestone, state: "DELIVERED", deliveredAt: now },
    event: {
      eventType: "MILESTONE_DELIVERED",
      actorRole,
      occurredAt: now,
    },
  };
}

export function approveMilestone(
  milestone: MilestoneProjection,
  actorRole: MilestonePartyRole,
  now: Date,
): MilestoneTransition {
  if (actorRole !== "brand") throw new MilestoneRoleError(actorRole, "approve");
  if (milestone.state !== "DELIVERED")
    throw new InvalidMilestoneTransitionError(milestone.state, "approve");
  return {
    milestone: { ...milestone, state: "APPROVED", approvedAt: now },
    event: {
      eventType: "MILESTONE_APPROVED",
      actorRole,
      occurredAt: now,
    },
  };
}

export function autoApproveMilestone(
  milestone: MilestoneProjection,
  now: Date,
): MilestoneTransition {
  if (milestone.state !== "DELIVERED" || milestone.deliveredAt === null)
    return { milestone, event: null };
  const elapsed = now.getTime() - milestone.deliveredAt.getTime();
  if (elapsed < REVIEW_WINDOW_MS) return { milestone, event: null };
  return {
    milestone: { ...milestone, state: "APPROVED", approvedAt: now },
    event: {
      eventType: "MILESTONE_AUTO_APPROVED",
      actorRole: "system",
      occurredAt: now,
    },
  };
}

export function freezeMilestone(
  milestone: MilestoneProjection,
  now: Date,
): MilestoneTransition {
  if (milestone.state === "APPROVED" || milestone.state === "FROZEN")
    throw new InvalidMilestoneTransitionError(milestone.state, "freeze");
  return {
    milestone: {
      ...milestone,
      state: "FROZEN",
      frozenFromState: milestone.state,
    },
    event: {
      eventType: "MILESTONE_FROZEN",
      actorRole: "system",
      occurredAt: now,
    },
  };
}

export function resolveMilestone(
  milestone: MilestoneProjection,
  now: Date,
): MilestoneTransition {
  if (milestone.state !== "FROZEN" || milestone.frozenFromState === null)
    throw new InvalidMilestoneTransitionError(milestone.state, "resolve");
  return {
    milestone: {
      ...milestone,
      state: milestone.frozenFromState,
      frozenFromState: null,
    },
    event: {
      eventType: "MILESTONE_UNFROZEN",
      actorRole: "system",
      occurredAt: now,
    },
  };
}
