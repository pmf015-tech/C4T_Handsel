"use client";

import { useEffect, useRef } from "react";

interface CountUpProps {
  to: number;
  from?: number;
  direction?: "up" | "down";
  delay?: number;
  duration?: number;
  className?: string;
  startWhen?: boolean;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

const getDecimalPlaces = (num: number): number => {
  const decimals = num.toString().split(".")[1];
  return decimals && parseInt(decimals) !== 0 ? decimals.length : 0;
};

export default function CountUp({
  to,
  from = 0,
  direction = "up",
  delay = 0,
  duration = 2,
  className = "",
  startWhen = true,
  separator = "",
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const start = direction === "down" ? to : from;
    const end = direction === "down" ? from : to;
    const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

    const format = (value: number) => {
      const formatted = Intl.NumberFormat("en-US", {
        useGrouping: !!separator,
        minimumFractionDigits: maxDecimals,
        maximumFractionDigits: maxDecimals,
      }).format(value);
      return separator ? formatted.replace(/,/g, separator) : formatted;
    };

    el.textContent = format(start);
    if (!startWhen) return;

    let raf = 0;
    let timeoutId = 0;
    let started = false;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || started) return;
      started = true;
      observer.disconnect();
      onStart?.();
      timeoutId = window.setTimeout(() => {
        const t0 = performance.now();
        const totalMs = duration * 1000;
        const tick = (now: number) => {
          const progress = totalMs <= 0 ? 1 : Math.min((now - t0) / totalMs, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = format(start + (end - start) * eased);
          if (progress < 1) {
            raf = requestAnimationFrame(tick);
          } else {
            onEnd?.();
          }
        };
        raf = requestAnimationFrame(tick);
      }, delay * 1000);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(timeoutId);
    };
  }, [
    to,
    from,
    direction,
    delay,
    duration,
    startWhen,
    separator,
    onStart,
    onEnd,
  ]);

  return <span className={className} ref={ref} />;
}
