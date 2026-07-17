import { notFound } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import { findSharedTermSheet } from "@/lib/db/deals";
import { PUBLIC_TERM_SHEET_COPY } from "@/lib/i18n/deals";
import { ClockChip } from "../../deals/clock-chip";
import { ShareTokenSchema } from "@/lib/terms/share-token";
import styles from "../../deals/deals.module.css";

type SharedTermSheetPageProps = {
  readonly params: Promise<{ shareToken: string }>;
};

const disputeCopy = {
  REFUND_BRAND: "Refund brand / 退還品牌款項",
  SPLIT_BY_DELIVERED_PROPORTION:
    "Split by delivered proportion / 按交付比例分配",
  EXTERNAL_MEDIATION: "External mediation / 外部調解",
} as const;

function formatAmount(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinorUnits / 100);
}

function formatBilingualDate(dueAt: string): string {
  const date = new Date(dueAt);
  const english = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
  const traditionalChinese = new Intl.DateTimeFormat("zh-Hant", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
  return `${english} / ${traditionalChinese}`;
}

export default async function SharedTermSheetPage({
  params,
}: SharedTermSheetPageProps) {
  const { shareToken } = await params;
  const parsedToken = ShareTokenSchema.safeParse(shareToken);
  if (!parsedToken.success) notFound();
  const termSheet = await findSharedTermSheet(getDatabase(), parsedToken.data);
  if (!termSheet) notFound();
  if (termSheet.expiresAt.getTime() < Date.now()) {
    return (
      <main style={{ padding: "64px" }}>
        <h1>Offer expired / 條款書已過期</h1>
        <p>Please ask the deal owner for a new share link.</p>
      </main>
    );
  }
  const content = termSheet.content;
  return (
    <main className={styles.publicPage}>
      <article className={styles.termSheet}>
        <p className={styles.termSheetEyebrow}>
          HANDSEL 信約 · TERM SHEET / 條款書 · v{termSheet.versionNumber}
        </p>
        <h1>{content.title}</h1>
        <div className={styles.shareMeta}>
          <span>Offer expires / 條款書到期：</span>
          <ClockChip deadline={termSheet.expiresAt.toISOString()} />
        </div>
        {termSheet.latestVersionNumber > termSheet.versionNumber ? (
          <p className={styles.staleBanner} role="status">
            You are viewing v{termSheet.versionNumber}; v
            {termSheet.latestVersionNumber} is available. / 你而家睇緊 v
            {termSheet.versionNumber}，最新係 v{termSheet.latestVersionNumber}。
          </p>
        ) : null}
        <p>Counterparty / 合作對方：{content.counterpartyName}</p>
        <hr />
        <p>
          Currency / 貨幣：<strong>{content.currency}</strong>
        </p>
        <p>
          Creator share / 創作者分成：
          <strong>{(content.creatorShareBasisPoints / 100).toFixed(2)}%</strong>
        </p>
        <p>
          Projected revenue / 預計收入：
          <strong>
            {content.projectedRevenueMinorUnits / 100} {content.currency}
          </strong>
        </p>
        <p>
          Milestone total / 里程碑總額：
          <strong>
            {content.totalMilestoneAmountMinorUnits / 100} {content.currency}
          </strong>
        </p>
        <p>
          Dispute default / 預設爭議處理：
          <strong>{disputeCopy[content.disputeClause]}</strong>
        </p>
        <section className={styles.publicMilestones}>
          <h2>{PUBLIC_TERM_SHEET_COPY.milestonesHeading}</h2>
          {content.milestones.length === 0 ? (
            <p className={styles.emptyMilestones}>
              {PUBLIC_TERM_SHEET_COPY.legacyMilestonesEmpty}
            </p>
          ) : (
            <div className={styles.milestoneList}>
              {content.milestones.map((milestone) => (
                <article
                  className={styles.milestoneDetail}
                  key={milestone.position}
                >
                  <span className={styles.milestoneNumber}>
                    {milestone.position}
                  </span>
                  <div className={styles.milestoneSummary}>
                    <h3>{milestone.title}</h3>
                    <dl>
                      <div>
                        <dt>{PUBLIC_TERM_SHEET_COPY.amountLabel}</dt>
                        <dd>
                          {formatAmount(
                            milestone.amountMinorUnits,
                            content.currency,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>{PUBLIC_TERM_SHEET_COPY.dueLabel}</dt>
                        <dd>{formatBilingualDate(milestone.dueAt)}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <p className={styles.immutableNote}>
          This version is content-hashed and immutable. /
          呢個版本已作內容雜湊並不可修改。
        </p>
        <a
          className={styles.acceptLink}
          href={`/sign-in?redirect_url=/deals/${content.dealId}/contract`}
        >
          Accept & proceed / 接受並繼續 →
        </a>
      </article>
    </main>
  );
}
