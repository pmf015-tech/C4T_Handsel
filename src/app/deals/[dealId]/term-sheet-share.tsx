"use client";

import { api as ky } from "@/lib/http/client";
import { useState } from "react";

import styles from "../deals.module.css";

type TermSheetShareProps = {
  readonly dealId: string;
};

export function TermSheetShare({ dealId }: TermSheetShareProps) {
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate(): Promise<void> {
    setError(null);
    setLoading(true);
    try {
      const result = (await ky
        .post(`/api/deals/${dealId}/term-sheet`)
        .json()) as {
        ok: boolean;
        termSheet?: { sharePath: string };
        message?: string;
      };
      if (!result.ok || !result.termSheet) {
        setError(result.message ?? "Could not generate a term sheet.");
        return;
      }
      setSharePath(result.termSheet.sharePath);
    } catch {
      setError("Could not generate a term sheet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.events}>
      <h2>Term sheet / 條款書</h2>
      <p>Generate a locked, 14-day share link for your counterparty.</p>
      <button
        className={styles.submit}
        disabled={loading}
        onClick={generate}
        type="button"
      >
        {loading ? "Generating…" : "Generate shareable term sheet"}
      </button>
      {sharePath ? (
        <p className={styles.notice}>
          Ready / 已準備：<a href={sharePath}>{sharePath}</a>
        </p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
