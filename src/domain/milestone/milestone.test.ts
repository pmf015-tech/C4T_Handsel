import { describe, expect, it } from "vitest";

import {
  InvalidMilestoneTransitionError,
  MilestoneRoleError,
  approveMilestone,
  rejectMilestone,
  autoApproveMilestone,
  deliverMilestone,
  freezeMilestone,
  resolveMilestone,
  type MilestoneProjection,
} from "./milestone";

const DAY_MS = 24 * 60 * 60 * 1000;

function pendingMilestone(): MilestoneProjection {
  return {
    id: "5f0d1a52-3f4f-4f4f-9a5a-111111111111",
    state: "PENDING",
    deliveredAt: null,
    approvedAt: null,
    frozenFromState: null,
  };
}

function deliveredMilestone(deliveredAt: Date): MilestoneProjection {
  return {
    ...pendingMilestone(),
    state: "DELIVERED",
    deliveredAt,
  };
}

describe("deliverMilestone", () => {
  it("moves PENDING to DELIVERED when the creator delivers", () => {
    const now = new Date("2026-07-17T10:00:00Z");
    const result = deliverMilestone(pendingMilestone(), "creator", now);
    expect(result.milestone.state).toBe("DELIVERED");
    expect(result.milestone.deliveredAt).toEqual(now);
    expect(result.event).toEqual({
      eventType: "MILESTONE_DELIVERED",
      actorRole: "creator",
      occurredAt: now,
    });
  });

  it("rejects delivery by the brand", () => {
    expect(() =>
      deliverMilestone(pendingMilestone(), "brand", new Date()),
    ).toThrow(MilestoneRoleError);
  });

  it("rejects delivering a milestone that is not PENDING", () => {
    const delivered = deliveredMilestone(new Date());
    expect(() => deliverMilestone(delivered, "creator", new Date())).toThrow(
      InvalidMilestoneTransitionError,
    );
  });
});

describe("approveMilestone", () => {
  it("moves DELIVERED to APPROVED when the brand approves", () => {
    const deliveredAt = new Date("2026-07-17T10:00:00Z");
    const now = new Date("2026-07-18T10:00:00Z");
    const result = approveMilestone(
      deliveredMilestone(deliveredAt),
      "brand",
      now,
    );
    expect(result.milestone.state).toBe("APPROVED");
    expect(result.milestone.approvedAt).toEqual(now);
    expect(result.event).toEqual({
      eventType: "MILESTONE_APPROVED",
      actorRole: "brand",
      occurredAt: now,
    });
  });

  it("rejects approval by the creator", () => {
    expect(() =>
      approveMilestone(deliveredMilestone(new Date()), "creator", new Date()),
    ).toThrow(MilestoneRoleError);
  });

  it("rejects approving a milestone that has not been delivered", () => {
    expect(() =>
      approveMilestone(pendingMilestone(), "brand", new Date()),
    ).toThrow(InvalidMilestoneTransitionError);
  });
});

describe("rejectMilestone", () => {
  it("returns a delivered milestone to pending with a reason", () => {
    const now = new Date("2026-07-18T10:00:00Z");
    const result = rejectMilestone(
      deliveredMilestone(new Date("2026-07-17T10:00:00Z")),
      "brand",
      "Please attach the final product link.",
      now,
    );

    expect(result.milestone).toMatchObject({
      state: "PENDING",
      deliveredAt: null,
    });
    expect(result.event).toMatchObject({
      eventType: "MILESTONE_REJECTED",
      reason: "Please attach the final product link.",
    });
  });

  it("rejects a blank reason and non-brand actor", () => {
    const delivered = deliveredMilestone(new Date("2026-07-17T10:00:00Z"));
    const now = new Date("2026-07-18T10:00:00Z");
    expect(() => rejectMilestone(delivered, "brand", " ", now)).toThrowError(
      /reason/i,
    );
    expect(() =>
      rejectMilestone(delivered, "creator", "Needs changes", now),
    ).toThrowError(MilestoneRoleError);
  });
});

