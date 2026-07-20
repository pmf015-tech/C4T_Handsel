import { computeRevShare } from "@/domain/money/revShare";

/**
 * Deterministic settlement statement (spec E8). Turns a confirmed rev-share and
 * a sales report into the human-readable statement document — the payable
 * figures come from computeRevShare, never from the agent, so the statement is
 * reproducible with no Gemini call at render time.
 */

export type SettlementStatementInput = Readonly<{
  dealTitle: string;
  counterpartyName: string;
  currency: string;
  creatorShareBasisPoints: number;
  report: Readonly<{
    periodEnd: string;
    units: number;
    grossRevenueMinorUnits: number;
    timing: "ON_TIME" | "LATE";
  }>;
  generatedAt: string;
}>;

export type SettlementLine = Readonly<{
  key: "gross" | "creator" | "brand" | "units";
  labelEn: string;
  labelZh: string;
  value: string;
}>;

export type SettlementStatement = Readonly<{
  dealTitle: string;
  counterpartyName: string;
  currency: string;
  periodEnd: string;
  creatorShareBasisPoints: number;
  grossRevenueMinorUnits: number;
  creatorShareMinorUnits: number;
  brandShareMinorUnits: number;
  timing: "ON_TIME" | "LATE";
  isLate: boolean;
  generatedAt: string;
  lines: readonly SettlementLine[];
}>;

function formatMinorUnits(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(minorUnits / 100)
    .replace(/\u00A0/g, " ");
}

export function buildSettlementStatement(
  input: SettlementStatementInput,
): SettlementStatement {
  const { grossRevenueMinorUnits, units, timing } = input.report;
  const { creatorShareMinorUnits, brandShareMinorUnits } = computeRevShare(
    grossRevenueMinorUnits,
    input.creatorShareBasisPoints,
  );

  const lines: readonly SettlementLine[] = [
    {
      key: "units",
      labelEn: "Units sold",
      labelZh: "銷售件數",
      value: units.toLocaleString("en-US"),
    },
    {
      key: "gross",
      labelEn: "Gross revenue",
      labelZh: "總收入",
      value: formatMinorUnits(grossRevenueMinorUnits, input.currency),
    },
    {
      key: "creator",
      labelEn: `Creator share (${(input.creatorShareBasisPoints / 100).toFixed(2)}%)`,
      labelZh: `創作者分成（${(input.creatorShareBasisPoints / 100).toFixed(2)}%）`,
      value: formatMinorUnits(creatorShareMinorUnits, input.currency),
    },
    {
      key: "brand",
      labelEn: "Brand share",
      labelZh: "品牌分成",
      value: formatMinorUnits(brandShareMinorUnits, input.currency),
    },
  ];

  return {
    dealTitle: input.dealTitle,
    counterpartyName: input.counterpartyName,
    currency: input.currency,
    periodEnd: input.report.periodEnd,
    creatorShareBasisPoints: input.creatorShareBasisPoints,
    grossRevenueMinorUnits,
    creatorShareMinorUnits,
    brandShareMinorUnits,
    timing,
    isLate: timing === "LATE",
    generatedAt: input.generatedAt,
    lines,
  };
}
