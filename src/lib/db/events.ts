import type { Sql, TransactionSql } from "postgres";
import { z } from "zod";

const DealEventSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string().min(1),
  actorClerkUserId: z.string().min(1),
  actorRole: z.enum(["creator", "brand"]).nullable(),
  payload: z.record(z.unknown()),
  createdAt: z.coerce.date(),
});

export type DealEvent = Readonly<z.infer<typeof DealEventSchema>>;

/**
 * Private audit-log read. The viewer party join intentionally stays in SQL so
 * a caller cannot learn that a private deal exists by probing its event log.
 */
export async function findDealEventsForParty(
  sql: Sql | TransactionSql,
  dealId: string,
  clerkUserId: string,
): Promise<readonly DealEvent[]> {
  const rows = await sql`
    select
      e.id,
      e.event_type as "eventType",
      e.actor_clerk_user_id as "actorClerkUserId",
      actor.role as "actorRole",
      e.payload,
      e.created_at as "createdAt"
    from deal_events e
    join deal_parties viewer
      on viewer.deal_id = e.deal_id
      and viewer.clerk_user_id = ${clerkUserId}
    left join deal_parties actor
      on actor.deal_id = e.deal_id
      and actor.clerk_user_id = e.actor_clerk_user_id
    where e.deal_id = ${dealId}
    order by e.created_at asc, e.id asc
  `;
  return rows.map((row) => DealEventSchema.parse(row));
}
