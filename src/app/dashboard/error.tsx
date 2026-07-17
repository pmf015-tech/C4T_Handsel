"use client";

export default function DashboardError({
  reset,
}: Readonly<{ readonly reset: () => void }>) {
  return (
    <main
      style={{ minHeight: "100vh", padding: "48px", background: "#f5f8ff" }}
    >
      <h1>Workspace unavailable / 工作區暫時未能載入</h1>
      <p>
        Try again without losing your saved deals. /
        請重試，已儲存嘅合作唔會遺失。
      </p>
      <button onClick={reset} type="button">
        Retry / 再試
      </button>
    </main>
  );
}
