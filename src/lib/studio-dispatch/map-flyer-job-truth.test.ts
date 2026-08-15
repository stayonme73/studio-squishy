import { describe, expect, it } from "vitest";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { FLYER_PROOF_CONTRACT } from "@/lib/studio-design-renderer/contracts";
import {
  reasonFlyerDesignSpecDeterministic,
  validateFlyerDesignSpec,
} from "@/lib/studio-design-renderer";

import { evaluateJobDispatch } from "./evaluate";
import { mapFlyerProjectTruthFromJob } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");

function readyFlyerRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-flyer`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: "v2-rtu-flyer" as const,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-nologo",
    capabilityReadiness: "contract_ready" as const,
    evaluatedAt: new Date().toISOString(),
    reason: null,
    blocker: null,
    ownerActionRequired: false as const,
  };
  return evaluateJobDispatch({
    campaignId,
    routing,
    jobId,
    skuId: "v2-rtu-flyer",
  });
}

function mayaCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Cedar & Bloom Home Organizing",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Customer flyer job",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        flyerPurpose: "Promotional flyer for Back-to-School Reset",
        mustInclude:
          "Back-to-School Reset — 2-hour session $149. August 24 – September 14, 2026. Call (804) 555-0186 or visit cedarandbloom.example. Book Your Reset.",
        materials: "No logo. No photos.",
        intendedUse: "Both print and digital",
        callToAction: "Book Your Reset",
      },
    },
    routeMapIntakeSubmittedAt: now,
  };
}

describe("v2-rtu-flyer no-logo customer mapping", () => {
  it("sealed flyer contract does not require a customer logo", () => {
    expect(FLYER_PROOF_CONTRACT.customerLogoRequired).toBe(false);
  });

  it("maps a truthful no-logo flyer without inventing a mark", () => {
    const campaignId = "camp-maya-nologo";
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: REPO,
      campaign: mayaCampaign(campaignId),
      dispatchRecord: readyFlyerRecord(campaignId),
      materials: [],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.approvedLogoVariantId).toBeNull();
    expect(mapped.truth.materials).toEqual([]);
    expect(mapped.truth.businessName).toBe("Cedar & Bloom Home Organizing");
    expect(mapped.truth.outputMode).toBe("customer");
    expect(mapped.truth.headline).toMatch(/Back-to-School Reset/);
    expect(mapped.truth.cta).toBe("Book Your Reset");

    const spec = reasonFlyerDesignSpecDeterministic(mapped.truth);
    expect(spec.layers.some((l) => l.type === "image" && l.role === "logo")).toBe(
      false,
    );
    expect(spec.layers.some((l) => l.type === "text" && l.role === "wordmark")).toBe(
      true,
    );
    const validated = validateFlyerDesignSpec(REPO, spec, mapped.truth);
    expect(validated).toEqual({ ok: true });
  });

  it("applies Maya's CTA-as-headline emphasis without inventing a new offer", () => {
    const campaignId = "camp-maya-emphasis";
    const campaign = mayaCampaign(campaignId);
    campaign.machineFlyerRevisionEmphasis = {
      packageId: "STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1",
      instruction:
        "Please make Book Your Reset more prominent as the headline.",
      emphasizeExistingCtaAsHeadline: true,
      sourceRevisionPackageId: "pkg:maya:rev-1",
      priorWorkVersionId: "flyer-v1",
      recordedAt: new Date().toISOString(),
    };
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyFlyerRecord(campaignId),
      materials: [],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.headline).toBe("Book Your Reset");
    expect(mapped.truth.cta).toBe("Book Your Reset");
    expect(mapped.truth.priceDisplay).toBe("$149");
    expect(mapped.truth.body).toMatch(/2-hour session \$149/);
  });
});
