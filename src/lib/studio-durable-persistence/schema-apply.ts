import { readFileSync } from "fs";
import path from "path";

import { getStudioPostgresPool } from "./postgres-pool";

/** Test / local bootstrap only — not for production deploy. */
export async function applyLocalFoundationSchemaFromFile(): Promise<void> {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261025100000_studio_spine_local_foundation.sql",
  );
  const sql = readFileSync(migrationPath, "utf8");
  await getStudioPostgresPool().query(sql);
}

/** Test / local bootstrap only — STUDIO-DURABLE-PERSISTENCE-USERS-AND-CLAIM-1 */
export async function applyLocalIdentitySchemaFromFile(): Promise<void> {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261025120000_studio_identity_local_foundation.sql",
  );
  const sql = readFileSync(migrationPath, "utf8");
  await getStudioPostgresPool().query(sql);
}

export async function applyLocalCommsLifeSchemaFromFile(): Promise<void> {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261025130000_studio_comms_life_local_foundation.sql",
  );
  const sql = readFileSync(migrationPath, "utf8");
  await getStudioPostgresPool().query(sql);
}

export async function applyLocalAssignmentsSchemaFromFile(): Promise<void> {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261025150000_studio_assignments_local_foundation.sql",
  );
  const sql = readFileSync(migrationPath, "utf8");
  await getStudioPostgresPool().query(sql);
}

export async function applyLocalActivityProductionSchemaFromFile(): Promise<void> {
  const migrationPath = path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20261025140000_studio_activity_production_local_foundation.sql",
  );
  const sql = readFileSync(migrationPath, "utf8");
  await getStudioPostgresPool().query(sql);
}

export async function applyLocalPersistenceSchemasFromFile(): Promise<void> {
  await applyLocalFoundationSchemaFromFile();
  await applyLocalIdentitySchemaFromFile();
  await applyLocalCommsLifeSchemaFromFile();
  await applyLocalActivityProductionSchemaFromFile();
  await applyLocalAssignmentsSchemaFromFile();
}
