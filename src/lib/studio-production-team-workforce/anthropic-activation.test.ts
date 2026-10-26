/**
 * STUDIO-OPERATING-ANTHROPIC-ACTIVATION-1
 * Prove Design/Copy Anthropic paths on the existing integration.
 * Never print the API key. Do not touch Maya creative. Do not start Customer One.
 */

import path from "path";
import { describe, expect, it } from "vitest";

import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  produceCopyFromFacts,
  writeCopyFromFacts,
} from "@/lib/studio-copy-production";
import {
  reasonFlyerDesignSpec,
  reasonFlyerDesignSpecDeterministic,
  type FlyerProjectTruth,
} from "@/lib/studio-design-renderer";
import { invokeDesignRendererDispatchHook } from "@/lib/studio-dispatch/design-renderer-hook";
import { gateCopyQualityForQaPass } from "@/lib/studio-kitchen-production/copy-quality";
import {
  inspectAnthropicRuntime,
  isProductionFrozen,
  loadStudioLocalEnv,
} from "@/lib/studio-production-team-workforce";

const REPO = path.resolve(__dirname, "../../..");

const millwrightFacts = {
  skuId: "v2-rtu-email-kit" as const,
  businessName: "Millwright & Co.",
  campaignGoal: "Spring millwright open house",
  mustInclude:
    "Walk-in sharpening $45. Call (616) 555-0142 or visit millwrightandco.example",
  callToAction: "Call (616) 555-0142",
  compliance: "Reply STOP to opt out.",
  mustNotSay: "guaranteed lifetime edge",
  messageCopy: "",
  sendingAccount: "Mailchimp",
  listConsent: "Yes — I own the list and have consent",
};

function millwrightFlyerTruth(): FlyerProjectTruth {
  return {
    campaignId: "camp-anthropic-activation-millwright",
    jobId: "camp-anthropic-activation-millwright:v2-rtu-flyer",
    dispatchId: "dd:camp-anthropic-activation-millwright:v2-rtu-flyer",
    skuId: "v2-rtu-flyer",
    fixtureId: "anthropic-activation-millwright",
    label: "Anthropic activation — ordinary non-Maya truth",
    outputMode: "customer",
    businessName: "Millwright & Co.",
    wordmark: "Millwright & Co.",
    descriptor: "Walk-in sharpening",
    headline: "Spring open house",
    offerName: "Walk-in sharpening",
    priceDisplay: "$45",
    dateWindow: "",
    body: "Walk-in sharpening for knives and tools.",
    cta: "Call (616) 555-0142",
    phone: "(616) 555-0142",
    webDisplay: "millwrightandco.example",
    webUrl: "https://millwrightandco.example",
    disclaimer: "",
    intendedUse: "Both print and digital",
    brandColors: {
      primary: "#1F3A5F",
      secondary: "#C4A574",
      background: "#F7F4EF",
      text: "#1A1A1A",
      muted: "#5A6570",
    },
    approvedLogoVariantId: null,
    materials: [],
    requiredTextTokens: ["$45", "(616) 555-0142", "Millwright"],
    prohibitedClaimPatterns: ["guaranteed lifetime edge"],
  };
}

