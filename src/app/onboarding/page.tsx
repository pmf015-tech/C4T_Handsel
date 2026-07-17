import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import { findProfileByClerkUserId } from "@/lib/db/profiles";
import { OnboardingForm } from "./onboarding-form";

type OnboardingPageProps = {
  readonly searchParams: Promise<{ readonly role?: string }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams;
  const { userId } = await auth();
  if (!userId) {
    const role = params.role === "brand" ? "brand" : "creator";
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(`/onboarding?role=${role}`)}`,
    );
  }

  const profile = await findProfileByClerkUserId(getDatabase(), userId);
  if (profile) redirect("/dashboard");

  return (
    <OnboardingForm
      defaultRole={params.role === "brand" ? "brand" : "creator"}
    />
  );
}
