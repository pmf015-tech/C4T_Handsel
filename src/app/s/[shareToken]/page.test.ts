import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSharedTermSheet: vi.fn(),
  getDatabase: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/db/deals", () => ({
  findSharedTermSheet: mocks.findSharedTermSheet,
}));

import SharedTermSheetPage from "./page";

describe("SharedTermSheetPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
    mocks.findSharedTermSheet.mockResolvedValue(null);
  });

  it("returns not found for a malformed token before opening storage", async () => {
    // Given: a public route parameter that is not an exact share token.
    const params = Promise.resolve({ shareToken: "not-a-share-token" });

    // When: the public term-sheet page handles the route.
    const render = SharedTermSheetPage({ params });

    // Then: malformed input fails closed before any database access.
    await expect(render).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(mocks.getDatabase).not.toHaveBeenCalled();
    expect(mocks.findSharedTermSheet).not.toHaveBeenCalled();
  });
});
