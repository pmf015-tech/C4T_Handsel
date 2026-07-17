import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import {
  createContractVersion,
  findContractForParty,
} from "@/lib/db/contracts";
import { findDealEventsForParty } from "@/lib/db/events";
import { CONTRACT_COPY } from "@/lib/i18n/deals";
import { ContractActions } from "./contract-actions";
import { ActivityTimeline } from "../../activity-timeline";
import { ClockChip } from "../../clock-chip";
import styles from "./contract.module.css";

const copy = CONTRACT_COPY.en;
const zhCopy = CONTRACT_COPY["zh-Hant"];

export default async function ContractPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ dealId: string }>;
  readonly searchParams?: Promise<{ lang?: string }>;
}) {
  const { userId } = await auth();
  const { dealId } = await params;
  if (!userId) redirect(`/sign-in?redirect_url=/deals/${dealId}/contract`);
  const contract =
    (await findContractForParty(getDatabase(), dealId, userId)) ??
    (await createContractVersion(getDatabase(), dealId, userId));
  if (!contract) notFound();
  const language = (await searchParams)?.lang === "zh-Hant" ? "zh-Hant" : "en";
  const events = await findDealEventsForParty(getDatabase(), dealId, userId);
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <a href={`/deals/${dealId}`}>← Back to deal hub</a>
        <div className={styles.languageToggle}>
          <span>Language / 語言</span>
          <a href={`/deals/${dealId}/contract?lang=en`}>EN</a>
          <a href={`/deals/${dealId}/contract?lang=zh-Hant`}>中文</a>
        </div>
        <p className={styles.eyebrow}>
          {copy.eyebrow} / {zhCopy.eyebrow}
        </p>
        <h1>
          {copy.title}
          <br />
          <span>{zhCopy.title}</span>
        </h1>
        <p className={styles.intro}>
          {copy.body} / {zhCopy.body}
        </p>
        <section className={styles.card}>
          <div className={styles.meta}>
            <div>
              <small>{copy.version}</small>
              <strong>v{contract.version.versionNumber}</strong>
            </div>
            <div>
              <small>{copy.expires}</small>
              <ClockChip
                deadline={contract.version.signingExpiresAt.toISOString()}
              />
            </div>
          </div>
          <p className={styles.hash}>
            <small>{copy.hash}</small>
            <code>{contract.version.contentHash}</code>
          </p>
          <p>{copy.latest}</p>
          {contract.history.length > 1 ? (
            <section
              className={styles.versionHistory}
              aria-labelledby="version-history-heading"
            >
              <h2 id="version-history-heading">Version history / 版本紀錄</h2>
              {contract.history.map((version) => (
                <div
                  className={styles.versionHistoryRow}
                  key={version.versionNumber}
                >
                  <strong>v{version.versionNumber}</strong>
                  <code>{version.contentHash.slice(0, 16)}…</code>
                  <span>{version.createdAt.toISOString()}</span>
                </div>
              ))}
            </section>
          ) : null}
          <h2>{contract.version.content.title}</h2>
          <p>
            {contract.version.content.counterpartyName} ·{" "}
            {contract.version.content.currency}
          </p>
          <ContractActions
            dealId={dealId}
            userId={userId}
            contract={contract}
            language={language}
          />
        </section>
        <ActivityTimeline events={events} />
      </div>
    </main>
  );
}
