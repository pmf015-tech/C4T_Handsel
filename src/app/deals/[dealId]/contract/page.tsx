import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import {
  createContractVersion,
  findContractForParty,
} from "@/lib/db/contracts";
import { CONTRACT_COPY } from "@/lib/i18n/deals";
import { ContractActions } from "./contract-actions";
import styles from "./contract.module.css";

const copy = CONTRACT_COPY.en;

export default async function ContractPage({
  params,
}: {
  readonly params: Promise<{ dealId: string }>;
}) {
  const { userId } = await auth();
  const { dealId } = await params;
  if (!userId) redirect(`/sign-in?redirect_url=/deals/${dealId}/contract`);
  const contract =
    (await findContractForParty(getDatabase(), dealId, userId)) ??
    (await createContractVersion(getDatabase(), dealId, userId));
  if (!contract) notFound();
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <a href={`/deals/${dealId}`}>← Back to deal hub</a>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className={styles.intro}>{copy.body}</p>
        <section className={styles.card}>
          <div className={styles.meta}>
            <div>
              <small>{copy.version}</small>
              <strong>v{contract.version.versionNumber}</strong>
            </div>
            <div>
              <small>{copy.expires}</small>
              <strong>{contract.version.signingExpiresAt.toISOString()}</strong>
            </div>
          </div>
          <p className={styles.hash}>
            <small>{copy.hash}</small>
            <code>{contract.version.contentHash}</code>
          </p>
          <p>{copy.latest}</p>
          <h2>{contract.version.content.title}</h2>
          <p>
            {contract.version.content.counterpartyName} ·{" "}
            {contract.version.content.currency}
          </p>
          <ContractActions
            dealId={dealId}
            userId={userId}
            contract={contract}
          />
        </section>
      </div>
    </main>
  );
}
