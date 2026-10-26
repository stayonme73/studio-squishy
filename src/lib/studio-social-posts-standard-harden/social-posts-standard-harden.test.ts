/**
 * HARDEN #6 — SOCIAL POSTS (STANDARD)
 * Proves the locked $99 four-square set. Does not remint Maya.
 * Business Card and Short Video do not piggyback.
 */

import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import {
  SOCIAL_POSTS_CAPTIONS_LABEL,
  SOCIAL_POSTS_HONEST_PROMISED_OUTPUT,
  SOCIAL_POSTS_ORDER_LABEL,
  SOCIAL_POSTS_STANDARD_HARDEN_SKU,
  studioSocialPostsStandardHardenV1 as harden,
} from "@/config/studio-social-posts-standard-harden-v1";
import {
  appendGeneralDesignAttempt,
  createGeneralDesignInternalLoop,
} from "@/lib/studio-general-design-runtime/correction";
import {
  formatSocialPostsCustomerCaptionFile,
  formatSocialPostsCustomerOrderFile,
  validateCaptionFacts,
} from "@/lib/studio-design-renderer/social-posts-captions";
import { SOCIAL_POSTS_PROOF_CONTRACT } from "@/lib/studio-design-renderer/social-posts-contracts";
import { evaluateSocialPostsSetConsistency } from "@/lib/studio-design-renderer/social-posts-set-qa";
import type { SocialPostCaption, SocialPostsProjectTruth } from "@/lib/studio-design-renderer/social-posts-types";
import { assembleApprovedSocialPostsClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import { clientDeliveryFileLabelsForSku } from "@/lib/studio-review-revision/flyer-purchase-delivery-truth";
import { SOCIAL_POSTS_EXPORT_PREFIX } from "@/lib/studio-review-revision/social-posts-purchase-delivery-truth";
import { skuLaneRow } from "@/lib/studio-static-creative-lane/sku-lane-matrix";
import { evaluateWorkSupervision } from "@/lib/studio-work-supervision/evaluate";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { StudioFileReference } from "@/lib/file-registry/types";

function failAttempt(n: number) {
  return {
    attemptNumber: n,
    triggeredBy: n === 1 ? ("initial_dispatch" as const) : ("qa_correction" as const),
    qaResult: "fail" as const,
    failureCode: "QA_FAILURE",
    message: "fail",
    pngContentSha256: null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

const captions: readonly SocialPostCaption[] = [
  { captionId: "caption-1", assetId: "social-post-1", orderIndex: 1, text: "Spring Special is $20 at Harbor." },
  { captionId: "caption-2", assetId: "social-post-2", orderIndex: 2, text: "Book now: 555-0100." },
  { captionId: "caption-3", assetId: "social-post-3", orderIndex: 3, text: "Harbor: Spring Special runs May 1–15." },
  { captionId: "caption-4", assetId: "social-post-4", orderIndex: 4, text: "Harbor. Fresh catch. Book now: 555-0100." },
];

function briefTruth(): SocialPostsProjectTruth {
  return {
    campaignId: "harden-social",
    jobId: "harden-social::v2-rtu-social-posts",
    dispatchId: "dd:harden-social::v2-rtu-social-posts",
    skuId: SOCIAL_POSTS_STANDARD_HARDEN_SKU,
    fixtureId: "harden",
    label: "Harbor",
    outputMode: "customer",
    businessName: "Harbor",
    wordmark: "Harbor",
    descriptor: "Fresh catch",
    headline: "Fresh catch",
    offerName: "Spring Special",
    priceDisplay: "$20",
    dateWindow: "May 1–15",
    body: "Fresh catch",
    cta: "Book now",
    phone: "555-0100",
    webDisplay: "harbor.example",
    webUrl: "https://harbor.example",
    disclaimer: "Customer-supplied facts only.",
    platformLabel: "Instagram Post — square feed (1024×1024)",
    brandColors: {
      primary: "#123456",
      secondary: "#654321",
      background: "#ffffff",
      text: "#111111",
      muted: "#888888",
    },
    materials: [],
    approvedLogoVariantId: "logo-1",
    requiredTextTokens: [],
    prohibitedClaimPatterns: [],
    assets: [
      { assetId: "social-post-1", orderIndex: 1, roleAngle: "offer_lead" },
      { assetId: "social-post-2", orderIndex: 2, roleAngle: "cta_book" },
      { assetId: "social-post-3", orderIndex: 3, roleAngle: "dates_window" },
      { assetId: "social-post-4", orderIndex: 4, roleAngle: "trust_brand" },
    ],
    dispatchWiringScopeNote: "HARDEN #6",
  };
}

describe("HARDEN #6 — Social Posts STANDARD", () => {
  it("locks the smallest honest $99 four-square set and drops hitchhikers", () => {
    expect(harden.skuId).toBe(SOCIAL_POSTS_STANDARD_HARDEN_SKU);
    expect(harden.hardenClass).toBe("STANDARD");
    expect(harden.offer.priceCents).toBe(9900);
    expect(harden.offer.exactAssetCount).toBe(4);
    expect(harden.offer.plate).toEqual({ widthPx: 1024, heightPx: 1024 });
    expect(harden.offer.carousel).toBe(false);
    expect(harden.offer.stories).toBe(false);
    expect(harden.offer.portraitVersions).toBe(false);
    expect(harden.offer.reels).toBe(false);
    expect(harden.offer.video).toBe(false);
    expect(harden.offer.extraPlatformSizes).toBe(false);
    expect(harden.offer.studioDoesNotPost).toBe(true);
    expect(harden.offer.oneSetRevisionNotFourRedesigns).toBe(true);
    expect(harden.ownerRescueIsNotTheCompletionPath).toBe(true);
    expect(harden.qualityLock.reduceScopeBeforeReducingQuality).toBe(true);
    expect(harden.economics.targetPriceHoldsAtThisScope).toBe(true);
    expect(harden.piggyback.businessCard).toBe(false);
    expect(harden.piggyback.shortVideo).toBe(false);
    expect(harden.doNotRemintMaya).toBe(true);
    expect(harden.classification).toBe("SELL_NOW");
    expect(harden.frozen).toBe(true);
  });

  it("1 + 2 — one set renderer; four plates version together", () => {
    expect(SOCIAL_POSTS_PROOF_CONTRACT.promisedOutput).toBe(SOCIAL_POSTS_HONEST_PROMISED_OUTPUT);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.requiredDeliverableFormats).toEqual(["png", "txt"]);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.exactAssetCount).toBe(4);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.wholeSetVersionsTogether).toBe(true);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.setIncompleteUnlessAllPass).toBe(true);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.captionsRequired).toBe(true);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.postingOrderRequired).toBe(true);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.portraitVariantsAuthorized).toBe(false);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.oneSetRevisionNotFourRedesigns).toBe(true);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.customerPosts).toBe(true);
  });

  it("3 — one weak plate fails the set", () => {
    const result = evaluateSocialPostsSetConsistency({
      truth: briefTruth(),
      spec: {
        specVersion: "social-posts-design-spec-1.0.0",
        skuId: SOCIAL_POSTS_STANDARD_HARDEN_SKU,
        platformLabel: "Instagram Post — square feed (1024×1024)",
        colors: briefTruth().brandColors,
        materials: [],
        sharedCampaign: {
          businessName: "Harbor",
          wordmark: "Harbor",
          offerName: "Spring Special",
          priceDisplay: "$20",
          dateWindow: "May 1–15",
          phone: "555-0100",
          webDisplay: "harbor.example",
          cta: "Book now",
        },
        assets: [
          {
            assetId: "social-post-1",
            orderIndex: 1,
            roleAngle: "offer_lead",
            authorizedPurpose: "feed",
            plateId: "cert-square-1024",
            canvas: { widthPx: 1024, heightPx: 1024 },
            background: { color: "#fff" },
            layers: [],
            outputFormats: ["png"],
          },
        ] as never,
        reasoningMode: "deterministic_constrained",
      },
      declaredTextByAsset: {},
      captions,
      postingOrder: captions.map((caption) => ({
        position: caption.orderIndex,
        assetId: caption.assetId,
        captionId: caption.captionId,
      })),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("SET_CONSISTENCY_FAILURE");
  });

  it("4 + 5 — captions stay fact-safe; posting order is not a calendar", () => {
    const ok = validateCaptionFacts(captions[0]!, briefTruth());
    expect(ok.ok).toBe(true);

    const invented = validateCaptionFacts(
      {
        captionId: "caption-1",
        assetId: "social-post-1",
        orderIndex: 1,
        text: "Guaranteed results. Five-star testimonial. Was $99 now $20.",
      },
      briefTruth(),
    );
    expect(invented.ok).toBe(false);
    if (!invented.ok) {
      expect(invented.message).toMatch(/invents a (business claim|price)/i);
    }

    const captionFile = formatSocialPostsCustomerCaptionFile(captions);
    expect(captionFile).toMatch(/^Post 1\n/);
    expect(captionFile).not.toMatch(/caption-1|social-post-1/);
    const orderFile = formatSocialPostsCustomerOrderFile(
      captions,
      "Instagram Post — square feed (1024×1024)",
    );
    expect(orderFile).toMatch(/not a calendar/i);
    expect(orderFile).toMatch(/you post these yourself/i);
    expect(orderFile).toMatch(/1\. Post 1/);
  });

  it("6 — exhaust fail-closes; Owner does not produce the set; card still escalates", () => {
    let loop = createGeneralDesignInternalLoop({
      skuId: SOCIAL_POSTS_STANDARD_HARDEN_SKU,
      campaignId: "harden-social",
      jobId: "harden-social::v2-rtu-social-posts",
      dispatchId: "dd:harden-social::v2-rtu-social-posts",
    });
    for (const n of [1, 2, 3]) {
      loop = appendGeneralDesignAttempt(loop, failAttempt(n));
    }
    expect(loop.status).toBe("fail_closed");
    expect(loop.ownerEscalation).toBeNull();

    const video = createGeneralDesignInternalLoop({
      skuId: "v2-rtu-voice",
      campaignId: "harden-voice",
      jobId: "harden-voice::v2-rtu-voice",
      dispatchId: "dd:harden-voice::v2-rtu-voice",
    });
    const videoExhaust = appendGeneralDesignAttempt(
      appendGeneralDesignAttempt(appendGeneralDesignAttempt(video, failAttempt(1)), failAttempt(2)),
      failAttempt(3),
    );
    expect(videoExhaust.status).toBe("escalated");
    expect(videoExhaust.ownerEscalation?.required).toBe(true);

    const supervision = evaluateWorkSupervision({
      campaignId: "harden-social",
      nowMs: Date.now(),
      ownerAvailable: true,
      jobs: [
        {
          jobId: "harden-social::v2-rtu-social-posts",
          skuId: SOCIAL_POSTS_STANDARD_HARDEN_SKU,
          serviceName: "Make My Social Media Posts",
          productionAttemptsUsed: 3,
          pendingCustomerRevision: false,
          unresolvedQaFail: true,
          customerInformedOfIncident: true,
          waitingOnCustomer: false,
          failedTransport: false,
          missingAuthorizedNotice: false,
        },
      ],
    });
    expect(supervision.incidents[0]?.recovery).toBe("fail_closed_refund");
    expect(supervision.incidents[0]?.ownerRequired).toBe(false);
    expect(supervision.ownerEscalations).toHaveLength(0);
    expect(supervision.customerMessages[0]?.whatStudioIsDoing).toMatch(
      /will not finish the social posts/i,
    );
  });

  it("7–10 — ceilings and one set revision, not four redesigns", () => {
    expect(harden.ceilings.productionTime).toBe("within 3–5 business days");
    expect(harden.ceilings.internalQaAttempts).toBe(3);
    expect(harden.ceilings.includedCustomerRevisions).toBe(1);
    expect(harden.ceilings.toolCostWarningCents).toBe(1485);
    expect(harden.ceilings.toolCostFailCents).toBe(2970);
    const social = getServiceById(SOCIAL_POSTS_STANDARD_HARDEN_SKU);
    expect(social?.routeMapTurnaroundLabel?.toLowerCase()).toContain("3–5 business days");
    expect(social?.includedRevisionRounds).toBe(1);
    expect(harden.offer.includedRevisions).toBe(1);
    expect(harden.offer.wholeSetVersionsTogether).toBe(true);
  });

  it("11 + 12 — advertised files match the delivered square set", () => {
    const social = getServiceById(SOCIAL_POSTS_STANDARD_HARDEN_SKU)!;
    expect(social.priceCents).toBe(9900);
    expect(social.purpose).toBe(SOCIAL_POSTS_HONEST_PROMISED_OUTPUT);
    expect(social.deliverables.some((label) => label.includes("1024"))).toBe(true);
    expect(social.exclusions).toEqual(
      expect.arrayContaining([
        "Portrait versions or extra platform sizes",
        "Owner or Scout finishing the posts after QA exhausts",
        "Four separate redesign cycles — one revision is for the whole set",
      ]),
    );
    const schema = getRouteMapIntakeSchema("rtu-social-posts");
    const platform = schema.fields.find((field) => field.id === "platform");
    expect(platform && "options" in platform ? platform.options : []).toEqual([
      "Facebook",
      "Instagram",
      "LinkedIn",
    ]);
    expect(clientDeliveryFileLabelsForSku(SOCIAL_POSTS_STANDARD_HARDEN_SKU, [])).toEqual([
      "Post 1 — square 1024×1024 PNG",
      "Post 2 — square 1024×1024 PNG",
      "Post 3 — square 1024×1024 PNG",
      "Post 4 — square 1024×1024 PNG",
      SOCIAL_POSTS_CAPTIONS_LABEL,
      SOCIAL_POSTS_ORDER_LABEL,
    ]);
    expect(skuLaneRow(SOCIAL_POSTS_STANDARD_HARDEN_SKU).overall).toBe("READY_WITH_LIMITS");
  });

  it("assembles exactly four approved PNGs plus captions and posting-order files", () => {
    const hashes = [
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    ];
    const captionHash = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const orderHash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const pngs: StudioFileReference[] = hashes.map((hash, index) => ({
      id: `proof:post-${index + 1}.png`,
      clientId: "client",
      campaignId: "social-harden",
      jobId: "social-harden::v2-rtu-social-posts",
      category: "review_proof",
      filename: `post-${index + 1}.png`,
      fileType: "image/png",
      storageRef: {
        provider: "supabase_storage",
        connectionStatus: "private_object",
        bucket: "studio-files-local",
        objectPath: `clients/x/campaigns/social-harden/jobs/j/review_proof/v1/post-${index + 1}.png`,
        visibilityState: "review-proof",
        originalFilename: `post-${index + 1}.png`,
        contentType: "image/png",
        checksumSha256: hash,
      },
      visibility: "client_visible",
      versionLabel: "Version 1",
      status: "approved_for_review",
      deliverableKey: `gd-proof:post-${index + 1}`,
      addedBy: { role: "system", displayName: "Studio Machine" },
      addedAt: "2026-09-24T12:00:00.000Z",
    }));
    const captionsFile: StudioFileReference = {
      ...pngs[0]!,
      id: "export:captions.txt",
      category: "internal_draft",
      filename: "captions.txt",
      fileType: "text/plain",
      storageRef: {
        ...pngs[0]!.storageRef,
        objectPath: "clients/x/campaigns/social-harden/jobs/j/internal_draft/v1/captions.txt",
        visibilityState: "internal-only",
        originalFilename: "captions.txt",
        contentType: "text/plain",
        checksumSha256: captionHash,
      },
      visibility: "internal_only",
      status: "draft",
      deliverableKey: `${SOCIAL_POSTS_EXPORT_PREFIX}:captions`,
      deliverableLabel: SOCIAL_POSTS_CAPTIONS_LABEL,
    };
    const orderFile: StudioFileReference = {
      ...captionsFile,
      id: "export:posting-order.txt",
      filename: "posting-order.txt",
      storageRef: {
        ...captionsFile.storageRef,
        objectPath: "clients/x/campaigns/social-harden/jobs/j/internal_draft/v1/posting-order.txt",
        originalFilename: "posting-order.txt",
        checksumSha256: orderHash,
      },
      deliverableKey: `${SOCIAL_POSTS_EXPORT_PREFIX}:order`,
      deliverableLabel: SOCIAL_POSTS_ORDER_LABEL,
    };
    const job: PurchasedJobRecord = {
      jobId: "social-harden::v2-rtu-social-posts",
      campaignId: "social-harden",
      skuId: SOCIAL_POSTS_STANDARD_HARDEN_SKU,
      serviceName: "Make My Social Media Posts",
      spineStatus: "approved",
      productionLane: "standard",
      intakeComplete: true,
      updatedAt: "2026-09-24T12:00:00.000Z",
      fileRegistry: [...pngs, captionsFile, orderFile],
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        decisionId: "caa-social",
        schemaVersion: 1,
        packageId: "STUDIO-OPERATING-APPROVED-DELIVERY-1",
        jobId: "social-harden::v2-rtu-social-posts",
        campaignId: "social-harden",
        skuId: SOCIAL_POSTS_STANDARD_HARDEN_SKU,
        workVersionId: "v2-rtu-social-posts-v1",
        artifactIds: ["v2-rtu-social-posts-v1"],
        contentSha256s: hashes,
        qaRecordIds: ["qa-1"],
        reviewPackageId: "pkg:social:approve",
        releaseActivityId: null,
        approvedAt: "2026-09-24T12:00:00.000Z",
        feedbackSubmissionType: "approved_for_delivery",
        sourceQaDecisionId: "re-1",
      },
    };
    const assembled = assembleApprovedSocialPostsClientDelivery({
      job,
      events: [],
      actor: { role: "system", displayName: "Studio Machine" },
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles?.map((file) => file.fileName).sort()).toEqual([
      "captions.txt",
      "post-1.png",
      "post-2.png",
      "post-3.png",
      "post-4.png",
      "posting-order.txt",
    ]);
  });
});
