import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { buildSettlementStatement } from "@/domain/statement/settlement-statement";
import { getDatabase } from "@/lib/db/client";
import { findDealForParty } from "@/lib/db/deals";
import { findSalesReportsForParty } from "@/lib/db/sales-reports";
import { PrintButton } from "./print-button";
import styles from "./statement.module.css";

/**
 * Free settlement statement (spec E8). Deterministic render: figures come from
 * computeRevShare via buildSettlementStatement — no Gemini call, no charge —
 * so both parties can reproduce the statement at any time.
 */
export default async function StatementPage({
  params,
}: {
  readonly params: Promise<{ dealId: string }>;
}) {
  const { userId } = await auth();
  const { dealId } = await params;
  if (!userId) redirect(`/sign-in?redirect_url=/deals/${dealId}/statement`);

  const sql = getDatabase();
  const deal = await findDealForParty(sql, dealId, userId);
  if (!deal) notFound();

  const reports = await findSalesReportsForParty(sql, dealId, userId);
  const latest = reports[0];

  if (!latest) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <a className={styles.backLink} href={`/deals/${dealId}`}>
            ← Back to deal hub / 返回交易主頁
          </a>
          <section className={styles.card}>
            <p className={styles.eyebrow}>Settlement statement / 結算單</p>
            <h1>{deal.title}</h1>
            <p>
              No sales report has been submitted for this deal yet. The
              statement is generated from the latest report. /
              此交易尚未提交銷售報告,結算單會由最新報告產生。
            </p>
          </section>
        </div>
      </main>
    );
  }

  const statement = buildSettlementStatement({
    dealTitle: deal.title,
    counterpartyName: deal.counterpartyName,
    currency: deal.currency.toUpperCase(),
    creatorShareBasisPoints: deal.creatorShareBasisPoints,
    report: {
      periodEnd: latest.periodEnd.toISOString().slice(0, 10),
      units: latest.units,
      grossRevenueMinorUnits: latest.grossRevenueMinorUnits,
      timing: latest.timing,
    },
    generatedAt: new Date().toISOString(),
  });

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <a className={styles.backLink} href={`/deals/${dealId}`}>
          ← Back to deal hub / 返回交易主頁
        </a>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Settlement statement / 結算單</p>
          <h1>{statement.dealTitle}</h1>
          <div className={styles.meta}>
            <div>
              <small>Counterparty / 對方</small>
              <strong>{statement.counterpartyName}</strong>
            </div>
            <div>
              <small>Period ending / 結算期至</small>
              <strong>{statement.periodEnd}</strong>
            </div>
            <div>
              <small>Currency / 貨幣</small>
              <strong>{statement.currency}</strong>
            </div>
          </div>
          {statement.isLate ? (
            <p className={styles.lateFlag} role="alert">
              ⚑ Report submitted late / 報告逾期提交
            </p>
          ) : null}
          <dl className={styles.lines}>
            {statement.lines.map((line) => (
              <div key={line.key}>
                <dt>
                  {line.labelEn}
                  <small>{line.labelZh}</small>
                </dt>
                <dd>{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.footer}>
            Figures computed deterministically by Handsel from the confirmed
            revenue share (
            {(statement.creatorShareBasisPoints / 100).toFixed(2)}
            %) and the submitted sales report. Generated{" "}
            {statement.generatedAt.slice(0, 10)}. /
            金額由平台按已確認分成與已提交報告以確定性程式計算。
          </p>
          <div className={styles.actions}>
            <PrintButton />
          </div>
        </section>
      </div>
    </main>
  );
}
