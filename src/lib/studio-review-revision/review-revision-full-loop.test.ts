import { describe, expect, it } from "vitest";

import { studioReviewRevisionFullLoopV1 } from "@/config/studio-review-revision-full-loop-v1";
import { allRequiredClientDeliveryFilesAssembled } from "@/lib/job-control/final-delivery-gates";
import {
  applyExistingCtaHeadlineEmphasis,
  assembleApprovedFlyerClientDelivery,
  classifyFlyerIncludedSlot,
  customerPromisedFileLabels,
  customerVisiblePurchaseLabels,
  shouldEmphasizeExistingCtaAsHeadline,
} from "@/lib/studio-review-revision";
import { evaluateDeliveryEligibility } from "@/lib/studio-approved-delivery";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { StudioFileReference } from "@/lib/file-registry/types";

const HASH_V1 = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_V2 = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HASH_PDF_V1 = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const HASH_PDF_V2 = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

const FLYER_FROZEN_SLOTS = [
  "One defined design direction",
  "One finished single-sided flyer design — one agreed size only",
  "Print-ready PDF",
  "Digital PNG or JPG version for sharing online (one agreed size)",
  "Studio quality-control review before delivery",
] as const;

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
    deliverableKey: "deliverable-1",
    deliverableLabel: "One finished single-sided flyer design — one agreed size only",
  };
}

function printDraft(hash: string, version: string, addedAt: string): StudioFileReference {
  return {
    id: `print:${version}`,
    clientId: "maya",
    campaignId: "maya-review",
    jobId: "maya-review::v2-rtu-flyer",
    category: "internal_draft",
    filename: `flyer-${version}.pdf`,
    fileType: "application/pdf",
    storageRef: {
      provider: "supabase_storage",
      connectionStatus: "private_object",
      bucket: "studio-files-local",
      objectPath: `clients/maya/campaigns/maya-review/jobs/job/internal_draft/${version}/flyer.pdf`,
      visibilityState: "internal-only",
      originalFilename: `flyer-${version}.pdf`,
      contentType: "application/pdf",
      checksumSha256: hash.replace(/^sha256:/, ""),
    },
    visibility: "internal_only",
    versionLabel: version,
    status: "draft",
    addedBy: { role: "system", displayName: "Studio Machine" },
    addedAt,
    deliverableKey: "deliverable-2",
    deliverableLabel: "Print-ready PDF",
  };
}

