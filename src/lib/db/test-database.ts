function databaseTarget(databaseUrl: string): string | null {
  try {
    const url = new URL(databaseUrl);
    const databaseName = url.pathname.replace(/^\/+/, "");
    return `${url.protocol}//${url.hostname}:${url.port}/${databaseName}`;
  } catch {
    return null;
  }
}

export function isDedicatedTestDatabase(
  testDatabaseUrl: string,
  applicationDatabaseUrl: string,
): boolean {
  if (!testDatabaseUrl) return false;
  if (!applicationDatabaseUrl) return true;

  const testTarget = databaseTarget(testDatabaseUrl);
  const applicationTarget = databaseTarget(applicationDatabaseUrl);

  if (testTarget === null || applicationTarget === null) return false;
  return testTarget !== applicationTarget;
}
