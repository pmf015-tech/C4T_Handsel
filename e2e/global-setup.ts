import { clerkSetup } from "@clerk/testing/playwright";

import {
  BRAND_EMAIL,
  CREATOR_EMAIL,
  criticalPathEnvReady,
  ensureClerkTestUser,
  loadEnvLocal,
} from "./support";

export default async function globalSetup(): Promise<void> {
  loadEnvLocal();
  // Smoke tests (landing page) run without secrets; the critical-path spec
  // skips itself when the env is not ready, so setup must not hard-fail here.
  if (!criticalPathEnvReady()) return;
  await clerkSetup();
  await Promise.all([
    ensureClerkTestUser(CREATOR_EMAIL),
    ensureClerkTestUser(BRAND_EMAIL),
  ]);
}
