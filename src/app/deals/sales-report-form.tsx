"use client";

import ky, { HTTPError } from "ky";
import { useMemo, useState } from "react";

import { computeRevShare } from "@/domain/money/revShare";
import { SALES_REPORT_COPY } from "@/lib/i18n/deals";
import { ClockChip } from "./clock-chip";
import styles from "./deal-detail.module.css";

const copy = SALES_REPORT_COPY;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function parseWholeUnits(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const minor = BigInt(value) * 100n;
  return minor <= MAX_SAFE ? Number(minor) : null;
}

function formatAmount(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinorUnits / 100);
}

export function SalesReportForm({
  dealId,
  currency,
  creatorShareBasisPoints,
}: Readonly<{
  readonly dealId: string;
  readonly currency: string;
  readonly creatorShareBasisPoints: number;
}>) {
  const [periodEnd, setPeriodEnd] = useState("");
  const [units, setUnits] = useState("");
  const [grossRevenue, setGrossRevenue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const grossMinorUnits = useMemo(
    () => parseWholeUnits(grossRevenue),
    [grossRevenue],
  );
  const preview =
    grossMinorUnits === null
      ? null
      : computeRevShare(grossMinorUnits, creatorShareBasisPoints);
  const graceDeadline = periodEnd
    ? new Date(
        new Date(`${periodEnd}T00:00:00.000Z`).getTime() +
          7 * 24 * 60 * 60 * 1000,
      ).toISOString()
    : null;

  async function submit(): Promise<void> {
    setMessage("");
    const wholeUnits = parseWholeUnits(units);
    if (!periodEnd || wholeUnits === null || grossMinorUnits === null) {
      setMessage("Enter a date and whole-number units/revenue first.");
      return;
    }
    setBusy(true);
    try {
      await ky.post(`/api/deals/${dealId}/sales-reports`, {
        json: {
          periodEnd,
          units: Number(units),
          grossRevenueMinorUnits: grossMinorUnits,
        },
      });
      setMessage("Sales report submitted. Refreshing the audit trail…");
      window.location.reload();
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 403)
        setMessage("Only the brand party can submit a report.");
      else if (error instanceof HTTPError && error.response.status === 409)
        setMessage("A report already exists for this period.");
      else
        setMessage("Could not submit this report. Check the fields and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.salesForm}>
      <div className={styles.sectionHeadingRow}>
        <div>
          <span className={styles.eyebrow}>BRAND INPUT / 品牌輸入</span>
          <h3>{copy.formTitle}</h3>
        </div>
        {graceDeadline ? <ClockChip deadline={graceDeadline} /> : null}
      </div>
      <label>
        {copy.periodEnd}
        <input
          type="date"
          value={periodEnd}
          onChange={(event) => setPeriodEnd(event.target.value)}
        />
      </label>
      <label>
        {copy.units}
        <input
          min="0"
          step="1"
          type="number"
          value={units}
          onChange={(event) => setUnits(event.target.value)}
        />
      </label>
      <label>
        {copy.grossRevenue}
        <input
          min="0"
          step="1"
          type="number"
          value={grossRevenue}
          onChange={(event) => setGrossRevenue(event.target.value)}
        />
      </label>
      <div className={styles.reconciliationPreview} aria-live="polite">
        <span>{copy.preview}</span>
        {preview ? (
          <dl>
            <div>
              <dt>{copy.creatorShare}</dt>
              <dd>{formatAmount(preview.creatorShareMinorUnits, currency)}</dd>
            </div>
            <div>
              <dt>{copy.brandShare}</dt>
              <dd>{formatAmount(preview.brandShareMinorUnits, currency)}</dd>
            </div>
          </dl>
        ) : (
          <p>{copy.previewHint}</p>
        )}
      </div>
      {message ? (
        <p className={styles.formMessage} role="status">
          {message}
        </p>
      ) : null}
      <button
        className={styles.primaryButton}
        disabled={busy}
        onClick={submit}
        type="button"
      >
        {busy ? copy.submitting : copy.submit}
      </button>
    </div>
  );
}