describe("autoApproveMilestone (7-day clock, idempotent)", () => {
  const deliveredAt = new Date("2026-07-10T00:00:00Z");

  it("auto-approves once the 7-day review window has elapsed", () => {
    const now = new Date(deliveredAt.getTime() + 7 * DAY_MS);
    const result = autoApproveMilestone(deliveredMilestone(deliveredAt), now);
    expect(result.milestone.state).toBe("APPROVED");
    expect(result.event).toEqual({
      eventType: "MILESTONE_AUTO_APPROVED",
      actorRole: "system",
      occurredAt: now,
    });
  });

  it("does nothing before the window elapses", () => {
    const now = new Date(deliveredAt.getTime() + 7 * DAY_MS - 1);
    const milestone = deliveredMilestone(deliveredAt);
    const result = autoApproveMilestone(milestone, now);
    expect(result.milestone).toEqual(milestone);
    expect(result.event).toBeNull();
  });

  it("is idempotent: a duplicate cron run emits no second event", () => {
    const firstRun = autoApproveMilestone(
      deliveredMilestone(deliveredAt),
      new Date(deliveredAt.getTime() + 7 * DAY_MS),
    );
    const secondRun = autoApproveMilestone(
      firstRun.milestone,
      new Date(deliveredAt.getTime() + 8 * DAY_MS),
    );
    expect(secondRun.milestone).toEqual(firstRun.milestone);
    expect(secondRun.event).toBeNull();
  });

  it("does not auto-approve a PENDING (undelivered) milestone", () => {
    const milestone = pendingMilestone();
    const result = autoApproveMilestone(milestone, new Date());
    expect(result.milestone).toEqual(milestone);
    expect(result.event).toBeNull();
  });
});

describe("freeze / resolve (dispute)", () => {
  it("freezes a DELIVERED milestone and remembers the prior state", () => {
    const deliveredAt = new Date("2026-07-10T00:00:00Z");
    const now = new Date("2026-07-11T00:00:00Z");
    const result = freezeMilestone(deliveredMilestone(deliveredAt), now);
    expect(result.milestone.state).toBe("FROZEN");
    expect(result.milestone.frozenFromState).toBe("DELIVERED");
    expect(result.event).toEqual({
      eventType: "MILESTONE_FROZEN",
      actorRole: "system",
      occurredAt: now,
    });
  });

  it("blocks approval while frozen", () => {
    const frozen = freezeMilestone(
      deliveredMilestone(new Date()),
      new Date(),
    ).milestone;
    expect(() => approveMilestone(frozen, "brand", new Date())).toThrow(
      InvalidMilestoneTransitionError,
    );
  });

  it("blocks auto-approval while frozen even after the window", () => {
    const deliveredAt = new Date("2026-07-01T00:00:00Z");
    const frozen = freezeMilestone(
      deliveredMilestone(deliveredAt),
      new Date("2026-07-02T00:00:00Z"),
    ).milestone;
    const result = autoApproveMilestone(
      frozen,
      new Date(deliveredAt.getTime() + 30 * DAY_MS),
    );
    expect(result.milestone).toEqual(frozen);
    expect(result.event).toBeNull();
  });

  it("resolve restores the pre-freeze state", () => {
    const deliveredAt = new Date("2026-07-10T00:00:00Z");
    const frozen = freezeMilestone(
      deliveredMilestone(deliveredAt),
      new Date("2026-07-11T00:00:00Z"),
    ).milestone;
    const now = new Date("2026-07-12T00:00:00Z");
    const result = resolveMilestone(frozen, now);
    expect(result.milestone.state).toBe("DELIVERED");
    expect(result.milestone.frozenFromState).toBeNull();
    expect(result.event).toEqual({
      eventType: "MILESTONE_UNFROZEN",
      actorRole: "system",
      occurredAt: now,
    });
  });

  it("cannot freeze an APPROVED (terminal) milestone", () => {
    const approved = approveMilestone(
      deliveredMilestone(new Date()),
      "brand",
      new Date(),
    ).milestone;
    expect(() => freezeMilestone(approved, new Date())).toThrow(
      InvalidMilestoneTransitionError,
    );
  });

  it("cannot resolve a milestone that is not frozen", () => {
    expect(() => resolveMilestone(pendingMilestone(), new Date())).toThrow(
      InvalidMilestoneTransitionError,
    );
  });
});
