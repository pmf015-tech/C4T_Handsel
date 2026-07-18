import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { OnboardingInputSchema } from "@/lib/profile/onboarding";
import { findProfileByClerkUserId, saveProfile } from "./profiles";
import { isDedicatedTestDatabase } from "./test-database";

const databaseUrl = process.env.TEST_DATABASE_URL ?? "";
const appDatabaseUrl = process.env.DATABASE_URL ?? "";
const describeWithDatabase =
  isDedicatedTestDatabase(databaseUrl, appDatabaseUrl) &&
  process.env.ALLOW_DESTRUCTIVE_INTEGRATION === "true"
    ? describe
    : describe.skip;
const sql = postgres(
  databaseUrl || "postgres://handsel:handsel@127.0.0.1:54329/handsel_test",
  { max: 1 },
);

describeWithDatabase("Given a migrated profiles table", () => {
  beforeAll(async () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "db/migrations/0001_profiles.sql",
    );
    const migration = await readFile(migrationPath, "utf8");
    await sql.unsafe(migration);
  });

  beforeEach(async () => {
    await sql`delete from profiles`;
  });

  afterAll(async () => {
    await sql.end();
  });

  it("then saves and reads only the authenticated creator profile", async () => {
    const input = OnboardingInputSchema.parse({
      role: "creator",
      displayName: "Kaia Chen",
      niche: "Skincare",
      followerCount: 96_200,
      engagementRateBasisPoints: 425,
      socials: ["https://instagram.com/kaia"],
      preferredLanguage: "zh-Hant",
    });

    await saveProfile(sql, "user_creator_1", input);
    const saved = await findProfileByClerkUserId(sql, "user_creator_1");
    const otherUser = await findProfileByClerkUserId(sql, "user_creator_2");

    expect(saved).toMatchObject({
      clerkUserId: "user_creator_1",
      role: "creator",
      displayName: "Kaia Chen",
      followerCount: 96_200,
      engagementRateBasisPoints: 425,
    });
    expect(otherUser).toBeNull();
  });

  it("then clears creator-only data when the owner switches to brand", async () => {
    const creator = OnboardingInputSchema.parse({
      role: "creator",
      displayName: "Kaia Chen",
      niche: "Skincare",
      followerCount: 96_200,
      engagementRateBasisPoints: 425,
      socials: [],
      preferredLanguage: "en",
    });
    const brand = OnboardingInputSchema.parse({
      role: "brand",
      displayName: "Brightside Brands",
      productCategory: "Skincare",
      website: "https://brightside.example",
      preferredLanguage: "en",
    });

    await saveProfile(sql, "user_switching_role", creator);
    await saveProfile(sql, "user_switching_role", brand);
    const saved = await findProfileByClerkUserId(sql, "user_switching_role");

    expect(saved).toMatchObject({
      role: "brand",
      niche: null,
      followerCount: null,
      engagementRateBasisPoints: null,
      productCategory: "Skincare",
    });
  });
});
