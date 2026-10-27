import { isPostgresPersistenceEnabled } from "@/config/studio-durable-persistence-v1";

/**
 * Vercel serverless has a read-only filesystem — auth must use Postgres on hosted Preview/Production.
 */
export function requirePostgresPersistenceOnHostedRuntime(context: string): void {
  const hosted =
    process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "production";
  if (!hosted) return;
  if (isPostgresPersistenceEnabled()) return;
  throw new Error(
    `${context}: hosted runtime requires STUDIO_PERSISTENCE_BACKEND=postgres and DATABASE_URL.`,
  );
}
