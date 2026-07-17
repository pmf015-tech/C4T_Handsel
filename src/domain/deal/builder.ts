import type { DealState, DisputeDefaultClause, MinorUnits } from "./types";

export const SUPPORTED_CURRENCIES = ["HKD", "TWD", "USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export type DealMilestoneInput = Readonly<{
  title: string;
  amountMinorUnits: MinorUnits;
  dueAt: string;
}>;

export type DealDraftInput = Readonly<{
  title: string;
  counterpartyName: string;
  currency: SupportedCurrency;
  creatorShareBasisPoints: number;
  projectedRevenueMinorUnits: MinorUnits;
  milestones: readonly DealMilestoneInput[];
  disputeClause: DisputeDefaultClause;
}>;

export type DealDraft = Readonly<
  DealDraftInput & {
    id: string;
    state: DealState;
    totalMilestoneAmountMinorUnits: MinorUnits;
    createdAt: string;
  }
>;

export class InvalidDealDraftError extends Error {
  readonly name = "InvalidDealDraftError";

  constructor(message: string) {
    super(message);
  }
}

function requireText(value: string, field: string): void {
  if (value.trim().length < 2 || value.trim().length > 80) {
    throw new InvalidDealDraftError(`${field} must be 2 to 80 characters`);
  }
}

function requireMinorUnits(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new InvalidDealDraftError(`${field} must be a positive safe integer`);
  }
}

function requireValidDueDate(value: string): void {
  const parsed = new Date(value);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value.slice(0, 10)
  ) {
    throw new InvalidDealDraftError("milestone due date must be valid");
  }
}

function validateMilestones(
  milestones: readonly DealMilestoneInput[],
): MinorUnits {
  if (milestones.length < 1 || milestones.length > 20) {
    throw new InvalidDealDraftError("milestones must contain 1 to 20 items");
  }

  const titles = new Set<string>();
  return milestones.reduce((total, milestone) => {
    requireText(milestone.title, "milestone title");
    const normalizedTitle = milestone.title.trim().toLocaleLowerCase("en-US");
    if (titles.has(normalizedTitle)) {
      throw new InvalidDealDraftError("milestone titles must be unique");
    }
    titles.add(normalizedTitle);
    requireMinorUnits(milestone.amountMinorUnits, "milestone amount");
    requireValidDueDate(milestone.dueAt);
    const nextTotal = total + milestone.amountMinorUnits;
    requireMinorUnits(nextTotal, "total milestone amount");
    return nextTotal;
  }, 0);
}

export function createDealDraft(
  input: DealDraftInput,
  id: string,
  createdAt: string,
): DealDraft {
  requireText(input.title, "title");
  requireText(input.counterpartyName, "counterpartyName");
  if (!SUPPORTED_CURRENCIES.includes(input.currency)) {
    throw new InvalidDealDraftError("currency is not supported");
  }
  if (
    !Number.isInteger(input.creatorShareBasisPoints) ||
    input.creatorShareBasisPoints < 1 ||
    input.creatorShareBasisPoints > 9_500
  ) {
    throw new InvalidDealDraftError(
      "creator share must be 1 to 9500 basis points",
    );
  }
  requireMinorUnits(input.projectedRevenueMinorUnits, "projected revenue");
  const totalMilestoneAmountMinorUnits = validateMilestones(input.milestones);

  return {
    ...input,
    id,
    state: "DRAFT",
    totalMilestoneAmountMinorUnits,
    createdAt,
  };
}
