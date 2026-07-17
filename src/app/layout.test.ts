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
});
