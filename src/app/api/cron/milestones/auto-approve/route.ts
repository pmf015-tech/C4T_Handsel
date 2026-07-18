import { NextResponse } from "next/server";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { runAutoApproveSweep } from "@/lib/db/milestones";

/**
 * Vercel Cron sends the configured CRON_SECRET as a bearer token; this is the
 * only auth on this route, so a missing/misconfigured secret must fail
 * closed rather than let the sweep run unauthenticated.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret)
    return NextResponse.json(
      { ok: false, message: "Auto-approve sweep is not configured." },
      { status: 503 },
    );
  const providedSecret = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (providedSecret !== expectedSecret)
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 },
    );
  try {
    const approved = await runAutoApproveSweep(getDatabase());
    return NextResponse.json({ ok: true, approvedCount: approved.length });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: "Milestone storage is not configured." },
        { status: 503 },
      );
    throw error;
  }
}
