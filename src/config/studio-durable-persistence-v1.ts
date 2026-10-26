/**
 * STUDIO-DURABLE-PERSISTENCE-IMPLEMENT-1 — local foundation (not production-deployed).
 * Default: filesystem under data/. Postgres when explicitly enabled + DATABASE_URL set.
 */

export const STUDIO_DURABLE_PERSISTENCE_PACKAGE_ID =
  "STUDIO-DURABLE-PERSISTENCE-IMPLEMENT-1" as const;

export type StudioPersistenceBackend = "filesystem" | "postgres";

export function resolveStudioPersistenceBackend(
  source: Record<string, string | undefined> = process.env,
): StudioPersistenceBackend {
  const raw = source.STUDIO_PERSISTENCE_BACKEND?.trim().toLowerCase();
  if (raw === "postgres") return "postgres";
  return "filesystem";
}

export function resolveStudioDatabaseUrl(
  source: Record<string, string | undefined> = process.env,
): string | undefined {
  const url =
    source.STUDIO_DATABASE_URL?.trim() ||
    source.DATABASE_URL?.trim() ||
    source.SUPABASE_DB_URL?.trim();
  return url || undefined;
}

export function isPostgresPersistenceEnabled(
  source: Record<string, string | undefined> = process.env,
): boolean {
  return (
    resolveStudioPersistenceBackend(source) === "postgres" &&
    Boolean(resolveStudioDatabaseUrl(source))
  );
}
