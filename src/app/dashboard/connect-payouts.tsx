"use client";

import { api as ky } from "@/lib/http/client";
import { useEffect, useState } from "react";

type ConnectStatus = "LOADING" | "NONE" | "PENDING" | "COMPLETE" | "ERROR";

/**
 * Creator-side Stripe Connect Express onboarding entry point (spec E4).
 * Shown on the dashboard; polls status once on mount so returning from the
 * Stripe-hosted flow reflects immediately.
 */
export function ConnectPayouts() {
  const [status, setStatus] = useState<ConnectStatus>("LOADING");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ky.get("/api/stripe/connect")
      .json<{ readonly status: "NONE" | "PENDING" | "COMPLETE" }>()
      .then((response) => {
        if (!cancelled) setStatus(response.status);
      })
      .catch(() => {
        if (!cancelled) setStatus("ERROR");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function begin(): Promise<void> {
    setBusy(true);
    try {
      const response = await ky
        .post("/api/stripe/connect")
        .json<{ readonly url: string }>();
      window.location.assign(response.url);
    } catch {
      setStatus("ERROR");
      setBusy(false);
    }
  }

  if (status === "LOADING") return null;
  if (status === "COMPLETE")
    return <p role="status">Payouts connected ✓ / 收款帳戶已連接 ✓</p>;
  return (
    <div>
      {status === "ERROR" ? (
        <p role="status">
          Payout setup is unavailable right now. / 收款設定暫時未可用。
        </p>
      ) : null}
      <button disabled={busy} onClick={begin} type="button">
        {busy
          ? "Working… / 處理中…"
          : status === "PENDING"
            ? "Resume payout setup / 繼續收款設定"
            : "Connect payouts / 設定收款帳戶"}
      </button>
    </div>
  );
}
