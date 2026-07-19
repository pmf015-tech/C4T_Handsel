import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { getDatabase } from "@/lib/db/client";
import styles from "../deals/deal-detail.module.css";
import { ResolveButton } from "./resolve-button";

/**
 * E7 admin ops console: failed-money-operation queue + audit log viewer.
 * Allowlist-gated; non-admins get 404 (no existence leak).
 */
export default async function AdminPage() {
  const { userId } = await auth();
  if (!isAdmin(userId ?? null)) notFound();

  const sql = getDatabase();
  const [failed, events] = await Promise.all([
    sql`
      select p.id, p.deal_id as "dealId", p.state, p.failure_class as "failureClass",
        p.amount_minor_units as "amountMinor", p.currency,
        p.funding_attempts as "fundingAttempts", p.release_attempts as "releaseAttempts",
        p.updated_at as "updatedAt", d.title
      from milestone_payouts p
      join deals d on d.id = p.deal_id
      where p.state in ('FUNDING_FAILED', 'RELEASE_FAILED')
      order by p.updated_at desc
      limit 100
    `,
    sql`
      select e.id, e.deal_id as "dealId", e.event_type as "eventType",
        e.actor_clerk_user_id as "actor", e.created_at as "createdAt"
      from deal_events e
      order by e.created_at desc
      limit 50
    `,
  ]);

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <h1>Admin ops / 管理後台</h1>

        <section aria-labelledby="queue-heading">
          <h2 id="queue-heading">
            Failed money operations ({failed.length}) / 失敗金流操作
          </h2>
          {failed.length === 0 ? (
            <p className={styles.emptyState}>Queue is empty. / 隊列清空。</p>
          ) : (
            failed.map((payout) => (
              <article className={styles.milestoneDetail} key={payout.id}>
                <h3>{payout.title}</h3>
                <p>
                  {payout.state} · {payout.failureClass} ·{" "}
                  {payout.currency.toUpperCase()}{" "}
                  {(Number(payout.amountMinor) / 100).toFixed(2)} · attempts f
                  {payout.fundingAttempts}/r{payout.releaseAttempts}
                </p>
                <ResolveButton payoutId={payout.id} />
              </article>
            ))
          )}
        </section>

        <section aria-labelledby="audit-heading">
          <h2 id="audit-heading">Audit log (latest 50) / 審計日誌</h2>
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                {new Date(event.createdAt as string).toISOString()} ·{" "}
                {event.eventType} · {event.actor} · deal{" "}
                {String(event.dealId).slice(0, 8)}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
