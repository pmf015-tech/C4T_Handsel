import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import { findDealForParty } from "@/lib/db/deals";
import { findDealEventsForParty } from "@/lib/db/events";
import { findPayoutsForDeal } from "@/lib/db/payouts";
import { findSalesReportsForParty } from "@/lib/db/sales-reports";
import { DEAL_COPY } from "@/lib/i18n/deals";
import styles from "../deal-detail.module.css";
import { MilestoneActions } from "./milestone-actions";
import { PayoutActions } from "./payout-actions";
import { TermSheetShare } from "./term-sheet-share";
import { ActivityTimeline } from "../activity-timeline";
import { SalesReportPanel } from "../sales-report-panel";
import { StateBadge } from "../state-badge";
import { ClockChip } from "../clock-chip";
import { getNextDealAction } from "../next-action";

const copy = DEAL_COPY.en;

function formatAmount(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinorUnits / 100);
}

function formatDueDate(dueAt: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(dueAt);
}

export default async function DealHubPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ dealId: string }>;
  readonly searchParams?: Promise<{ tab?: string; lang?: string }>;
}) {
  const { dealId } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=/deals/${dealId}`);
  const database = getDatabase();
  const deal = await findDealForParty(database, dealId, userId);
  if (!deal) notFound();
  const resolvedSearchParams = await searchParams;
  const tabValue = resolvedSearchParams?.tab;
  const language = resolvedSearchParams?.lang === "zh-Hant" ? "zh-Hant" : "en";
  const tab =
    tabValue === "milestones" || tabValue === "sales" ? tabValue : "overview";
  const [events, reports, payouts] = await Promise.all([
    findDealEventsForParty(database, deal.id, userId),
    findSalesReportsForParty(database, deal.id, userId),
    findPayoutsForDeal(database, deal.id),
  ]);
  const nextAction = getNextDealAction(deal);
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <a className={styles.back} href="/dashboard">
            ← Back to workspace
          </a>
          <StateBadge value={deal.state} />
        </div>
        <section className={styles.card}>
          <span className={styles.eyebrow}>DEAL HUB</span>
          <h1>{deal.title}</h1>
          <p>Counterparty / 合作對方：{deal.counterpartyName}</p>
          <div className={styles.nextActionBar}>
            <span>Next actor / 下一位：</span>
            <strong>{nextAction.actor}</strong>
            <a href={nextAction.href}>{nextAction.label} →</a>
            {nextAction.deadline ? (
              <ClockChip deadline={nextAction.deadline} />
            ) : null}
          </div>
          <div className={styles.languageToggle}>
            <span>Language / 語言</span>
            <a href={`/deals/${deal.id}?tab=${tab}&lang=en`}>EN</a>
            <a href={`/deals/${deal.id}?tab=${tab}&lang=zh-Hant`}>中文</a>
          </div>
          <div className={styles.hubGrid}>
            <div className={styles.metric}>
              <small>Currency / 貨幣</small>
              <strong>{deal.currency}</strong>
            </div>
            <div className={styles.metric}>
              <small>Creator share / 創作者分成</small>
              <strong>
                {(deal.creatorShareBasisPoints / 100).toFixed(2)}%
              </strong>
            </div>
            <div className={styles.metric}>
              <small>Milestones / 里程碑</small>
              <strong>
                {deal.milestones.length} {copy.milestoneCount}
              </strong>
            </div>
          </div>
          <nav className={styles.tabs} aria-label="Deal sections">
            <a
              className={tab === "overview" ? styles.activeTab : ""}
              href={`/deals/${deal.id}?tab=overview&lang=${language}`}
            >
              Overview / 概覽
            </a>
            <a
              className={tab === "milestones" ? styles.activeTab : ""}
              href={`/deals/${deal.id}?tab=milestones&lang=${language}`}
            >
              Milestones / 里程碑
            </a>
            <a
              className={tab === "sales" ? styles.activeTab : ""}
              href={`/deals/${deal.id}?tab=sales&lang=${language}`}
            >
              Sales reports / 銷售報告
            </a>
          </nav>
          {tab === "overview" ? (
            <>
              <ActivityTimeline events={events} />
              <a
                className={styles.contractLink}
                href={`/deals/${deal.id}/contract`}
              >
                Create / open contract →
              </a>
              <TermSheetShare dealId={deal.id} />
            </>
          ) : null}
          {tab === "milestones" ? (
            <section className={styles.milestoneSchedule}>
              <h2>{copy.ownerMilestonesHeading}</h2>
              <div className={styles.milestoneList}>
                {deal.milestones.length === 0 ? (
                  <p className={styles.emptyState}>
                    No milestones yet. / 暫時未有里程碑。
                  </p>
                ) : (
                  deal.milestones.map((milestone) => (
                    <article
                      className={styles.milestoneDetail}
                      key={milestone.id}
                    >
                      <span className={styles.milestoneNumber}>
                        {milestone.position}
                      </span>
                      <div className={styles.milestoneSummary}>
                        <h3>{milestone.title}</h3>
                        <dl>
                          <div>
                            <dt>{copy.ownerAmountLabel}</dt>
                            <dd>
                              {formatAmount(
                                milestone.amountMinorUnits,
                                deal.currency,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>{copy.ownerDueLabel}</dt>
                            <dd>{formatDueDate(milestone.dueAt)}</dd>
                          </div>
                        </dl>
                        <MilestoneActions
                          dealId={deal.id}
                          milestoneId={milestone.id}
                          role={deal.viewerRole}
                          state={milestone.state}
                          deliveredAt={milestone.deliveredAt}
                          language={language}
                        />
                        <PayoutActions
                          dealId={deal.id}
                          milestoneId={milestone.id}
                          milestoneState={milestone.state}
                          payoutState={
                            payouts.get(milestone.id)?.state ?? "NOT_FUNDED"
                          }
                          role={deal.viewerRole}
                        />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}
          {tab === "sales" ? (
            <SalesReportPanel deal={deal} reports={reports} />
          ) : null}
        </section>
      </div>
    </main>
  );
}
