import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import { findDealForParty } from "@/lib/db/deals";
import { DEAL_COPY } from "@/lib/i18n/deals";
import styles from "../deal-detail.module.css";
import { TermSheetShare } from "./term-sheet-share";

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
}: {
  readonly params: Promise<{ dealId: string }>;
}) {
  const { userId } = await auth();
  if (!userId)
    redirect(`/sign-in?redirect_url=/deals/${(await params).dealId}`);
  const deal = await findDealForParty(
    getDatabase(),
    (await params).dealId,
    userId,
  );
  if (!deal) notFound();
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <a className={styles.back} href="/dashboard">
            ← Back to workspace
          </a>
          <span className={styles.eyebrow}>DRAFT · E1</span>
        </div>
        <section className={styles.card}>
          <span className={styles.eyebrow}>DEAL HUB</span>
          <h1>{deal.title}</h1>
          <p>Counterparty: {deal.counterpartyName}</p>
          <div className={styles.hubGrid}>
            <div className={styles.metric}>
              <small>Currency</small>
              <strong>{deal.currency}</strong>
            </div>
            <div className={styles.metric}>
              <small>Creator share</small>
              <strong>
                {(deal.creatorShareBasisPoints / 100).toFixed(2)}%
              </strong>
            </div>
            <div className={styles.metric}>
              <small>Milestones</small>
              <strong>
                {deal.milestones.length} {copy.milestoneCount}
              </strong>
            </div>
          </div>
          <section className={styles.milestoneSchedule}>
            <h2>{copy.ownerMilestonesHeading}</h2>
            <div className={styles.milestoneList}>
              {deal.milestones.map((milestone) => (
                <article className={styles.milestoneDetail} key={milestone.id}>
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
                  </div>
                </article>
              ))}
            </div>
          </section>
          <div className={styles.events}>
            <h2>Event log</h2>
            <p>✓ Deal draft created · append-only record written</p>
            <p>Next: invite counterparty and generate terms for review.</p>
          </div>
          <a
            className={styles.contractLink}
            href={`/deals/${deal.id}/contract`}
          >
            Create / open contract →
          </a>
          <TermSheetShare dealId={deal.id} />
        </section>
      </div>
    </main>
  );
}
