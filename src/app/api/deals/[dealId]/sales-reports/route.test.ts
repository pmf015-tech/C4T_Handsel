import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getDatabase: vi.fn(),
  submitSalesReport: vi.fn(),
  SalesReportNotFoundError: class SalesReportNotFoundError extends Error {},
  SalesReportRoleError: class SalesReportRoleError extends Error {},
  SalesReportAlreadyExistsError: class SalesReportAlreadyExistsError extends Error {},
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/client", () => ({
  DatabaseConfigurationError: class DatabaseConfigurationError extends Error {},
  getDatabase: mocks.getDatabase,
}));
vi.mock("@/lib/db/sales-reports", () => ({
  SalesReportInputSchema: {
    safeParse: (value: unknown) =>
      value && typeof value === "object"
        ? { success: true, data: value }
        : { success: false },
  },
  SalesReportNotFoundError: mocks.SalesReportNotFoundError,
  SalesReportRoleError: mocks.SalesReportRoleError,
  SalesReportAlreadyExistsError: mocks.SalesReportAlreadyExistsError,
  submitSalesReport: mocks.submitSalesReport,
}));

import { POST } from "./route";

const dealId = "46781a56-5fb5-4b81-91a8-7f62b0a70da3";
const context = { params: Promise.resolve({ dealId }) };

function request(body: unknown): Request {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/deals/[dealId]/sales-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("rejects unauthenticated writes before storage", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await POST(request({}), context);

    expect(response.status).toBe(401);
    expect(mocks.submitSalesReport).not.toHaveBeenCalled();
  });

  it("rejects a malformed report at the route boundary", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_brand" });

    const response = await POST(request("bad"), context);

    expect(response.status).toBe(400);
    expect(mocks.submitSalesReport).not.toHaveBeenCalled();
  });

  it("returns 403 when the creator tries to submit", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_creator" });
    mocks.submitSalesReport.mockRejectedValue(new mocks.SalesReportRoleError());

    const response = await POST(
      request({
        periodEnd: "2026-07-01",
        units: 10,
        grossRevenueMinorUnits: 100_000,
      }),
      context,
    );

    expect(response.status).toBe(403);
  });

  it("returns a persisted report for the brand", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_brand" });
    mocks.submitSalesReport.mockResolvedValue({ id: "report_1" });

    const response = await POST(
      request({
        periodEnd: "2026-07-01",
        units: 10,
        grossRevenueMinorUnits: 100_000,
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.submitSalesReport).toHaveBeenCalledWith(
      {},
      dealId,
      "user_brand",
      {
        periodEnd: "2026-07-01",
        units: 10,
        grossRevenueMinorUnits: 100_000,
      },
    );
  });
});
