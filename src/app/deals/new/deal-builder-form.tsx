"use client";

import ky from "ky";
import { useState, type ComponentProps, type FormEvent } from "react";
import { DEAL_COPY } from "@/lib/i18n/deals";
import { CreateDealInputSchema } from "@/lib/deals/input";
import styles from "./deal-builder.module.css";
import { MilestoneEditor } from "./milestone-editor";
import { buildMilestonePayload, type MilestoneRow } from "./milestone-rows";

type Language = "en" | "zh-Hant";
const isoDate = () => new Date().toISOString().slice(0, 10);

function FormInput({
  label,
  ...inputProps
}: Readonly<{ label: string }> & ComponentProps<"input">) {
  return (
    <label>
      {label}
      <input {...inputProps} />
    </label>
  );
}

/** Prefilled terms turn the builder into the redline editor for an existing deal. */
export type DealFormInitialValues = Readonly<{
  readonly title: string;
  readonly counterpartyName: string;
  readonly currency: string;
  readonly share: string;
  readonly revenue: string;
  readonly milestones: readonly MilestoneRow[];
  readonly disputeClause: string;
}>;

type DealBuilderFormProps = Readonly<{
  /** Existing deal id switches the form from create to redline. */
  readonly dealId?: string;
  readonly initial?: DealFormInitialValues;
}>;

export function DealBuilderForm({
  dealId,
  initial,
}: DealBuilderFormProps = {}) {
  const isRevision = dealId !== undefined;
  const [language, setLanguage] = useState<Language>("en");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [counterpartyName, setCounterpartyName] = useState(
    initial?.counterpartyName ?? "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "HKD");
  const [share, setShare] = useState(initial?.share ?? "20");
  const [revenue, setRevenue] = useState(initial?.revenue ?? "");
  const [milestones, setMilestones] = useState<readonly MilestoneRow[]>(
    initial?.milestones ?? [
      { title: "", amountWholeUnits: "", dueAt: isoDate() },
    ],
  );
  const [disputeClause, setDisputeClause] = useState(
    initial?.disputeClause ?? "REFUND_BRAND",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const copy = DEAL_COPY[language];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = CreateDealInputSchema.safeParse({
      title,
      counterpartyName,
      currency,
      creatorShareBasisPoints: Math.round(Number(share) * 100),
      projectedRevenueMinorUnits: Math.round(Number(revenue) * 100),
      milestones: buildMilestonePayload(milestones),
      disputeClause,
    });
    if (!parsed.success) {
      setError(
        language === "en"
          ? (parsed.error.issues[0]?.message ?? copy.failure)
          : "請修正合作資料。",
      );
      return;
    }
    setSaving(true);
    try {
      const response = await ky.post(
        isRevision ? `/api/deals/${dealId}/revise` : "/api/deals",
        { json: parsed.data, throwHttpErrors: false },
      );
      const result = (await response.json()) as {
        ok: boolean;
        deal?: { id: string };
        message?: string | { en: string; zhHant: string };
      };
      if (!result.ok) {
        const raw = result.message;
        const message =
          typeof raw === "string"
            ? raw
            : language === "en"
              ? raw?.en
              : raw?.zhHant;
        setError(message ?? copy.failure);
        return;
      }
      if (isRevision) {
        window.location.assign(`/deals/${dealId}/contract`);
        return;
      }
      if (!result.deal) {
        setError(copy.failure);
        return;
      }
      window.location.assign(`/deals/${result.deal.id}`);
    } catch {
      setError(copy.failure);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <a
            className={styles.back}
            href={isRevision ? `/deals/${dealId}/contract` : "/dashboard"}
          >
            ← {copy.back}
          </a>
          <span className={styles.language}>
            <button type="button" onClick={() => setLanguage("zh-Hant")}>
              中
            </button>{" "}
            /{" "}
            <button type="button" onClick={() => setLanguage("en")}>
              EN
            </button>
          </span>
        </div>
        <div className={styles.grid}>
          <section className={styles.intro}>
            <span className={styles.eyebrow}>
              {isRevision ? copy.reviseEyebrow : copy.eyebrow}
            </span>
            <h1>{isRevision ? copy.reviseTitle : copy.title}</h1>
            <p>{isRevision ? copy.reviseBody : copy.body}</p>
          </section>
          <section className={styles.card}>
            <form className={styles.form} onSubmit={submit}>
              <FormInput
                required
                label={copy.titleLabel}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <FormInput
                required
                label={copy.counterpartyLabel}
                value={counterpartyName}
                onChange={(event) => setCounterpartyName(event.target.value)}
              />
              <div className={styles.row}>
                <label>
                  {copy.currencyLabel}
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option>HKD</option>
                    <option>TWD</option>
                    <option>USD</option>
                  </select>
                </label>
                <FormInput
                  required
                  label={copy.shareLabel}
                  min="0.01"
                  max="95"
                  step="0.01"
                  type="number"
                  value={share}
                  onChange={(event) => setShare(event.target.value)}
                />
              </div>
              <FormInput
                required
                label={copy.revenueLabel}
                min="1"
                step="1"
                type="number"
                value={revenue}
                onChange={(event) => setRevenue(event.target.value)}
              />
              <MilestoneEditor
                copy={copy}
                rows={milestones}
                setRows={setMilestones}
              />
              <label>
                {copy.disputeLabel}
                <select
                  value={disputeClause}
                  onChange={(e) => setDisputeClause(e.target.value)}
                >
                  <option value="REFUND_BRAND">{copy.disputeRefund}</option>
                  <option value="SPLIT_BY_DELIVERED_PROPORTION">
                    {copy.disputeSplit}
                  </option>
                  <option value="EXTERNAL_MEDIATION">
                    {copy.disputeMediation}
                  </option>
                </select>
              </label>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              <button className={styles.submit} disabled={saving} type="submit">
                {isRevision
                  ? saving
                    ? copy.reviseSaving
                    : copy.reviseSubmit
                  : saving
                    ? copy.saving
                    : copy.submit}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
