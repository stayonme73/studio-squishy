import { getStudioPostgresPool } from "./postgres-pool";

/** Integration test cleanup — CASCADE removes child store rows. */
export async function pgCleanupDisposableE2eIntegrationTestData(): Promise<void> {
  await getStudioPostgresPool().query(
    `DELETE FROM studio_users WHERE email_normalized LIKE 'disposable.persistence.e2e.%@example.test'`,
  );
  await getStudioPostgresPool().query(
    `DELETE FROM studio_campaigns WHERE campaign_id LIKE 'disposable-persistence-e2e-%'`,
  );
}
