import { Pool, type PoolClient, type QueryResultRow } from "pg";

import {
  isPostgresPersistenceEnabled,
  resolveStudioDatabaseUrl,
} from "@/config/studio-durable-persistence-v1";

let pool: Pool | null = null;

/** Integration tests only — drop pool so the next query opens a fresh connection. */
export async function resetStudioPostgresPoolForTests(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export function getStudioPostgresPool(): Pool {
  if (!isPostgresPersistenceEnabled()) {
    throw new Error(
      "Postgres persistence is not enabled. Set STUDIO_PERSISTENCE_BACKEND=postgres and DATABASE_URL.",
    );
  }
  if (!pool) {
    const connectionString = resolveStudioDatabaseUrl();
    if (!connectionString) {
      throw new Error("DATABASE_URL (or STUDIO_DATABASE_URL) is required for Postgres persistence.");
    }
    pool = new Pool({
      connectionString,
      max: 5,
      ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/** Per-campaign transactional lock (matches in-process write lock intent). */
export async function withCampaignPgAdvisoryLock<T>(
  client: PoolClient,
  campaignId: string,
  work: () => Promise<T>,
): Promise<T> {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [campaignId]);
  return work();
}

export async function withPostgresTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getStudioPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function rowEnvelope<T>(row: QueryResultRow | undefined, column: string): T | null {
  if (!row) return null;
  const value = row[column];
  if (value == null) return null;
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value as T;
}
