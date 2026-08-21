import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  ROOM_4C_SCENARIO_1_CAMPAIGN_ID,
  studioRoom4cScenario1CedarLaneV1 as brief,
} from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";
import { studioRoom4cMultiServiceClientGauntletV1 } from "@/config/studio-room-4c-multi-service-client-gauntlet-v1";
import { evaluateCopyQuality } from "@/lib/studio-kitchen-production/copy-quality/evaluate";
import {
  buildNiaFallResetCreativeBrief,
  CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1,
  emitAssetLayers,
  getLayoutRecipe,
  ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1,
} from "@/lib/studio-campaign-creative";
import {
  CAMPAIGN_FORMAT_CANVASES,
  CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1,
  CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER,
  resolvePrintHandoutContract,
} from "@/lib/studio-campaign-creative/formats";
import {
  buildCedarLaneCreativeBrief,
  buildScenario1Caption,
  buildScenario1DeliveryManifest,
  buildScenario1NarrationScript,
  buildScenario1Provenance,
  canonicalScenario1BriefJson,
  collectScenario1CustomerFactSources,
  evaluateScenario1Acceptance,
  evaluateScenario1CustomerFactSourceGate,
  hashScenario1Brief,
  isUsLetterMediaBox,
  routeScenario1Services,
  scenario1CanonicalBookingContact,
  scenario1CanonicalBookingUrl,
  scenario1CanonicalPhone,
  scenario1CopyQualityBrief,
  scenario1VideoCtaPlateCopy,
  SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD,
  SCENARIO_1_OWNER_LOCKED_FACTS,
  SCENARIO_1_STALE_BOOKING_URL,
  SCENARIO_1_STALE_PHONE,
  staleScenario1FactHits,
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

  it("classifies Scenario 1 PASS WITH EXPLICIT LIMITS while Scenario 3 is stamped PASS WITH EXPLICIT LIMITS", () => {
    const scenario1 = studioRoom4cMultiServiceClientGauntletV1.scenarios[0];
    expect(studioRoom4cMultiServiceClientGauntletV1.status).toBe(
      "CLOSED WITH EXPLICIT LIMITS",
    );
    expect(studioRoom4cMultiServiceClientGauntletV1.sectionClosed).toBe(true);
    expect(studioRoom4cMultiServiceClientGauntletV1.room4RemainsOpen).toBe(true);
    expect(scenario1?.status).toBe("PASS WITH EXPLICIT LIMITS");
    expect(scenario1?.contactFactApprovalStatus).toBe(
      "OWNER_APPROVED_FOR_CERTIFICATION",
    );
    expect(scenario1?.explicitLimits).toEqual([
      "Studio-generated photography rather than customer-supplied photography.",
      "Social graphic relies on its accompanying caption for phone and booking URL.",
      "Short video is polished template-led production using one primary photograph, not cinematic production.",
      "Mobile findings are responsive coverage only, not final Room 4 mobile certification.",
      "Frozen Launch Now service classifications remain READY WITH EXPLICIT LIMITS.",
    ]);
    expect(studioRoom4cMultiServiceClientGauntletV1.scenarios[1]?.status).toBe(
      "PASS WITH EXPLICIT LIMITS",
    );
    expect(studioRoom4cMultiServiceClientGauntletV1.scenarios[2]?.status).toBe(
      "PASS WITH EXPLICIT LIMITS",
    );
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

  it("uses the owner-approved continuous narration and does not speak contact", () => {
    const script = buildScenario1NarrationScript();
    expect(script).toBe(
      "Ready for a calmer, more usable closet? Cedar Lane Home Organizing's Fall Closet Reset is available September fifteenth through October fifteenth for Richmond-area homes. Keep what you use, let the rest go, and book your free twenty-minute consultation today.",
    );
    expect(script).toContain(brief.customer.businessName);
    expect(script).toContain(brief.offer.name);
    expect(script).not.toContain(brief.cta.phoneSpoken);
    expect(script).not.toContain(brief.cta.bookingUrlSpoken);
    expect(script).not.toContain("(804)");
    expect(script).not.toContain("cedarlaneorganizing.example");
    expect(script.split("?").length).toBe(2);
    expect(staleScenario1FactHits(script)).toEqual([]);
  });
});

describe("Room 4C Scenario 1 — exact canonical facts in render sources", () => {
  it("locks Tagia's canonical phone and booking URL on the brief", () => {
    expect(scenario1CanonicalPhone()).toBe("(804) 555-0147");
    expect(scenario1CanonicalBookingUrl()).toBe(
      "cedarlaneorganizing.example/book",
    );
    expect(scenario1CanonicalBookingContact()).toBe(
      "(804) 555-0147 · cedarlaneorganizing.example/book",
    );
    expect(brief.cta.phoneDisplay).toBe("(804) 555-0147");
    expect(brief.cta.bookingUrl).toBe("cedarlaneorganizing.example/book");
    expect(brief.facts.bookingContact).toBe(
      "(804) 555-0147 · cedarlaneorganizing.example/book",
    );
  });

  it("8. uses the generic fact gate without scenario-specific bypass logic", () => {
    expect(
      SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD.approvalStatus,
    ).toBe("OWNER_APPROVED_FOR_CERTIFICATION");
    expect(SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD.values.phoneDisplay).toBe(
      "(804) 555-0147",
    );
    expect(SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD.values.bookingUrl).toBe(
      "cedarlaneorganizing.example/book",
    );
    expect(() => routeScenario1Services()).not.toThrow();

    const result = evaluateScenario1CustomerFactSourceGate();
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);

    const routingSrc = readFileSync(
      path.join(__dirname, "routing.ts"),
      "utf8",
    );
    const collectorSrc = readFileSync(
      path.join(__dirname, "customer-fact-sources.ts"),
      "utf8",
    );
    expect(routingSrc).toContain("assertScenario1ProductionRoutingAllowed");
    expect(collectorSrc).toContain("evaluateCustomerFactSourceGate");
    expect(collectorSrc).toContain("SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD");
    expect(collectorSrc).not.toMatch(/if\s*\(.*cedar/i);
  });

  it("9. puts exact approved facts on caption, print contact, video CTA plate, and other applicable outputs", () => {
    const caption = buildScenario1Caption();
    expect(caption).toContain("(804) 555-0147");
    expect(caption).toContain("cedarlaneorganizing.example/book");
    expect(staleScenario1FactHits(caption)).toEqual([]);

    const narration = buildScenario1NarrationScript();
    expect(narration).not.toContain(brief.cta.phoneSpoken);
    expect(narration).not.toContain(brief.cta.bookingUrlSpoken);
    expect(staleScenario1FactHits(narration)).toEqual([]);

    const creative = buildCedarLaneCreativeBrief();
    expect(creative.facts.bookingContact).toBe(
      "(804) 555-0147 · cedarlaneorganizing.example/book",
    );

    const printRecipe = getLayoutRecipe(
      "full_bleed_hero",
      "print_handout",
      creative.printHandoutContractId,
    );
    const printLayers = emitAssetLayers({
      recipe: printRecipe,
      brief: creative,
      system: CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1,
      heroPreparedMaterialId: "hero",
      logoMaterialId: "logo",
    });
    const contact = printLayers.find(
      (l) => l.type === "text" && l.role === "contact",
    );
    expect(contact?.type).toBe("text");
    if (contact?.type === "text") {
      expect(contact.content).toBe(
        "(804) 555-0147 · cedarlaneorganizing.example/book",
      );
      expect(contact.content).toContain("(804) 555-0147");
      expect(contact.content).toContain("cedarlaneorganizing.example/book");
      expect(staleScenario1FactHits(contact.content)).toEqual([]);
    }

    const squareRecipe = getLayoutRecipe("full_bleed_hero", "social_square");
    const squareLayers = emitAssetLayers({
      recipe: squareRecipe,
      brief: creative,
      system: CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1,
      heroPreparedMaterialId: "hero",
      logoMaterialId: "logo",
    });
    for (const layer of squareLayers) {
      if (layer.type === "text") {
        expect(staleScenario1FactHits(layer.content)).toEqual([]);
      }
    }

    const ctaPlate = scenario1VideoCtaPlateCopy();
    expect(ctaPlate.line1).toBe("(804) 555-0147");
    expect(ctaPlate.line2).toBe("cedarlaneorganizing.example/book");
    expect(
      staleScenario1FactHits(`${ctaPlate.line1}\n${ctaPlate.line2}`),
    ).toEqual([]);
  });

  it("does not treat leftover invented facts as valid", () => {
    expect(SCENARIO_1_STALE_PHONE).toBe("(804) 555-0172");
    expect(SCENARIO_1_STALE_BOOKING_URL).toBe(
      "cedarlaneorganizing.example/fall-reset",
    );
    expect(
      staleScenario1FactHits(
        "Book a consult: (804) 555-0172\ncedarlaneorganizing.example/fall-reset",
      ),
    ).toEqual(["stale-phone-0172", "stale-url-fall-reset"]);
  });

  it("records Cedar Lane contact as fictional certification facts, not customer-provided real-world facts", () => {
    expect(SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD.approvalStatus).toBe(
      "OWNER_APPROVED_FOR_CERTIFICATION",
    );
    expect(SCENARIO_1_OWNER_LOCKED_FACTS.phoneDisplay).toBe("(804) 555-0147");
    expect(SCENARIO_1_OWNER_LOCKED_FACTS.bookingUrl).toBe(
      "cedarlaneorganizing.example/book",
    );
    expect(SCENARIO_1_OWNER_LOCKED_FACTS.phoneDisplay).not.toBe(
      SCENARIO_1_STALE_PHONE,
    );
    expect(SCENARIO_1_OWNER_LOCKED_FACTS.bookingUrl).not.toBe(
      SCENARIO_1_STALE_BOOKING_URL,
    );
  });

  it("passes the generic customer-fact source gate for social, caption, print, video, and narration", () => {
    const result = evaluateScenario1CustomerFactSourceGate();
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);

    const byId = Object.fromEntries(
      collectScenario1CustomerFactSources().map((source) => [
        source.sourceId,
        source,
      ]),
    );
    expect(byId.caption?.requireExact).toEqual(
      expect.arrayContaining(["phoneDisplay", "bookingUrl"]),
    );
    expect(byId["social-square-layers"]?.requireExact).toEqual([
      "offerName",
      "datesDisplay",
      "cta",
    ]);
    expect(byId["social-square-layers"]?.text).not.toContain(
      "(804) 555-0147",
    );
    expect(byId["social-square-layers"]?.text).toContain("Book a consult");
    expect(byId.narration?.forbidExact).toEqual([
      "phoneDisplay",
      "bookingUrl",
    ]);
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
      previewRole:
        | "social-graphic"
        | "video"
        | "caption"
        | "handout-png"
        | "handout-pdf",
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

describe("Room 4C Scenario 1 — versioned print format", () => {
  it("keeps the unnamed default and Room 4B Nia brief on historical v1", () => {
    expect(CAMPAIGN_FORMAT_CANVASES.print_handout).toEqual({
      widthPx: 1024,
      heightPx: 1536,
    });
    expect(resolvePrintHandoutContract()).toEqual(
      CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1,
    );
    expect(resolvePrintHandoutContract("campaign-print-handout-v1")).toEqual(
      CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1,
    );
    const historical = getLayoutRecipe("full_bleed_hero", "print_handout");
    expect(historical.canvas).toEqual({ widthPx: 1024, heightPx: 1536 });

    const nia = buildNiaFallResetCreativeBrief();
    expect(nia.printHandoutContractId).toBe("campaign-print-handout-v1");
    const niaPrint = getLayoutRecipe(
      "full_bleed_hero",
      "print_handout",
      nia.printHandoutContractId,
    );
    expect(niaPrint.canvas).toEqual({ widthPx: 1024, heightPx: 1536 });
  });

  it("resolves Cedar Lane to US Letter without redefining v1", () => {
    expect(brief.printHandoutContractId).toBe(
      "campaign-print-handout-v2-us-letter",
    );
    const cedar = buildCedarLaneCreativeBrief();
    expect(cedar.printHandoutContractId).toBe(
      "campaign-print-handout-v2-us-letter",
    );
    const letter = resolvePrintHandoutContract(cedar.printHandoutContractId);
    expect(letter).toEqual(CAMPAIGN_PRINT_HANDOUT_CONTRACT_V2_US_LETTER);
    expect(letter.widthPx).toBe(2550);
    expect(letter.heightPx).toBe(3300);
    if ("pdfPage" in letter) {
      expect(letter.pdfPage.widthPt).toBe(612);
      expect(letter.pdfPage.heightPt).toBe(792);
    } else {
      throw new Error("v2 contract missing pdfPage");
    }
    const recipe = getLayoutRecipe(
      "full_bleed_hero",
      "print_handout",
      cedar.printHandoutContractId,
    );
    expect(recipe.canvas).toEqual({ widthPx: 2550, heightPx: 3300 });
    expect(CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1).toEqual({
      contractId: "campaign-print-handout-v1",
      widthPx: 1024,
      heightPx: 1536,
    });
    expect(
      brief.requestedDeliverables.find((d) => d.id === "print-handout")?.output,
    ).toContain("2550x3300");
  });

  it("treats 612×792 points as US Letter", () => {
    expect(isUsLetterMediaBox({ width: 612, height: 792 })).toBe(true);
    expect(isUsLetterMediaBox({ width: 1024, height: 1536 })).toBe(false);
  });

  it("scopes cream date color to Cedar Lane, not Room 4B replay", () => {
    const cedarRecipe = getLayoutRecipe("full_bleed_hero", "social_square");
    const cedarDates = emitAssetLayers({
      recipe: cedarRecipe,
      brief: buildCedarLaneCreativeBrief(),
      system: CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1,
      heroPreparedMaterialId: "hero",
      logoMaterialId: "logo",
    }).find((l) => l.type === "text" && l.role === "dates");
    expect(cedarDates?.type).toBe("text");
    if (cedarDates?.type === "text") {
      expect(cedarDates.color.toLowerCase()).toBe(
        CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1.palette.background.toLowerCase(),
      );
    }

    const niaRecipe = getLayoutRecipe(
      "full_bleed_hero",
      "print_handout",
      "campaign-print-handout-v1",
    );
    const niaDates = emitAssetLayers({
      recipe: niaRecipe,
      brief: buildNiaFallResetCreativeBrief(),
      system: ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1,
      heroPreparedMaterialId: "hero",
      logoMaterialId: "logo",
    }).find((l) => l.type === "text" && l.role === "dates");
    expect(niaDates?.type).toBe("text");
    if (niaDates?.type === "text") {
      expect(niaDates.color.toLowerCase()).toBe(
        ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1.palette.muted.toLowerCase(),
      );
      expect(
        ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1.fullBleedDateColor,
      ).toBeUndefined();
    }
  });
});
