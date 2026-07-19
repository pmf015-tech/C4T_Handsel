"use client";

import ky from "ky";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResolveButton({ payoutId }: { readonly payoutId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function resolve(): Promise<void> {
    setBusy(true);
    setFailed(false);
    try {
      await ky.post(`/api/admin/payouts/${payoutId}`, {
        json: { action: "resolve" },
      });
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button disabled={busy} onClick={resolve} type="button">
        {busy ? "Resolving…" : "Mark resolved / 標記已處理"}
      </button>
      {failed ? (
        <span role="status"> Failed — retry. / 失敗,請重試。</span>
      ) : null}
    </span>
  );
}
