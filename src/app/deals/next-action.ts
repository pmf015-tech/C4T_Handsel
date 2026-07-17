import type { DealSummary } from "@/lib/db/deals";

export type NextDealAction = Readonly<{
  readonly actor: string;
  readonly label: string;
  readonly href: string;
  readonly deadline: string | null;
}>;

export function getNextDealAction(deal: DealSummary): NextDealAction {
  const milestone = deal.milestones.find((item) => {
    if (deal.viewerRole === "creator") return item.state === "PENDING";
    return item.state === "DELIVERED";
  });
  if (milestone) {
    const deadline =
      deal.viewerRole === "brand" && milestone.deliveredAt
        ? new Date(
            milestone.deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : milestone.dueAt.toISOString();
    return {
      actor: "You / 你",
      label:
        deal.viewerRole === "creator"
          ? "Deliver milestone / 交付里程碑"
          : "Approve milestone / 批核里程碑",
      href: `/deals/${deal.id}?tab=milestones`,
      deadline,
    };
  }
  if (deal.state === "DRAFT" || deal.state === "NEGOTIATING") {
    return {
      actor: "You / 你",
      label: "Open contract / 開啟合約",
      href: `/deals/${deal.id}/contract`,
      deadline: null,
    };
  }
  return {
    actor: "Both parties / 雙方",
    label: "Review deal activity / 檢視合作活動",
    href: `/deals/${deal.id}?tab=overview`,
    deadline: null,
  };
}
