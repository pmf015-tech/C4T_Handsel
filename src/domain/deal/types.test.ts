import { describe, expect, it } from "vitest";

import { CLOCKS } from "./types";

describe("deal lifecycle clocks", () => {
  it("uses positive whole days for every configured deadline", () => {
    // Given: every configured lifecycle clock.
    const durations = Object.values(CLOCKS);

    // When: the durations are inspected as domain configuration.
    const invalidDurations = durations.filter(
      (duration) => !Number.isInteger(duration) || duration <= 0,
    );

    // Then: no clock can introduce a fractional or non-positive deadline.
    expect(invalidDurations).toEqual([]);
  });
});
