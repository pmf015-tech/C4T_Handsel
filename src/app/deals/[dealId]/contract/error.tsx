"use client";

export default function ContractError({
  reset,
}: Readonly<{ readonly reset: () => void }>) {
  return (
    <main
      style={{ minHeight: "100vh", padding: "48px", background: "#f7faff" }}
    >
      <h1>Contract unavailable / 合約暫時未能載入</h1>
      <p>
        Retry to reload the latest immutable version. /
        請重試載入最新不可變版本。
      </p>
      <button onClick={reset} type="button">
        Retry / 再試
      </button>
    </main>
  );
}
