"use client";

import ky from "ky";
import { useState } from "react";

export function InviteAccept({ token }: { readonly token: string }) {
  const [message, setMessage] = useState(
    "Review this invitation before joining the deal.",
  );
  const [busy, setBusy] = useState(false);
  async function accept(): Promise<void> {
    setBusy(true);
    try {
      const result = await ky
        .post(`/api/contract-invites/${token}/accept`)
        .json<{ readonly dealId: string }>();
      window.location.assign(`/deals/${result.dealId}/contract`);
    } catch {
      setMessage("This invitation is invalid, expired, or already accepted.");
      setBusy(false);
    }
  }
  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: 24 }}>
      <p className="eyebrow">E2 · CONTRACT INVITE</p>
      <h1>Join this deal as the brand party.</h1>
      <p>{message}</p>
      <button disabled={busy} onClick={accept} type="button">
        {busy ? "Joining…" : "Accept invitation"}
      </button>
    </main>
  );
}
