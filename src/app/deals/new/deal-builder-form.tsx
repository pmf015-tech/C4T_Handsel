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

export function DealBuilderForm() {
  const [language, setLanguage] = useState<Language>("en");
  const [title, setTitle] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [currency, setCurrency] = useState("HKD");
  const [share, setShare] = useState("20");
  const [revenue, setRevenue] = useState("");
  const [milestones, setMilestones] = useState<readonly MilestoneRow[]>([
    { title: "", amountWholeUnits: "", dueAt: isoDate() },
  ]);
  const [disputeClause, setDisputeClause] = useState("REFUND_BRAND");
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
      const response = await ky.post("/api/deals", {
        json: parsed.data,
        throwHttpErrors: false,
      });
      const result = (await response.json()) as {
        ok: boolean;
        deal?: { id: string };
        message?: { en: string; zhHant: string };
      };
      const message =
        language === "en" ? result.message?.en : result.message?.zhHant;
      if (!result.ok || !result.deal) {
        setError(message ?? copy.failure);
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
          <a className={styles.back} href="/dashboard">
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
            <span className={styles.eyebrow}>{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.body}</p>
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
                {saving ? copy.saving : copy.submit}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
