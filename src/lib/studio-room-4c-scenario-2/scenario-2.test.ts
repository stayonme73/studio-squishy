import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  ROOM_4C_SCENARIO_2_CAMPAIGN_ID,
  studioRoom4cScenario2HarborRoastV1 as brief,
} from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";
import { studioRoom4cMultiServiceClientGauntletV1 } from "@/config/studio-room-4c-multi-service-client-gauntlet-v1";
import { evaluateCopyQuality } from "@/lib/studio-kitchen-production/copy-quality/evaluate";
import {
  emitAssetLayers,
  getLayoutRecipe,
  HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1,
} from "@/lib/studio-campaign-creative";
import {
  CAMPAIGN_FORMAT_CANVASES,
  CAMPAIGN_PRINT_COUNTER_CARD_CONTRACT_V1_5X7,
  CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1,
} from "@/lib/studio-campaign-creative/formats";
import { isFiveBySevenMediaBox } from "@/lib/studio-room-4c-scenario-1";
import {
  buildHarborRoastCreativeBrief,
  buildScenario2Caption,
  buildScenario2CampaignDirection,
  buildScenario2DeliveryManifest,
  buildScenario2Email,
  buildScenario2NarrationScript,
  buildScenario2Provenance,
  canonicalScenario2BriefJson,
  collectScenario2CustomerFactSources,
  evaluateScenario2Acceptance,
  evaluateScenario2CustomerFactSourceGate,
  formatScenario2EmailPasteReady,
  hashScenario2Brief,
  routeScenario2Services,
  scenario2CopyQualityBrief,
  scenario2VideoCtaPlateCopy,
  SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
  SCENARIO_2_STALE_BOOKING_URL,
  SCENARIO_2_STALE_EMAIL,
  SCENARIO_2_STALE_PHONE,
  staleScenario2FactHits,
} from "@/lib/studio-room-4c-scenario-2";

describe("Room 4C Scenario 2 — machine-readable brief", () => {
  it("hashes stably and binds CreativeBrief facts to one campaign", () => {
    const json = canonicalScenario2BriefJson();
    const a = hashScenario2Brief(json);
    const b = hashScenario2Brief(json);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);

    const creative = buildHarborRoastCreativeBrief();
    expect(creative.campaignId).toBe(ROOM_4C_SCENARIO_2_CAMPAIGN_ID);
    expect(creative.facts.headline).toBe(brief.facts.headline);
    expect(creative.facts.datesDisplay).toBe(brief.facts.datesDisplay);
    expect(creative.facts.priceDisplay).toBe("$48");
    expect(creative.facts.cta).toBe("Limited autumn box");
    expect(creative.facts.bookingContact).toBe("");
    expect(creative.targetFormats).toEqual([
      "social_square",
      "social_vertical",
      "print_counter_card",
    ]);
    expect(creative.printCounterCardContractId).toBe(
      "campaign-print-counter-card-v1-5x7",
    );
    expect(creative.printHandoutContractId).toBeUndefined();
    expect(creative.constraints.noNeon).toBe(true);
  });

  it("does not invent URL, email, phone, or carousel", () => {
    expect(brief.facts.bookingContact).toBe("");
    expect(brief.refusedIfAsked).toContain("carousel");
    expect(JSON.stringify(brief)).not.toContain("harborroast.example");
    expect(JSON.stringify(brief)).not.toContain("@");
    expect(JSON.stringify(brief)).not.toContain("(804)");
    expect(
      studioRoom4cMultiServiceClientGauntletV1.frozenLaunchNowServices.carousel,
    ).toBe("NOT ON LAUNCH MENU");
  });

  it("keeps Scenario 1 closed, Scenario 2 pending owner decision, Scenario 3 unstarted", () => {
    expect(studioRoom4cMultiServiceClientGauntletV1.status).toBe("OPEN");
    expect(studioRoom4cMultiServiceClientGauntletV1.scenarios[0]?.status).toBe(
      "PASS WITH EXPLICIT LIMITS",
    );
    expect(studioRoom4cMultiServiceClientGauntletV1.scenarios[1]?.status).toBe(
      "EXECUTED_OWNER_DECISION_PENDING",
    );
    expect(studioRoom4cMultiServiceClientGauntletV1.scenarios[2]?.status).toBe(
      "NOT_STARTED",
    );
  });
});

