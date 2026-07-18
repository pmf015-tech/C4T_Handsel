import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const layoutPath = fileURLToPath(new URL("./layout.tsx", import.meta.url));

describe("RootLayout", () => {
  it("suppresses hydration warnings for browser extension attributes on html", () => {
    return expect(readFile(layoutPath, "utf8")).resolves.toContain(
      '<html lang="en" suppressHydrationWarning>',
    );
  });

  it("mounts ClerkProvider inside the body for the current Clerk SDK", async () => {
    const source = await readFile(layoutPath, "utf8");
    const bodyIndex = source.indexOf("<body>");
    const providerIndex = source.indexOf("<ClerkProvider>");

    expect(bodyIndex).toBeGreaterThan(-1);
    expect(providerIndex).toBeGreaterThan(bodyIndex);
  });
});
