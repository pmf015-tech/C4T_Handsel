import { notFound } from "next/navigation";
import { z } from "zod";

import { getDatabase } from "@/lib/db/client";
import {
  findPublicDealsForProfile,
  findPublicProfile,
} from "@/lib/db/public-profiles";
import styles from "../../deals/deal-detail.module.css";

/**
 * E5 public profile — verifiable deal history. Renders ONLY the public
 * projection (src/lib/db/public-profiles.ts); no auth required.
 */
export default async function PublicProfilePage({
  params,
}: {
  readonly params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  if (!z.string().uuid().safeParse(profileId).success) notFound();

  const sql = getDatabase();
  const profile = await findPublicProfile(sql, profileId);
  if (!profile) notFound();
  const deals = await findPublicDealsForProfile(sql, profileId);
  const completed = deals.filter((deal) =>
    ["COMPLETED", "PAYOUT_RELEASED"].includes(deal.state),
  ).length;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header>
          <p className={styles.eyebrow}>
            {profile.role === "creator" ? "CREATOR / 創作者" : "BRAND / 品牌"}
          </p>
          <h1>{profile.displayName}</h1>
          {profile.niche ? <p>{profile.niche}</p> : null}
          {profile.productCategory ? <p>{profile.productCategory}</p> : null}
          <p>
            {deals.length} verifiable deals · {completed} completed /{" "}
            {deals.length} 個可驗證合作 · {completed} 個已完成
          </p>
        </header>
        <section aria-label="Deal history">
          {deals.length === 0 ? (
            <p className={styles.emptyState}>
              No public deals yet. / 暫時未有公開合作紀錄。
            </p>
          ) : (
            deals.map((deal) => (
              <article className={styles.milestoneDetail} key={deal.id}>
                <h2>{deal.title}</h2>
                <p>
                  {deal.counterpartyDisplayName
                    ? `with ${deal.counterpartyDisplayName} · `
                    : ""}
                  {deal.state} · milestones {deal.milestonesApproved}/
                  {deal.milestonesTotal}
                </p>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
