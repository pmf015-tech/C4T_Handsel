const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const TLS_MODES = new Set(["require", "verify-ca", "verify-full"]);

export class DatabaseConfigurationError extends Error {
  readonly name = "DatabaseConfigurationError";

  constructor() {
    super("DATABASE_URL must be a valid PostgreSQL connection string");
  }
}

export function parseDatabaseUrl(
  value: string | undefined,
  environment: string | undefined,
): string {
  if (!value) throw new DatabaseConfigurationError();

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (error) {
    if (error instanceof TypeError) throw new DatabaseConfigurationError();
    throw error;
  }

  if (!POSTGRES_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
    throw new DatabaseConfigurationError();
  }

  const tlsMode = parsed.searchParams.get("sslmode");
  const isRemoteProduction =
    environment === "production" && !LOCAL_DATABASE_HOSTS.has(parsed.hostname);
  if (isRemoteProduction && (!tlsMode || !TLS_MODES.has(tlsMode))) {
    throw new DatabaseConfigurationError();
  }

  return value;
}