describe("STUDIO-OPERATING-ANTHROPIC-ACTIVATION-1", () => {
  loadStudioLocalEnv(REPO);
  const runtime = inspectAnthropicRuntime(REPO);

  it("inspects the existing integration without exposing a secret", () => {
    expect(runtime.envFile).toBe("present");
    expect(runtime).not.toHaveProperty("apiKey");
    expect(JSON.stringify(runtime)).not.toMatch(/sk-ant-|sk-ant/);
  });

  it("Design Production falls back to the deterministic reasoner when Anthropic is not used", async () => {
    const spec = await reasonFlyerDesignSpec({
      truth: millwrightFlyerTruth(),
      preferAnthropic: false,
    });
    expect(spec.reasoningMode).toBe("deterministic_constrained");
    const blob = JSON.stringify(spec);
    expect(blob).toContain("$45");
    expect(blob).not.toMatch(/guaranteed lifetime edge/i);
  });

  it("Copy Production falls back to the structured writer and keeps fact-lock", async () => {
    const prior = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const produced = await produceCopyFromFacts(millwrightFacts);
      expect(produced.ok).toBe(true);
      if (!produced.ok) return;
      expect(produced.writingRuntime).toBe("structured_writer");
      const blob = JSON.stringify(produced.submission);
      expect(blob).toContain("$45");
      expect(blob).toContain("(616) 555-0142");
      expect(blob).not.toMatch(/guaranteed lifetime edge/i);
      const gated = gateCopyQualityForQaPass({
        brief: produced.brief,
        submission: produced.submission,
        attestations: {
          brandVoiceReviewed: true,
          grammarSpellingReviewed: true,
          notes: "Fact-lock check for Anthropic activation fallback.",
        },
      });
      expect(gated.ok).toBe(true);
      const local = writeCopyFromFacts(millwrightFacts);
      expect(local.ok).toBe(true);
    } finally {
      if (prior !== undefined) process.env.ANTHROPIC_API_KEY = prior;
    }
  });

  it("Maya stays frozen at Version 16 and is not reminted for a provider change", async () => {
    const envelope = await readCampaignEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
    expect(envelope?.record.productionFreeze?.status).toBe("FROZEN");
    expect(envelope?.record.productionFreeze?.renderVersion).toBe(16);
    expect(envelope?.record.productionFreeze?.workVersionId).toBe("flyer-v16");
    expect(envelope?.record.productionFreeze?.doNotRemint).toBe(true);
    expect(isProductionFrozen(envelope?.record, "v2-rtu-flyer")).toBe(true);
    const flyer = envelope?.record.dispatchExecution?.records.find(
      (record) => record.skuId === "v2-rtu-flyer",
    );
    expect(flyer).toBeTruthy();
    if (!envelope || !flyer) return;
    const hooked = await invokeDesignRendererDispatchHook({
      repoRoot: REPO,
      campaign: envelope.record,
      dispatchRecord: flyer,
      materials: [],
      preferAnthropic: true,
    });
    expect(hooked.ok).toBe(true);
    if (!hooked.ok) return;
    expect(hooked.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(hooked.identity.renderVersion).toBe(16);
    expect(hooked.identity.pngContentSha256).toBe(
      envelope.record.productionFreeze?.pngContentSha256,
    );
  });

  it.skipIf(!runtime.available)(
    "Design Production actually uses the Anthropic creative path",
    async () => {
      const spec = await reasonFlyerDesignSpec({
        truth: millwrightFlyerTruth(),
        preferAnthropic: true,
      });
      expect(spec.reasoningMode).toBe("anthropic_text_model");
      expect(spec.reasoningModel).toBeTruthy();
      const blob = JSON.stringify(spec);
      expect(blob).toContain("$45");
      expect(blob).not.toMatch(/guaranteed lifetime edge/i);
    },
    90_000,
  );

  it.skipIf(!runtime.available)(
    "Copy Production actually uses the Anthropic writing path",
    async () => {
      const produced = await produceCopyFromFacts(millwrightFacts);
      expect(produced.ok).toBe(true);
      if (!produced.ok) return;
      expect(produced.writingRuntime).toBe("anthropic_text_model");
      const blob = JSON.stringify(produced.submission);
      expect(blob).toContain("$45");
      expect(blob).toContain("(616) 555-0142");
      expect(blob).not.toMatch(/guaranteed lifetime edge/i);
      const gated = gateCopyQualityForQaPass({
        brief: produced.brief,
        submission: produced.submission,
        attestations: {
          brandVoiceReviewed: true,
          grammarSpellingReviewed: true,
          notes: "Copy Production Anthropic path fact-lock and QA.",
        },
      });
      expect(gated.ok).toBe(true);
    },
    120_000,
  );
});
