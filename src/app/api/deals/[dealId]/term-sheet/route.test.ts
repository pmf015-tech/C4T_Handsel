import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createTermSheetVersion: vi.fn(),
  getDatabase: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
  getDatabase: mocks.getDatabase,
}));
vi.mock("@/lib/db/deals", () => ({
  createTermSheetVersion: mocks.createTermSheetVersion,
}));

import { POST } from "./route";

const dealId = "46781a56-5fb5-4b81-91a8-7f62b0a70da3";
const context = { params: Promise.resolve({ dealId }) };

describe("POST /api/deals/[dealId]/term-sheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("rejects an unauthenticated generation request before storage", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await POST(new Request("http://localhost"), context);

    expect(response.status).toBe(401);
    expect(mocks.createTermSheetVersion).not.toHaveBeenCalled();
  });

  it("returns 404 when the authenticated actor is not a deal party", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_other" });
    mocks.createTermSheetVersion.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost"), context);

    expect(response.status).toBe(404);
    expect(mocks.createTermSheetVersion).toHaveBeenCalledWith(
      expect.anything(),
      dealId,
      "user_other",
    );
  });

  it("returns only the share path and expiry for an authorized party", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_owner" });
    mocks.createTermSheetVersion.mockResolvedValue({
      versionNumber: 1,
      shareToken: "o0Fn_R7epZ5UxKCpp2x0cyvbPj-PBQiIT_cYCahI1oQ",
      expiresAt: new Date("2026-07-30T00:00:00.000Z"),
    });

    const response = await POST(new Request("http://localhost"), context);
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      termSheet: {
        versionNumber: 1,
        sharePath: "/s/o0Fn_R7epZ5UxKCpp2x0cyvbPj-PBQiIT_cYCahI1oQ",
        expiresAt: "2026-07-30T00:00:00.000Z",
      },
    });
  });
});
