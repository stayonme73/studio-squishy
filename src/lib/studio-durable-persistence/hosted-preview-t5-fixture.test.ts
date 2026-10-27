/**
 * Seeds disposable Final Delivery bytes on Test Postgres + Supabase for hosted Preview T5.
 * Run only via scripts/hosted-preview-t5-file-room.mjs (sets HOSTED_T5_SEED=1).
 */
import { createHash } from "crypto";
import { writeFileSync } from "fs";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { buildJobId } from "@/lib/job-control/lane-map";
import { canClientAccessJobDelivery } from "@/lib/job-control/final-delivery-access";
import type { PurchasedJobRecord, ServerTasksEnvelope } from "@/lib/job-control/types";
import { addJobFileReference, releaseFinalDeliveryFiles } from "@/lib/file-registry/job-files";
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

const FLYER_ONLY = ["v2-rtu-flyer"] as const;

function useTestPostgresEnv(): void {
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
  process.env.SESSION_SECRET =
    process.env.SESSION_SECRET ?? "hosted-preview-t5-session-secret";
  applyStudioPersistenceTestSupabaseEnvToProcess(process.env);
}

describe.runIf(process.env.HOSTED_T5_SEED === "1")(
  "Hosted Preview T5 — disposable delivery fixture seed",
  () => {
    it(
      "seeds paid flyer job + released Supabase final file",
      async () => {
      const campaignId = process.env.HOSTED_T5_CAMPAIGN_ID?.trim();
      const clientUserId = process.env.HOSTED_T5_CLIENT_USER_ID?.trim();
      const outPath = process.env.HOSTED_T5_OUT?.trim();
      if (!campaignId || !clientUserId || !outPath) {
        throw new Error("HOSTED_T5_CAMPAIGN_ID, HOSTED_T5_CLIENT_USER_ID, HOSTED_T5_OUT required");
      }

      const dbVerification = verifyStudioPersistenceTestTarget(process.env);
      if (!dbVerification.ok) throw new Error(dbVerification.reason);
      const storageVerification = verifyStudioPersistenceTestStorageTarget(process.env);
      if (!storageVerification.ok) throw new Error(storageVerification.reason);

      useTestPostgresEnv();

      const totals = computePlanPricingTotals([...FLYER_ONLY]);
      const lineItems = buildServiceScopeSnapshot([...FLYER_ONLY]);
      const now = new Date().toISOString();
      const unpaid: CampaignRecord = {
        campaignId,
        campaignName: "Hosted Preview T5 Flyer",
        campaignStatus: "DRAFT_RECEIVED",
        campaignDescription: "Disposable hosted Preview File Room T5",
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
      await upsertCampaignRecord(unpaid, clientUserId);

      const facts = {
        draftRevision: 1,
        routeId: "i75",
        selectedServiceIds: [...FLYER_ONLY],
        projectNeed: "Hosted T5 flyer",
        businessName: "Hosted T5 Cafe",
        requestedDeadline: "",
        deadlineStatus: "not_requested" as const,
        existingMaterialsNote: "",
        riskScanText: "Hosted T5 flyer",
      };
      const decision = evaluatePreAcceptance(facts);
      const authorization = buildPreAcceptancePaymentAuthorization(decision);
      expect(authorization).toBeTruthy();
      if (!authorization) return;

      const sessionId = `cs_hosted_t5_${Date.now()}`;
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
        { ...paid.campaign, projectDetailsSubmittedAt: now },
        clientUserId,
      );

      const tasks = await getOrGenerateTasks(campaignId, paid.campaign);
      const jobId = buildJobId(campaignId, "v2-rtu-flyer");
      let job = tasks.jobRecords?.find((entry) => entry.jobId === jobId) as PurchasedJobRecord;
      expect(job).toBeTruthy();

      const testStorageConfig = resolveTestSupabaseStorageEnv(process.env)!;
      const supabaseEnv = {
        supabaseUrl: testStorageConfig.supabaseUrl,
        supabaseServiceRoleKey: testStorageConfig.supabaseServiceRoleKey,
        supabaseStorageBucket: testStorageConfig.supabaseStorageBucket,
      };
      const storageClient = createServerSupabaseStorageClient(supabaseEnv);
      const adapter = createSupabaseStorageAdapter({ env: supabaseEnv, client: storageClient });

      const scope = {
        clientId: clientUserId,
        campaignId,
        jobId,
        category: "final_delivery" as const,
      };
      const pdfBody = new TextEncoder().encode(
        `%PDF-1.4\nHosted Preview T5 ${campaignId}\n%%EOF\n`,
      );
      const contentSha256 = `sha256:${checksumSha256(pdfBody)}`;
      const uploadMeta = {
        filename: "hosted-t5-final.pdf",
        contentType: "application/pdf",
        sizeBytes: pdfBody.byteLength,
        uploadedAt: now,
      };
      const uploaded = await adapter.uploadObject({
        scope,
        metadata: uploadMeta,
        body: pdfBody,
      });

      const storageRef = {
        ...adapter.createStorageRef(scope, uploadMeta),
        objectPath: uploaded.objectPath,
        checksumSha256: contentSha256.replace(/^sha256:/i, ""),
      };

      const approvalDecisionId = "caa-hosted-t5";
      let withFile = addJobFileReference(job, tasks.jobActivityEvents ?? [], {
        clientId: clientUserId,
        category: "final_delivery",
        filename: uploadMeta.filename,
        fileType: uploadMeta.contentType,
        storageRef,
        visibility: "client_visible",
        versionLabel: "Final",
        status: "approved_for_release",
        actor: { role: "owner", userId: "owner-hosted-t5", displayName: "Owner" },
        occurredAt: now,
      });
      job = withFile.job;

      job = {
        ...job,
        clientDeliveryFiles: [
          {
            id: `delivery-hosted-t5-${Date.now()}`,
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
        { role: "owner", userId: "owner-hosted-t5", displayName: "Owner" },
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
          workVersionId: "wv-hosted-t5",
          artifactIds: ["art-hosted-t5"],
          contentSha256s: [contentSha256],
          qaRecordIds: ["qa-hosted-t5"],
          reviewPackageId: `pkg:${campaignId}:approved`,
          releaseActivityId: "release-hosted-t5",
          approvedAt: now,
          feedbackSubmissionType: "approved_for_delivery",
          sourceQaDecisionId: "re-hosted-t5",
        },
        internalQaReviewAuthorization: {
          status: "ELIGIBLE_FOR_REVIEW",
          decisionId: "re-hosted-t5",
          packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
          skuId: "v2-rtu-flyer",
          qaRecordIds: ["qa-hosted-t5"],
          workVersionId: "wv-hosted-t5",
          contentSha256s: [contentSha256],
          artifactIds: ["art-hosted-t5"],
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

      const expectedSha256 = checksumSha256(pdfBody);
      writeFileSync(
        outPath,
        JSON.stringify({
          campaignId,
          clientUserId,
          fileId: withFile.file.id,
          expectedSha256,
          objectPath: uploaded.objectPath,
          bucket: adapter.bucket,
        }),
        "utf8",
      );

      const ownerUser = {
        id: clientUserId,
        email: "hosted-t5-owner@example.test",
        displayName: "Hosted T5 Owner",
        roles: ["client"] as const,
        clientCampaignIds: [campaignId],
        currentCampaignId: campaignId,
      };
      const strangerUser = {
        id: "hosted-t5-stranger-local",
        email: "hosted-t5-stranger@example.test",
        displayName: "Hosted T5 Stranger",
        roles: ["client"] as const,
        clientCampaignIds: ["other-campaign"],
        currentCampaignId: "other-campaign",
      };
      const downloadRoute = await import("@/app/api/file-room/files/[fileId]/download/route");
      const fileId = withFile.file.id;
      const ownerToken = await createSessionToken(ownerUser);
      const strangerToken = await createSessionToken(strangerUser);
      const authorized = await downloadRoute.GET(
        new Request(`http://localhost/api/file-room/files/${encodeURIComponent(fileId)}/download`, {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(ownerToken)}` },
        }),
        { params: Promise.resolve({ fileId }) },
      );
      expect(authorized.status).toBe(200);
      const authorizedBytes = new Uint8Array(await authorized.arrayBuffer());
      expect(createHash("sha256").update(authorizedBytes).digest("hex")).toBe(expectedSha256);

      const denied = await downloadRoute.GET(
        new Request(`http://localhost/api/file-room/files/${encodeURIComponent(fileId)}/download`, {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(strangerToken)}` },
        }),
        { params: Promise.resolve({ fileId }) },
      );
      expect(denied.status).toBe(403);
    },
      120_000,
    );
  },
);
