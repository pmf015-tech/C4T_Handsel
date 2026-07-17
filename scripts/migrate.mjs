import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new TypeError("DATABASE_URL is required to run migrations");
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const migrationsDirectory = path.resolve(process.cwd(), "db/migrations");

await sql`
  create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`;

const files = (await readdir(migrationsDirectory))
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort();

for (const file of files) {
  const applied = await sql`
    select name
    from schema_migrations
    where name = ${file}
  `;
  if (applied.length > 0) continue;

  const migration = await readFile(
    path.join(migrationsDirectory, file),
    "utf8",
  );
  await sql.begin(async (transaction) => {
    await transaction.unsafe(migration);
    await transaction`
      insert into schema_migrations (name)
      values (${file})
    `;
  });
  process.stdout.write(`applied ${file}\n`);
}

await sql.end();
