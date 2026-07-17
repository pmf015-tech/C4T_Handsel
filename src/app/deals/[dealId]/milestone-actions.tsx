"use client";

import ky, { HTTPError } from "ky";
import { useState } from "react";

import type { MilestoneState } from "@/domain/milestone/milestone";
import { DEAL_COPY } from "@/lib/i18n/deals";
import styles from "../deal-detail.module.css";

const copy = DEAL_COPY.en;

const STATE_COPY: Record<MilestoneState, string> = {
  PENDING: copy.milestonePending,
  DELIVERED: copy.milestoneDelivered,
  APPROVED: copy.milestoneApproved,
  FROZEN: copy.milestoneFrozen,
};

type MilestoneActionsProps = {
  readonly dealId: string;
  readonly milestoneId: string;
  readonly state: MilestoneState;
  readonly role: "creator" | "brand";
};

export function MilestoneActions({
  dealId,
  milestoneId,
  state,
  role,
}: MilestoneActionsProps) {
  const [current, setCurrent] = useState<MilestoneState>(state);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canDeliver = role === "creator" && current === "PENDING";
  const canApprove = role === "brand" && current === "DELIVERED";

  async function run(action: "deliver" | "approve"): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      const response = await ky
        .post(`/api/deals/${dealId}/milestones/${milestoneId}`, {
          json: { action },
        })
        .json<{ readonly milestone: { readonly state: MilestoneState } }>();
      setCurrent(response.milestone.state);
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
        <strong>{STATE_COPY[current]}</strong>
      </p>
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
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
