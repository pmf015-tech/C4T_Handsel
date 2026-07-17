import { describe, expect, it } from "vitest";

import {
  DatabaseConfigurationError,
  parseDatabaseUrl,
} from "./database-config";

describe("Given a database connection string", () => {
  it("then rejects missing and non-Postgres values with a typed error", () => {
    expect(() => parseDatabaseUrl(undefined, "development")).toThrow(
      DatabaseConfigurationError,
    );
    expect(() =>
      parseDatabaseUrl("https://database.example", "development"),
    ).toThrow(DatabaseConfigurationError);
  });

  it("then requires TLS for a remote production database", () => {
    expect(() =>
      parseDatabaseUrl(
        "postgres://user:password@db.example/handsel",
        "production",
      ),
    ).toThrow(DatabaseConfigurationError);
  });

  it("then accepts local development and TLS-protected production URLs", () => {
    expect(
      parseDatabaseUrl(
        "postgres://handsel:handsel@127.0.0.1:54329/handsel_test",
        "development",
      ),
    ).toContain("127.0.0.1");
    expect(
      parseDatabaseUrl(
        "postgresql://user:password@db.example/handsel?sslmode=require",
        "production",
      ),
    ).toContain("sslmode=require");
  });
});
