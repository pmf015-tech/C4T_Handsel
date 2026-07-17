import { describe, expect, it } from "vitest";

import { decimalInputOrNull } from "./numeric-input";

describe("Given a numeric browser field", () => {
  it("then preserves an empty value as null instead of silently making it zero", () => {
    expect(decimalInputOrNull("   ")).toBeNull();
  });

  it("then parses a supplied decimal value", () => {
    expect(decimalInputOrNull("4.25")).toBe(4.25);
  });
});
