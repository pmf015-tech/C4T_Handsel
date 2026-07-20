"use client";

import ky, { HTTPError } from "ky";
import { useState } from "react";

import styles from "../deal-detail.module.css";

type Rules = {
  readonly creatorShareBasisPoints: number;
  readonly currency: string;
  readonly reportCadence: "MONTHLY" | "QUARTERLY";
  readonly reportGraceDays: number;
  readonly milestones: readonly {
    readonly title: string;
    readonly amountMinorUnits: number;
    readonly dueDate: string | null;
  }[];
  readonly notes: readonly string[];
};

type Reconciliation = {
  readonly grossRevenueMinorUnits: number;
  readonly creatorShareMinorUnits: number;
  readonly brandShareMinorUnits: number;
  readonly flags: readonly string[];
  readonly narrative: string;
  readonly model: string;
};

/**
 * S15 agent console (spec E8): trigger the Gemini settlement agent and show
 * its proposals. Every action is also appended to the deal event log, so the
 * activity timeline doubles as the agent execution log.
 */
export function SettlementAgentPanel({ dealId }: { readonly dealId: string }) {
  const [busy, setBusy] = useState<"extract" | "confirm" | "reconcile" | null>(
    null,
  );
  const [rules, setRules] = useState<Rules | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<Reconciliation | null>(null);
  const [message, setMessage] = useState("");

  function formatMinor(minor: number, currency: string): string {
    return `${currency.toUpperCase()} ${(minor / 100).toFixed(2)}`;
  }

  async function call(action: "extract" | "confirm" | "reconcile") {
    setBusy(action);
    setMessage("");
    try {
      if (action === "extract") {
        const response = await ky
          .post(`/api/deals/${dealId}/settlement-rules`, { timeout: 60_000 })
          .json<{ readonly rules: Rules }>();
        setRules(response.rules);
        setConfirmed(false);
      } else if (action === "confirm" && rules) {
        await ky.patch(`/api/deals/${dealId}/settlement-rules`, {
          json: { action: "confirm", rules },
        });
        setConfirmed(true);
      } else if (action === "reconcile") {
        const response = await ky
          .post(`/api/deals/${dealId}/reconcile`, { timeout: 60_000 })
          .json<{ readonly result: Reconciliation }>();
        setResult(response.result);
      }
    } catch (error) {
      if (error instanceof HTTPError) {
        const body = (await error.response.json().catch(() => null)) as {
          message?: string;
        } | null;
        setMessage(body?.message ?? "Agent call failed. / 代理呼叫失敗。");
      } else setMessage("Agent call failed. / 代理呼叫失敗。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.milestoneActions} aria-label="Settlement agent">
      <h3>Gemini settlement agent / 結算代理</h3>
      <p>
        The agent proposes; deterministic code decides the money. /
        代理提議,金額由確定性程式碼話事。
      </p>
      <div>
        <button
          disabled={busy !== null}
          onClick={() => call("extract")}
          type="button"
        >
          {busy === "extract"
            ? "Reading contract… / 閱讀合約中…"
            : "Extract settlement rules / 抽取結算規則"}
        </button>
        {rules && !confirmed ? (
          <button
            disabled={busy !== null}
            onClick={() => call("confirm")}
            type="button"
          >
            {busy === "confirm"
              ? "Confirming… / 確認中…"
              : "Confirm rules / 確認規則"}
          </button>
        ) : null}
        <button
          disabled={busy !== null}
          onClick={() => call("reconcile")}
          type="button"
        >
          {busy === "reconcile"
            ? "Reconciling… / 對帳中…"
            : "Reconcile latest report / 對帳最新報告"}
        </button>
        <a href={`/deals/${dealId}/statement`}>View statement / 查看結算單</a>
      </div>
      {rules ? (
        <dl>
          <div>
            <dt>Creator share / 創作者分成</dt>
            <dd>{(rules.creatorShareBasisPoints / 100).toFixed(2)}%</dd>
          </div>
          <div>
            <dt>Cadence / 報告週期</dt>
            <dd>
              {rules.reportCadence} · grace {rules.reportGraceDays}d
              {confirmed
                ? " · Confirmed ✓ / 已確認 ✓"
                : " · Unconfirmed / 未確認"}
            </dd>
          </div>
          {rules.notes.length > 0 ? (
            <div>
              <dt>Agent notes / 代理備註</dt>
              <dd>{rules.notes.join("; ")}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {result ? (
        <div>
          <p>
            <strong>
              Creator payable / 應付創作者:{" "}
              {formatMinor(result.creatorShareMinorUnits, "hkd")}
            </strong>{" "}
            (gross {formatMinor(result.grossRevenueMinorUnits, "hkd")})
          </p>
          {result.flags.length > 0 ? (
            <p role="alert">⚑ {result.flags.join(" · ")}</p>
          ) : null}
          <p>{result.narrative}</p>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
