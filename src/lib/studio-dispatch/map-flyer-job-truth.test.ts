import { describe, expect, it } from "vitest";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { FLYER_PROOF_CONTRACT } from "@/lib/studio-design-renderer/contracts";
import {
  reasonFlyerDesignSpecDeterministic,
  validateFlyerDesignSpec,
} from "@/lib/studio-design-renderer";
import { evaluateFlyerSpecCreativeQuality } from "@/lib/studio-design-renderer/flyer-creative-quality";

import { evaluateJobDispatch } from "./evaluate";
import { mapFlyerProjectTruthFromJob } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";
import { projectIntakeServiceFieldKey } from "@/lib/project-intake-plan";

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
    expect(mapped.truth.descriptor).toBe("");
    expect(mapped.truth.intendedUse).toBe("Both print and digital");
    expect(mapped.truth.sizeNotes).toBe("");

    const spec = reasonFlyerDesignSpecDeterministic(mapped.truth);
    expect(spec.canvas).toEqual({ widthPx: 1024, heightPx: 1536 });
    expect(spec.layers.some((l) => l.type === "image" && l.role === "logo")).toBe(
      false,
    );
    expect(spec.layers.some((l) => l.type === "text" && l.role === "wordmark")).toBe(
      true,
    );
    expect(spec.layers.some((l) => l.type === "text" && l.role === "descriptor")).toBe(
      false,
    );
    const validated = validateFlyerDesignSpec(REPO, spec, mapped.truth);
    expect(validated).toEqual({ ok: true });
  });

  it("maps customer-selected flyer size without inventing a different plate", () => {
    const campaignId = "camp-size-lock";
    const campaign = mayaCampaign(campaignId);
    campaign.routeMapIntake = {
      submittedAt: campaign.routeMapIntake!.submittedAt,
      answers: {
        ...campaign.routeMapIntake!.answers,
        sizeNotes: "8.5 x 11",
      },
    };
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyFlyerRecord(campaignId),
      materials: [],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.sizeNotes).toBe("8.5 x 11");
    const spec = reasonFlyerDesignSpecDeterministic(mapped.truth);
    expect(spec.canvas.heightPx).toBe(1536);
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
    expect(mapped.truth.headline).toMatch(/Back-to-School Reset/);
    expect(mapped.truth.headline).not.toBe("Book Your Reset");
    expect(mapped.truth.cta).toBe("Book Your Reset");
    expect(mapped.truth.revisionEmphasis?.emphasizeExistingCtaAsHeadline).toBe(
      true,
    );
    expect(mapped.truth.priceDisplay).toBe("$149");
    expect(mapped.truth.offerName).toMatch(/2-hour session/i);
    expect(mapped.truth.body).not.toMatch(/\$149/);
    expect(mapped.truth.body).not.toMatch(/555-0186/);
  });

  it("executes the locked Maya brief facts and style, not Harbor leftover navy", () => {
    const campaignId = "camp-maya-locked-brief";
    const campaign = mayaCampaign(campaignId);
    campaign.routeMapIntake!.answers.mustInclude = [
      "Cedar & Bloom Home Organizing",
      "Back-to-School Reset",
      "2-hour home organization session",
      "$149",
      "August 24 through September 14, 2026",
      "Includes: one 2-hour organizing session; organization of one selected household area; simple organization plan for maintaining the space.",
      "Customers may choose: pantry, entryway, children's homework area, closet, or home office.",
      "(804) 555-0186",
      "cedarandbloom.example",
      "Book Your Reset",
      "",
      "Style: warm, clean, calm, uncluttered. Soft neutral atmosphere with subtle botanical influence. Do not use childish school graphics, cartoon pencils, school buses, loud primary colors, or cluttered layouts. No logo. No photos. No social handles. No testimonials. No discount. No guarantee. Do not state a service area.",
    ].join("\n");
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyFlyerRecord(campaignId),
      materials: [],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.offerName).toBe("Back-to-School Reset");
    expect(mapped.truth.descriptor).toBe("");
    expect(mapped.truth.disclaimer).toBe("");
    expect(mapped.truth.body).not.toMatch(/Includes:/);
    expect(mapped.truth.body).not.toMatch(
      /2-hour home organization session Includes: one 2-hour organizing session/i,
    );
    expect(mapped.truth.body).toMatch(/One 2-hour home organization session/i);
    expect(mapped.truth.body).toMatch(/one selected household area/i);
    expect(mapped.truth.body).toMatch(/simple organization plan for maintaining the space/i);
    expect(mapped.truth.body).toMatch(/pantry/i);
    expect(mapped.truth.body).toMatch(/entryway/i);
    expect(mapped.truth.body).toMatch(/children's homework area/i);
    expect(mapped.truth.body).toMatch(/closet/);
    expect(mapped.truth.body).toMatch(/home office/);
    expect(mapped.truth.body).not.toMatch(/Style:/);
    expect(mapped.truth.body).not.toMatch(/555-0186/);
    expect(mapped.truth.body).not.toMatch(/cedarandbloom/);
    expect(mapped.truth.body).not.toMatch(/You distribute/);
    expect(mapped.truth.creativeDirection).toBeTruthy();
    expect(mapped.truth.brandColors.primary).toBe("#3F5A4A");
    expect(mapped.truth.requiredTextTokens).toEqual(
      expect.arrayContaining([
        "$149",
        "2-hour",
        "household area",
        "organization plan",
        expect.stringMatching(/^pantry$/i),
      ]),
    );
    expect(mapped.truth.requiredTextTokens).not.toContain("Includes");
    const spec = reasonFlyerDesignSpecDeterministic(mapped.truth);
    const declared = spec.layers
      .filter((layer): layer is Extract<typeof layer, { type: "text" }> => layer.type === "text")
      .map((layer) => layer.content)
      .join("\n");
    expect(declared).toMatch(/pantry/i);
    expect(declared).not.toMatch(/Local business/);
    expect(declared).not.toMatch(/school bus/i);
    expect(declared).not.toMatch(/Finished single-sided flyer/i);
    expect(declared).not.toMatch(/You distribute/i);
    expect(declared).not.toMatch(/Includes:/);
    expect(
      spec.layers.some((layer) => layer.type === "text" && layer.role === "disclaimer"),
    ).toBe(false);
  });

  it("maps live Project Intake prefixed keys without requiring bare field ids", () => {
    const campaignId = "camp-live-prefixed-intake";
    const campaign = mayaCampaign(campaignId);
    campaign.routeMapIntake = {
      submittedAt: campaign.routeMapIntake!.submittedAt,
      answers: {
        "shared:materials": "I do not have this yet",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "flyerPurpose")]:
          "Promotional flyer for Back-to-School Reset",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "mustInclude")]:
          "Back-to-School Reset — 2-hour session $149. August 24 – September 14, 2026. Call (804) 555-0186 or visit cedarandbloom.example. Book Your Reset.",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "intendedUse")]:
          "Both print and digital",
      },
    };
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyFlyerRecord(campaignId),
      materials: [],
    });
    expect(mapped.ok).toBe(true);
  });

  it("does not invent flyerPurpose or mustInclude from Maya's materials-only submitted Intake", () => {
    const campaignId = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
    const campaign = mayaCampaign(campaignId);
    campaign.campaignName = "Maya’s Mobile Boutique";
    campaign.routeMapIntake = {
      submittedAt: "2026-09-09T00:19:37.586Z",
      answers: { "shared:materials": "I do not have this yet" },
    };
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyFlyerRecord(campaignId),
      materials: [],
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("INVALID_DESIGN_SPEC");
    expect(mapped.message).toMatch(/flyerPurpose or mustInclude/);
  });

  it("does not print Maya's intake purpose as the customer-facing offer", () => {
    const campaignId = "camp-instructional-purpose";
    const campaign = mayaCampaign(campaignId);
    campaign.campaignName = "Maya’s Mobile Boutique";
    campaign.routeMapIntake = {
      submittedAt: campaign.routeMapIntake!.submittedAt,
      answers: {
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "flyerPurpose")]:
          "Grand opening flyer for Maya’s Mobile Boutique",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "mustInclude")]:
          "Grand Opening — first styling appointment $45. Call (804) 555-0142 or visit mayasmobileboutique.example.",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "intendedUse")]:
          "Both print and digital",
      },
    };
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyFlyerRecord(campaignId),
      materials: [],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.headline).toMatch(/Grand Opening/i);
    expect(mapped.truth.headline).not.toMatch(/flyer for/i);
    expect(mapped.truth.offerName).toMatch(/styling appointment/i);
    expect(mapped.truth.dateWindow).toBe("");
    expect(mapped.truth.cta).toBe("Call or visit");
    expect(mapped.truth.body).not.toMatch(/\(804\) 555-0142/);
    expect(mapped.truth.body).not.toMatch(/mayasmobileboutique\.example/i);
    expect(mapped.truth.body).not.toMatch(/\bor\s*\./i);
    expect(mapped.truth.prohibitedClaimPatterns).toEqual(
      expect.arrayContaining(["See offer details", "Book online or call", "flyer for"]),
    );

    const spec = reasonFlyerDesignSpecDeterministic(mapped.truth);
    const declared = spec.layers
      .filter((layer) => layer.type === "text")
      .map((layer) => layer.content)
      .join("\n");
    expect(declared).not.toMatch(/flyer for/i);
    expect(declared).not.toMatch(/See offer details/i);
    expect(declared).not.toMatch(/^phone /m);
    expect(declared).not.toMatch(/^web /m);
    expect(declared).toMatch(/First styling appointment/i);
    expect(declared).toMatch(/\$45/);
    const price = spec.layers.find((layer) => layer.type === "text" && layer.role === "price");
    const offer = spec.layers.find((layer) => layer.type === "text" && layer.role === "offer");
    expect(price && offer && price.type === "text" && offer.type === "text").toBe(true);
    if (offer?.type === "text") {
      expect(offer.content).toMatch(/styling appointment/i);
      expect(offer.content).not.toMatch(/\$45/);
    }
    if (price?.type === "text") {
      expect(price.content).toMatch(/\$45/);
    }
    expect(spec.layers.some((layer) => layer.id === "offer-panel")).toBe(true);
    expect(spec.layers.some((layer) => layer.id === "offer-medallion")).toBe(
      false,
    );
    expect(validateFlyerDesignSpec(REPO, spec, mapped.truth)).toEqual({ ok: true });
  });

  it("maps a submitted launch announcement without inventing a phone, website, or price", () => {
    const campaignId = "camp-studio-launch";
    const campaign = mayaCampaign(campaignId);
    campaign.campaignName = "the Studio";
    campaign.routeMapIntake = {
      submittedAt: campaign.routeMapIntake!.submittedAt,
      answers: {
        "shared:materials":
          "No logo yet. Use the business name The Studio as a clean wordmark.",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "flyerPurpose")]:
          "Launch announcement for The Studio. Invite small-business owners to use The Studio.",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "mustInclude")]:
          "THE STUDIO\nOpening October 2026\nCreative services for small businesses and entrepreneurs.\nProfessional design, marketing copy, social content, and short-form video created through an AI Production Team.\nNow accepting launch clients.",
        [projectIntakeServiceFieldKey("v2-rtu-flyer", "intendedUse")]:
          "Both print and digital",
      },
    };
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyFlyerRecord(campaignId),
      materials: [],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.phone).toBe("");
    expect(mapped.truth.webDisplay).toBe("");
    expect(mapped.truth.priceDisplay).toBe("");
    expect(mapped.truth.dateWindow).toMatch(/October 2026/i);
    expect(mapped.truth.headline).not.toMatch(/launch announcement for/i);
    expect(mapped.truth.headline).not.toMatch(/flyer for/i);
    expect(mapped.truth.headline).toMatch(/Opening October 2026/i);
    expect(mapped.truth.headline).not.toMatch(/entre$/i);
    expect(mapped.truth.offerName).toMatch(/creative services/i);
    expect(mapped.truth.body).toMatch(/professional design/i);
    const spec = reasonFlyerDesignSpecDeterministic(mapped.truth);
    expect(spec.layers.some((layer) => layer.type === "text" && layer.role === "price")).toBe(
      false,
    );
    expect(
      spec.layers.some((layer) => layer.type === "text" && layer.role === "contact_phone"),
    ).toBe(false);
    expect(
      spec.layers.some((layer) => layer.type === "text" && layer.role === "contact_web"),
    ).toBe(false);
    expect(spec.layers.some((layer) => layer.id === "offer-medallion")).toBe(false);
    expect(spec.colors.primary.toUpperCase()).not.toBe("#1F3A5F");
    expect(spec.colors.secondary.toUpperCase()).not.toBe("#C4A574");
    expect(mapped.truth.creativeDirection?.intelligenceVersion).toBeTruthy();
    expect(mapped.truth.dateWindow).toMatch(/October 2026/i);
    expect(spec.layers.some((layer) => layer.type === "text" && layer.role === "headline")).toBe(
      true,
    );
    expect(
      spec.layers.some(
        (layer) =>
          layer.type === "text" &&
          /Opening October 2026/i.test(layer.content),
      ),
    ).toBe(true);
    expect(validateFlyerDesignSpec(REPO, spec, mapped.truth)).toEqual({ ok: true });
    const canvasFails = evaluateFlyerSpecCreativeQuality(spec, mapped.truth).filter(
      (finding) => finding.severity === "fail",
    );
    expect(canvasFails).toEqual([]);
    expect(
      spec.layers.some((layer) => layer.type === "text" && layer.role === "cta"),
    ).toBe(true);
  });
});