function jobWithProofs(input: {
  spine: PurchasedJobRecord["spineStatus"];
  approvedHashes?: readonly string[];
  files: StudioFileReference[];
}): PurchasedJobRecord {
  const hashes = input.approvedHashes ? [...input.approvedHashes] : undefined;
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
    internalQaReviewAuthorization: hashes
      ? {
          status: "ELIGIBLE_FOR_REVIEW",
          decisionId: "re-2",
          packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
          skuId: "v2-rtu-flyer",
          qaRecordIds: ["qa-2"],
          workVersionId: "flyer-v2",
          contentSha256s: hashes,
          artifactIds: ["flyer-v2"],
          authorizedAt: "2026-08-15T11:00:00.000Z",
        }
      : undefined,
    customerApprovedArtifactAuthorization: hashes
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
          contentSha256s: hashes,
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

  it("classifies the five frozen $69 flyer slots without rewriting SKU law", () => {
    expect(classifyFlyerIncludedSlot(FLYER_FROZEN_SLOTS[0])?.class).toBe("supporting_studio_work");
    expect(classifyFlyerIncludedSlot(FLYER_FROZEN_SLOTS[1])?.class).toBe("customer_promised_design");
    expect(classifyFlyerIncludedSlot(FLYER_FROZEN_SLOTS[2])).toMatchObject({
      class: "customer_promised_file",
      format: "pdf",
    });
    expect(classifyFlyerIncludedSlot(FLYER_FROZEN_SLOTS[3])).toMatchObject({
      class: "customer_promised_file",
      format: "png",
    });
    expect(classifyFlyerIncludedSlot(FLYER_FROZEN_SLOTS[4])?.class).toBe("internal_qa");
    expect(customerPromisedFileLabels(FLYER_FROZEN_SLOTS)).toEqual([
      "Print-ready PDF",
      "Digital PNG or JPG version for sharing online (one agreed size)",
    ]);
    expect(customerVisiblePurchaseLabels(FLYER_FROZEN_SLOTS)).toHaveLength(3);
  });

  it("assembles Final Delivery from the exact approved proof hash", () => {
    const assembled = assembleApprovedFlyerClientDelivery({
      job: jobWithProofs({
        spine: "approved",
        approvedHashes: [HASH_V2],
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

  it("delivers the promised PNG and PDF of Version 2, not five copies of the PNG", () => {
    const assembled = assembleApprovedFlyerClientDelivery({
      job: jobWithProofs({
        spine: "approved",
        approvedHashes: [HASH_V2, HASH_PDF_V2],
        files: [
          proof(HASH_V1, "Version 1", "2026-08-15T10:00:00.000Z"),
          proof(HASH_V2, "Version 2", "2026-08-15T11:00:00.000Z"),
          printDraft(HASH_PDF_V2, "Version 2", "2026-08-15T11:00:01.000Z"),
        ],
      }),
      events: [],
      actor: { role: "client", displayName: "Maya Brooks" },
      requiredDeliverables: FLYER_FROZEN_SLOTS,
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles).toHaveLength(2);
    const pdf = assembled.job.clientDeliveryFiles?.find((file) => file.deliverableLabel === "Print-ready PDF");
    const png = assembled.job.clientDeliveryFiles?.find((file) =>
      /Digital PNG/i.test(file.deliverableLabel),
    );
    expect(pdf?.contentSha256).toBe(HASH_PDF_V2);
    expect(png?.contentSha256).toBe(HASH_V2);
    expect(pdf?.fileType).toBe("application/pdf");
    expect(png?.fileType).toBe("image/png");
    expect(
      assembled.job.clientDeliveryFiles?.some((file) =>
        /quality-control|design direction/i.test(file.deliverableLabel),
      ),
    ).toBe(false);
  });

  it("fails closed when the promised print PDF is missing", () => {
    const refused = assembleApprovedFlyerClientDelivery({
      job: jobWithProofs({
        spine: "approved",
        approvedHashes: [HASH_V2, HASH_PDF_V2],
        files: [proof(HASH_V2, "Version 2", "2026-08-15T11:00:00.000Z")],
      }),
      events: [],
      actor: { role: "client", displayName: "Maya Brooks" },
      requiredDeliverables: FLYER_FROZEN_SLOTS,
    });
    expect(refused.assembled).toBe(false);
    expect(
      allRequiredClientDeliveryFilesAssembled(refused.job, [
        "Print-ready PDF",
        "Digital PNG or JPG version for sharing online (one agreed size)",
      ]),
    ).toBe(false);
  });

  it("treats assembled flyer files as present even when file-slot indexes are not zero-based", () => {
    const assembled = assembleApprovedFlyerClientDelivery({
      job: jobWithProofs({
        spine: "approved",
        approvedHashes: [HASH_V2, HASH_PDF_V2],
        files: [
          proof(HASH_V2, "Version 2", "2026-08-15T11:00:00.000Z"),
          printDraft(HASH_PDF_V2, "Version 2", "2026-08-15T11:00:01.000Z"),
        ],
      }),
      events: [],
      actor: { role: "client", displayName: "Maya Brooks" },
      requiredDeliverables: FLYER_FROZEN_SLOTS,
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles?.[0]?.deliverableKey).toBe("deliverable-2");
    expect(
      allRequiredClientDeliveryFilesAssembled(assembled.job, [
        "Print-ready PDF",
        "Digital PNG or JPG version for sharing online (one agreed size)",
      ]),
    ).toBe(true);
  });

  it("fails closed when the PDF is from a non-approved version", () => {
    const refused = assembleApprovedFlyerClientDelivery({
      job: jobWithProofs({
        spine: "approved",
        approvedHashes: [HASH_V2, HASH_PDF_V2],
        files: [
          proof(HASH_V2, "Version 2", "2026-08-15T11:00:00.000Z"),
          printDraft(HASH_PDF_V1, "Version 1", "2026-08-15T10:00:01.000Z"),
        ],
      }),
      events: [],
      actor: { role: "client", displayName: "Maya Brooks" },
      requiredDeliverables: FLYER_FROZEN_SLOTS,
    });
    expect(refused.assembled).toBe(false);
  });

  it("refuses to assemble Final Delivery from Version 1 after Version 2 is the approved pin", () => {
    const v1Only = jobWithProofs({
      spine: "approved",
      approvedHashes: [HASH_V2],
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
      approvedHashes: [HASH_V2, HASH_PDF_V2],
      files: [
        proof(HASH_V1, "Version 1", "2026-08-15T10:00:00.000Z"),
        proof(HASH_V2, "Version 2", "2026-08-15T11:00:00.000Z"),
        printDraft(HASH_PDF_V2, "Version 2", "2026-08-15T11:00:01.000Z"),
      ],
    });
    const withWrongFile = {
      ...job,
      clientDeliveryFiles: [
        {
          id: "cdf-old",
          deliverableKey: "deliverable-3",
          deliverableLabel: "Digital PNG or JPG version for sharing online (one agreed size)",
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
