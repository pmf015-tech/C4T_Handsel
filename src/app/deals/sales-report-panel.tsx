import { computeRevShare } from "@/domain/money/revShare";
import type { DealSummary } from "@/lib/db/deals";
import type { SalesReport } from "@/lib/db/sales-reports";
import { SALES_REPORT_COPY } from "@/lib/i18n/deals";
import { SalesReportForm } from "./sales-report-form";
import { StateBadge } from "./state-badge";
import styles from "./deal-detail.module.css";

function formatAmount(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinorUnits / 100);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(value);
}

export function SalesReportPanel({
  deal,
  reports,
}: Readonly<{
  readonly deal: DealSummary;
  readonly reports: readonly SalesReport[];
}>) {
  const copy = SALES_REPORT_COPY;
  return (
    <section className={styles.salesPanel} aria-labelledby="sales-heading">
      <div className={styles.sectionHeadingRow}>
        <div>
          <span className={styles.eyebrow}>E3 · RECONCILIATION</span>
          <h2 id="sales-heading">{copy.title}</h2>
        </div>
        <span className={styles.roleHint}>
          {deal.viewerRole === "brand"
            ? copy.brandCanSubmit
            : copy.creatorReadOnly}
        </span>
      </div>
      <p className={styles.panelIntro}>{copy.body}</p>
      {deal.viewerRole === "brand" ? (
        <SalesReportForm
          dealId={deal.id}
          currency={deal.currency}
          creatorShareBasisPoints={deal.creatorShareBasisPoints}
        />
      ) : (
        <div className={styles.readOnlyNotice}>{copy.creatorNotice}</div>
      )}
      <div className={styles.reportHistory}>
        <h3>{copy.history}</h3>
        {reports.length === 0 ? (
          <p className={styles.emptyState}>{copy.empty}</p>
        ) : (
          <div className={styles.reportRows}>
            {reports.map((report) => {
              const shares = computeRevShare(
                report.grossRevenueMinorUnits,
                deal.creatorShareBasisPoints,
              );
              return (
                <article className={styles.reportRow} key={report.id}>
                  <div>
                    <strong>{formatDate(report.periodEnd)}</strong>
                    <span>{report.units.toLocaleString("en-US")} units</span>
                  </div>
                  <div>
                    <small>{copy.grossRevenue}</small>
                    <strong>
                      {formatAmount(
                        report.grossRevenueMinorUnits,
                        deal.currency,
                      )}
                    </strong>
                  </div>
                  <div>
                    <small>{copy.creatorShare}</small>
                    <strong>
                      {formatAmount(
                        shares.creatorShareMinorUnits,
                        deal.currency,
                      )}
                    </strong>
                  </div>
                  <StateBadge value={report.timing} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
