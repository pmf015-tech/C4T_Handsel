import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import { StripeConfigurationError } from "@/lib/stripe/client";
import {
  beginExpressOnboarding,
  findConnectAccount,
  syncConnectAccountStatus,
} from "@/lib/stripe/connect";

function appOrigin(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

/** Creator begins (or resumes) Stripe Connect Express onboarding. */
export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before connecting payouts." },
      { status: 401 },
    );
  try {
    const origin = appOrigin(request);
    const { url } = await beginExpressOnboarding(
      getDatabase(),
      userId,
      `${origin}/dashboard?connect=return`,
      `${origin}/dashboard?connect=refresh`,
    );
    return NextResponse.json({ ok: true, url });
  } catch (error: unknown) {
    if (
      error instanceof DatabaseConfigurationError ||
      error instanceof StripeConfigurationError
    )
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 503 },
      );
    throw error;
  }
}

/** Poll/refresh the caller's Connect onboarding status. */
export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in first." },
      { status: 401 },
    );
  try {
    const sql = getDatabase();
    const account = await findConnectAccount(sql, userId);
    if (!account) return NextResponse.json({ ok: true, status: "NONE" });
    const complete = await syncConnectAccountStatus(
      sql,
      account.stripeAccountId,
    );
    return NextResponse.json({
      ok: true,
      status: complete ? "COMPLETE" : "PENDING",
    });
  } catch (error: unknown) {
    if (
      error instanceof DatabaseConfigurationError ||
      error instanceof StripeConfigurationError
    )
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 503 },
      );
    throw error;
  }
}
