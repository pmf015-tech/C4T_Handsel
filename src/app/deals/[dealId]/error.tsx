"use client";

export default function DealError({
  reset,
}: Readonly<{ readonly reset: () => void }>) {
  return (
    <main
      style={{ minHeight: "100vh", padding: "48px", background: "#f7faff" }}
    >
      <h1>Deal hub unavailable / 合作控制台暫時未能載入</h1>
      <p>
        Retry to reload the party-scoped deal activity. /
        請重試載入你有權限查看嘅合作活動。
      </p>
      <button onClick={reset} type="button">
        Retry / 再試
      </button>
    </main>
  );
}
