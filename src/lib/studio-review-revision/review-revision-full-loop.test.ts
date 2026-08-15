import { describe, expect, it } from "vitest";

import { studioReviewRevisionFullLoopV1 } from "@/config/studio-review-revision-full-loop-v1";
import {
  applyExistingCtaHeadlineEmphasis,
  assembleApprovedFlyerClientDelivery,
  shouldEmphasizeExistingCtaAsHeadline,
} from "@/lib/studio-review-revision";
import { evaluateDeliveryEligibility } from "@/lib/studio-approved-delivery";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { StudioFileReference } from "@/lib/file-registry/types";

const HASH_V1 = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_V2 = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function proof(hash: string, version: string, addedAt: string): StudioFileReference {
  return {
    id: `proof:${version}`,
    clientId: "maya",
    campaignId: "maya-review",
    jobId: "maya-review::v2-rtu-flyer",
    category: "review_proof",
    filename: `flyer-${version}.png`,
    fileType: "image/png",
    storageRef: {
      provider: "supabase_storage",
      connectionStatus: "private_object",
      bucket: "studio-files-local",
      objectPath: `clients/maya/campaigns/maya-review/jobs/job/review_proof/${version}/flyer.png`,
      visibilityState: "review-proof",
      originalFilename: `flyer-${version}.png`,
      contentType: "image/png",
      checksumSha256: hash.replace(/^sha256:/, ""),
    },
    visibility: "client_visible",
    versionLabel: version,
    status: "approved_for_review",
    addedBy: { role: "system", displayName: "Studio Machine" },
    addedAt,
    deliverableKey: "deliverable-0",
    deliverableLabel: "One flyer",
  };
}

function jobWithProofs(input: {
  spine: PurchasedJobRecord["spineStatus"];
  approvedHash?: string;
  files: StudioFileReference[];
}): PurchasedJobRecord {
  return {
    jobId: "maya-review::v2-rtu-flyer",
    campaignId: "maya-review",
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    spineStatus: input.spine,
    productionLane: "quick",
    intakeComplete: true,
    updatedAt: "2026-08-15T12:00:00.000Z",
    fileRegistry: input.files,
    internalQaReviewAuthorization: input.approvedHash
      ? {
          status: "ELIGIBLE_FOR_REVIEW",
          decisionId: "re-2",
          packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
          skuId: "v2-rtu-flyer",
          qaRecordIds: ["qa-2"],
          workVersionId: "flyer-v2",
          contentSha256s: [input.approvedHash],
          artifactIds: ["flyer-v2"],
          authorizedAt: "2026-08-15T11:00:00.000Z",
        }
      : undefined,
    customerApprovedArtifactAuthorization: input.approvedHash
      ? {
          status: "CUSTOMER_APPROVED",
          decisionId: "caa-v2",
          schemaVersion: 1,
          packageId: "STUDIO-OPERATING-APPROVED-DELIVERY-1",
          jobId: "maya-review::v2-rtu-flyer",
          campaignId: "maya-review",
          skuId: "v2-rtu-flyer",
          workVersionId: "flyer-v2",
          artifactIds: ["flyer-v2"],
          contentSha256s: [input.approvedHash],
          qaRecordIds: ["qa-2"],
          reviewPackageId: "pkg:maya:approve",
          releaseActivityId: null,
          approvedAt: "2026-08-15T12:00:00.000Z",
          feedbackSubmissionType: "approved_for_delivery",
          sourceQaDecisionId: "re-2",
        }
      : undefined,
  };
}

