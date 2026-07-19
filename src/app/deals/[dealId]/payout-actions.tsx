"use client";

import ky, { HTTPError } from "ky";
import { useState } from "react";

import type { MilestoneState } from "@/domain/milestone/milestone";
import type { PayoutState } from "@/domain/payout/payout";
import styles from "../deal-detail.module.css";

type PayoutActionsProps = {
  readonly dealId: string;
  readonly milestoneId: string;
  readonly milestoneState: MilestoneState;
  readonly payoutState: PayoutState;
  readonly role: "creator" | "brand";
};

const PAYOUT_LABEL: Record<PayoutState, string> = {
  NOT_FUNDED: "Not funded / 未注資",
  FUNDING_PENDING: "Funding pending / 注資處理中",
  FUNDING_FAILED: "Funding failed / 注資失敗",
  FUNDED: "Funds held in escrow / 資金已託管",
  RELEASE_PENDING: "Release pending / 放款處理中",
  RELEASE_FAILED: "Release failed / 放款失敗",
  RELEASED: "Paid out / 已放款",
};

export function PayoutActions({
  dealId,
  milestoneId,
  milestoneState,
  payoutState,
  role,
}: PayoutActionsProps) {
  const [state, setState] = useState(payoutState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canFund =
    role === "brand" &&
    (state === "NOT_FUNDED" || state === "FUNDING_FAILED") &&
    milestoneState !== "FROZEN";
  const canRelease =
    role === "brand" &&
    milestoneState === "APPROVED" &&
    (state === "FUNDED" || state === "RELEASE_FAILED");

  async function fund(): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      const response = await ky
        .post(`/api/deals/${dealId}/milestones/${milestoneId}/fund`)
        .json<{ readonly url: string }>();
      window.location.assign(response.url);
    } catch (error) {
      setMessage(
        error instanceof HTTPError && error.response.status === 409
          ? "This milestone cannot be funded right now. / 呢個里程碑而家唔可以注資。"
          : "Funding failed to start. / 注資未能開始。",
      );
      setBusy(false);
    }
  }

  async function release(): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      const response = await ky
        .post(`/api/deals/${dealId}/milestones/${milestoneId}/release`)
        .json<{ readonly state: PayoutState }>();
      setState(response.state);
    } catch (error) {
      setMessage(
        error instanceof HTTPError && error.response.status === 409
          ? "Release blocked — check milestone approval and creator onboarding. / 放款受阻，請確認里程碑已批核及創作者已完成收款設定。"
          : "Release failed. / 放款失敗。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.milestoneActions}>
      <p className={styles.milestoneState}>
        <span>Escrow / 託管</span>
        <span>{PAYOUT_LABEL[state]}</span>
      </p>
      {canFund ? (
        <button disabled={busy} onClick={fund} type="button">
          {busy ? "Working… / 處理中…" : "Fund milestone / 注資里程碑"}
        </button>
      ) : null}
      {canRelease ? (
        <button disabled={busy} onClick={release} type="button">
          {busy ? "Working… / 處理中…" : "Release payout / 放款"}
        </button>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
