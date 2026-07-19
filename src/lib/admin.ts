/**
 * E7 admin gating. Admins are the ops allowlist in ADMIN_CLERK_USER_IDS
 * (comma-separated Clerk user ids) — no self-serve admin role, no DB flag,
 * so a compromised app account cannot escalate itself.
 */
export function isAdmin(clerkUserId: string | null): boolean {
  if (!clerkUserId) return false;
  const allowlist = process.env.ADMIN_CLERK_USER_IDS;
  if (!allowlist) return false;
  return allowlist
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(clerkUserId);
}
