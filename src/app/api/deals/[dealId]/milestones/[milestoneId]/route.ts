import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  InvalidMilestoneTransitionError,
  MilestoneRoleError,
} from "@/domain/milestone/milestone";
import { DatabaseConfigurationError, getDatabase } from "@/lib/db/client";
import {
  MilestoneNotFoundError,
  markMilestoneApproved,
  markMilestoneDelivered,
  markMilestoneRejected,
} from "@/lib/db/milestones";

const ParamsSchema = z.object({
  dealId: z.string().uuid(),
  milestoneId: z.string().uuid(),
});
const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deliver") }),
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().trim().min(2).max(500),
  }),
]);

export async function POST(
  request: Request,
  context: {
    readonly params: Promise<{ dealId: string; milestoneId: string }>;
  },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json(
      { ok: false, message: "Sign in before updating a milestone." },
      { status: 401 },
    );
  const params = ParamsSchema.safeParse(await context.params);
  if (!params.success) return new NextResponse(null, { status: 404 });
  const body = BodySchema.safeParse(await request.json());
  if (!body.success)
    return NextResponse.json(
      { ok: false, message: "Choose a valid milestone action." },
      { status: 400 },
    );
  try {
    const milestone =
      body.data.action === "deliver"
        ? await markMilestoneDelivered(
            getDatabase(),
            params.data.dealId,
            params.data.milestoneId,
            userId,
          )
        : body.data.action === "approve"
          ? await markMilestoneApproved(
              getDatabase(),
              params.data.dealId,
              params.data.milestoneId,
              userId,
            )
          : await markMilestoneRejected(
              getDatabase(),
              params.data.dealId,
              params.data.milestoneId,
              userId,
              body.data.reason,
            );
    return NextResponse.json({ ok: true, milestone });
  } catch (error) {
    // Non-party and unknown milestone collapse to the same 404: an attacker
    // must not learn that a milestone exists on a deal they cannot see.
    if (error instanceof MilestoneNotFoundError)
      return new NextResponse(null, { status: 404 });
    if (error instanceof MilestoneRoleError)
      return NextResponse.json(
        { ok: false, message: "Your role cannot take this action." },
        { status: 403 },
      );
    if (error instanceof InvalidMilestoneTransitionError)
      return NextResponse.json(
        { ok: false, message: "This milestone is not in a state for that." },
        { status: 409 },
      );
    if (error instanceof DatabaseConfigurationError)
      return NextResponse.json(
        { ok: false, message: "Milestone storage is not configured." },
        { status: 503 },
      );
    throw error;
  }
}
