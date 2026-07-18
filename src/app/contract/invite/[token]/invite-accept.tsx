"use client";

import ky, { HTTPError } from "ky";
import { useState } from "react";

import { CONTRACT_INVITE_COPY } from "@/lib/i18n/deals";

export function InviteAccept({ token }: { readonly token: string }) {
  const [message, setMessage] = useState<string>(CONTRACT_INVITE_COPY.review);
  const [busy, setBusy] = useState(false);
  async function accept(): Promise<void> {
    setBusy(true);
    try {
      const result = await ky
        .post(`/api/contract-invites/${token}/accept`)
        .json<{ readonly dealId: string }>();
      window.location.assign(`/deals/${result.dealId}/contract`);
    } catch (error) {
      if (error instanceof HTTPError) {
        setMessage(CONTRACT_INVITE_COPY.failed);
        setBusy(false);
        return;
      }
      throw error;
    }
  }
  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: 24 }}>
      <p className="eyebrow">{CONTRACT_INVITE_COPY.eyebrow}</p>
      <h1>{CONTRACT_INVITE_COPY.title}</h1>
      <p>{message}</p>
      <button disabled={busy} onClick={accept} type="button">
        {busy ? CONTRACT_INVITE_COPY.joining : CONTRACT_INVITE_COPY.accept}
      </button>
    </main>
  );
}
