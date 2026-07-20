"use client";

import { HTTPError } from "ky";

import { api as ky } from "@/lib/http/client";
import { useState } from "react";

import type { MilestoneState } from "@/domain/milestone/milestone";
import { DEAL_COPY } from "@/lib/i18n/deals";
import { ClockChip } from "../clock-chip";
import { StateBadge } from "../state-badge";
import styles from "../deal-detail.module.css";

type MilestoneActionsProps = {
  readonly dealId: string;
  readonly milestoneId: string;
  readonly state: MilestoneState;
  readonly deliveredAt?: Date | null;
  readonly role: "creator" | "brand";
  readonly language?: "en" | "zh-Hant";
};

export function MilestoneActions({
  dealId,
  milestoneId,
  state,
  role,
  deliveredAt = null,
  language = "en",
}: MilestoneActionsProps) {
  const copy = DEAL_COPY[language];
  const [current, setCurrent] = useState({ state, deliveredAt });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const canDeliver = role === "creator" && current.state === "PENDING";
  const canApprove = role === "brand" && current.state === "DELIVERED";

  async function run(
    action: "deliver" | "approve" | "reject",
    reason?: string,
  ): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      const response = await ky
        .post(`/api/deals/${dealId}/milestones/${milestoneId}`, {
          json: { action, ...(reason ? { reason } : {}) },
        })
        .json<{
          readonly milestone: {
            readonly state: MilestoneState;
            readonly deliveredAt: string | null;
          };
        }>();
      setCurrent({
        state: response.milestone.state,
        deliveredAt: response.milestone.deliveredAt
          ? new Date(response.milestone.deliveredAt)
          : null,
      });
    } catch (error) {
      if (error instanceof HTTPError) {
        if (error.response.status === 403) setMessage(copy.milestoneRoleError);
        else if (error.response.status === 409)
          setMessage(copy.milestoneStateError);
        else setMessage(copy.milestoneError);
      } else setMessage(copy.milestoneError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.milestoneActions}>
      <p className={styles.milestoneState}>
        <span>{copy.milestoneStateLabel}</span>
        <StateBadge value={current.state} />
      </p>
      {current.state === "DELIVERED" && current.deliveredAt ? (
        <ClockChip
          deadline={new Date(
            current.deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString()}
        />
      ) : null}
      {current.state === "FROZEN" ? (
        <p className={styles.frozenOverlay} role="status">
          Frozen while dispute is open / 爭議處理中，操作已暫停
        </p>
      ) : null}
      {canDeliver ? (
        <button disabled={busy} onClick={() => run("deliver")} type="button">
          {busy ? copy.milestoneWorking : copy.milestoneDeliver}
        </button>
      ) : null}
      {canApprove ? (
        <button disabled={busy} onClick={() => run("approve")} type="button">
          {busy ? copy.milestoneWorking : copy.milestoneApprove}
        </button>
      ) : null}
      {role === "brand" && current.state === "DELIVERED" ? (
        <button
          disabled={busy}
          onClick={() => setRejecting((value) => !value)}
          type="button"
        >
          {copy.milestoneReject}
        </button>
      ) : null}
      {rejecting ? (
        <div className={styles.rejectPanel}>
          <label>
            {copy.milestoneRejectReason}
            <textarea
              minLength={2}
              maxLength={500}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          </label>
          <button
            disabled={busy || rejectReason.trim().length < 2}
            onClick={() => run("reject", rejectReason)}
            type="button"
          >
            {copy.milestoneRejectConfirm}
          </button>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
