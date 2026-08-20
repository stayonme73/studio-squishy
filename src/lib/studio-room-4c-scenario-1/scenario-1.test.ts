import { describe, expect, it } from "vitest";

import {
  ROOM_4C_SCENARIO_1_CAMPAIGN_ID,
  studioRoom4cScenario1CedarLaneV1 as brief,
} from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";
import { studioRoom4cMultiServiceClientGauntletV1 } from "@/config/studio-room-4c-multi-service-client-gauntlet-v1";
import { evaluateCopyQuality } from "@/lib/studio-kitchen-production/copy-quality/evaluate";
import { CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1 } from "@/lib/studio-campaign-creative";
import {
  buildCedarLaneCreativeBrief,
  buildScenario1Caption,
  buildScenario1DeliveryManifest,
  buildScenario1NarrationScript,
  buildScenario1Provenance,
  canonicalScenario1BriefJson,
  evaluateScenario1Acceptance,
  hashScenario1Brief,
  routeScenario1Services,
  scenario1CopyQualityBrief,
} from "@/lib/studio-room-4c-scenario-1";

describe("Room 4C Scenario 1 — machine-readable brief", () => {
  it("hashes stably and binds CreativeBrief facts to one campaign", () => {
    const json = canonicalScenario1BriefJson();
    const a = hashScenario1Brief(json);
    const b = hashScenario1Brief(json);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);

    const creative = buildCedarLaneCreativeBrief();
    expect(creative.campaignId).toBe(ROOM_4C_SCENARIO_1_CAMPAIGN_ID);
    expect(creative.facts.headline).toBe(brief.facts.headline);
    expect(creative.facts.datesDisplay).toBe(brief.facts.datesDisplay);
    expect(creative.facts.cta).toBe(brief.facts.cta);
    expect(creative.facts.bookingContact).toBe(brief.facts.bookingContact);
    expect(creative.facts.priceDisplay).toBe("");
    expect(creative.constraints.noNeon).toBe(true);
    expect(creative.constraints.calmWellness).toBe(false);
  });

  it("does not invent a price or carousel", () => {
    expect(brief.offer.priceDisplay).toBe("");
    expect(brief.refusedIfAsked).toContain("carousel");
    expect(
      studioRoom4cMultiServiceClientGauntletV1.frozenLaunchNowServices.carousel,
    ).toBe("NOT ON LAUNCH MENU");
  });
});

describe("Room 4C Scenario 1 — acceptance and routing", () => {
  it("admits Launch Now deliverables and refuses carousel", () => {
    const result = evaluateScenario1Acceptance({ askedForCarousel: true });
    expect(result.admit).toBe(true);
    expect(result.menuOk).toBe(true);
    expect(result.carousel.admit).toBe(false);
    expect(result.unsupportedRefused).toContain("carousel");
    expect(
      studioRoom4cMultiServiceClientGauntletV1.frozenLaunchNowServices
        .shortFormVideo,
    ).toBe("READY WITH EXPLICIT LIMITS");
  });

  it("routes every deliverable from the shared brief", () => {
    const routes = routeScenario1Services();
    expect(routes.map((r) => r.deliverableId)).toEqual(
      expect.arrayContaining([
        "campaign-set",
        "social-square",
        "print-handout",
        "promo-caption",
        "short-vertical-video",
      ]),
    );
    expect(routes.find((r) => r.skuId === "v2-rtu-short-video")?.toolId).toBe(
      "shotstack",
    );
  });
});

describe("Room 4C Scenario 1 — copy quality", () => {
  it("passes required facts and fails unsupported claims", () => {
    const caption = buildScenario1Caption();
    const copyBrief = scenario1CopyQualityBrief();
    const pass = evaluateCopyQuality({
      brief: copyBrief,
      submission: { kind: "plain_text", plainText: caption },
    });
    expect(pass.ok).toBe(true);
    expect(caption).toContain(brief.cta.bookingUrl);
    expect(caption.toLowerCase()).not.toContain("guaranteed");

    const fail = evaluateCopyQuality({
      brief: copyBrief,
      submission: {
        kind: "plain_text",
        plainText: `${caption}\nBest in Richmond. Guaranteed results.`,
      },
    });
    expect(fail.ok).toBe(false);
  });

  it("keeps narration on the same facts", () => {
    const script = buildScenario1NarrationScript();
    expect(script).toContain(brief.customer.businessName);
    expect(script).toContain(brief.offer.name);
    expect(script).toContain(brief.cta.bookingUrlSpoken);
  });
});

describe("Room 4C Scenario 1 — provenance and delivery manifest", () => {
  it("rejects assets not bound to the brief hash", () => {
    const briefSha256 = hashScenario1Brief();
    expect(() =>
      buildScenario1Provenance({
        packageId: brief.packageId,
        scenarioId: brief.scenarioId,
        campaignId: brief.campaignId,
        briefSha256,
        visualSystemId: CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1.systemId,
        generatedAt: "2026-08-20T00:00:00.000Z",
        assets: [
          {
            id: "rogue",
            role: "caption",
            relativePath: "x.txt",
            contentSha256: "abc",
            source: "derived_from_brief",
            derivedFromBriefSha256: "0".repeat(64),
          },
        ],
      }),
    ).toThrow(/PROVENANCE_UNBOUND/);
  });

  it("requires hashed preview files for the five customer outputs", () => {
    const briefSha256 = hashScenario1Brief();
    const file = (
      id: string,
      previewRole: "social-graphic" | "video" | "caption" | "handout-png" | "handout-pdf",
      mimeType: string,
    ) => ({
      id,
      previewRole,
      relativePath: `deliverables/${id}`,
      contentSha256: "a".repeat(64),
      byteLength: 12,
      mimeType,
    });
    const manifest = buildScenario1DeliveryManifest({
      packageId: brief.packageId,
      scenarioId: brief.scenarioId,
      campaignId: brief.campaignId,
      briefSha256,
      generatedAt: "2026-08-20T00:00:00.000Z",
      files: [
        file("social-square.png", "social-graphic", "image/png"),
        file("video.mp4", "video", "video/mp4"),
        file("caption.txt", "caption", "text/plain"),
        file("handout.png", "handout-png", "image/png"),
        file("handout.pdf", "handout-pdf", "application/pdf"),
      ],
    });
    expect(manifest.files).toHaveLength(5);
    expect(() =>
      buildScenario1DeliveryManifest({
        packageId: brief.packageId,
        scenarioId: brief.scenarioId,
        campaignId: brief.campaignId,
        briefSha256,
        generatedAt: "2026-08-20T00:00:00.000Z",
        files: [file("social-square.png", "social-graphic", "image/png")],
      }),
    ).toThrow(/DELIVERY_MANIFEST_MISSING/);
  });
});