describe("Room 4C Scenario 2 — acceptance and routing", () => {
  it("admits Launch Now deliverables and refuses carousel", () => {
    const result = evaluateScenario2Acceptance({ askedForCarousel: true });
    expect(result.admit).toBe(true);
    expect(result.menuOk).toBe(true);
    expect(result.carousel.admit).toBe(false);
    expect(result.unsupportedRefused).toContain("carousel");
    expect(result.disclosedLimits.some((l) => l.includes("No shop URL"))).toBe(
      true,
    );
  });

  it("routes every deliverable from the shared brief after the fact gate", () => {
    const routes = routeScenario2Services();
    expect(routes.map((r) => r.deliverableId)).toEqual(
      expect.arrayContaining([
        "campaign-direction",
        "campaign-set",
        "social-square",
        "social-vertical",
        "print-counter-card",
        "promo-caption",
        "promo-email",
        "short-vertical-video",
      ]),
    );
    expect(routes.find((r) => r.skuId === "v2-rtu-short-video")?.toolId).toBe(
      "shotstack",
    );
  });
});

describe("Room 4C Scenario 2 — copy quality", () => {
  it("passes required facts on caption and email and fails unsupported claims", () => {
    const caption = buildScenario2Caption();
    const email = buildScenario2Email();
    const copyBrief = scenario2CopyQualityBrief();
    const captionPass = evaluateCopyQuality({
      brief: copyBrief,
      submission: { kind: "plain_text", plainText: caption },
    });
    expect(captionPass.ok).toBe(true);
    const emailPass = evaluateCopyQuality({
      brief: { ...copyBrief, maxEmails: 1 },
      submission: { kind: "email_set", emails: [email] },
    });
    expect(emailPass.ok).toBe(true);
    expect(formatScenario2EmailPasteReady()).toContain("$48");
    expect(formatScenario2EmailPasteReady()).not.toContain("harborroast.example");

    const fail = evaluateCopyQuality({
      brief: copyBrief,
      submission: {
        kind: "plain_text",
        plainText: `${caption}\nBest coffee. Guaranteed.`,
      },
    });
    expect(fail.ok).toBe(false);
  });

  it("uses the continuous narration and does not speak contact", () => {
    const script = buildScenario2NarrationScript();
    expect(script).toBe(
      "Harbor Roast Coffee Co. presents the Autumn Single-Origin Box. This limited launch is forty-eight dollars, available October first through October thirty-first, twenty twenty-six. A seasonal coffee box for fall. Get the limited box while it lasts.",
    );
    expect(script).toContain(brief.customer.businessName);
    expect(script).toContain(brief.offer.name);
    expect(script).not.toContain("harborroast.example");
    expect(script).not.toContain("@");
    expect(script).not.toContain("(804)");
    expect(staleScenario2FactHits(script)).toEqual([]);
  });

  it("keeps campaign direction on authorized facts only", () => {
    const direction = buildScenario2CampaignDirection();
    expect(direction).toContain("$48");
    expect(direction).toContain("October 1 – October 31, 2026");
    expect(direction).not.toContain("harborroast.example");
  });
});

