import { describe, expect, it } from "vitest";
import path from "path";

import { DESIGN_INTELLIGENCE_VERSION } from "@/config/studio-design-intelligence-v1";
import { OWNER_QUALITY_DOCTRINE, classifyFeedback } from "./calibration";
import { critiqueAsCreativeDirector } from "./creative-director";
import { evaluateFullCanvasComposition, measureCanvasDistribution } from "./full-canvas";
import { isEngineeringDefect } from "./engineering-recovery";
import { researchCategoryPrinciples } from "./reference-research";
import { requestCreativeGuidance } from "./studio-manager";
import { DESIGN_TOOL_CHEST, routeProductionMethod } from "./tool-chest";
import {
  buildHybridImagePrompt,
  promptOwnsNoCustomerFacts,
  sanitizeCritiqueForImagePrompt,
} from "./hybrid-image";
import { composeHybridSpec, hybridSpecOwnsExactFacts } from "./compose-hybrid";
import {
  collectProviderCost,
  documentedImageOutputTokens,
  evaluateSkuMargin,
  priceProviderUsage,
  recordAnthropicCall,
  recordProviderCall,
  resetUnattributedProviderCallCount,
  summarizeProviderCost,
  unattributedProviderCallCount,
} from "./cost-telemetry";
import { deriveCreativeBrief, selectCreativeDirection } from "@/lib/studio-design-intelligence";
import { reasonFlyerDesignSpecDeterministic } from "@/lib/studio-design-renderer/reason";
import type { FlyerProjectTruth } from "@/lib/studio-design-renderer/types";
import { paletteForBrief } from "@/lib/studio-design-intelligence";
import { evaluateFlyerSpecCreativeQuality } from "@/lib/studio-design-renderer/flyer-creative-quality";
import { validateFlyerDesignSpec } from "@/lib/studio-design-renderer/validate-spec";

const REPO = path.resolve(__dirname, "../../..");

function truthFrom(input: {
  campaignId: string;
  businessName: string;
  purpose: string;
  mustInclude: string;
  materials: string;
}): FlyerProjectTruth {
  const brief = deriveCreativeBrief({
    businessName: input.businessName,
    flyerPurpose: input.purpose,
    mustInclude: input.mustInclude,
    materials: input.materials,
    intendedUse: "Both print and digital",
    sizeNotes: "",
    cta: "Call or visit",
    headline: input.purpose,
    offerName: input.mustInclude.split("\n")[1] ?? input.businessName,
    body: input.mustInclude
      .split("\n")
      .slice(2)
      .filter(
        (line) =>
          !/\(\d{3}\)/.test(line) &&
          !/\.example/.test(line) &&
          !/\$\d/.test(line),
      )
      .join(" ")
      .slice(0, 280),
    logoAvailable: false,
    suppliedImagery: false,
    requiredFacts: [],
  });
  const direction = selectCreativeDirection({ brief, recent: [] });
  const palette = paletteForBrief(brief);
  const price = input.mustInclude.match(/\$\s?\d+/)?.[0] ?? "";
  return {
    campaignId: input.campaignId,
    jobId: `${input.campaignId}:v2-rtu-flyer`,
    dispatchId: `dd:${input.campaignId}:v2-rtu-flyer`,
    skuId: "v2-rtu-flyer",
    fixtureId: input.campaignId,
    label: "Project Alpha QA",
    outputMode: "customer",
    businessName: input.businessName,
    wordmark: input.businessName,
    descriptor: "",
    headline: input.purpose,
    offerName: input.mustInclude.split("\n")[1] ?? input.businessName,
    priceDisplay: price.replace(/\s+/g, ""),
    dateWindow: "",
    body: input.mustInclude
      .split("\n")
      .slice(2)
      .filter(
        (line) =>
          !/\(\d{3}\)/.test(line) &&
          !/\.example/.test(line) &&
          !/\$\d/.test(line),
      )
      .join(" ")
      .slice(0, 280),
    cta: "Call or visit",
    phone: input.mustInclude.match(/\(\d{3}\)\s?\d{3}-\d{4}/)?.[0] ?? "",
    webDisplay: input.mustInclude.match(/[a-z0-9.-]+\.example/)?.[0] ?? "",
    webUrl: "",
    disclaimer: "",
    intendedUse: "Both print and digital",
    brandColors: {
      primary: palette.primary,
      secondary: palette.secondary,
      background: palette.background,
      text: palette.text,
      muted: palette.muted,
    },
    approvedLogoVariantId: null,
    materials: [],
    requiredTextTokens: [input.businessName.split(/\s+/)[0]!],
    prohibitedClaimPatterns: ["guarantee"],
    creativeDirection: direction,
  };
}

