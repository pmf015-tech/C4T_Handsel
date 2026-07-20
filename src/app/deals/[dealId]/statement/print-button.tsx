"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} type="button">
      Print / download PDF · 列印 / 下載 PDF
    </button>
  );
}
