export const MAX_MILESTONES = 20;

export type MilestoneRow = Readonly<{
  title: string;
  amountWholeUnits: string;
  dueAt: string;
}>;

export type MilestonePayloadRow = Readonly<{
  title: string;
  amountMinorUnits: number;
  dueAt: string;
}>;

export function appendMilestoneRow(
  rows: readonly MilestoneRow[],
  dueAt: string,
): readonly MilestoneRow[] {
  if (rows.length >= MAX_MILESTONES) return rows;
  return [...rows, { title: "", amountWholeUnits: "", dueAt }];
}

export function updateMilestoneRow(
  rows: readonly MilestoneRow[],
  index: number,
  update: Partial<MilestoneRow>,
): readonly MilestoneRow[] {
  return rows.map((row, rowIndex) =>
    rowIndex === index ? { ...row, ...update } : row,
  );
}

export function removeMilestoneRow(
  rows: readonly MilestoneRow[],
  index: number,
): readonly MilestoneRow[] {
  if (rows.length <= 1) return rows;
  return rows.filter((_, rowIndex) => rowIndex !== index);
}

export function buildMilestonePayload(
  rows: readonly MilestoneRow[],
): readonly MilestonePayloadRow[] {
  return rows.map((row) => ({
    title: row.title,
    amountMinorUnits: Math.round(Number(row.amountWholeUnits) * 100),
    dueAt: `${row.dueAt}T00:00:00.000Z`,
  }));
}