describe("STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1", () => {
  it("only emphasizes an existing CTA token, never a new offer", () => {
    expect(
      shouldEmphasizeExistingCtaAsHeadline(
        "Please make Book Your Reset more prominent as the headline.",
        "Book Your Reset",
      ),
    ).toBe(true);
    expect(
      applyExistingCtaHeadlineEmphasis({
        headline: "Promotional flyer for Back-to-School Reset",
        callToAction: "Book Your Reset",
        emphasis: {
          packageId: studioReviewRevisionFullLoopV1.packageId,
          instruction: "Please make Book Your Reset more prominent as the headline.",
          emphasizeExistingCtaAsHeadline: true,
          sourceRevisionPackageId: "pkg",
          priorWorkVersionId: "flyer-v1",
          recordedAt: "2026-08-15T12:00:00.000Z",
        },
      }),
    ).toBe("Book Your Reset");
  });

  it("assembles Final Delivery from the exact approved proof hash", () => {
    const assembled = assembleApprovedFlyerClientDelivery({
      job: jobWithProofs({
        spine: "approved",
        approvedHash: HASH_V2,
        files: [
          proof(HASH_V1, "Version 1", "2026-08-15T10:00:00.000Z"),
          proof(HASH_V2, "Version 2", "2026-08-15T11:00:00.000Z"),
        ],
      }),
      events: [],
      actor: { role: "client", displayName: "Maya Brooks" },
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles).toHaveLength(1);
    expect(assembled.job.clientDeliveryFiles?.[0]?.contentSha256).toBe(HASH_V2);
    expect(assembled.job.clientDeliveryFiles?.[0]?.versionLabel).toBe("Version 2");
  });

  it("binds every frozen-plan deliverable row to the exact approved hash, not a later file", () => {
    const assembled = assembleApprovedFlyerClientDelivery({
      job: jobWithProofs({
        spine: "approved",
        approvedHash: HASH_V2,
        files: [
          proof(HASH_V1, "Version 1", "2026-08-15T10:00:00.000Z"),
          proof(HASH_V2, "Version 2", "2026-08-15T11:00:00.000Z"),
        ],
      }),
      events: [],
      actor: { role: "client", displayName: "Maya Brooks" },
      requiredDeliverables: [
        "One defined design direction",
        "One finished single-sided flyer design — one agreed size only",
        "Print-ready PDF",
        "Digital PNG or JPG version for sharing online (one agreed size)",
        "Studio quality-control review before delivery",
      ],
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles).toHaveLength(5);
    expect(
      assembled.job.clientDeliveryFiles?.every((file) => file.contentSha256 === HASH_V2),
    ).toBe(true);
  });

  it("refuses to assemble Final Delivery from Version 1 after Version 2 is the approved pin", () => {
    const v1Only = jobWithProofs({
      spine: "approved",
      approvedHash: HASH_V2,
      files: [proof(HASH_V1, "Version 1", "2026-08-15T10:00:00.000Z")],
    });
    const refused = assembleApprovedFlyerClientDelivery({
      job: v1Only,
      events: [],
      actor: { role: "client", displayName: "Maya Brooks" },
    });
    expect(refused.assembled).toBe(false);
  });

  it("fails closed when Final Delivery would use an older unapproved hash", () => {
    const job = jobWithProofs({
      spine: "ready_for_delivery",
      approvedHash: HASH_V2,
      files: [
        proof(HASH_V1, "Version 1", "2026-08-15T10:00:00.000Z"),
        proof(HASH_V2, "Version 2", "2026-08-15T11:00:00.000Z"),
      ],
    });
    const withWrongFile = {
      ...job,
      clientDeliveryFiles: [
        {
          id: "cdf-old",
          deliverableKey: "deliverable-0",
          deliverableLabel: "One flyer",
          fileName: "flyer-version-1.png",
          fileType: "image/png",
          url: "/api/file-room/files/old/download",
          addedAt: "2026-08-15T12:00:00.000Z",
          addedBy: { role: "system" as const, displayName: "Studio" },
          contentSha256: HASH_V1,
          artifactId: "flyer-v1",
          approvedWorkVersionId: "flyer-v1",
          approvedAuthorizationDecisionId: "caa-v2",
        },
      ],
    };
    const decision = evaluateDeliveryEligibility({
      job: withWrongFile,
      forOwnerFinalRelease: true,
    });
    expect(decision.outcome).not.toBe("ELIGIBLE_FOR_DELIVERY");
    expect(decision.blockCodes.join(" ")).toMatch(/hash_mismatch|unbound_final_file|multi_deliverable/);
  });
});
