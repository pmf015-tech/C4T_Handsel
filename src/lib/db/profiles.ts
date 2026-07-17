import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { z } from "zod";

import type { OnboardingInput } from "@/lib/profile/onboarding";

const ProfileSchema = z.object({
  id: z.string().uuid(),
  clerkUserId: z.string().min(1),
  role: z.union([z.literal("creator"), z.literal("brand")]),
  displayName: z.string(),
  preferredLanguage: z.union([z.literal("en"), z.literal("zh-Hant")]),
  niche: z.string().nullable(),
  followerCount: z.number().int().nullable(),
  engagementRateBasisPoints: z.number().int().nullable(),
  socials: z.array(z.string()),
  productCategory: z.string().nullable(),
  website: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Profile = Readonly<z.infer<typeof ProfileSchema>>;

type ProfileColumns = {
  readonly niche: string | null;
  readonly followerCount: number | null;
  readonly engagementRateBasisPoints: number | null;
  readonly socials: readonly string[];
  readonly productCategory: string | null;
  readonly website: string | null;
};

class InvalidProfileRoleError extends Error {
  readonly name = "InvalidProfileRoleError";

  constructor() {
    super("Profile role is outside the supported domain");
  }
}

function assertNever(_value: never): never {
  throw new InvalidProfileRoleError();
}

function profileColumns(input: OnboardingInput): ProfileColumns {
  switch (input.role) {
    case "creator":
      return {
        niche: input.niche,
        followerCount: input.followerCount,
        engagementRateBasisPoints: input.engagementRateBasisPoints,
        socials: input.socials,
        productCategory: null,
        website: null,
      };
    case "brand":
      return {
        niche: null,
        followerCount: null,
        engagementRateBasisPoints: null,
        socials: [],
        productCategory: input.productCategory,
        website: input.website,
      };
    default:
      return assertNever(input);
  }
}

function parseProfile(row: unknown): Profile {
  return ProfileSchema.parse(row);
}

export async function saveProfile(
  sql: Sql,
  clerkUserId: string,
  input: OnboardingInput,
): Promise<Profile> {
  const columns = profileColumns(input);
  const rows = await sql`
    insert into profiles (
      id,
      clerk_user_id,
      role,
      display_name,
      preferred_language,
      niche,
      follower_count,
      engagement_rate_basis_points,
      socials,
      product_category,
      website
    ) values (
      ${randomUUID()},
      ${clerkUserId},
      ${input.role},
      ${input.displayName},
      ${input.preferredLanguage},
      ${columns.niche},
      ${columns.followerCount},
      ${columns.engagementRateBasisPoints},
      ${sql.json(columns.socials)},
      ${columns.productCategory},
      ${columns.website}
    )
    on conflict (clerk_user_id) do update set
      role = excluded.role,
      display_name = excluded.display_name,
      preferred_language = excluded.preferred_language,
      niche = excluded.niche,
      follower_count = excluded.follower_count,
      engagement_rate_basis_points = excluded.engagement_rate_basis_points,
      socials = excluded.socials,
      product_category = excluded.product_category,
      website = excluded.website,
      updated_at = now()
    returning
      id,
      clerk_user_id as "clerkUserId",
      role,
      display_name as "displayName",
      preferred_language as "preferredLanguage",
      niche,
      follower_count as "followerCount",
      engagement_rate_basis_points as "engagementRateBasisPoints",
      socials,
      product_category as "productCategory",
      website,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return parseProfile(rows[0]);
}

export async function findProfileByClerkUserId(
  sql: Sql,
  clerkUserId: string,
): Promise<Profile | null> {
  const rows = await sql`
    select
      id,
      clerk_user_id as "clerkUserId",
      role,
      display_name as "displayName",
      preferred_language as "preferredLanguage",
      niche,
      follower_count as "followerCount",
      engagement_rate_basis_points as "engagementRateBasisPoints",
      socials,
      product_category as "productCategory",
      website,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from profiles
    where clerk_user_id = ${clerkUserId}
    limit 1
  `;

  const row = rows[0];
  return row ? parseProfile(row) : null;
}
