import type { MilestoneState } from "@/domain/milestone/milestone";
import type { DealState } from "./types";

/**
 * When a redline may still rewrite the deal's terms — spec-handsel-mvp.md E2.
 *
 * The state machine loops DRAFT/NEGOTIATING/SIGNED back to NEGOTIATING on any
 * edit (signatures reset, new version). Once the deal is funded (ACTIVE) or
 * beyond, terms are locked: money and delivery now depend on them, so a
 * rewrite would be an amendment, not a redline.
 *
 * Delivery progress locks terms too. A revision replaces the milestone rows,
 * so any milestone that has left PENDING would lose its delivery/approval
 * record — silently destroying an audited fact. Refuse instead.
 */

const REVISABLE_DEAL_STATES: readonly DealState[] = [
  "DRAFT",
  "NEGOTIATING",
  "SIGNED",
];

export class DealRevisionLockedError extends Error {
  readonly name = "DealRevisionLockedError";
  constructor(reason: string) {
    super(`Deal terms can no longer be revised: ${reason}.`);
  }
}

export function assertDealTermsRevisable(
  dealState: DealState,
  milestoneStates: readonly MilestoneState[],
): void {
  if (!REVISABLE_DEAL_STATES.includes(dealState))
    throw new DealRevisionLockedError(`the deal is ${dealState}`);
  if (milestoneStates.some((state) => state !== "PENDING"))
    throw new DealRevisionLockedError("a milestone has already progressed");
}
