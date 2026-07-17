import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";

import { createDealDraft } from "@/domain/deal/builder";
import { assertDealTermsRevisable } from "@/domain/deal/revision";
import type { DealState } from "@/domain/deal/types";
import type { MilestoneState } from "@/domain/milestone/milestone";
import {
  type ContractView,
  redlineContractInTransaction,
} from "@/lib/db/contracts";
import { createTermSheetVersionInTransaction } from "@/lib/db/deals";
import type { CreateDealInput } from "@/lib/deals/input";

export class DealRevisionNotFoundError extends Error {
  readonly name = "DealRevisionNotFoundError";
  constructor() {
    super("Deal not found for this party.");
  }
}

async function readRevisionGuardState(
  transaction: TransactionSql,
  dealId: string,
  clerkUserId: string,
): Promise<{
  readonly dealState: DealState;
  readonly milestoneStates: readonly MilestoneState[];
}> {
  const deals = await transaction<{ state: DealState }[]>`
    select d.state
    from deals d
    join deal_parties p on p.deal_id = d.id
    where d.id = ${dealId} and p.clerk_user_id = ${clerkUserId}
    limit 1
  `;
  const deal = deals[0];
  if (!deal) throw new DealRevisionNotFoundError();
  const milestones = await transaction<{ state: MilestoneState }[]>`
    select state from deal_milestones where deal_id = ${dealId}
  `;
  return {
    dealState: deal.state,
    milestoneStates: milestones.map((milestone) => milestone.state),
  };
}

/**
 * Rewrites a deal's terms, publishes the next immutable term-sheet version,
 * and redlines the contract (new hash, signatures reset) in ONE transaction.
 *
 * Atomicity is the point: if the terms committed but the redline failed, a
 * contract still carrying both signatures would describe terms that no longer
 * exist. Either every part of the revision is visible, or none of it is.
 */
export async function reviseDealTerms(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
  input: CreateDealInput,
): Promise<ContractView> {
  return sql.begin(async (transaction) => {
    const guard = await readRevisionGuardState(
      transaction,
      dealId,
      clerkUserId,
    );
    assertDealTermsRevisable(guard.dealState, guard.milestoneStates);

    // Reuse the same validation the create path uses; the returned draft is
    // discarded except for its normalised terms.
    const revised = createDealDraft(input, dealId, new Date().toISOString());

    await transaction`
      update deals set
        title = ${revised.title},
        counterparty_name = ${revised.counterpartyName},
        currency = ${revised.currency},
        creator_share_basis_points = ${revised.creatorShareBasisPoints},
        projected_revenue_minor_units = ${revised.projectedRevenueMinorUnits},
        total_milestone_amount_minor_units = ${revised.totalMilestoneAmountMinorUnits},
        dispute_clause = ${revised.disputeClause},
        updated_at = now()
      where id = ${dealId}
    `;
    // Safe to replace: the guard above proved every milestone is still PENDING,
    // so no delivery or approval record can be destroyed here.
    await transaction`delete from deal_milestones where deal_id = ${dealId}`;
    for (const [index, milestone] of revised.milestones.entries()) {
      await transaction`
        insert into deal_milestones (
          id, deal_id, position, title, amount_minor_units, due_date
        ) values (
          ${randomUUID()}, ${dealId}, ${index + 1}, ${milestone.title},
          ${milestone.amountMinorUnits}, ${milestone.dueAt.slice(0, 10)}
        )
      `;
    }
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (${randomUUID()}, ${dealId}, 'DEAL_TERMS_REVISED', ${clerkUserId},
        ${transaction.json({ title: revised.title, creatorShareBasisPoints: revised.creatorShareBasisPoints })})
    `;

    const termSheet = await createTermSheetVersionInTransaction(
      transaction,
      dealId,
      clerkUserId,
    );
    if (!termSheet) throw new DealRevisionNotFoundError();

    return redlineContractInTransaction(
      transaction,
      dealId,
      clerkUserId,
      termSheet.id,
    );
  }) as Promise<ContractView>;
}
