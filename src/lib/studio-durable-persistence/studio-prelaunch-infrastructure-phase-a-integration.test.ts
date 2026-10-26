import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  assignStaffToCampaign,
  isStaffAssignedToCampaign,
  readCampaignAssignments,
  writeCampaignAssignments,
} from "@/lib/file-room/assignments";
import { internalCampaignAccessAllowed } from "@/lib/file-storage/registry-server";
import { createSupabaseStorageAdapter } from "@/lib/file-storage/supabase";
import {
  backupPrivateObject,
  restorePrivateObjectFromBackup,
  snapshotsMatch,
} from "@/lib/file-storage/storage-backup-restore";
import { createServerSupabaseStorageClient } from "@/lib/supabase/server";
import type { StudioUser } from "@/lib/campaign-store/types";

import { verifyStudioPersistenceTestTarget } from "./test-target-verify";
import {
  resolveTestSupabaseStorageEnv,
  verifyStudioPersistenceTestStorageTarget,
} from "./test-storage-target-verify";

const ENV = { ...process.env };

function useTestPostgresEnv(): void {
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
}

const staffUser: StudioUser = {
  id: "staff-prelaunch-a",
  email: "staff-prelaunch@example.test",
  displayName: "Staff Prelaunch",
  roles: ["staff"],
};

afterEach(async () => {
  process.env = { ...ENV };
  vi.resetModules();
  try {
    useTestPostgresEnv();
    const { pgResetCampaignAssignmentsForTests } = await import("./postgres-assignments");
    const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
    await pgResetCampaignAssignmentsForTests({ staffByUserId: {} });
    await resetStudioPostgresPoolForTests();
  } catch {
    // ignore
  }
});

describe.runIf(Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL))(
  "STUDIO-PRELAUNCH-INFRASTRUCTURE-COMPLETION-1 Phase A — assignments",
  () => {
    beforeAll(() => {
      const verification = verifyStudioPersistenceTestTarget(process.env);
      if (!verification.ok) {
        throw new Error(`DB target verification failed: ${verification.reason}`);
      }
    });

    it("persists campaign assignments on Postgres and survives pool reconnect", async () => {
      useTestPostgresEnv();
      const campaignId = `disposable-prelaunch-a-${Date.now()}`;
      await assignStaffToCampaign(staffUser.id, campaignId);

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const assignments = await readCampaignAssignments();
      expect(isStaffAssignedToCampaign(assignments, staffUser.id, campaignId)).toBe(true);
      expect(
        internalCampaignAccessAllowed(staffUser, campaignId, assignments),
      ).toBe(true);
    });

    it("merges staff routing updates without dropping unrelated staff rows", async () => {
      useTestPostgresEnv();
      await writeCampaignAssignments({
        staffByUserId: {
          "staff-one": ["camp-1"],
          "staff-two": ["camp-2"],
        },
      });
      await writeCampaignAssignments({
        staffByUserId: {
          "staff-one": ["camp-1", "camp-3"],
          "staff-two": ["camp-2"],
        },
      });
      const assignments = await readCampaignAssignments();
      expect(assignments.staffByUserId["staff-one"]).toEqual(["camp-1", "camp-3"]);
      expect(assignments.staffByUserId["staff-two"]).toEqual(["camp-2"]);
    });
  },
);

const storageEnv = resolveTestSupabaseStorageEnv(process.env);

describe.runIf(Boolean(storageEnv))(
  "STUDIO-PRELAUNCH-INFRASTRUCTURE-COMPLETION-1 Phase A — Supabase Storage",
  () => {
    beforeAll(() => {
      const verification = verifyStudioPersistenceTestStorageTarget(process.env);
      if (!verification.ok) {
        throw new Error(`Storage target verification failed: ${verification.reason}`);
      }
    });

    it("uploads, backs up, restores, and re-downloads a private test object", async () => {
      const env = resolveTestSupabaseStorageEnv(process.env);
      expect(env).toBeTruthy();
      if (!env) return;

      const client = createServerSupabaseStorageClient(env);
      const adapter = createSupabaseStorageAdapter({ env, client });
      const scope = {
        clientId: "prelaunch-client",
        campaignId: `disposable-prelaunch-storage-${Date.now()}`,
        jobId: "job-prelaunch-flyer",
        category: "client_final" as const,
      };
      const body = new TextEncoder().encode("%PDF-1.4 prelaunch backup probe\n");
      const metadata = {
        filename: `prelaunch-backup-${Date.now()}.pdf`,
        contentType: "application/pdf",
        sizeBytes: body.byteLength,
        uploadedAt: new Date().toISOString(),
      };

      const uploaded = await adapter.uploadObject({ scope, metadata, body });
      const storageRef = adapter.createStorageRef(scope, {
        ...metadata,
        checksumSha256: undefined,
      });

      try {
        const snapshot = await backupPrivateObject({
          adapter,
          storageRef: { ...storageRef, objectPath: uploaded.objectPath },
        });
        await client.deletePrivateObject({ bucket: adapter.bucket, objectPath: uploaded.objectPath });
        await expect(
          client.objectExists({ bucket: adapter.bucket, objectPath: uploaded.objectPath }),
        ).resolves.toBe(false);

        await restorePrivateObjectFromBackup({ adapter, snapshot, scope });
        const again = await backupPrivateObject({
          adapter,
          storageRef: { ...storageRef, objectPath: uploaded.objectPath },
        });
        expect(snapshotsMatch(snapshot, again)).toBe(true);
      } finally {
        await client
          .deletePrivateObject({ bucket: adapter.bucket, objectPath: uploaded.objectPath })
          .catch(() => undefined);
      }
    });
  },
);
