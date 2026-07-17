import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import { findProfileByClerkUserId } from "@/lib/db/profiles";
import { DealBuilderForm } from "./deal-builder-form";

export default async function NewDealPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/deals/new");
  const profile = await findProfileByClerkUserId(getDatabase(), userId);
  if (!profile) redirect("/onboarding");
  return <DealBuilderForm />;
}
