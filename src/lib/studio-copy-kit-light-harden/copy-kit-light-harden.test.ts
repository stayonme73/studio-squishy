/**
 * HARDEN #2 — EMAIL KIT + TEXT KIT (LIGHT)
 * Proves paste-ready files, fail-closed exhaust, and no Owner rewrite.
 * Does not remint Maya. Does not reopen Flyer.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import type { CampaignRecord } from "@/config/studio-board";
import {
  EMAIL_KIT_HONEST_PROMISED_OUTPUT,
  EMAIL_KIT_SKU,
  SMS_KIT_HONEST_PROMISED_OUTPUT,
  SMS_KIT_SKU,
  studioCopyKitLightHardenV1 as harden,
} from "@/config/studio-copy-kit-light-harden-v1";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { invokeCopyDispatchHook } from "@/lib/studio-dispatch/copy-dispatch-hook";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { StudioFileReference } from "@/lib/file-registry/types";
import { assembleApprovedCopyKitClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import {
  EMAIL_KIT_PASTE_READY_LABEL,
  SMS_KIT_PASTE_READY_LABEL,
} from "@/lib/studio-review-revision/copy-kit-purchase-delivery-truth";
import { clientDeliveryFileLabelsForSku } from "@/lib/studio-review-revision/flyer-purchase-delivery-truth";

const REPO = path.resolve(__dirname, "../../..");

function readyRecord(campaignId: string, skuId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${skuId}`;
  return evaluateJobDispatch({
    campaignId,
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: skuId as JobDispatchRecord["skuId"],
      status: "READY_FOR_DISPATCH",
      readyForDispatch: true,
      productionFamilyId: "marketing_assets",
      controlLane: "standard",
      factFingerprint: `fp-${skuId}`,
      capabilityReadiness: "contract_ready",
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false,
    },
    jobId,
    skuId: skuId as JobDispatchRecord["skuId"],
  });
}

function copyCampaign(
  campaignId: string,
  skuId: typeof EMAIL_KIT_SKU | typeof SMS_KIT_SKU,
  extras: Record<string, string> = {},
): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "River Reed Pottery",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Copy kit harden",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        [`${skuId}:campaignGoal`]: "Open Studio Saturday for wheel-throwing seats",
        [`${skuId}:mustInclude`]:
          "Open Studio Saturday — wheel-throwing seats $35. Call (804) 555-0177 or visit riverandreed.example",
        [`${skuId}:callToAction`]: "Call (804) 555-0177 or visit riverandreed.example",
        [`${skuId}:listConsent`]: "Yes — I own the list and have consent",
        [`${skuId}:sendingAccount`]: skuId === SMS_KIT_SKU ? "SimpleTexting" : "Mailchimp",
        [`${skuId}:mustNotSay`]: "guaranteed savings",
        [`${skuId}:messageCopy`]:
          "Open Studio Saturday — seats $35.\nLast seats for Saturday — reply if you want one.",
        ...extras,
      },
    },
  };
}

describe("HARDEN #2 — Email Kit + Text Kit LIGHT", () => {
  it("locks the smallest honest $129 email and $69 text offers", () => {
    expect(harden.email.skuId).toBe(EMAIL_KIT_SKU);
    expect(harden.sms.skuId).toBe(SMS_KIT_SKU);
    expect(harden.email.priceCents).toBe(12900);
    expect(harden.sms.priceCents).toBe(6900);
    expect(harden.email.maxEmails).toBe(2);
    expect(harden.sms.maxMessages).toBe(4);
    expect(harden.email.studioDoesNotSend).toBe(true);
    expect(harden.sms.studioDoesNotSend).toBe(true);
    expect(harden.ownerRescueIsNotTheCompletionPath).toBe(true);
    expect(harden.qualityLock.reduceScopeBeforeReducingQuality).toBe(true);
    expect(harden.doNotReopenFlyer).toBe(true);
    expect(harden.doNotRemintMaya).toBe(true);
    expect(harden.classification.email).toBe("SELL_NOW");
    expect(harden.classification.sms).toBe("SELL_NOW");
    expect(harden.ceilings.internalQaAttempts).toBe(2);
  });

  it("menu copy matches the paste-ready offer", () => {
    const email = getServiceById(EMAIL_KIT_SKU)!;
    const sms = getServiceById(SMS_KIT_SKU)!;
    expect(email.purpose).toBe(EMAIL_KIT_HONEST_PROMISED_OUTPUT);
    expect(sms.purpose).toBe(SMS_KIT_HONEST_PROMISED_OUTPUT);
    expect(email.deliverables.some((item) => /paste/i.test(item))).toBe(true);
    expect(sms.deliverables.some((item) => /paste/i.test(item))).toBe(true);
    expect(email.exclusions.some((item) => /rewriting the emails/i.test(item))).toBe(true);
    expect(sms.exclusions.some((item) => /rewriting the messages/i.test(item))).toBe(true);
    expect(EMAIL_KIT_HONEST_PROMISED_OUTPUT).toBe(
      "Up to two marketing emails you paste into your own email platform. The Studio does not send them.",
    );
    expect(SMS_KIT_HONEST_PROMISED_OUTPUT).toBe(
      "Up to four text messages you paste into your own texting platform. The Studio does not send them.",
    );
    expect(EMAIL_KIT_HONEST_PROMISED_OUTPUT).toMatch(/does not send/i);
    expect(SMS_KIT_HONEST_PROMISED_OUTPUT).toMatch(/does not send/i);
    expect(clientDeliveryFileLabelsForSku(EMAIL_KIT_SKU, [EMAIL_KIT_PASTE_READY_LABEL])).toEqual([
      EMAIL_KIT_PASTE_READY_LABEL,
    ]);
    expect(clientDeliveryFileLabelsForSku(SMS_KIT_SKU, [SMS_KIT_PASTE_READY_LABEL])).toEqual([
      SMS_KIT_PASTE_READY_LABEL,
    ]);
  });

  it("email-kit writes paste-ready txt and html and stays spend-isolated", async () => {
    const campaignId = `camp-copy-harden-email-${Date.now()}`;
    const campaign = copyCampaign(campaignId, EMAIL_KIT_SKU);
    const record = readyRecord(campaignId, EMAIL_KIT_SKU);
    const first = await invokeCopyDispatchHook({ repoRoot: REPO, campaign, dispatchRecord: record });
    expect(first.ok, first.ok ? "ok" : `${first.failureCode}: ${first.message}`).toBe(true);
    if (!first.ok) return;
    expect(first.ownerRoutineProduction).toBe("NONE");
    const names = first.pasteReadyFiles.map((file) => path.posix.basename(file.relativePath));
    expect(names).toEqual(["email-1.txt", "email-1.html", "email-2.txt", "email-2.html"]);
    for (const file of first.pasteReadyFiles) {
      expect(existsSync(path.join(REPO, file.relativePath))).toBe(true);
      const body = readFileSync(path.join(REPO, file.relativePath), "utf8");
      expect(body).toMatch(/Subject:|Call to action:/);
      expect(body).not.toMatch(/copy-v\d+\.json/);
    }
    const second = await invokeCopyDispatchHook({ repoRoot: REPO, campaign, dispatchRecord: record });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("ALREADY_PRODUCED");
    expect(second.attempts).toBe(0);
  });

  it("sms-kit writes one paste-ready text file", async () => {
    const campaignId = `camp-copy-harden-sms-${Date.now()}`;
    const campaign = copyCampaign(campaignId, SMS_KIT_SKU);
    const record = readyRecord(campaignId, SMS_KIT_SKU);
    const first = await invokeCopyDispatchHook({ repoRoot: REPO, campaign, dispatchRecord: record });
    expect(first.ok, first.ok ? "ok" : `${first.failureCode}: ${first.message}`).toBe(true);
    if (!first.ok) return;
    expect(first.pasteReadyFiles).toHaveLength(1);
    expect(path.posix.basename(first.pasteReadyFiles[0]!.relativePath)).toBe("sms-kit.txt");
    const body = readFileSync(path.join(REPO, first.pasteReadyFiles[0]!.relativePath), "utf8");
    expect(body).toMatch(/Suggested sending order/);
    expect(body).toMatch(/Message 1/);
  });

  it("consent wait and copy exhaust do not call Owner", async () => {
    const consentId = `camp-copy-harden-consent-${Date.now()}`;
    const consent = await invokeCopyDispatchHook({
      repoRoot: REPO,
      campaign: copyCampaign(consentId, EMAIL_KIT_SKU, {
        [`${EMAIL_KIT_SKU}:listConsent`]: "Not yet — I need to set this up first",
      }),
      dispatchRecord: readyRecord(consentId, EMAIL_KIT_SKU),
    });
    expect(consent.ok).toBe(false);
    if (consent.ok) return;
    expect(consent.failureCode).toBe("CONSENT_NOT_CONFIRMED");
    expect(consent.ownerEscalationRequired).toBe(false);

    const exhaustId = `camp-copy-harden-exhaust-${Date.now()}`;
    const exhaust = await invokeCopyDispatchHook({
      repoRoot: REPO,
      campaign: copyCampaign(exhaustId, EMAIL_KIT_SKU, {
        [`${EMAIL_KIT_SKU}:mustInclude`]:
          "Wheel-throwing seats $35 with guaranteed savings",
      }),
      dispatchRecord: readyRecord(exhaustId, EMAIL_KIT_SKU),
    });
    expect(exhaust.ok).toBe(false);
    if (exhaust.ok) return;
    expect(exhaust.failureCode).toBe("COPY_QA_EXHAUSTED");
    expect(exhaust.ownerEscalationRequired).toBe(false);
  });

  it("assembles paste-ready Final Delivery from the approved copy identity", () => {
    const hash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const source: StudioFileReference = {
      id: "export:email-1.txt",
      clientId: "client",
      campaignId: "copy-harden",
      jobId: "copy-harden::v2-rtu-email-kit",
      category: "internal_draft",
      filename: "email-1.txt",
      fileType: "text/plain",
      storageRef: {
        provider: "supabase_storage",
        connectionStatus: "private_object",
        bucket: "studio-files-local",
        objectPath: "clients/x/campaigns/copy-harden/jobs/j/internal_draft/v1/email-1.txt",
        visibilityState: "internal-only",
        originalFilename: "email-1.txt",
        contentType: "text/plain",
        checksumSha256: hash,
      },
      visibility: "internal_only",
      versionLabel: "Version 1",
      status: "draft",
      addedBy: { role: "system", displayName: "Studio Machine" },
      addedAt: "2026-09-23T12:00:00.000Z",
      deliverableKey: "copy-export:email-1.txt",
      deliverableLabel: "Email 1 — paste-ready text",
    };
    const job: PurchasedJobRecord = {
      jobId: "copy-harden::v2-rtu-email-kit",
      campaignId: "copy-harden",
      skuId: EMAIL_KIT_SKU,
      serviceName: "Make My Email Campaign Kit",
      spineStatus: "approved",
      productionLane: "standard",
      intakeComplete: true,
      updatedAt: "2026-09-23T12:00:00.000Z",
      fileRegistry: [source],
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        decisionId: "caa-copy",
        schemaVersion: 1,
        packageId: "STUDIO-OPERATING-APPROVED-DELIVERY-1",
        jobId: "copy-harden::v2-rtu-email-kit",
        campaignId: "copy-harden",
        skuId: EMAIL_KIT_SKU,
        workVersionId: "v2-rtu-email-kit-v1",
        artifactIds: ["v2-rtu-email-kit-v1"],
        contentSha256s: [hash],
        qaRecordIds: ["qa-1"],
        reviewPackageId: "pkg:copy:approve",
        releaseActivityId: null,
        approvedAt: "2026-09-23T12:00:00.000Z",
        feedbackSubmissionType: "approved_for_delivery",
        sourceQaDecisionId: "re-1",
      },
    };
    const assembled = assembleApprovedCopyKitClientDelivery({
      job,
      events: [],
      actor: { role: "system", displayName: "Studio Machine" },
      requiredDeliverables: [EMAIL_KIT_PASTE_READY_LABEL],
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles?.[0]?.fileName).toBe("email-1.txt");
    expect(assembled.job.clientDeliveryFiles?.[0]?.visibility).toBe("client_visible");
  });
});
