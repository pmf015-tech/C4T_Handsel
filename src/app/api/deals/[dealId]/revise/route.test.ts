import { beforeEach, describe, expect, it, vi } from "vitest";

import { DealRevisionLockedError } from "@/domain/deal/revision";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getDatabase: vi.fn(),
  reviseDealTerms: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
  getDatabase: mocks.getDatabase,
}));
vi.mock("@/lib/db/revisions", () => ({
  DealRevisionNotFoundError: class DealRevisionNotFoundError extends Error {},
  reviseDealTerms: mocks.reviseDealTerms,
}));

import { DealRevisionNotFoundError } from "@/lib/db/revisions";
import { POST } from "./route";

const dealId = "46781a56-5fb5-4b81-91a8-7f62b0a70da3";
const context = { params: Promise.resolve({ dealId }) };

const validTerms = {
  title: "Glow Ritual Product Line",
  counterpartyName: "Brightside Labs",
  currency: "HKD",
  creatorShareBasisPoints: 2500,
  projectedRevenueMinorUnits: 10_000_000,
  milestones: [
    {
      title: "Content published",
      amountMinorUnits: 750_000,
      dueAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  disputeClause: "REFUND_BRAND",
};

function post(body: unknown): Request {
  return new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/deals/[dealId]/revise", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("rejects an unauthenticated revision before touching storage", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await POST(post(validTerms), context);

    expect(response.status).toBe(401);
    expect(mocks.reviseDealTerms).not.toHaveBeenCalled();
  });

  it("rejects malformed terms with 400 before touching storage", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_creator" });

    const response = await POST(
      post({ ...validTerms, creatorShareBasisPoints: 99_999 }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mocks.reviseDealTerms).not.toHaveBeenCalled();
  });

  it("returns 404 when the actor is not a party to the deal", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_stranger" });
    mocks.reviseDealTerms.mockRejectedValue(new DealRevisionNotFoundError());

    const response = await POST(post(validTerms), context);

    expect(response.status).toBe(404);
  });

  it("returns 409 when the deal is past the revisable window", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_creator" });
    mocks.reviseDealTerms.mockRejectedValue(
      new DealRevisionLockedError("the deal is ACTIVE"),
    );

    const response = await POST(post(validTerms), context);

    expect(response.status).toBe(409);
  });

  it("revises terms for an authenticated party", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_creator" });
    mocks.reviseDealTerms.mockResolvedValue({
      version: { versionNumber: 2, contentHash: "b".repeat(64) },
      signatures: [],
      events: [],
    });

    const response = await POST(post(validTerms), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      contract: { version: { versionNumber: 2 }, signatures: [] },
    });
  });
});
