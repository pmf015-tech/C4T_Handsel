import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import { findDealForParty } from "@/lib/db/deals";
import {
  DealBuilderForm,
  type DealFormInitialValues,
} from "@/app/deals/new/deal-builder-form";

/** Minor units are integers; the form edits whole units, so scale only for display. */
function toWholeUnits(minorUnits: number): string {
  return String(minorUnits / 100);
}

export default async function ReviseDealPage({
  params,
}: {
  readonly params: Promise<{ dealId: string }>;
}) {
  const { userId } = await auth();
  const { dealId } = await params;
  if (!userId) redirect(`/sign-in?redirect_url=/deals/${dealId}/revise`);
  const deal = await findDealForParty(getDatabase(), dealId, userId);
  if (!deal) notFound();

  const initial: DealFormInitialValues = {
    title: deal.title,
    counterpartyName: deal.counterpartyName,
    currency: deal.currency,
    share: String(deal.creatorShareBasisPoints / 100),
    revenue: toWholeUnits(deal.projectedRevenueMinorUnits),
    milestones: deal.milestones.map((milestone) => ({
      title: milestone.title,
      amountWholeUnits: toWholeUnits(milestone.amountMinorUnits),
      dueAt: milestone.dueAt.toISOString().slice(0, 10),
    })),
    disputeClause: deal.disputeClause,
  };

  return <DealBuilderForm dealId={dealId} initial={initial} />;
}
