import { describe, expect, it } from "vitest";

import {
  appendMilestoneRow,
  buildMilestonePayload,
  removeMilestoneRow,
  updateMilestoneRow,
} from "./milestone-rows";

const milestone = {
  title: "Launch content",
  amountWholeUnits: "1250",
  dueAt: "2026-08-01",
};

describe("deal-builder milestone rows", () => {
  it("adds rows through the twentieth row and then preserves the limit", () => {
    // Given: nineteen ordered milestone rows.
    const rows = Array.from({ length: 19 }, (_, index) => ({
      ...milestone,
      title: `Milestone ${index + 1}`,
    }));

    // When: the creator tries to add two more rows.
    const twentieth = appendMilestoneRow(rows, "2026-08-02");
    const beyondLimit = appendMilestoneRow(twentieth, "2026-08-03");

    // Then: exactly twenty rows remain in their original order.
    expect(beyondLimit).toHaveLength(20);
    expect(beyondLimit.slice(0, 19)).toEqual(rows);
  });

  it("updates only the selected row", () => {
    // Given: two ordered milestone rows.
    const rows = [milestone, { ...milestone, title: "Follow-up content" }];

    // When: the creator changes the second milestone amount.
    const updated = updateMilestoneRow(rows, 1, {
      amountWholeUnits: "500",
    });

    // Then: the first row is preserved and only the selected row changes.
    expect(updated).toEqual([rows[0], { ...rows[1], amountWholeUnits: "500" }]);
  });

  it("removes a selected row but always preserves one milestone", () => {
    // Given: two ordered milestone rows.
    const rows = [milestone, { ...milestone, title: "Follow-up content" }];

    // When: the creator removes the first row and tries to remove the last row.
    const oneRow = removeMilestoneRow(rows, 0);
    const minimumPreserved = removeMilestoneRow(oneRow, 0);

    // Then: the selected row is gone and the minimum is enforced.
    expect(minimumPreserved).toEqual([rows[1]]);
  });

  it("builds ordered API rows with whole-unit inputs converted to minor units", () => {
    // Given: two rows in the creator's chosen order.
    const rows = [
      milestone,
      {
        title: "Follow-up content",
        amountWholeUnits: "500",
        dueAt: "2026-08-15",
      },
    ];

    // When: the browser payload is built.
    const payload = buildMilestonePayload(rows);

    // Then: order, integer minor units, and UTC due dates are preserved.
    expect(payload).toEqual([
      {
        title: "Launch content",
        amountMinorUnits: 125_000,
        dueAt: "2026-08-01T00:00:00.000Z",
      },
      {
        title: "Follow-up content",
        amountMinorUnits: 50_000,
        dueAt: "2026-08-15T00:00:00.000Z",
      },
    ]);
  });
});
