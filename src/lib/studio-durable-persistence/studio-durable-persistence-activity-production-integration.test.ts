import { randomUUID } from "crypto";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { writeCampaignEnvelope } from "@/lib/campaign-store/store";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import {
  getOrInitializeProduction,
  mutateProductionEnvelope,
  readProductionEnvelope,
  writeProductionEnvelope,
} from "@/lib/campaign-production/store";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import { submitInformationUpdateRequest } from "@/lib/project-activity/actions";
import {
  getOrInitializeProjectActivity,
  mutateProjectActivityEnvelope,
  readProjectActivityEnvelope,
  writeProjectActivityEnvelope,
} from "@/lib/project-activity/store";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import type { CampaignRecord } from "@/config/studio-board";
import { seedCustomerFieldTokensFromProjectDetails } from "@/lib/customer-field-tokens";

import { verifyStudioPersistenceTestTarget } from "./test-target-verify";

const ENV = { ...process.env };

function useTestPostgresEnv(): void {
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
}

function disposableCampaignId(suffix: string): string {
  return `disposable-persistence-activity-${Date.now()}-${suffix}`;
}

function minimalCampaign(campaignId: string): ServerCampaignEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    clientUserId: "client-disposable-activity",
    syncVersion: 1,
    syncedAt: now,
    record: {
      campaignId,
      campaignName: "Disposable Activity Campaign",
      campaignStatus: "active",
      campaignDescription: "Integration probe",
      estimatedCompletion: now,
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      updatedAt: now,
    },
  };
}

function paidCampaignRecord(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const base: CampaignRecord = {
    campaignId,
    campaignName: "Paid",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Test",
    estimatedCompletion: now,
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: { ...EMPTY_PROJECT_DETAILS_FORM, primaryApproverEmail: "old@example.com" },
      files: [],
      submittedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
  };
  return seedCustomerFieldTokensFromProjectDetails(base);
}

const clientUser: StudioUser = {
  id: "cust-activity-1",
  email: "activity@test.local",
  displayName: "Activity Customer",
  roles: ["client"],
};

function sampleProductionEnvelope(campaignId: string): ServerProductionEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    version: 1,
    planFingerprint: "probe-fp",
    workUnits: [],
    versions: [],
    updatedAt: now,
    syncedAt: now,
  };
}

async function seedCampaign(campaignId: string): Promise<void> {
  await writeCampaignEnvelope(minimalCampaign(campaignId));
}

afterEach(async () => {
  process.env = { ...ENV };
  vi.resetModules();
  try {
    useTestPostgresEnv();
    const { pgCleanupDisposableActivityProductionIntegrationTestData } = await import(
      "./postgres-activity-production"
    );
    const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
    await pgCleanupDisposableActivityProductionIntegrationTestData();
    await resetStudioPostgresPoolForTests();
  } catch {
    // ignore teardown errors after module reset
  }
});

