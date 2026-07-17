import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import {
  SalesReportAlreadyExistsError,
  SalesReportInputSchema,
  SalesReportNotFoundError,
  SalesReportRoleError,
  submitSalesReport,
} from "@/lib/db/sales-reports";

const ParamsSchema = z.object({ dealId: z.string().uuid() });

export async function POST(
  request: Request,
  context: { readonly params: Promise<{ dealId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before submitting a sales report." },
      { status: 401 },
    );

  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Submit a valid JSON sales report." },
      { status: 400 },
    );
  }
  const body = SalesReportInputSchema.safeParse(rawBody);
  if (!body.success)
    return NextResponse.json(
      {
        ok: false,
        message: "Period end, units, and revenue must be valid whole values.",
      },
      { status: 400 },
    );

  try {
    const report = await submitSalesReport(
      getDatabase(),
      params.data.dealId,
      userId,
      body.data,
    );
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    if (error instanceof SalesReportNotFoundError)
      return new NextResponse(null, { status: 404 });
    if (error instanceof SalesReportRoleError)
      return NextResponse.json(
        { ok: false, message: "Only the brand party can submit a report." },
        { status: 403 },
      );
    if (error instanceof SalesReportAlreadyExistsError)
      return NextResponse.json(
        { ok: false, message: "A report already exists for this period." },
        { status: 409 },
      );
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: "Sales report storage is not configured." },
        { status: 503 },
      );
    throw error;
  }
}