describe("Project Alpha design oversight", () => {
  it("encodes Owner doctrine and distinguishes learning levels", () => {
    expect(OWNER_QUALITY_DOCTRINE.length).toBeGreaterThanOrEqual(6);
    expect(classifyFeedback({ text: "I personally prefer pink." })).toBe(
      "customer_preference",
    );
    expect(
      classifyFeedback({ text: "The CTA is unreadable at mobile size." }),
    ).toBe("studio_quality_lesson");
    expect(
      classifyFeedback({
        text: "Paid creative must look commercially competitive.",
      }),
    ).toBe("owner_quality_doctrine");
  });

  it("routes a luxury beauty brief to image-plus-renderer without trusting image text", () => {
    const brief = deriveCreativeBrief({
      businessName: "Atelier Lune",
      flyerPurpose: "Salon opening",
      mustInclude: "Atelier Lune\nQuiet facial hour\nLuxury facial for members.",
      materials: "Elegant, premium. No logo.",
      intendedUse: "Both print and digital",
      sizeNotes: "",
      cta: "Reserve",
      headline: "Quiet facial hour",
      offerName: "Quiet facial hour",
      body: "Luxury facial for members.",
      logoAvailable: false,
      suppliedImagery: false,
      requiredFacts: [],
    });
    const routed = routeProductionMethod(brief);
    expect(routed.method).toBe("image_plus_renderer");
    expect(routed.criticalTextMustStayInRenderer).toBe(true);
    expect(DESIGN_TOOL_CHEST.some((tool) => tool.id === "openai_image_generation")).toBe(
      true,
    );
    expect(researchCategoryPrinciples(brief).industryFamily).toBe("beauty_wellness");
  });

  it("rejects a top-heavy words-on-field spec and asks Studio Manager for correction", async () => {
    const truth = truthFrom({
      campaignId: "alpha-topheavy",
      businessName: "The Studio",
      purpose: "Opening October 2026",
      mustInclude:
        "THE STUDIO\nOpening October 2026\nCreative services for small businesses and entrepreneurs.",
      materials: "modern, elevated, polished, editorial, and slightly edgy",
    });
    const hollow = reasonFlyerDesignSpecDeterministic(truth);
    hollow.layers = hollow.layers.filter(
      (layer) =>
        layer.id === "field-bleed" ||
        (layer.type === "text" &&
          (layer.role === "wordmark" || layer.role === "headline")),
    );
    const report = measureCanvasDistribution(hollow);
    expect(report.topHeavy || !report.lowerThirdHasDesignedContent).toBe(true);
    const canvasFails = evaluateFullCanvasComposition({ spec: hollow, truth });
    expect(canvasFails.length).toBeGreaterThan(0);
    const director = critiqueAsCreativeDirector({ spec: hollow, truth });
    expect(director.ok).toBe(false);
    const guidance = await requestCreativeGuidance({
      campaignId: truth.campaignId,
      skuId: "v2-rtu-flyer",
      brief: truth.creativeDirection!.brief,
      question: "Composition confidence is low.",
      spec: hollow,
      truth,
    });
    expect(["studio_correction_required", "use_image_generation", "reroute_design"]).toContain(
      guidance.action,
    );
    expect(guidance.doNotInventCustomerFacts).toBe(true);
    expect(guidance.ownerOnly).toBe(false);
  });

  it("full-canvas intelligent layouts pass Creative Director for three industries", () => {
    const trucking = truthFrom({
      campaignId: "intel-qa-trucking",
      businessName: "Iron Range Freight",
      purpose: "Regional trucking capacity",
      mustInclude:
        "Iron Range Freight\nDedicated lanes\nRegional freight and dedicated trucking lanes for manufacturers.\n(218) 555-0194\nironrangefreight.example\n$240",
      materials: "No logo. Professional and readable.",
    });
    const bakery = truthFrom({
      campaignId: "intel-qa-bakery",
      businessName: "Hearth & Rye",
      purpose: "Weekend pastry menu",
      mustInclude:
        "Hearth & Rye\nSaturday pastry window\nNeighborhood bakery. Butter croissants and rye loaves.\n(612) 555-0177\nhearthandrye.example\n$12",
      materials: "Warm and welcoming. No photos.",
    });
    const architecture = truthFrom({
      campaignId: "intel-qa-architecture",
      businessName: "North Line Architects",
      purpose: "Studio open house",
      mustInclude:
        "North Line Architects\nFall studio open house\nResidential architecture for families who want quiet, lasting houses.\n(651) 555-0118\nnorthlinearchitects.example",
      materials: "Elegant, premium, type-led. No logo.",
    });
    const specs = [trucking, bakery, architecture].map((truth) => {
      const spec = reasonFlyerDesignSpecDeterministic(truth);
      expect(validateFlyerDesignSpec(REPO, spec, truth)).toEqual({ ok: true });
      const fails = evaluateFlyerSpecCreativeQuality(spec, truth).filter(
        (finding) => finding.severity === "fail",
      );
      expect(fails).toEqual([]);
      expect(critiqueAsCreativeDirector({ spec, truth }).ok).toBe(true);
      expect(spec.layers.some((layer) => layer.id === "footer-band")).toBe(true);
      expect(spec.creativeDirection?.intelligenceVersion).toBe(
        DESIGN_INTELLIGENCE_VERSION,
      );
      return spec;
    });
    const layouts = new Set(
      specs.map((spec) => spec.creativeDirection?.layoutFamilyId),
    );
    const palettes = new Set(specs.map((spec) => spec.colors.primary));
    expect(layouts.size).toBe(3);
    expect(palettes.size).toBe(3);
  });

  it("Customer-One sparse facts occupy top, mid, and footer without inventing contact", () => {
    const studio = truthFrom({
      campaignId: "9c6c25f2-2562-4192-97a5-44536e45cd18",
      businessName: "The Studio",
      purpose: "Opening October 2026",
      mustInclude:
        "THE STUDIO\nOpening October 2026\nCreative services for small businesses and entrepreneurs.\nProfessional design, marketing copy, social content, and short-form video created through an AI Production Team.\nNow accepting launch clients.",
      materials:
        "No logo yet. Use the business name The Studio as a clean wordmark. The look should feel modern, elevated, polished, editorial, and slightly edgy.",
    });
    studio.cta = "Now accepting launch clients";
    studio.phone = "";
    studio.webDisplay = "";
    studio.priceDisplay = "";
    studio.headline = "Opening October 2026";
    studio.offerName = "Creative services for small businesses and entrepreneurs.";
    studio.body =
      "Professional design, marketing copy, social content, and short-form video created through an AI Production Team.";
    const spec = reasonFlyerDesignSpecDeterministic(studio);
    expect(validateFlyerDesignSpec(REPO, spec, studio)).toEqual({ ok: true });
    const report = measureCanvasDistribution(spec);
    expect(report.topHeavy).toBe(false);
    expect(report.lowerThirdHasDesignedContent).toBe(true);
    expect(report.midHasDesignedContent).toBe(true);
    expect(evaluateFullCanvasComposition({ spec, truth: studio })).toEqual([]);
    expect(critiqueAsCreativeDirector({ spec, truth: studio }).ok).toBe(true);
    expect(
      spec.layers.some((layer) => layer.type === "text" && layer.role === "cta"),
    ).toBe(true);
    expect(
      spec.layers.some((layer) => layer.type === "text" && layer.role === "contact_phone"),
    ).toBe(false);
    const tightened = reasonFlyerDesignSpecDeterministic(studio, {
      capDominantGeometry: false,
      tightenComposition: true,
      preferOfferLedHierarchy: false,
      preferAlternateLayoutFamily: true,
    });
    expect(tightened.creativeDirection?.layoutFamilyId).not.toBe(
      spec.creativeDirection?.layoutFamilyId,
    );
  });

  it("treats renderer failure as a Scout engineering defect, not Owner QA", () => {
    expect(isEngineeringDefect("RENDER_FAILURE")).toBe(true);
    expect(isEngineeringDefect("QA_FAILURE")).toBe(false);
  });

  it("keeps hybrid image prompts free of customer facts and composes renderer-owned text", () => {
    const brief = deriveCreativeBrief({
      businessName: "Atelier Noir",
      flyerPurpose: "Fall collection",
      mustInclude: "Atelier Noir\nFall collection night\nEditorial ready-to-wear.\n(212) 555-0144\nateliernoir.example\n$180",
      materials: "Fashion-forward. Choose for me.",
      intendedUse: "Both print and digital",
      sizeNotes: "",
      cta: "Reserve a seat",
      headline: "Fall collection night",
      offerName: "Fall collection night",
      body: "Editorial ready-to-wear.",
      logoAvailable: false,
      suppliedImagery: false,
      requiredFacts: ["Atelier Noir", "(212) 555-0144", "$180"],
    });
    const prompt = buildHybridImagePrompt({
      brief,
      lockedFacts: ["Atelier Noir", "(212) 555-0144", "$180"],
      attempt: 1,
    });
    expect(promptOwnsNoCustomerFacts(prompt, ["Atelier Noir", "(212) 555-0144", "$180"])).toBe(
      true,
    );
    const truth = truthFrom({
      campaignId: "hybrid-compose",
      businessName: "Atelier Noir",
      purpose: "Fall collection night",
      mustInclude:
        "Atelier Noir\nFall collection night\nEditorial ready-to-wear.\n(212) 555-0144\nateliernoir.example\n$180",
      materials: "Fashion-forward. Choose for me.",
    });
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const hybrid = composeHybridSpec(spec, {
      ok: true,
      relativePath: "data/design-intelligence-qa/hybrid-compose/generated/hybrid-visual-a1.png",
      contentSha256: "abc",
      model: "gpt-image-1",
      prompt,
      bytes: 120,
    });
    expect(hybrid.layers[0]?.id).toBe("generated-hero");
    expect(hybrid.layers.some((layer) => layer.id === "offer-panel")).toBe(true);
    expect(hybrid.layers.some((layer) => layer.id === "field-mark")).toBe(false);
    expect(hybrid.layers.some((layer) => layer.id === "paper-mat")).toBe(false);
    expect(hybridSpecOwnsExactFacts(hybrid, ["Atelier Noir", "$180"])).toBe(true);
    expect(
      hybrid.layers.some((layer) => layer.type === "text" && layer.content.includes("$180")),
    ).toBe(true);
    const corrected = buildHybridImagePrompt({
      brief,
      lockedFacts: ["Atelier Noir", "Quiet facial hour", "$180"],
      attempt: 2,
      priorCritique:
        "REJECT — Quiet facial hour appears twice. $180 is unclear. Call (212) 555-0144.",
    });
    expect(
      promptOwnsNoCustomerFacts(corrected, [
        "Atelier Noir",
        "Quiet facial hour",
        "(212) 555-0144",
        "$180",
      ]),
    ).toBe(true);
    expect(corrected.toLowerCase()).not.toContain("quiet facial hour");
  });

  it("never carries raw customer intake prose into the image prompt", () => {
    // Regression: `materials` is customer-authored and routinely repeats the
    // business name, which leaked into the prompt through desiredBrandFeeling.
    const materials =
      "No logo yet. Use the business name The Studio as a clean wordmark. The look should feel modern, elevated, polished, editorial, and slightly edgy.";
    const brief = deriveCreativeBrief({
      businessName: "THE STUDIO",
      flyerPurpose: "Launch announcement for The Studio.",
      mustInclude:
        "THE STUDIO\nOpening October 2026\nCreative services for small businesses and entrepreneurs.\nNow accepting launch clients.",
      materials,
      intendedUse: "Both print and digital",
      sizeNotes: "",
      cta: "Now accepting launch clients",
      headline: "Opening October 2026",
      offerName: "Opening October 2026",
      body: "Creative services for small businesses and entrepreneurs.",
      logoAvailable: false,
      suppliedImagery: false,
      requiredFacts: ["THE STUDIO"],
    });
    expect(brief.desiredBrandFeeling).toContain("The Studio");
    for (const attempt of [1, 2]) {
      const prompt = buildHybridImagePrompt({
        brief,
        lockedFacts: ["THE STUDIO", "Now accepting launch clients"],
        attempt,
      });
      expect(prompt).not.toContain(materials);
      expect(prompt.toLowerCase()).not.toContain("the studio");
      expect(
        promptOwnsNoCustomerFacts(prompt, [
          "THE STUDIO",
          "Opening October 2026",
          "Now accepting launch clients",
        ]),
      ).toBe(true);
    }
  });

  it("directs a retry with the Creative Director's critique instead of rerolling", () => {
    const brief = deriveCreativeBrief({
      businessName: "Atelier Lune",
      flyerPurpose: "Salon opening",
      mustInclude: "Atelier Lune\nQuiet facial hour\nLuxury facial for members.",
      materials: "Choose for me.",
      intendedUse: "Both print and digital",
      sizeNotes: "",
      cta: "Reserve a seat",
      headline: "Quiet facial hour",
      offerName: "Quiet facial hour",
      body: "Luxury facial for members.",
      logoAvailable: false,
      suppliedImagery: false,
      requiredFacts: ["Atelier Lune"],
    });
    const lockedFacts = ["Atelier Lune", "Quiet facial hour", "(212) 555-0144", "$180"];
    const critique =
      "The upper two thirds of Atelier Lune's flyer is empty haze and $180 floats. Push the camera in on wet stone with raking side light and fill the frame.";

    const undirected = buildHybridImagePrompt({
      brief,
      lockedFacts,
      attempt: 2,
    });
    const directed = buildHybridImagePrompt({
      brief,
      lockedFacts,
      attempt: 2,
      priorCritique: critique,
    });

    // The critique must actually change the instruction the provider receives.
    expect(directed).not.toBe(undirected);
    expect(directed).toContain("wet stone with raking side light");
    expect(directed.toLowerCase()).toContain("art director rejected");
    // And it must arrive stripped of every customer fact.
    expect(directed.toLowerCase()).not.toContain("atelier lune");
    expect(directed.toLowerCase()).not.toContain("quiet facial hour");
    expect(directed).not.toContain("$180");
    expect(promptOwnsNoCustomerFacts(directed, lockedFacts)).toBe(true);

    // Sanitizer contract, checked directly.
    const sanitized = sanitizeCritiqueForImagePrompt(critique, lockedFacts);
    expect(sanitized).not.toMatch(/\d/);
    expect(sanitized).toContain("raking side light");
  });

  it("prices provider usage from reported tokens and judges SKU margin", async () => {
    const { ledger } = await collectProviderCost(async () => {
      recordProviderCall({
        provider: "openai",
        model: "gpt-image-1",
        purpose: "image_generation",
        attempt: 2,
        httpStatus: 200,
        usage: { textInputTokens: 200, imageOutputTokens: 6240 },
      });
      recordProviderCall({
        provider: "openai",
        model: "gpt-4.1-mini",
        purpose: "vision_creative_director",
        attempt: 2,
        httpStatus: 200,
        usage: { textInputTokens: 2700, textOutputTokens: 50 },
      });
      recordProviderCall({
        provider: "openai",
        model: "gpt-image-1",
        purpose: "image_generation",
        attempt: 3,
        httpStatus: 200,
        usage: { textInputTokens: 200, imageOutputTokens: 6240 },
      });
    });

    // 6240 image output tokens at $40/1M plus 200 text input tokens at $5/1M.
    expect(priceProviderUsage("gpt-image-1", {
      textInputTokens: 200,
      cachedTextInputTokens: 0,
      imageInputTokens: 0,
      textOutputTokens: 0,
      imageOutputTokens: 6240,
    })).toBeCloseTo(0.2506, 4);

    const summary = summarizeProviderCost(ledger);
    expect(summary.totalCalls).toBe(3);
    expect(summary.imageGenerationCalls).toBe(2);
    expect(summary.visionReviewCalls).toBe(1);
    expect(summary.callsMissingUsage).toBe(0);
    // Attempt 2 is this run's first attempt, so only attempt 3 is retry spend.
    expect(summary.retryCostUsd).toBeCloseTo(0.2506, 4);

    const margin = evaluateSkuMargin({
      skuId: "v2-rtu-flyer",
      priceCents: 6900,
      warningShareOfPrice: 0.15,
      failShareOfPrice: 0.3,
      costPerSeriousAttemptUsd: 0.2518,
    });
    expect(margin.projected.attempts3).toBeCloseTo(0.7554, 4);
    expect(margin.verdict).toBe("no_material_threat");

    // A price low enough to be threatened must be reported as such.
    const thin = evaluateSkuMargin({
      skuId: "hypothetical",
      priceCents: 200,
      warningShareOfPrice: 0.15,
      failShareOfPrice: 0.3,
      costPerSeriousAttemptUsd: 0.2518,
    });
    expect(thin.verdict).toBe("material_threat");
  });

  it("flags a model with no rate-card entry instead of pricing it as free", async () => {
    const { ledger } = await collectProviderCost(async () => {
      recordProviderCall({
        provider: "anthropic",
        model: "some-unpriced-model",
        purpose: "creative_reasoning",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 5000, textOutputTokens: 900 },
      });
    });

    expect(ledger.calls[0]!.rateMissing).toBe(true);
    expect(ledger.calls[0]!.costUsd).toBe(0);

    const summary = summarizeProviderCost(ledger);
    // Zero cost with a missing rate must be visible, or the total reads as
    // complete when it is only a floor.
    expect(summary.callsMissingRate).toBe(1);
    expect(summary.totalCostUsd).toBe(0);
  });

  it("does not flag a priced model as missing a rate", async () => {
    const { ledger } = await collectProviderCost(async () => {
      recordProviderCall({
        provider: "openai",
        model: "gpt-image-1",
        purpose: "image_generation",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 200, imageOutputTokens: 6240 },
      });
    });
    expect(summarizeProviderCost(ledger).callsMissingRate).toBe(0);
  });

  it("documents image output tokens for every supported generation size", () => {
    expect(documentedImageOutputTokens("1024x1536", "high")).toBe(6240);
    expect(documentedImageOutputTokens("1024x1536", "medium")).toBe(1584);
    expect(documentedImageOutputTokens("2048x2048", "high")).toBeNull();
  });

  it("keeps two concurrent jobs' provider spend on their own ledgers", async () => {
    // A module-global ledger would attribute both jobs' calls to whichever run
    // happened to be collecting, which is silently wrong billing data.
    const jobA = collectProviderCost(async () => {
      recordProviderCall({
        provider: "openai",
        model: "gpt-image-1",
        purpose: "image_generation",
        attempt: 1,
        httpStatus: 200,
        usage: { imageOutputTokens: 6240 },
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      recordProviderCall({
        provider: "openai",
        model: "gpt-4.1-mini",
        purpose: "vision_creative_director",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 2700 },
      });
    });
    const jobB = collectProviderCost(async () => {
      recordProviderCall({
        provider: "anthropic",
        model: "claude-sonnet-4-5-20250929",
        purpose: "creative_reasoning",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 1000, textOutputTokens: 200 },
      });
    });

    const [a, b] = await Promise.all([jobA, jobB]);
    expect(a.ledger.calls.map((call) => call.model)).toEqual([
      "gpt-image-1",
      "gpt-4.1-mini",
    ]);
    expect(b.ledger.calls.map((call) => call.model)).toEqual([
      "claude-sonnet-4-5-20250929",
    ]);
  });

  it("counts a nested collection's calls on the enclosing ledger too", async () => {
    const { ledger: outer } = await collectProviderCost(async () => {
      recordProviderCall({
        provider: "openai",
        model: "gpt-image-1",
        purpose: "image_generation",
        attempt: 1,
        httpStatus: 200,
        usage: { imageOutputTokens: 6240 },
      });
      const { ledger: inner } = await collectProviderCost(async () => {
        recordProviderCall({
          provider: "openai",
          model: "gpt-4.1-mini",
          purpose: "vision_text_audit",
          attempt: 1,
          httpStatus: 200,
          usage: { textInputTokens: 2700 },
        });
      });
      expect(inner.calls).toHaveLength(1);
    });
    expect(outer.calls).toHaveLength(2);
  });

  it("counts billable calls made outside any collection scope", () => {
    resetUnattributedProviderCallCount();
    recordProviderCall({
      provider: "openai",
      model: "gpt-image-1",
      purpose: "image_generation",
      attempt: 1,
      httpStatus: 200,
      usage: { imageOutputTokens: 6240 },
    });
    expect(unattributedProviderCallCount()).toBe(1);
    resetUnattributedProviderCallCount();
  });

  it("meters Anthropic reasoning from the provider's own usage block", async () => {
    const { ledger } = await collectProviderCost(async () => {
      recordAnthropicCall({
        model: "claude-sonnet-4-5-20250929",
        purpose: "creative_reasoning",
        httpStatus: 200,
        usage: {
          input_tokens: 2000,
          output_tokens: 400,
          cache_read_input_tokens: 500,
        },
      });
    });
    const call = ledger.calls[0]!;
    expect(call.provider).toBe("anthropic");
    expect(call.usage.textInputTokens).toBe(2000);
    expect(call.usage.cachedTextInputTokens).toBe(500);
    expect(call.usage.textOutputTokens).toBe(400);
    // 2000 in at $3/1M plus 400 out at $15/1M. Cached input has no listed rate.
    expect(call.costUsd).toBeCloseTo(0.012, 6);
    const summary = summarizeProviderCost(ledger);
    expect(summary.reasoningCalls).toBe(1);
    expect(summary.callsMissingRate).toBe(0);
  });

  it("counts a pixel text audit as vision spend, not reasoning", async () => {
    const { ledger } = await collectProviderCost(async () => {
      recordProviderCall({
        provider: "openai",
        model: "gpt-4.1-mini",
        purpose: "vision_text_audit",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 2700, textOutputTokens: 60 },
      });
    });
    const summary = summarizeProviderCost(ledger);
    expect(summary.visionReviewCalls).toBe(1);
    expect(summary.reasoningCalls).toBe(0);
  });

  it("reports OCR spend separately from Creative Director spend", async () => {
    // Both are vision calls, but they answer different questions and scale
    // differently, so the cost report has to be able to tell them apart.
    const { ledger } = await collectProviderCost(async () => {
      recordProviderCall({
        provider: "openai",
        model: "gpt-4.1-mini",
        purpose: "vision_creative_director",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 2700, textOutputTokens: 60 },
      });
      recordProviderCall({
        provider: "openai",
        model: "gpt-4.1-mini",
        purpose: "vision_text_audit",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 2700, textOutputTokens: 60 },
      });
      recordProviderCall({
        provider: "openai",
        model: "gpt-4.1-mini",
        purpose: "vision_text_audit",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 2700, textOutputTokens: 60 },
      });
    });
    const summary = summarizeProviderCost(ledger);
    expect(summary.visionReviewCalls).toBe(3);
    expect(summary.textAuditCalls).toBe(2);
    expect(summary.creativeDirectorCalls).toBe(1);
    expect(summary.textAuditCostUsd).toBeGreaterThan(0);
    expect(summary.creativeDirectorCostUsd).toBeGreaterThan(0);
    // The two legs are subsets that together account for the vision total, so
    // neither can be inflated by the other's spend.
    expect(summary.creativeDirectorCostUsd + summary.textAuditCostUsd).toBeCloseTo(
      summary.visionReviewCostUsd,
      6,
    );
    expect(summary.reasoningCalls).toBe(0);
  });

  it("shows a zero-priced Creative Director call instead of hiding it behind OCR spend", async () => {
    // The reason the legs are reported separately: an unpriced director call would
    // vanish inside a combined vision total that OCR spend was holding up.
    const { ledger } = await collectProviderCost(async () => {
      recordProviderCall({
        provider: "openai",
        model: "some-unlisted-vision-model",
        purpose: "vision_creative_director",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 2700, textOutputTokens: 60 },
      });
      recordProviderCall({
        provider: "openai",
        model: "gpt-4.1-mini",
        purpose: "vision_text_audit",
        attempt: 1,
        httpStatus: 200,
        usage: { textInputTokens: 2700, textOutputTokens: 60 },
      });
    });
    const summary = summarizeProviderCost(ledger);
    expect(summary.visionReviewCostUsd).toBeGreaterThan(0);
    expect(summary.creativeDirectorCostUsd).toBe(0);
    expect(summary.callsMissingRate).toBe(1);
  });
});
