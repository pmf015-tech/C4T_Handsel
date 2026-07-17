import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  ContractInviteNotFoundError,
  ContractInviteRoleConflictError,
  acceptContractInvite,
} from "@/lib/db/contracts";
import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";

export async function POST(
  _request: Request,
  context: { readonly params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before accepting this invite." },
      { status: 401 },
    );
  try {
    const dealId = await acceptContractInvite(
      getDatabase(),
      (await context.params).token,
      userId,
    );
    return NextResponse.json({ ok: true, dealId });
  } catch (error) {
    if (error instanceof ContractInviteNotFoundError)
      return new NextResponse(null, { status: 404 });
    if (error instanceof ContractInviteRoleConflictError)
      return NextResponse.json(
        {
          ok: false,
          message: "This deal already has a different brand party.",
        },
        { status: 409 },
      );
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: "Contract storage is not configured." },
        { status: 503 },
      );
    throw error;
  }
}
