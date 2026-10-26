import { describe, expect, it } from "vitest";

import type { StudioFileReference } from "@/lib/file-registry/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import {
  assembleApprovedClientDelivery,
  assembleApprovedSocialPromoClientDelivery,
} from "./assemble-approved-delivery";
import { allRequiredClientDeliveryFilesAssembled } from "@/lib/job-control/final-delivery-gates";

import { clientDeliveryFileLabelsForSku } from "./flyer-purchase-delivery-truth";
import {
  SOCIAL_PROMO_DELIVERY_FILES,
  socialPromoClientDeliveryFileLabels,
  socialPromoDeliveryKey,
  socialPromoPurchasedDeliverableLabels,
} from "./social-promo-purchase-delivery-truth";

const SKU = "social_and_promo_graphics";
const JOB_ID = `promo-composite:${SKU}`;
const NOW = "2026-10-10T12:00:00.000Z";

function hashFor(index: number, version = 1): string {
  return `${index}${version}`.padEnd(64, "a").slice(0, 64);
}

function proof(filename: string, hash: string, version = 1): StudioFileReference {
  return {
    id: `proof:${version}:${filename}`,
    clientId: "client",
    campaignId: "promo-composite",
    jobId: JOB_ID,
    category: "review_proof",
    filename,
    fileType: filename.endsWith(".txt") ? "text/plain" : "image/png",
    storageRef: {
      provider: "supabase_storage",
      connectionStatus: "private_object",
      bucket: "studio-files-local",
      objectPath: `clients/x/campaigns/promo-composite/jobs/j/review_proof/v${version}/${filename}`,
      visibilityState: "review-proof",
      originalFilename: filename,
      contentType: filename.endsWith(".txt") ? "text/plain" : "image/png",
      checksumSha256: hash,
    },
    visibility: "client_visible",
    versionLabel: `Version ${version}`,
    status: "approved_for_review",
    addedBy: { role: "system", displayName: "Studio Machine" },
    addedAt: NOW,
  };
}

function approvedJob(input: {
  proofs: StudioFileReference[];
  pin: string[];
}): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    campaignId: "promo-composite",
    skuId: SKU as PurchasedJobRecord["skuId"],
    serviceName: "Social & Promo Graphics",
    spineStatus: "approved",
    productionLane: "standard",
    intakeComplete: true,
    updatedAt: NOW,
    fileRegistry: input.proofs,
    customerApprovedArtifactAuthorization: {
      status: "CUSTOMER_APPROVED",
      decisionId: "caa-composite",
      schemaVersion: 1,
      packageId: "STUDIO-OPERATING-APPROVED-DELIVERY-1",
      jobId: JOB_ID,
      campaignId: "promo-composite",
      skuId: SKU,
      workVersionId: `${SKU}:social-posts-v4+campaign-graphics-v2`,
      artifactIds: [`${SKU}:social-posts-v4+campaign-graphics-v2`],
      contentSha256s: input.pin,
      qaRecordIds: ["qa-composite"],
      reviewPackageId: "pkg:composite:approve",
      releaseActivityId: null,
      approvedAt: NOW,
      feedbackSubmissionType: "approved_for_delivery",
      sourceQaDecisionId: "re-composite",
    },
  };
}

const ACTOR = { role: "system" as const, displayName: "Studio Machine" };
const PURCHASED = socialPromoPurchasedDeliverableLabels();

describe("Social & Promo composite Final Delivery", () => {
  it("requires all eight composite files for the parent SKU", () => {
    expect(clientDeliveryFileLabelsForSku(SKU, PURCHASED)).toEqual(socialPromoClientDeliveryFileLabels());
    expect(clientDeliveryFileLabelsForSku(SKU, PURCHASED)).toHaveLength(8);
  });

  it("assembles every approved file from the approval pin and nothing stale", () => {
    const current = SOCIAL_PROMO_DELIVERY_FILES.map((file, index) =>
      proof(file.filename, hashFor(index, 4), 4),
    );
    const stale = SOCIAL_PROMO_DELIVERY_FILES.map((file, index) =>
      proof(file.filename, hashFor(index, 1), 1),
    );
    const job = approvedJob({
      proofs: [...stale, ...current],
      pin: current.map((ref) =>
        ref.storageRef.provider === "supabase_storage" ? ref.storageRef.checksumSha256! : "",
      ),
    });

    const result = assembleApprovedClientDelivery({ job, events: [], actor: ACTOR, occurredAt: NOW });
    expect(result.assembled).toBe(true);
    const files = result.job.clientDeliveryFiles ?? [];
    expect(files).toHaveLength(8);
    expect(files.map((file) => file.deliverableKey).sort()).toEqual(
      SOCIAL_PROMO_DELIVERY_FILES.map((file) => socialPromoDeliveryKey(file.member)).sort(),
    );
    for (const [index, file] of SOCIAL_PROMO_DELIVERY_FILES.entries()) {
      const delivered = files.find((entry) => entry.deliverableKey === socialPromoDeliveryKey(file.member));
      expect(delivered?.fileName).toBe(file.filename);
      expect(delivered?.contentSha256?.replace(/^sha256:/, "")).toBe(hashFor(index, 4));
    }
    expect(
      allRequiredClientDeliveryFilesAssembled(result.job, clientDeliveryFileLabelsForSku(SKU, PURCHASED)),
    ).toBe(true);
  });

  it("fails closed when any approved file is missing", () => {
    const partial = SOCIAL_PROMO_DELIVERY_FILES.slice(0, 7).map((file, index) =>
      proof(file.filename, hashFor(index, 4), 4),
    );
    const job = approvedJob({
      proofs: partial,
      pin: partial.map((ref) =>
        ref.storageRef.provider === "supabase_storage" ? ref.storageRef.checksumSha256! : "",
      ),
    });
    const result = assembleApprovedSocialPromoClientDelivery({ job, events: [], actor: ACTOR });
    expect(result.assembled).toBe(false);
    expect(result.job.clientDeliveryFiles ?? []).toHaveLength(0);
  });

  it("does not deliver bytes the customer did not approve", () => {
    const current = SOCIAL_PROMO_DELIVERY_FILES.map((file, index) =>
      proof(file.filename, hashFor(index, 4), 4),
    );
    const job = approvedJob({
      proofs: current,
      pin: current
        .slice(1)
        .map((ref) =>
          ref.storageRef.provider === "supabase_storage" ? ref.storageRef.checksumSha256! : "",
        ),
    });
    const result = assembleApprovedSocialPromoClientDelivery({ job, events: [], actor: ACTOR });
    expect(result.assembled).toBe(false);
  });
});
