import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import { listDealsForUser } from "@/lib/db/deals";
import { findProfileByClerkUserId } from "@/lib/db/profiles";
import { ClockChip } from "../deals/clock-chip";
import { ConnectPayouts } from "./connect-payouts";
import { getNextDealAction } from "../deals/next-action";
import { StateBadge } from "../deals/state-badge";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard");

  const profile = await findProfileByClerkUserId(getDatabase(), userId);
  if (!profile) redirect("/onboarding");
  const deals = await listDealsForUser(getDatabase(), userId);
  const actionItems = deals
    .map((deal) => ({ deal, action: getNextDealAction(deal) }))
    .filter(({ action }) => action.actor === "You / 你");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <strong>Handsel 信約</strong>
        <UserButton />
      </header>
      <section className={styles.shell}>
        <div className={styles.heroRow}>
          <div>
            <p className={styles.eyebrow}>WORKSPACE / 工作區</p>
            <h1>Welcome, {profile.displayName}</h1>
            <p>Your verified profile is ready. Keep every deal accountable.</p>
          </div>
          <a className={styles.primaryButton} href="/deals/new">
            Start a deal / 開始合作
          </a>
        </div>
        <ConnectPayouts />
        <section
          className={styles.actionPanel}
          aria-labelledby="actions-heading"
        >
          <div className={styles.sectionTitle}>
            <div>
              <span className={styles.eyebrow}>NEXT UP / 下一步</span>
              <h2 id="actions-heading">Action required / 需要你處理</h2>
            </div>
            <strong>{actionItems.length}</strong>
          </div>
          {actionItems.length === 0 ? (
            <p className={styles.emptyState}>
              No urgent actions. Invite a partner to start a deal. /
              暫時冇需要你處理嘅事項，可以邀請夥伴開始合作。
            </p>
          ) : (
            <div className={styles.actionList}>
              {actionItems.map(({ deal, action }) => (
                <article className={styles.actionItem} key={deal.id}>
                  <div>
                    <strong>{action.label}</strong>
                    <span>
                      {deal.title} · {deal.counterpartyName}
                    </span>
                  </div>
                  {action.deadline ? (
                    <ClockChip deadline={action.deadline} />
                  ) : null}
                  <a href={action.href}>Open →</a>
                </article>
              ))}
            </div>
          )}
        </section>
        <section
          className={styles.dealsSection}
          aria-labelledby="deals-heading"
        >
          <div className={styles.sectionTitle}>
            <div>
              <span className={styles.eyebrow}>DEALS / 合作</span>
              <h2 id="deals-heading">Active deals / 進行中合作</h2>
            </div>
            <strong>{deals.length}</strong>
          </div>
          {deals.length === 0 ? (
            <div className={styles.emptyCard}>
              <h3>No deals yet / 暫時未有合作</h3>
              <p>
                Create your first structured deal, then invite the other party
                to review and sign.
              </p>
              <a className={styles.secondaryButton} href="/deals/new">
                Create first deal →
              </a>
            </div>
          ) : (
            <div className={styles.dealGrid}>
              {deals.map((deal) => {
                const action = getNextDealAction(deal);
                return (
                  <article className={styles.dealCard} key={deal.id}>
                    <div className={styles.cardTopline}>
                      <StateBadge value={deal.state} />
                      <small>
                        {deal.viewerRole} /{" "}
                        {deal.viewerRole === "creator" ? "創作者" : "品牌"}
                      </small>
                    </div>
                    <h3>{deal.title}</h3>
                    <p>
                      {deal.counterpartyName} · {deal.currency}
                    </p>
                    <div className={styles.cardAction}>
                      <span>{action.label}</span>
                      {action.deadline ? (
                        <ClockChip deadline={action.deadline} />
                      ) : null}
                    </div>
                    <a className={styles.cardLink} href={`/deals/${deal.id}`}>
                      Open deal →
                    </a>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