describe("Room 4C Scenario 2 — exact canonical facts in render sources", () => {
  it("uses the generic fact gate without scenario-specific bypass logic", () => {
    expect(
      SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.approvalStatus,
    ).toBe("OWNER_APPROVED_FOR_CERTIFICATION");
    expect(SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values.priceDisplay).toBe(
      "$48",
    );
    expect(
      SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values.bookingUrl,
    ).toBeUndefined();
    expect(() => routeScenario2Services()).not.toThrow();

    const result = evaluateScenario2CustomerFactSourceGate();
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
    expect(routingSrc).toContain("assertScenario2ProductionRoutingAllowed");
    expect(collectorSrc).toContain("evaluateCustomerFactSourceGate");
    expect(collectorSrc).toContain("SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD");
    expect(collectorSrc).not.toMatch(/if\s*\(.*harbor/i);
  });

  it("puts exact approved facts on social, print, video, caption, and email", () => {
    const caption = buildScenario2Caption();
    expect(caption).toContain("$48");
    expect(caption).toContain("October 1 – October 31, 2026");
    expect(staleScenario2FactHits(caption)).toEqual([]);

    const creative = buildHarborRoastCreativeBrief();
    const printRecipe = getLayoutRecipe("full_bleed_hero", "print_counter_card");
    expect(printRecipe.canvas).toEqual({ widthPx: 1500, heightPx: 2100 });
    const printLayers = emitAssetLayers({
      recipe: printRecipe,
      brief: creative,
      system: HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1,
      heroPreparedMaterialId: "hero",
      logoMaterialId: "logo",
    });
    const price = printLayers.find(
      (l) => l.type === "text" && l.role === "price",
    );
    expect(price?.type).toBe("text");
    if (price?.type === "text") {
      expect(price.content).toBe("$48");
    }
    const contact = printLayers.find(
      (l) => l.type === "text" && l.role === "contact",
    );
    expect(contact).toBeUndefined();

    const squareLayers = emitAssetLayers({
      recipe: getLayoutRecipe("full_bleed_hero", "social_square"),
      brief: creative,
      system: HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1,
      heroPreparedMaterialId: "hero",
      logoMaterialId: "logo",
    });
    const squareText = squareLayers
      .filter((l) => l.type === "text")
      .map((l) => (l.type === "text" ? l.content : ""))
      .join("\n");
    expect(squareText).toContain("$48");
    expect(squareText).toContain("Limited autumn box");
    expect(staleScenario2FactHits(squareText)).toEqual([]);

    const ctaPlate = scenario2VideoCtaPlateCopy();
    expect(ctaPlate.line1).toBe("Limited autumn box");
    expect(ctaPlate.line2).toContain("$48");
  });

  it("does not treat generic-gate test doubles as valid production facts", () => {
    expect(SCENARIO_2_STALE_PHONE).toBe("(804) 555-0100");
    expect(SCENARIO_2_STALE_BOOKING_URL).toBe("harborroast.example/book");
    expect(SCENARIO_2_STALE_EMAIL).toBe("hello@harborroast.example");
    expect(
      staleScenario2FactHits(
        "Order at harborroast.example/book or (804) 555-0100",
      ),
    ).toEqual(
      expect.arrayContaining(["stale-phone-0100", "stale-url-book", "invented-example-host"]),
    );
  });

  it("passes the generic customer-fact source gate for social, email, print, video, and narration", () => {
    const result = evaluateScenario2CustomerFactSourceGate();
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
    const byId = Object.fromEntries(
      collectScenario2CustomerFactSources().map((source) => [
        source.sourceId,
        source,
      ]),
    );
    expect(byId.email?.requireExact).toEqual(
      expect.arrayContaining(["priceDisplay", "datesDisplay", "contentsDisplay"]),
    );
    expect(byId["social-square-layers"]?.text).not.toContain(
      "harborroast.example",
    );
    expect(byId.narration?.forbidSubstrings).toEqual(
      expect.arrayContaining(["harborroast.example", "@"]),
    );
  });
});

describe("Room 4C Scenario 2 — provenance, delivery, and 5x7 print", () => {
  it("rejects assets not bound to the brief hash", () => {
    const briefSha256 = hashScenario2Brief();
    expect(() =>
      buildScenario2Provenance({
        packageId: brief.packageId,
        scenarioId: brief.scenarioId,
        campaignId: brief.campaignId,
        briefSha256,
        visualSystemId: HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1.systemId,
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

  it("requires hashed preview files for the Harbor Roast package", () => {
    const briefSha256 = hashScenario2Brief();
    const file = (
      id: string,
      previewRole:
        | "campaign-direction"
        | "social-square"
        | "social-vertical"
        | "video"
        | "caption"
        | "email"
        | "counter-card-png"
        | "counter-card-pdf",
      mimeType: string,
    ) => ({
      id,
      previewRole,
      relativePath: `deliverables/${id}`,
      contentSha256: "a".repeat(64),
      byteLength: 12,
      mimeType,
    });
    const manifest = buildScenario2DeliveryManifest({
      packageId: brief.packageId,
      scenarioId: brief.scenarioId,
      campaignId: brief.campaignId,
      briefSha256,
      generatedAt: "2026-08-20T00:00:00.000Z",
      files: [
        file("campaign-direction.md", "campaign-direction", "text/markdown"),
        file("social-square.png", "social-square", "image/png"),
        file("social-vertical.png", "social-vertical", "image/png"),
        file("video.mp4", "video", "video/mp4"),
        file("caption.txt", "caption", "text/plain"),
        file("email.txt", "email", "text/plain"),
        file("counter-card.png", "counter-card-png", "image/png"),
        file("counter-card.pdf", "counter-card-pdf", "application/pdf"),
      ],
    });
    expect(manifest.files).toHaveLength(8);
  });

  it("keeps historical print_handout v1 and treats 5x7 as a separate contract", () => {
    expect(CAMPAIGN_FORMAT_CANVASES.print_handout).toEqual({
      widthPx: 1024,
      heightPx: 1536,
    });
    expect(CAMPAIGN_PRINT_HANDOUT_CONTRACT_V1.widthPx).toBe(1024);
    expect(CAMPAIGN_PRINT_COUNTER_CARD_CONTRACT_V1_5X7).toEqual({
      contractId: "campaign-print-counter-card-v1-5x7",
      widthPx: 1500,
      heightPx: 2100,
      pdfPage: {
        width: "5in",
        height: "7in",
        widthPt: 360,
        heightPt: 504,
      },
    });
    expect(isFiveBySevenMediaBox({ width: 360, height: 504 })).toBe(true);
    expect(isFiveBySevenMediaBox({ width: 612, height: 792 })).toBe(false);
  });
});
