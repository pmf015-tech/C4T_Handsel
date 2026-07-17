import type { DealEvent } from "@/lib/db/events";
import { ACTIVITY_COPY } from "@/lib/i18n/deals";
import styles from "./deal-detail.module.css";

function eventCopy(eventType: string): { en: string; zhHant: string } {
  return (
    ACTIVITY_COPY[eventType as keyof typeof ACTIVITY_COPY] ??
    ACTIVITY_COPY.UNKNOWN
  );
}

function actorLabel(event: DealEvent): string {
  if (event.actorRole === "creator") return "Creator / 創作者";
  if (event.actorRole === "brand") return "Brand / 品牌";
  return "System / 系統";
}

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function ActivityTimeline({
  events,
}: Readonly<{ events: readonly DealEvent[] }>) {
  return (
    <section className={styles.events} aria-labelledby="activity-heading">
      <div className={styles.sectionHeadingRow}>
        <div>
          <span className={styles.eyebrow}>AUDIT TRAIL / 稽核紀錄</span>
          <h2 id="activity-heading">Activity timeline / 活動時間軸</h2>
        </div>
        <span className={styles.eventCount}>{events.length} events</span>
      </div>
      {events.length === 0 ? (
        <p className={styles.emptyState}>{ACTIVITY_COPY.EMPTY.en}</p>
      ) : (
        <ol className={styles.timeline}>
          {events.map((event) => {
            const copy = eventCopy(event.eventType);
            return (
              <li className={styles.timelineItem} key={event.id}>
                <span className={styles.timelineDot} aria-hidden="true">
                  ✓
                </span>
                <div className={styles.timelineBody}>
                  <strong>{copy.en}</strong>
                  <span>{copy.zhHant}</span>
                  <small>
                    {actorLabel(event)} · {formatEventDate(event.createdAt)}
                  </small>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
