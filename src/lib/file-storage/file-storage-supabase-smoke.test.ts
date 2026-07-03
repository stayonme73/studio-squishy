import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";

import { createSupabaseStorageAdapter } from "@/lib/file-storage/supabase";
import { createServerSupabaseStorageClient } from "@/lib/supabase/server";
import type { StudioFileReference } from "@/lib/file-registry/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import { safeFileRoomFileResponse } from "./responses";
import { downloadClientFinalFile, downloadStaffInternalFile } from "./server-access";

const RUN_SMOKE = process.env.RUN_SUPABASE_STORAGE_SMOKE === "1";
if (RUN_SMOKE) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      process.env[key] ??= valueParts.join("=");
    }
  }
}

const NOW = new Date().toISOString();
const CLIENT_ID = "smoke-client";
const CAMPAIGN_ID = "supabase-storage-smoke";
const JOB_ID = `${CAMPAIGN_ID}:smoke-service`;

const ownerUser = {
  id: "owner-smoke",
  email: "owner-smoke@local.dev",
  displayName: "Smoke Owner",
  roles: ["owner"] as const,
};

const clientUser = {
  id: CLIENT_ID,
  email: "smoke-client@local.dev",
  displayName: "Smoke Client",
  roles: ["client"] as const,
  currentCampaignId: CAMPAIGN_ID,
};

function job(file?: StudioFileReference): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    campaignId: CAMPAIGN_ID,
    skuId: "sm-001",
    serviceName: "Smoke Service",
    spineStatus: "building_concepts",
    productionLane: "quick",
    intakeComplete: true,
    fileRegistry: file ? [file] : [],
    updatedAt: NOW,
  };
}

describe.runIf(RUN_SMOKE)("File Room Supabase real smoke", () => {
  it("uploads, privately verifies, downloads through server access, denies client access, and cleans up", async () => {
    const client = createServerSupabaseStorageClient();
    const adapter = createSupabaseStorageAdapter({ client });
    const filename = `file-room-smoke-${Date.now()}.pdf`;
    const body = new TextEncoder().encode("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n");
    const scope = {
      clientId: CLIENT_ID,
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
      category: "internal_draft" as const,
    };
    const metadata = {
      filename,
      contentType: "application/pdf",
      sizeBytes: body.byteLength,
      versionLabel: "smoke-v1",
      uploadedAt: NOW,
    };
    const uploaded = await adapter.uploadObject({ scope, metadata, body });

    try {
      const bucket = await client.getBucketVisibility(adapter.bucket);
      expect(bucket.public).toBe(false);
      await expect(client.objectExists({ bucket: adapter.bucket, objectPath: uploaded.objectPath })).resolves.toBe(true);

      const file: StudioFileReference = {
        id: `file:${JOB_ID}:internal_draft:${Date.now()}`,
        clientId: CLIENT_ID,
        campaignId: CAMPAIGN_ID,
        jobId: JOB_ID,
        category: "internal_draft",
        filename,
        fileType: "application/pdf",
        storageRef: adapter.createStorageRef(scope, metadata),
        visibility: "internal_only",
        versionLabel: metadata.versionLabel,
        status: "draft",
        addedBy: { role: "owner", userId: ownerUser.id, displayName: ownerUser.displayName },
        addedAt: NOW,
      };
      const privateJob = job(file);
      const authorized = await downloadStaffInternalFile({
        adapter,
        user: ownerUser,
        job: privateJob,
        file,
      });
      expect(authorized.ok).toBe(true);

      const denied = await downloadClientFinalFile({
        adapter,
        user: clientUser,
        job: privateJob,
        file,
      });
      expect(denied.ok).toBe(false);

      const safeResponse = safeFileRoomFileResponse(file);
      expect(JSON.stringify(safeResponse)).not.toContain(adapter.bucket);
      expect(JSON.stringify(safeResponse)).not.toContain(uploaded.objectPath);
    } finally {
      await client.deletePrivateObject({ bucket: adapter.bucket, objectPath: uploaded.objectPath });
    }
  }, 30_000);
});
