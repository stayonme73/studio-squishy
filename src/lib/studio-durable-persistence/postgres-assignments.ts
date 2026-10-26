import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import { getStudioPostgresPool, rowEnvelope, withPostgresTransaction } from "./postgres-pool";

const SINGLETON_ID = "default";

export async function pgReadCampaignAssignments(): Promise<CampaignAssignmentsFile | null> {
  const result = await getStudioPostgresPool().query(
    `SELECT envelope FROM studio_file_room_assignments WHERE singleton_id = $1`,
    [SINGLETON_ID],
  );
  return rowEnvelope<CampaignAssignmentsFile>(result.rows[0], "envelope");
}

export async function pgWriteCampaignAssignments(
  assignments: CampaignAssignmentsFile,
): Promise<CampaignAssignmentsFile> {
  await withPostgresTransaction(async (client) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('studio_file_room_assignments'))`);
    await client.query(
      `INSERT INTO studio_file_room_assignments (singleton_id, envelope, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (singleton_id) DO UPDATE SET
         envelope = EXCLUDED.envelope,
         updated_at = NOW()`,
      [SINGLETON_ID, JSON.stringify(assignments)],
    );
  });
  return assignments;
}

/** Test helper — reset assignments row without touching campaigns. */
export async function pgResetCampaignAssignmentsForTests(
  assignments: CampaignAssignmentsFile,
): Promise<void> {
  await pgWriteCampaignAssignments(assignments);
}
