import { z } from "zod";

const MinorUnitsSchema = z.preprocess(
  (value) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().safe().positive(),
);

export const TermSheetContentSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string(),
  counterpartyName: z.string(),
  currency: z.enum(["HKD", "TWD", "USD"]),
  creatorShareBasisPoints: z.number().int(),
  projectedRevenueMinorUnits: MinorUnitsSchema,
  totalMilestoneAmountMinorUnits: MinorUnitsSchema,
  disputeClause: z.enum([
    "REFUND_BRAND",
    "SPLIT_BY_DELIVERED_PROPORTION",
    "EXTERNAL_MEDIATION",
  ]),
  milestones: z
    .array(
      z.object({
        position: z.number().int().min(1).max(20),
        title: z.string().min(2).max(80),
        amountMinorUnits: MinorUnitsSchema,
        dueAt: z.string().datetime(),
      }),
    )
    .max(20)
    .default([]),
});

type TermSheetSource = Readonly<{
  id: string;
  title: string;
  counterpartyName: string;
  currency: "HKD" | "TWD" | "USD";
  creatorShareBasisPoints: number;
  projectedRevenueMinorUnits: number;
  totalMilestoneAmountMinorUnits: number;
  disputeClause:
    "REFUND_BRAND" | "SPLIT_BY_DELIVERED_PROPORTION" | "EXTERNAL_MEDIATION";
  milestones: readonly Readonly<{
    position: number;
    title: string;
    amountMinorUnits: number;
    dueAt: Date;
  }>[];
}>;

export type TermSheetContent = Readonly<{
  dealId: string;
  title: string;
  counterpartyName: string;
  currency: TermSheetSource["currency"];
  creatorShareBasisPoints: number;
  projectedRevenueMinorUnits: number;
  totalMilestoneAmountMinorUnits: number;
  disputeClause: TermSheetSource["disputeClause"];
  milestones: readonly Readonly<{
    position: number;
    title: string;
    amountMinorUnits: number;
    dueAt: string;
  }>[];
}>;

export function buildTermSheetContent(deal: TermSheetSource): TermSheetContent {
  return {
    dealId: deal.id,
    title: deal.title,
    counterpartyName: deal.counterpartyName,
    currency: deal.currency,
    creatorShareBasisPoints: deal.creatorShareBasisPoints,
    projectedRevenueMinorUnits: deal.projectedRevenueMinorUnits,
    totalMilestoneAmountMinorUnits: deal.totalMilestoneAmountMinorUnits,
    disputeClause: deal.disputeClause,
    milestones: [...deal.milestones]
      .sort((left, right) => left.position - right.position)
      .map((milestone) => ({
        position: milestone.position,
        title: milestone.title,
        amountMinorUnits: milestone.amountMinorUnits,
        dueAt: milestone.dueAt.toISOString(),
      })),
  };
}
