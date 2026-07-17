import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  InvalidMilestoneTransitionError,
  MilestoneRoleError,
} from "@/domain/milestone/milestone";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getDatabase: vi.fn(),
  markMilestoneDelivered: vi.fn(),
  markMilestoneApproved: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
  getDatabase: mocks.getDatabase,
}));
vi.mock("@/lib/db/milestones", () => ({
  MilestoneNotFoundError: class MilestoneNotFoundError extends Error {},
  markMilestoneDelivered: mocks.markMilestoneDelivered,
  markMilestoneApproved: mocks.markMilestoneApproved,
}));

import { MilestoneNotFoundError } from "@/lib/db/milestones";
import { POST } from "./route";

const dealId = "46781a56-5fb5-4b81-91a8-7f62b0a70da3";
const milestoneId = "5f0d1a52-3f4f-4f4f-9a5a-111111111111";
const context = { params: Promise.resolve({ dealId, milestoneId }) };

function post(body: unknown): Request {
  return new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/deals/[dealId]/milestones/[milestoneId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("rejects an unauthenticated request before touching storage", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await POST(post({ action: "deliver" }), context);

    expect(response.status).toBe(401);
    expect(mocks.markMilestoneDelivered).not.toHaveBeenCalled();
  });

  it("rejects an unknown action with 400", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_creator" });

    const response = await POST(post({ action: "delete" }), context);

    expect(response.status).toBe(400);
    expect(mocks.markMilestoneDelivered).not.toHaveBeenCalled();
  });

  it("returns 404 when the actor is not a party to the deal", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_stranger" });
    mocks.markMilestoneDelivered.mockRejectedValue(
      new MilestoneNotFoundError(),
    );

    const response = await POST(post({ action: "deliver" }), context);

    expect(response.status).toBe(404);
  });

  it("returns 403 when the role cannot take the action", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_brand" });
    mocks.markMilestoneDelivered.mockRejectedValue(
      new MilestoneRoleError("brand", "deliver"),
    );

    const response = await POST(post({ action: "deliver" }), context);

    expect(response.status).toBe(403);
  });

  it("returns 409 for an invalid state transition", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_brand" });
    mocks.markMilestoneApproved.mockRejectedValue(
      new InvalidMilestoneTransitionError("PENDING", "approve"),
    );

    const response = await POST(post({ action: "approve" }), context);

    expect(response.status).toBe(409);
  });

  it("delivers a milestone for an authenticated party", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_creator" });
    mocks.markMilestoneDelivered.mockResolvedValue({
      id: milestoneId,
      state: "DELIVERED",
    });

    const response = await POST(post({ action: "deliver" }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      milestone: { state: "DELIVERED" },
    });
    expect(mocks.markMilestoneDelivered).toHaveBeenCalledWith(
      {},
      dealId,
      milestoneId,
      "user_creator",
    );
  });

  it("approves a milestone for an authenticated party", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_brand" });
    mocks.markMilestoneApproved.mockResolvedValue({
      id: milestoneId,
      state: "APPROVED",
    });

    const response = await POST(post({ action: "approve" }), context);

    expect(response.status).toBe(200);
    expect(mocks.markMilestoneApproved).toHaveBeenCalledWith(
      {},
      dealId,
      milestoneId,
      "user_brand",
    );
  });
});
