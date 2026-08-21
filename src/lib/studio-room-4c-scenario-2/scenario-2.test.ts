import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  ROOM_4C_SCENARIO_2_CAMPAIGN_ID,
  studioRoom4cScenario2HarborRoastV1 as brief,
} from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";
import { studioRoom4cMultiServiceClientGauntletV1 } from "@/config/studio-room-4c-multi-service-client-gauntlet-v1";
import { evaluateCopyQuality } from "@/lib/studio-kitchen-production/copy-quality/evaluate";
import { evaluateProductionRoutingEligibility } from "@/lib/studio-customer-facts";
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
import { evaluateProductRepresentation } from "@/lib/studio-product-representation";
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
  evaluateScenario2ProductRepresentation,
  formatScenario2EmailPasteReady,
  hashScenario2Brief,
  routeScenario2Services,
  scenario2CopyQualityBrief,
  scenario2EmailCopyQualityBrief,
  scenario2VideoCtaPlateCopy,
  SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
  SCENARIO_2_APPROVED_PRODUCT_REPRESENTATION,
  SCENARIO_2_AUTHORIZED_UNIT_COUNT,
  SCENARIO_2_AUTHORIZED_UNIT_TYPE,
  SCENARIO_2_HERO_GENERATION_PROMPT,
  SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC,
  SCENARIO_2_STALE_BOOKING_URL,
  SCENARIO_2_STALE_CTA,
  SCENARIO_2_STALE_EMAIL,
  SCENARIO_2_STALE_PHONE,
  SCENARIO_2_VISUAL_UNIT_TYPE,
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
    expect(creative.facts.cta).toBe("Shop the autumn box");
    expect(creative.facts.bookingContact).toBe("harborroast.example/autumn-box");
    expect(creative.facts.supportingCopy).toBe(
      "three 8-ounce bags of whole-bean single-origin coffee",
    );
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

  it("locks authorized URL, email, and contents without inventing a phone", () => {
    expect(brief.facts.bookingContact).toBe("harborroast.example/autumn-box");
    expect(brief.cta.bookingUrl).toBe("harborroast.example/autumn-box");
    expect(brief.cta.supportEmail).toBe("hello@harborroast.example");
    expect(brief.offer.contentsDisplay).toBe(
      "three 8-ounce bags of whole-bean single-origin coffee",
    );
    expect(brief.offer.contentsDisplay).not.toBe(brief.offer.name);
    expect(brief.refusedIfAsked).toContain("carousel");
    expect(JSON.stringify(brief)).not.toContain("(804)");
    expect(JSON.stringify(brief)).not.toContain("harborroast.example/book");
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
    expect(result.disclosedLimits.some((l) => l.includes("No phone"))).toBe(
      true,
    );
    expect(
      result.disclosedLimits.some((l) =>
        l.includes("harborroast.example/autumn-box"),
      ),
    ).toBe(true);
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
    const emailCopyBrief = scenario2EmailCopyQualityBrief();
    const emailPass = evaluateCopyQuality({
      brief: { ...emailCopyBrief, maxEmails: 1 },
      submission: { kind: "email_set", emails: [email] },
    });
    expect(emailPass.ok).toBe(true);
    expect(formatScenario2EmailPasteReady()).toContain("$48");
    expect(formatScenario2EmailPasteReady()).toContain(
      "harborroast.example/autumn-box",
    );
    expect(formatScenario2EmailPasteReady()).toContain(
      "hello@harborroast.example",
    );
    expect(formatScenario2EmailPasteReady()).not.toContain(
      "harborroast.example/book",
    );

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
      "Harbor Roast Coffee Co. presents the Autumn Single-Origin Box. This autumn launch is forty-eight dollars and includes three 8-ounce bags of whole-bean single-origin coffee, available October first through October thirty-first, twenty twenty-six. Shop the autumn box this October.",
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
    expect(direction).toContain("harborroast.example/autumn-box");
    expect(direction).toContain("hello@harborroast.example");
    expect(direction).toContain(
      "three 8-ounce bags of whole-bean single-origin coffee",
    );
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
    expect(SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values.bookingUrl).toBe(
      "harborroast.example/autumn-box",
    );
    expect(SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values.emailDisplay).toBe(
      "hello@harborroast.example",
    );
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
    expect(contact?.type).toBe("text");
    if (contact?.type === "text") {
      expect(contact.content).toBe("harborroast.example/autumn-box");
    }
    const body = printLayers.find((l) => l.type === "text" && l.role === "body");
    expect(body?.type).toBe("text");
    if (body?.type === "text") {
      expect(body.content).toBe(
        "three 8-ounce bags of whole-bean single-origin coffee",
      );
    }

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
    expect(squareText).toContain("Shop the autumn box");
    expect(squareText).toContain("harborroast.example/autumn-box");
    expect(squareText).toContain(
      "three 8-ounce bags of whole-bean single-origin coffee",
    );
    expect(staleScenario2FactHits(squareText)).toEqual([]);

    const ctaPlate = scenario2VideoCtaPlateCopy();
    expect(ctaPlate.line1).toBe("Shop the autumn box");
    expect(ctaPlate.line2).toBe("harborroast.example/autumn-box");
    expect(ctaPlate.line3).toBe("$48");
  });

  it("does not treat generic-gate test doubles as valid production facts", () => {
    expect(SCENARIO_2_STALE_PHONE).toBe("(804) 555-0100");
    expect(SCENARIO_2_STALE_BOOKING_URL).toBe("harborroast.example/book");
    expect(SCENARIO_2_STALE_EMAIL).toBe("info@harborroast.example");
    expect(SCENARIO_2_STALE_CTA).toBe("Limited autumn box");
    expect(
      staleScenario2FactHits(
        "Order at harborroast.example/book or (804) 555-0100",
      ),
    ).toEqual(expect.arrayContaining(["stale-phone-0100", "stale-url-book"]));
    expect(staleScenario2FactHits("Limited autumn box")).toEqual([
      "stale-cta-limited",
    ]);
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
      expect.arrayContaining([
        "priceDisplay",
        "datesDisplay",
        "contentsDisplay",
        "bookingUrl",
        "emailDisplay",
      ]),
    );
    expect(byId["social-square-layers"]?.text).toContain(
      "harborroast.example/autumn-box",
    );
    expect(byId.narration?.forbidExact).toEqual(
      expect.arrayContaining(["bookingUrl", "emailDisplay"]),
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

describe("Room 4C Scenario 2 — authorized-fact omission correction proofs", () => {
  const contents = "three 8-ounce bags of whole-bean single-origin coffee";
  const productUrl = "harborroast.example/autumn-box";
  const supportEmail = "hello@harborroast.example";

  it("1. product name cannot substitute for contents", () => {
    expect(brief.offer.contentsDisplay).toBe(contents);
    expect(brief.offer.contentsDisplay).not.toBe(brief.offer.name);
    expect(
      SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values.contentsDisplay,
    ).not.toBe(SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values.offerName);
  });

  it("2. exact contents reach every applicable render and copy source", () => {
    const byId = Object.fromEntries(
      collectScenario2CustomerFactSources().map((source) => [
        source.sourceId,
        source,
      ]),
    );
    for (const id of [
      "social-square-layers",
      "social-vertical-layers",
      "caption",
      "email",
      "print-counter-card-layers",
      "video-offer-plate",
      "narration",
    ]) {
      expect(byId[id]?.text).toContain(contents);
    }
  });

  it("3. exact URL reaches email, caption, counter card, video CTA, and social", () => {
    const byId = Object.fromEntries(
      collectScenario2CustomerFactSources().map((source) => [
        source.sourceId,
        source,
      ]),
    );
    for (const id of [
      "email",
      "caption",
      "print-counter-card-layers",
      "video-cta-plate",
      "social-square-layers",
      "social-vertical-layers",
    ]) {
      expect(byId[id]?.text).toContain(productUrl);
    }
  });

  it("4. exact support email reaches the email package", () => {
    const email = formatScenario2EmailPasteReady();
    expect(email).toContain(supportEmail);
    expect(email).toMatch(/^Subject:/m);
    expect(email).toMatch(/^Preheader:/m);
    expect(email).toContain("$48");
    expect(email).toContain(contents);
    expect(email).toContain("October 1 – October 31, 2026");
    expect(email).toContain("Shop the autumn box");
    expect(email).toContain(productUrl);
  });

  it("5. missing URL blocks routing", () => {
    const routing = evaluateProductionRoutingEligibility({
      approvedRecord: {
        ...SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
        values: {
          ...SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values,
          bookingUrl: "",
        },
      },
    });
    expect(routing.routingAllowed).toBe(false);
    expect(
      routing.findings.some(
        (f) => f.code === "required_fact_missing" && f.factId === "bookingUrl",
      ),
    ).toBe(true);
  });

  it("6. missing support email blocks routing", () => {
    const routing = evaluateProductionRoutingEligibility({
      approvedRecord: {
        ...SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
        values: {
          ...SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values,
          emailDisplay: "",
        },
      },
    });
    expect(routing.routingAllowed).toBe(false);
    expect(
      routing.findings.some(
        (f) => f.code === "required_fact_missing" && f.factId === "emailDisplay",
      ),
    ).toBe(true);
  });

  it("7. no phone is required or invented", () => {
    expect(SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.requiredFactIds).not.toContain(
      "phoneDisplay",
    );
    expect(() => routeScenario2Services()).not.toThrow();
    const joined = collectScenario2CustomerFactSources()
      .map((source) => source.text)
      .join("\n");
    expect(joined).not.toContain("(804)");
    expect(staleScenario2FactHits(joined)).toEqual([]);
  });

  it("8. the 5x7 PNG contract remains valid", () => {
    const recipe = getLayoutRecipe("full_bleed_hero", "print_counter_card");
    expect(recipe.canvas).toEqual({ widthPx: 1500, heightPx: 2100 });
    expect(CAMPAIGN_PRINT_COUNTER_CARD_CONTRACT_V1_5X7.pdfPage).toEqual({
      width: "5in",
      height: "7in",
      widthPt: 360,
      heightPt: 504,
    });
  });

  it("9. video duration contract remains 20–30 seconds", () => {
    const src = readFileSync(
      path.join(__dirname, "../../../scripts/execute-room-4c-scenario-2.mts"),
      "utf8",
    );
    expect(src).toContain("durationMinSeconds: 20");
    expect(src).toContain("durationMaxSeconds: 30");
    expect(src).toContain("videoDuration >= 20 && videoDuration <= 30");
  });

  it("10. Scenario 1 approved deliverable hashes remain unchanged", () => {
    const expected: Record<string, string> = {
      "social-square.png":
        "a565cd5f1fd2cb3d174daa0eb87029a819c322f6b7be88af9258bc9982cd7c6e",
      "video.mp4":
        "cdca7998bb6fded01b42248dca0c22e029d9e350e248801511aab8a45d0a5ff9",
      "caption.txt":
        "2220894a986ecbe144b50a62f85244ee36d8a04b40c32e5a33313f9acb8ad1b5",
      "handout.png":
        "f4ff91ba99c536fd0b1c5efdb5f60a9ed1791253fc91e4b79da722ef4d17debf",
      "handout.pdf":
        "ff931b9249f95d5ba96f732412b57171878fcf63c07e151fc859c6c9180131a0",
    };
    const root = path.join(
      __dirname,
      "../../../docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-1-cedar-lane/deliverables",
    );
    for (const [file, hash] of Object.entries(expected)) {
      const actual = createHash("sha256")
        .update(readFileSync(path.join(root, file)))
        .digest("hex");
      expect(actual).toBe(hash);
    }
  });
});

describe("Room 4C Scenario 2 — CTA authority correction proofs", () => {
  const approvedCta = "Shop the autumn box";
  const contents = "three 8-ounce bags of whole-bean single-origin coffee";
  const productUrl = "harborroast.example/autumn-box";
  const supportEmail = "hello@harborroast.example";
  const dates = "October 1 – October 31, 2026";

  it("1. a CTA different from the approved CTA fails", () => {
    expect(evaluateScenario2CustomerFactSourceGate().ok).toBe(true);
    const swapped = evaluateProductionRoutingEligibility({
      approvedRecord: {
        ...SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
        values: {
          ...SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values,
          cta: "Reserve yours",
        },
      },
      candidateValues: {
        ...SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.values,
        cta: "Shop the autumn box",
      },
    });
    expect(swapped.routingAllowed).toBe(false);
    expect(swapped.findings.map((f) => f.code)).toContain("owner_lock_mismatch");
  });

  it("2. a non-action label cannot substitute for the approved CTA", () => {
    expect(brief.cta.label).toBe(approvedCta);
    expect(brief.cta.label).not.toBe("Limited autumn box");
    expect(staleScenario2FactHits("Limited autumn box")).toContain(
      "stale-cta-limited",
    );
    const joined = collectScenario2CustomerFactSources()
      .map((source) => source.text)
      .join("\n");
    expect(joined).not.toMatch(/\blimited\b/i);
  });

  it("3. unauthorized scarcity language fails", () => {
    const fail = evaluateCopyQuality({
      brief: scenario2CopyQualityBrief(),
      submission: {
        kind: "plain_text",
        plainText: `${buildScenario2Caption()}\nWhile supplies last.`,
      },
    });
    expect(fail.ok).toBe(false);
  });

  it("4. exact approved CTA reaches all applicable render and copy sources", () => {
    const byId = Object.fromEntries(
      collectScenario2CustomerFactSources().map((source) => [
        source.sourceId,
        source,
      ]),
    );
    for (const id of [
      "social-square-layers",
      "social-vertical-layers",
      "caption",
      "email",
      "print-counter-card-layers",
      "video-cta-plate",
      "narration",
    ]) {
      expect(byId[id]?.text).toContain(approvedCta);
    }
    expect(buildScenario2CampaignDirection()).toContain(approvedCta);
  });

  it("5. authorized availability dates remain intact", () => {
    expect(brief.offer.windowDisplay).toBe(dates);
    expect(buildScenario2Caption()).toContain(dates);
    expect(formatScenario2EmailPasteReady()).toContain(dates);
  });

  it("6. contents, price, URL, and support email remain correct", () => {
    expect(brief.offer.contentsDisplay).toBe(contents);
    expect(brief.offer.priceDisplay).toBe("$48");
    expect(brief.cta.bookingUrl).toBe(productUrl);
    expect(brief.cta.supportEmail).toBe(supportEmail);
    const email = formatScenario2EmailPasteReady();
    expect(email).toContain(contents);
    expect(email).toContain("$48");
    expect(email).toContain(productUrl);
    expect(email).toContain(supportEmail);
  });

  it("7. Scenario 1 approved deliverable hashes remain unchanged", () => {
    const expected: Record<string, string> = {
      "social-square.png":
        "a565cd5f1fd2cb3d174daa0eb87029a819c322f6b7be88af9258bc9982cd7c6e",
      "video.mp4":
        "cdca7998bb6fded01b42248dca0c22e029d9e350e248801511aab8a45d0a5ff9",
      "caption.txt":
        "2220894a986ecbe144b50a62f85244ee36d8a04b40c32e5a33313f9acb8ad1b5",
      "handout.png":
        "f4ff91ba99c536fd0b1c5efdb5f60a9ed1791253fc91e4b79da722ef4d17debf",
      "handout.pdf":
        "ff931b9249f95d5ba96f732412b57171878fcf63c07e151fc859c6c9180131a0",
    };
    const root = path.join(
      __dirname,
      "../../../docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-1-cedar-lane/deliverables",
    );
    for (const [file, hash] of Object.entries(expected)) {
      const actual = createHash("sha256")
        .update(readFileSync(path.join(root, file)))
        .digest("hex");
      expect(actual).toBe(hash);
    }
  });
});

describe("Room 4C Scenario 2 — product-representation correction proofs", () => {
  const contents = "three 8-ounce bags of whole-bean single-origin coffee";
  const productUrl = "harborroast.example/autumn-box";
  const supportEmail = "hello@harborroast.example";
  const dates = "October 1 – October 31, 2026";

  it("1. one depicted bag fails against an authorized count of three", () => {
    const result = evaluateProductRepresentation({
      authorized: SCENARIO_2_APPROVED_PRODUCT_REPRESENTATION,
      visualSpec: {
        ...SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC,
        visualUnitCount: 1,
        generationPrompt:
          "Warm product photo of one sealed 8-ounce coffee bag in an open gift box.",
      },
      postRenderAltText: contents,
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain("unit_count_mismatch");
    expect(result.findings.map((f) => f.code)).toContain(
      "post_render_alt_text_cannot_substitute",
    );
  });

  it("2. loose bulk coffee cannot substitute for three packaged bags", () => {
    const result = evaluateProductRepresentation({
      authorized: SCENARIO_2_APPROVED_PRODUCT_REPRESENTATION,
      visualSpec: {
        ...SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC,
        visualUnitCount: 3,
        visualUnitType: "loose bulk coffee",
        packageType: "loose_bulk",
        generationPrompt:
          "Photograph of three scoops of loose bulk coffee poured into a box.",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "loose_bulk_substituted_for_packaged_bags",
    );
  });

  it("3. three packaged bags pass", () => {
    expect(SCENARIO_2_APPROVED_PRODUCT_REPRESENTATION.unitCount).toBe(
      SCENARIO_2_AUTHORIZED_UNIT_COUNT,
    );
    expect(SCENARIO_2_APPROVED_PRODUCT_REPRESENTATION.unitType).toBe(
      SCENARIO_2_AUTHORIZED_UNIT_TYPE,
    );
    expect(SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC.visualUnitCount).toBe(3);
    expect(SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC.visualUnitType).toBe(
      SCENARIO_2_VISUAL_UNIT_TYPE,
    );
    expect(evaluateScenario2ProductRepresentation().ok).toBe(true);
    expect(SCENARIO_2_HERO_GENERATION_PROMPT).toContain("three");
    expect(SCENARIO_2_HERO_GENERATION_PROMPT).toMatch(/\b(sealed|packaged)\b/i);
  });

  it("4. no unauthorized product claims enter labels or copy", () => {
    const joined = collectScenario2CustomerFactSources()
      .map((source) => source.text)
      .join("\n");
    expect(joined.toLowerCase()).not.toMatch(/award-winning|ethiopian|tasting notes|free shipping/);
    expect(evaluateScenario2ProductRepresentation().findings.map((f) => f.code)).not.toContain(
      "unauthorized_product_claim",
    );
  });

  it("5. corrected product identity reaches every visual format", () => {
    expect(SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC.boundFormatIds).toEqual([
      "social_square",
      "social_vertical",
      "print_counter_card",
      "short_vertical_video",
    ]);
    const creative = buildHarborRoastCreativeBrief();
    expect(creative.selectedAssetIds.primaryPhotoId).toBe("harbor-roast-hero-box");
    expect(creative.targetFormats).toEqual([
      "social_square",
      "social_vertical",
      "print_counter_card",
    ]);
    const src = readFileSync(
      path.join(__dirname, "../../../scripts/execute-room-4c-scenario-2.mts"),
      "utf8",
    );
    expect(src).toContain("assertScenario2ProductRepresentation");
    expect(src).toContain("harbor-roast-hero-box.png");
    expect(src).toContain("short_vertical_video");
  });

  it("6. price, dates, CTA, contents, URL, and email remain correct", () => {
    expect(brief.offer.priceDisplay).toBe("$48");
    expect(brief.offer.windowDisplay).toBe(dates);
    expect(brief.cta.label).toBe("Shop the autumn box");
    expect(brief.offer.contentsDisplay).toBe(contents);
    expect(brief.cta.bookingUrl).toBe(productUrl);
    expect(brief.cta.supportEmail).toBe(supportEmail);
    const email = formatScenario2EmailPasteReady();
    expect(email).toContain("$48");
    expect(email).toContain(dates);
    expect(email).toContain("Shop the autumn box");
    expect(email).toContain(contents);
    expect(email).toContain(productUrl);
    expect(email).toContain(supportEmail);
  });

  it("7. Scenario 1 approved deliverable hashes remain unchanged", () => {
    const expected: Record<string, string> = {
      "social-square.png":
        "a565cd5f1fd2cb3d174daa0eb87029a819c322f6b7be88af9258bc9982cd7c6e",
      "video.mp4":
        "cdca7998bb6fded01b42248dca0c22e029d9e350e248801511aab8a45d0a5ff9",
      "caption.txt":
        "2220894a986ecbe144b50a62f85244ee36d8a04b40c32e5a33313f9acb8ad1b5",
      "handout.png":
        "f4ff91ba99c536fd0b1c5efdb5f60a9ed1791253fc91e4b79da722ef4d17debf",
      "handout.pdf":
        "ff931b9249f95d5ba96f732412b57171878fcf63c07e151fc859c6c9180131a0",
    };
    const root = path.join(
      __dirname,
      "../../../docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-1-cedar-lane/deliverables",
    );
    for (const [file, hash] of Object.entries(expected)) {
      const actual = createHash("sha256")
        .update(readFileSync(path.join(root, file)))
        .digest("hex");
      expect(actual).toBe(hash);
    }
  });
});

