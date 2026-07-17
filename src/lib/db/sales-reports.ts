import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { z } from "zod";

import {
  assessSalesReportTiming,
  shouldOpenLateDispute,
  type SalesReportTiming,
} from "@/domain/sales/lateness";

const MinorUnitsSchema = z.preprocess(
  (value) =>
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().safe().nonnegative(),
);

const SalesReportSchema = z.object({
  id: z.string().uuid(),
  dealId: z.string().uuid(),
  periodEnd: z.coerce.date(),
  units: z.number().int().nonnegative(),
  grossRevenueMinorUnits: MinorUnitsSchema,
  timing: z.enum(["ON_TIME", "LATE"]),
  submittedByClerkUserId: z.string().min(1),
  submittedAt: z.coerce.date(),
});

export const SalesReportInputSchema = z.object({
  periodEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "periodEnd must be a calendar date"),
  units: z.number().int().safe().nonnegative(),
  grossRevenueMinorUnits: z.number().int().safe().nonnegative(),
});

export type SalesReport = Readonly<z.infer<typeof SalesReportSchema>>;
export type SalesReportInput = Readonly<z.infer<typeof SalesReportInputSchema>>;

export class SalesReportNotFoundError extends Error {
  readonly name = "SalesReportNotFoundError";
  constructor() {
    super("Sales report not found for this party.");
  }
}

export class SalesReportRoleError extends Error {
  readonly name = "SalesReportRoleError";
  constructor() {
    super("Only the brand party can submit a sales report.");
  }
}

export class SalesReportAlreadyExistsError extends Error {
  readonly name = "SalesReportAlreadyExistsError";
  constructor() {
    super("A sales report already exists for this period.");
  }
}

function parseCalendarDate(periodEnd: string): Date {
  const date = new Date(`${periodEnd}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid period end date");
  return date;
}

export async function findSalesReportsForParty(
  sql: Sql | TransactionSql,
  dealId: string,
  clerkUserId: string,
): Promise<readonly SalesReport[]> {
  const rows = await sql`
    select
      r.id,
      r.deal_id as "dealId",
      r.period_end as "periodEnd",
      r.units,
      r.gross_revenue_minor_units as "grossRevenueMinorUnits",
      r.timing,
      r.submitted_by_clerk_user_id as "submittedByClerkUserId",
      r.submitted_at as "submittedAt"
    from sales_reports r
    join deal_parties p
      on p.deal_id = r.deal_id
      and p.clerk_user_id = ${clerkUserId}
    where r.deal_id = ${dealId}
    order by r.period_end desc
  `;
  return rows.map((row) => SalesReportSchema.parse(row));
}

type DealReportContext = Readonly<{
  readonly role: "creator" | "brand";
  readonly creatorShareBasisPoints: number;
}>;

async function findDealReportContext(
  sql: Sql | TransactionSql,
  dealId: string,
  clerkUserId: string,
): Promise<DealReportContext | null> {
  const rows = await sql<DealReportContext[]>`
    select
      p.role,
      d.creator_share_basis_points as "creatorShareBasisPoints"
    from deals d
    join deal_parties p
      on p.deal_id = d.id
      and p.clerk_user_id = ${clerkUserId}
    where d.id = ${dealId}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function submitSalesReport(
  sql: Sql,
  dealId: string,
  clerkUserId: string,
  input: SalesReportInput,
  now = new Date(),
): Promise<SalesReport> {
  const periodEnd = parseCalendarDate(input.periodEnd);
  return sql.begin(async (transaction) => {
    const context = await findDealReportContext(
      transaction,
      dealId,
      clerkUserId,
    );
    if (!context) throw new SalesReportNotFoundError();
    if (context.role !== "brand") throw new SalesReportRoleError();

    const existing = await transaction`
      select id from sales_reports
      where deal_id = ${dealId} and period_end = ${input.periodEnd}
      limit 1
    `;
    if (existing.length > 0) throw new SalesReportAlreadyExistsError();

    const timing = assessSalesReportTiming(periodEnd, now, now);
    const reportId = randomUUID();
    const rows = await transaction`
      insert into sales_reports (
        id, deal_id, period_end, units, gross_revenue_minor_units,
        timing, submitted_by_clerk_user_id, submitted_at
      ) values (
        ${reportId}, ${dealId}, ${input.periodEnd}, ${input.units},
        ${input.grossRevenueMinorUnits}, ${timing}, ${clerkUserId}, ${now}
      )
      returning
        id,
        deal_id as "dealId",
        period_end as "periodEnd",
        units,
        gross_revenue_minor_units as "grossRevenueMinorUnits",
        timing,
        submitted_by_clerk_user_id as "submittedByClerkUserId",
        submitted_at as "submittedAt"
    `;
    await transaction`
      insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
      values (
        ${randomUUID()}, ${dealId}, ${"SALES_REPORT_SUBMITTED"}, ${clerkUserId},
        ${transaction.json({
          reportId,
          periodEnd: input.periodEnd,
          units: input.units,
          grossRevenueMinorUnits: input.grossRevenueMinorUnits,
          timing,
          creatorShareBasisPoints: context.creatorShareBasisPoints,
        })}
      )
    `;

    const timings = await transaction<{ timing: SalesReportTiming }[]>`
      select timing
      from sales_reports
      where deal_id = ${dealId}
      order by period_end asc
    `;
    if (shouldOpenLateDispute(timings.map((row) => row.timing))) {
      await transaction`
        insert into deal_events (id, deal_id, event_type, actor_clerk_user_id, payload)
        values (
          ${randomUUID()}, ${dealId}, ${"LATE_DISPUTE_TRIGGERED"}, ${clerkUserId},
          ${transaction.json({
            reportId,
            reason: "TWO_CONSECUTIVE_LATE_REPORTS",
          })}
        )
      `;
    }

    return SalesReportSchema.parse(rows[0]);
  });
}
