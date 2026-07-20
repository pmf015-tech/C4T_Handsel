import { readFileSync } from "node:fs";
import path from "node:path";

export const CREATOR_EMAIL = "handsel.e2e.creator+clerk_test@example.com";
export const BRAND_EMAIL = "handsel.e2e.brand+clerk_test@example.com";

/**
 * Playwright runs outside Next.js, so .env.local is not auto-loaded. Existing
 * process env always wins (CI provides real env; nothing is overwritten).
 */
export function loadEnvLocal(): void {
  let raw = "";
  try {
    raw = readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (match?.[1] && match[2] !== undefined && !process.env[match[1]])
      process.env[match[1]] = match[2];
  }
}

/** The full-journey spec needs auth + money + db; skip cleanly otherwise. */
export function criticalPathEnvReady(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY &&
    process.env.STRIPE_SECRET_KEY &&
    process.env.DATABASE_URL &&
    process.env.CRON_SECRET,
  );
}

async function clerkApi(
  pathname: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(`https://api.clerk.com/v1${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok)
    throw new Error(
      `Clerk API ${pathname} failed: ${response.status} ${await response.text()}`,
    );
  return response.json();
}

/**
 * Idempotently ensure a +clerk_test user exists in the dev instance. Test
 * emails sign in with the fixed dev verification code — no real credentials
 * are created or handled here.
 */
export async function ensureClerkTestUser(email: string): Promise<string> {
  const found = (await clerkApi(
    `/users?email_address=${encodeURIComponent(email)}`,
  )) as readonly { id: string }[];
  if (Array.isArray(found) && found[0]) return found[0].id;
  const created = (await clerkApi("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      username: email.split("@")[0]?.replace(/[^a-z0-9]/gi, "_"),
      skip_password_requirement: true,
    }),
  })) as { id: string };
  return created.id;
}
