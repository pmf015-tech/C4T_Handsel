"use client";

import { useEffect, useState } from "react";

import styles from "./deal-detail.module.css";

function remainingLabel(deadline: number, now: number): string {
  const distance = deadline - now;
  if (distance <= 0) return "Expired / 已過期";
  const totalHours = Math.ceil(distance / (60 * 60 * 1000));
  if (totalHours < 24) return `${totalHours}h left / 剩餘 ${totalHours} 小時`;
  const days = Math.ceil(totalHours / 24);
  return `${days}d left / 剩餘 ${days} 日`;
}

export function ClockChip({
  deadline,
}: Readonly<{ readonly deadline: string }>) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const deadlineMs = new Date(deadline).getTime();
  const expired = now !== null && deadlineMs <= now;
  const urgent = now !== null && deadlineMs - now <= 24 * 60 * 60 * 1000;
  return (
    <span
      className={`${styles.clockChip} ${expired || urgent ? styles.clockChipUrgent : ""}`}
      title={`Deadline / 截止：${deadline}`}
    >
      {now === null
        ? "Calculating… / 計算緊…"
        : remainingLabel(deadlineMs, now)}
    </span>
  );
}
