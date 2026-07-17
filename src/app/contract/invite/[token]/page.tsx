import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { InviteAccept } from "./invite-accept";

export default async function ContractInvitePage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}) {
  const { userId } = await auth();
  const { token } = await params;
  if (!userId) redirect(`/sign-in?redirect_url=/contract/invite/${token}`);
  return <InviteAccept token={token} />;
}
