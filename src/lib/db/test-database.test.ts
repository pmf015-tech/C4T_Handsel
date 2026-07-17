import { describe, expect, it } from "vitest";
import { isDedicatedTestDatabase } from "./test-database";

describe("isDedicatedTestDatabase", () => {
  it("rejects the application database even when URLs differ only by credentials or query parameters", () => {
    expect(
      isDedicatedTestDatabase(
        "postgres://test:secret@127.0.0.1:54329/handsel?sslmode=disable",
        "postgres://app:secret@127.0.0.1:54329/handsel",
      ),
    ).toBe(false);
  });
});
