import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  runAutoApproveSweep: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
  getDatabase: mocks.getDatabase,
}));
vi.mock("@/lib/db/milestones", () => ({
  runAutoApproveSweep: mocks.runAutoApproveSweep,
}));

import { GET } from "./route";

function requestWithAuth(secret: string | null): Request {
  return new Request("http://localhost/api/cron/milestones/auto-approve", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

describe("GET /api/cron/milestones/auto-approve", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("rejects a request with no bearer token before touching storage", async () => {
    const response = await GET(requestWithAuth(null));

    expect(response.status).toBe(401);
    expect(mocks.runAutoApproveSweep).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong secret", async () => {
    const response = await GET(requestWithAuth("wrong-secret"));

    expect(response.status).toBe(401);
    expect(mocks.runAutoApproveSweep).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(requestWithAuth("anything"));

    expect(response.status).toBe(503);
    expect(mocks.runAutoApproveSweep).not.toHaveBeenCalled();
  });

  it("runs the sweep and reports how many milestones were auto-approved", async () => {
    mocks.runAutoApproveSweep.mockResolvedValue([
      { id: "m1", state: "APPROVED" },
      { id: "m2", state: "APPROVED" },
    ]);

    const response = await GET(requestWithAuth("test-cron-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      approvedCount: 2,
    });
    expect(mocks.runAutoApproveSweep).toHaveBeenCalledWith({});
  });
});
