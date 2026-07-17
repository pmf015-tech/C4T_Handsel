import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getDatabase } from "@/lib/db/client";
import { findProfileByClerkUserId } from "@/lib/db/profiles";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard");

  const profile = await findProfileByClerkUserId(getDatabase(), userId);
  if (!profile) redirect("/onboarding");

  return (
    <main
      style={{ minHeight: "100vh", padding: "48px", background: "#f5f8ff" }}
    >
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Handsel 信約</strong>
        <UserButton />
      </header>
      <section style={{ maxWidth: "900px", margin: "80px auto" }}>
        <p>WORKSPACE</p>
        <h1>Welcome, {profile.displayName}</h1>
        <p>Your verified profile is ready. Start your first deal.</p>
        <a href="/deals/new">Start a deal</a>
      </section>
    </main>
  );
}
