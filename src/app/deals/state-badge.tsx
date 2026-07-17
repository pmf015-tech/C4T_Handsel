import type { DealState } from "@/domain/deal/types";
import type { MilestoneState } from "@/domain/milestone/milestone";

import styles from "./deal-detail.module.css";

type BadgeValue = DealState | MilestoneState | "ON_TIME" | "LATE";

const LABELS: Record<BadgeValue, string> = {
  DRAFT: "Draft / 草稿",
  NEGOTIATING: "Negotiating / 協商中",
  SIGNED: "Signed / 已簽署",
  ACTIVE: "Active / 進行中",
  MILESTONE_MET: "Milestone met / 已完成里程碑",
  PAYOUT_RELEASED: "Payout released / 已發放款項",
  DISPUTED: "Disputed / 爭議中",
  RESOLVED: "Resolved / 已解決",
  COMPLETED: "Completed / 已完成",
  CANCELLED: "Cancelled / 已取消",
  PENDING: "Pending / 等待中",
  DELIVERED: "Delivered / 已交付",
  APPROVED: "Approved / 已批核",
  FROZEN: "Frozen / 已凍結",
  ON_TIME: "On time / 準時",
  LATE: "Late / 遲交",
};

export function StateBadge({
  value,
}: Readonly<{ readonly value: BadgeValue }>) {
  return <span className={styles.stateBadge}>{LABELS[value]}</span>;
}
