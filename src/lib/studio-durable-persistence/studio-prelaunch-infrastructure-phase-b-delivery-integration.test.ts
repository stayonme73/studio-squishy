import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import type { StudioUser } from "@/lib/campaign-store/types";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { getOrGenerateTasks, readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { buildJobId } from "@/lib/job-control/lane-map";
import { canClientAccessJobDelivery } from "@/lib/job-control/final-delivery-access";
import type { PurchasedJobRecord, ServerTasksEnvelope } from "@/lib/job-control/types";
import { addJobFileReference, releaseFinalDeliveryFiles } from "@/lib/file-registry/job-files";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";
import { createSupabaseStorageAdapter } from "@/lib/file-storage/supabase";
import { checksumSha256 } from "@/lib/file-storage/storage-backup-restore";
import { confirmPaymentFromProcessor } from "@/lib/studio-payment/confirm";
import { writeCheckoutSessionBinding } from "@/lib/studio-payment/events-store";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance/evaluate";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { createServerSupabaseStorageClient } from "@/lib/supabase/server";

import { verifyStudioPersistenceTestTarget } from "./test-target-verify";
import {
  applyStudioPersistenceTestSupabaseEnvToProcess,
  resolveTestSupabaseStorageEnv,
  verifyStudioPersistenceTestStorageTarget,
} from "./test-storage-target-verify";

const ENV = { ...process.env };
const FLYER_ONLY = ["v2-rtu-flyer"] as const;

const storageEnvAtLoad = resolveTestSupabaseStorageEnv(process.env);

function useTestPostgresEnv(): void {
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
  process.env.SESSION_SECRET =
    process.env.SESSION_SECRET ?? "test-prelaunch-phase-b-session-secret";
  applyStudioPersistenceTestSupabaseEnvToProcess(process.env);
}

function disposableCampaignId(): string {
  return `disposable-prelaunch-b-${Date.now()}`;
}

async function requestWithSession(user: StudioUser, url: string): Promise<Request> {
  const token = await createSessionToken(user);
  return new Request(url, {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    },
  });
}

