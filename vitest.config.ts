import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      // Trust core (domain layer) carries the 80%+ mandate from CLAUDE.md.
      include: ["src/domain/**"],
    },
  },
});