describe.runIf(Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL))(
  "STUDIO-DURABLE-PERSISTENCE-ACTIVITY-AND-PRODUCTION-1",
  () => {
    beforeAll(() => {
      const verification = verifyStudioPersistenceTestTarget(process.env);
      if (!verification.ok) {
        throw new Error(`Integration target verification failed: ${verification.reason}`);
      }
    });

    it("persists project activity and survives pool reconnect", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("activity-read");
      await seedCampaign(campaignId);
      await getOrInitializeProjectActivity(campaignId);

      const marker = `event-${randomUUID()}`;
      await mutateProjectActivityEnvelope(campaignId, (envelope) => ({
        envelope: {
          ...envelope,
          events: [
            ...envelope.events,
            {
              id: marker,
              campaignId,
              occurredAt: new Date().toISOString(),
              kind: "system",
              sourceType: "system",
              sourceId: marker,
              actor: { role: "staff", userId: "staff", displayName: "Staff" },
              headline: "Probe",
              detail: "Probe",
            },
          ],
          updatedAt: new Date().toISOString(),
          version: envelope.version + 1,
        },
        value: marker,
      }));

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const read = await readProjectActivityEnvelope(campaignId);
      expect(read?.events.some((event) => event.id === marker)).toBe(true);
    });

    it("deduplicates information update requests by idempotency under concurrency", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("activity-idempotent");
      await seedCampaign(campaignId);
      const record = paidCampaignRecord(campaignId);

      const input = {
        campaignId,
        user: clientUser,
        idempotencyKey: "activity-dup-key",
        targetKey: "primary_approver_email" as const,
        requestedValue: "new@example.com",
        campaign: record,
      };

      const [first, second] = await Promise.all([
        submitInformationUpdateRequest(input),
        submitInformationUpdateRequest(input),
      ]);
      expect(first.ok && second.ok).toBe(true);
      if (!first.ok || !second.ok) return;
      expect(first.request.id).toBe(second.request.id);

      const envelope = await readProjectActivityEnvelope(campaignId);
      expect(envelope?.requests).toHaveLength(1);
    });

    it("isolates project activity between campaigns", async () => {
      useTestPostgresEnv();
      const campaignA = disposableCampaignId("activity-a");
      const campaignB = disposableCampaignId("activity-b");
      await seedCampaign(campaignA);
      await seedCampaign(campaignB);

      await writeProjectActivityEnvelope({
        ...(await getOrInitializeProjectActivity(campaignA)),
        updatedAt: new Date().toISOString(),
        version: 1,
      });

      const lifeA = await readProjectActivityEnvelope(campaignA);
      const lifeB = await readProjectActivityEnvelope(campaignB);
      expect(lifeA).not.toBeNull();
      expect(lifeB).toBeNull();
    });

    it("persists campaign production and survives pool reconnect", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("production-read");
      await seedCampaign(campaignId);

      await writeProductionEnvelope(sampleProductionEnvelope(campaignId));

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const read = await readProductionEnvelope(campaignId);
      expect(read?.planFingerprint).toBe("probe-fp");
    });

    it("merges concurrent production ledger appends without losing entries", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("production-concurrent");
      await seedCampaign(campaignId);
      await writeProductionEnvelope(sampleProductionEnvelope(campaignId));

      const appendVersion = (label: string) =>
        mutateProductionEnvelope(campaignId, (current) => {
          const base = current ?? sampleProductionEnvelope(campaignId);
          const versionId = `version-${label}`;
          return {
            envelope: {
              ...base,
              versions: [
                ...base.versions,
                {
                  id: versionId,
                  workUnitId: "wu-probe",
                  taskId: "task-probe",
                  stage: "copy",
                  reason: "initial",
                  contentKind: "plain_text",
                  body: label,
                  createdAt: new Date().toISOString(),
                  createdByUserId: "staff",
                  createdByDisplayName: "Staff",
                },
              ],
              updatedAt: new Date().toISOString(),
              syncedAt: new Date().toISOString(),
            },
            value: versionId,
          };
        });

      const [a, b] = await Promise.all([appendVersion("a"), appendVersion("b")]);
      expect(a).not.toBe(b);

      const read = await readProductionEnvelope(campaignId);
      expect(read?.versions).toHaveLength(2);
      expect(read?.versions.map((v) => v.id).sort()).toEqual(
        [`version-a`, `version-b`].sort(),
      );
    });

    it("initializes production via getOrInitializeProduction on Postgres", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId("production-init");
      const seeded = minimalCampaign(campaignId);
      seeded.record.approvedStudioPlan = {
        selectedServiceIds: ["sm-001"],
        includedServiceIds: ["sm-001"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 100,
        monthlyTotalCents: 0,
        amountDueTodayCents: 100,
        lineItems: [
          {
            skuId: "sm-001",
            serviceName: "Social Media Launch Set",
            quantity: 1,
            unitPriceCents: 100,
            lineTotalCents: 100,
            billingCadence: "one_time",
          },
        ],
      };
      await writeCampaignEnvelope(seeded);

      const envelope = await getOrInitializeProduction(campaignId, seeded.record);
      expect(envelope.workUnits.length).toBeGreaterThan(0);

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const again = await readProductionEnvelope(campaignId);
      expect(again?.workUnits.length).toBe(envelope.workUnits.length);
    });

    it("cleans up disposable activity and production rows", async () => {
      useTestPostgresEnv();
      const { getStudioPostgresPool } = await import("./postgres-pool");
      const pool = getStudioPostgresPool();
      const activity = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_project_activity
         WHERE campaign_id LIKE 'disposable-persistence-activity-%'`,
      );
      const production = await pool.query(
        `SELECT COUNT(*)::int AS n FROM studio_campaign_production
         WHERE campaign_id LIKE 'disposable-persistence-activity-%'`,
      );
      expect(activity.rows[0]?.n).toBe(0);
      expect(production.rows[0]?.n).toBe(0);
    });
  },
);