async function readDownloadBody(response: Response): Promise<Uint8Array> {
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

let lastStorageCleanup: { bucket: string; objectPath: string } | null = null;

afterEach(async () => {
  process.env = { ...ENV };
  vi.resetModules();
  try {
    useTestPostgresEnv();
    const testStorage = resolveTestSupabaseStorageEnv(process.env);
    if (lastStorageCleanup && testStorage) {
      const client = createServerSupabaseStorageClient({
        supabaseUrl: testStorage.supabaseUrl,
        supabaseServiceRoleKey: testStorage.supabaseServiceRoleKey,
        supabaseStorageBucket: testStorage.supabaseStorageBucket,
      });
      await client
        .deletePrivateObject({
          bucket: lastStorageCleanup.bucket,
          objectPath: lastStorageCleanup.objectPath,
        })
        .catch(() => undefined);
      lastStorageCleanup = null;
    }
    const { getStudioPostgresPool, resetStudioPostgresPoolForTests } = await import(
      "./postgres-pool"
    );
    await getStudioPostgresPool().query(
      `DELETE FROM studio_campaigns WHERE campaign_id LIKE 'disposable-prelaunch-b-%'`,
    );
    await resetStudioPostgresPoolForTests();
  } catch {
    // ignore
  }
});

describe.runIf(
  Boolean(process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL && storageEnvAtLoad),
)(
  "STUDIO-PRELAUNCH-INFRASTRUCTURE-COMPLETION-1 Phase B — Supabase-backed Final Delivery",
  () => {
    beforeAll(() => {
      const dbVerification = verifyStudioPersistenceTestTarget(process.env);
      if (!dbVerification.ok) {
        throw new Error(`DB target verification failed: ${dbVerification.reason}`);
      }
      const storageVerification = verifyStudioPersistenceTestStorageTarget(process.env);
      if (!storageVerification.ok) {
        throw new Error(`Storage target verification failed: ${storageVerification.reason}`);
      }
      if (dbVerification.projectRef !== storageVerification.projectRef) {
        throw new Error("Database and Storage project refs do not match.");
      }
    });

    it("flyer: sandbox pay → Supabase final file → delivery route → authorized download, deny stranger, retry after pool reconnect", async () => {
      useTestPostgresEnv();
      const campaignId = disposableCampaignId();
      const clientUser: StudioUser = {
        id: "client-prelaunch-b",
        email: "client.prelaunch.b@example.test",
        displayName: "Prelaunch Client",
        roles: ["client"],
        clientCampaignIds: [campaignId],
        currentCampaignId: campaignId,
      };
      const strangerUser: StudioUser = {
        id: "client-prelaunch-stranger",
        email: "stranger.prelaunch.b@example.test",
        displayName: "Stranger",
        roles: ["client"],
        clientCampaignIds: ["other-campaign"],
        currentCampaignId: "other-campaign",
      };

      const totals = computePlanPricingTotals([...FLYER_ONLY]);
      const lineItems = buildServiceScopeSnapshot([...FLYER_ONLY]);
      const now = new Date().toISOString();
      const unpaid: CampaignRecord = {
        campaignId,
        campaignName: "Prelaunch Flyer",
        campaignStatus: "DRAFT_RECEIVED",
        campaignDescription: "Phase B Supabase delivery",
        estimatedCompletion: "Soon",
        packageId: "custom-studio-plan",
        packageLabel: "Custom Studio Plan",
        revisionRoundsUsed: 0,
        deliverablesDelivered: {},
        createdAt: now,
        updatedAt: now,
        approvedStudioPlan: {
          selectedServiceIds: [...FLYER_ONLY],
          includedServiceIds: [...FLYER_ONLY],
          additionalServiceIds: [],
          additionalCostUsd: 0,
          oneTimeTotalCents: totals.oneTimeSubtotalCents,
          monthlyTotalCents: 0,
          amountDueTodayCents: totals.amountDueTodayCents,
          lineItems,
          approvedAt: now,
        },
      };
      await upsertCampaignRecord(unpaid, clientUser.id);

      const facts = {
        draftRevision: 1,
        routeId: "i75",
        selectedServiceIds: [...FLYER_ONLY],
        projectNeed: "Flyer for open house",
        businessName: "Prelaunch Cafe",
        requestedDeadline: "",
        deadlineStatus: "not_requested" as const,
        existingMaterialsNote: "",
        riskScanText: "Flyer for open house",
      };
      const decision = evaluatePreAcceptance(facts);
      const authorization = buildPreAcceptancePaymentAuthorization(decision);
      expect(authorization).toBeTruthy();
      if (!authorization) return;

      const sessionId = `cs_prelaunch_b_${Date.now()}`;
      await writeCheckoutSessionBinding({
        checkoutSessionId: sessionId,
        campaignId,
        expectedAmountCents: totals.amountDueTodayCents,
        currency: "usd",
        selectedServiceIds: [...FLYER_ONLY],
        decisionId: authorization.decisionId,
        factFingerprint: authorization.factFingerprint,
        draftRevision: authorization.evaluatedDraftRevision,
        createdAt: now,
        sandbox: true,
      });

      const paid = await confirmPaymentFromProcessor({
        campaignId,
        checkoutSessionId: sessionId,
        paymentIntentId: `pi_${campaignId}`,
        expectedAmountCents: totals.amountDueTodayCents,
        confirmedAmountCents: totals.amountDueTodayCents,
        currency: "usd",
        selectedServiceIds: [...FLYER_ONLY],
        decisionId: authorization.decisionId,
        factFingerprint: authorization.factFingerprint,
        draftRevision: authorization.evaluatedDraftRevision,
        authorization,
        stripeEventId: `evt_${campaignId}`,
        sandbox: true,
      });
      expect(paid.ok).toBe(true);
      if (!paid.ok) return;

      await upsertCampaignRecord(
        {
          ...paid.campaign,
          projectDetailsSubmittedAt: now,
        },
        clientUser.id,
      );

      const tasks = await getOrGenerateTasks(campaignId, paid.campaign);
      const jobId = buildJobId(campaignId, "v2-rtu-flyer");
      let job = tasks.jobRecords?.find((entry) => entry.jobId === jobId);
      expect(job).toBeTruthy();
      if (!job) return;

      const testStorageConfig = resolveTestSupabaseStorageEnv(process.env)!;
      const supabaseEnv = {
        supabaseUrl: testStorageConfig.supabaseUrl,
        supabaseServiceRoleKey: testStorageConfig.supabaseServiceRoleKey,
        supabaseStorageBucket: testStorageConfig.supabaseStorageBucket,
      };
      const storageClient = createServerSupabaseStorageClient(supabaseEnv);
      const adapter = createSupabaseStorageAdapter({ env: supabaseEnv, client: storageClient });
      expect(adapter.provider).toBe("supabase_storage");
      expect(createServerFileRoomStorageAdapter().provider).toBe("supabase_storage");

      const scope = {
        clientId: clientUser.id,
        campaignId,
        jobId,
        category: "final_delivery" as const,
      };
      const pdfBody = new TextEncoder().encode(
        `%PDF-1.4\nPrelaunch Supabase final flyer ${campaignId}\n%%EOF\n`,
      );
      const contentSha256 = `sha256:${checksumSha256(pdfBody)}`;
      const uploadMeta = {
        filename: "prelaunch-flyer-final.pdf",
        contentType: "application/pdf",
        sizeBytes: pdfBody.byteLength,
        uploadedAt: now,
      };
      const uploaded = await adapter.uploadObject({
        scope,
        metadata: uploadMeta,
        body: pdfBody,
      });
      lastStorageCleanup = { bucket: adapter.bucket, objectPath: uploaded.objectPath };

      const storageRef = {
        ...adapter.createStorageRef(scope, uploadMeta),
        objectPath: uploaded.objectPath,
        checksumSha256: contentSha256.replace(/^sha256:/i, ""),
      };

      const approvalDecisionId = "caa-prelaunch-b-supabase";
      let withFile = addJobFileReference(job, tasks.jobActivityEvents ?? [], {
        clientId: clientUser.id,
        category: "final_delivery",
        filename: uploadMeta.filename,
        fileType: uploadMeta.contentType,
        storageRef,
        visibility: "client_visible",
        versionLabel: "Final",
        status: "approved_for_release",
        actor: { role: "owner", userId: "owner-prelaunch", displayName: "Owner" },
        occurredAt: now,
      });
      job = withFile.job;

      job = {
        ...job,
        clientDeliveryFiles: [
          {
            id: `delivery-${Date.now()}`,
            registryFileId: withFile.file.id,
            deliverableLabel: "Print-ready PDF",
            fileName: uploadMeta.filename,
            fileType: uploadMeta.contentType,
            url: "",
            storageRef,
            contentSha256,
            approvedAuthorizationDecisionId: approvalDecisionId,
            addedAt: now,
            releaseStatus: "pending",
          },
        ],
      };

      const released = releaseFinalDeliveryFiles(
        job,
        withFile.events,
        { role: "owner", userId: "owner-prelaunch", displayName: "Owner" },
        now,
      );
      job = released.job;

      job = {
        ...released.job,
        spineStatus: "ready_for_delivery",
        deliveredAt: now,
        customerApprovedArtifactAuthorization: {
          status: "CUSTOMER_APPROVED",
          decisionId: approvalDecisionId,
          schemaVersion: 1,
          packageId: "STUDIO-APPROVED-DELIVERY-1",
          jobId,
          campaignId,
          skuId: "v2-rtu-flyer",
          workVersionId: "wv-prelaunch-supabase",
          artifactIds: ["art-prelaunch-supabase"],
          contentSha256s: [contentSha256],
          qaRecordIds: ["qa-prelaunch-1"],
          reviewPackageId: `pkg:${campaignId}:approved`,
          releaseActivityId: "release-prelaunch-b",
          approvedAt: now,
          feedbackSubmissionType: "approved_for_delivery",
          sourceQaDecisionId: "re-prelaunch-b",
        },
        internalQaReviewAuthorization: {
          status: "ELIGIBLE_FOR_REVIEW",
          decisionId: "re-prelaunch-b",
          packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
          skuId: "v2-rtu-flyer",
          qaRecordIds: ["qa-prelaunch-1"],
          workVersionId: "wv-prelaunch-supabase",
          contentSha256s: [contentSha256],
          artifactIds: ["art-prelaunch-supabase"],
          authorizedAt: now,
        },
      };

      const envelope: ServerTasksEnvelope = {
        ...tasks,
        jobRecords: tasks.jobRecords!.map((entry) => (entry.jobId === jobId ? job : entry)),
        jobActivityEvents: released.events,
      };
      await writeTasksEnvelope(envelope);

      expect(canClientAccessJobDelivery(job)).toBe(true);

      const deliveryRoute = await import("@/app/api/campaigns/[campaignId]/delivery/route");
      const deliveryRes = await deliveryRoute.GET(
        await requestWithSession(
          clientUser,
          `http://localhost/api/campaigns/${campaignId}/delivery`,
        ),
        { params: Promise.resolve({ campaignId }) },
      );
      expect(deliveryRes.status).toBe(200);
      const deliveryJson = (await deliveryRes.json()) as {
        delivery: {
          state: string;
          jobs: { files: { url: string; fileName: string }[] }[];
        };
      };
      expect(deliveryJson.delivery.state).toBe("ready");
      expect(deliveryJson.delivery.jobs.length).toBeGreaterThan(0);
      const downloadHref = deliveryJson.delivery.jobs[0]?.files[0]?.url;
      expect(downloadHref).toMatch(/^\/api\/file-room\/files\/.+\/download$/);

      const downloadRoute = await import("@/app/api/file-room/files/[fileId]/download/route");
      const fileId = withFile.file.id;

      const authorizedDownload = await downloadRoute.GET(
        await requestWithSession(
          clientUser,
          `http://localhost${downloadHref ?? `/api/file-room/files/${encodeURIComponent(fileId)}/download`}`,
        ),
        { params: Promise.resolve({ fileId }) },
      );
      expect(authorizedDownload.status).toBe(200);
      const authorizedBytes = await readDownloadBody(authorizedDownload);
      expect(checksumSha256(authorizedBytes)).toBe(checksumSha256(pdfBody));
      expect(authorizedDownload.headers.get("content-type")).toContain("application/pdf");

      const deniedDownload = await downloadRoute.GET(
        await requestWithSession(
          strangerUser,
          `http://localhost/api/file-room/files/${encodeURIComponent(fileId)}/download`,
        ),
        { params: Promise.resolve({ fileId }) },
      );
      expect(deniedDownload.status).toBe(403);

      const { resetStudioPostgresPoolForTests } = await import("./postgres-pool");
      await resetStudioPostgresPoolForTests();
      useTestPostgresEnv();

      const retryDownload = await downloadRoute.GET(
        await requestWithSession(
          clientUser,
          `http://localhost/api/file-room/files/${encodeURIComponent(fileId)}/download`,
        ),
        { params: Promise.resolve({ fileId }) },
      );
      expect(retryDownload.status).toBe(200);
      expect(checksumSha256(await readDownloadBody(retryDownload))).toBe(checksumSha256(pdfBody));

      const reread = await readCampaignEnvelope(campaignId);
      expect(reread?.record.paymentReceivedAt).toBeTruthy();
      const rereadTasks = await readTasksEnvelope(campaignId);
      expect(rereadTasks?.jobRecords?.find((j) => j.jobId === jobId)?.spineStatus).toBe(
        "ready_for_delivery",
      );
    }, 180_000);
  },
);
