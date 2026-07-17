import "server-only";

import postgres, { type Sql } from "postgres";
import {
  DatabaseConfigurationError,
  parseDatabaseUrl,
} from "./database-config";

export { DatabaseConfigurationError } from "./database-config";

let database: Sql | undefined;

export function getDatabase(): Sql {
  if (database) return database;

  const databaseUrl = parseDatabaseUrl(
    process.env.DATABASE_URL,
    process.env.NODE_ENV,
  );

  database = postgres(databaseUrl, {
    idle_timeout: 20,
    max: 5,
    prepare: false,
  });
  return database;
}
