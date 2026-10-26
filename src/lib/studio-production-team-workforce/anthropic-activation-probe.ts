/**
 * In-process Anthropic activation probe.
 * Invokes Design + Copy in the current Node/Next process.
 * Never returns the API key. Does not persist artifacts. Does not start Customer One.
 */

import path from "path";

import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { produceCopyFromFacts } from "@/lib/studio-copy-production";
import {
  reasonFlyerDesignSpec,
  type FlyerProjectTruth,
} from "@/lib/studio-design-renderer";
import { invokeDesignRendererDispatchHook } from "@/lib/studio-dispatch/design-renderer-hook";
import { gateCopyQualityForQaPass } from "@/lib/studio-kitchen-production/copy-quality";

import { inspectAnthropicRuntime } from "./anthropic-runtime";
import { isProductionFrozen } from "./freeze-maya";

const MILLWRIGHT_COPY_FACTS = {
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

export type AnthropicActivationProbeResult = {
  process: "next_app";
  runtime: {
    available: boolean;
    envFile: "present" | "missing";
    keyNamedInEnvFile: boolean;
    prefixClass: "absent" | "empty" | "anthropic" | "non_anthropic_prefix";
    processEnvSet: boolean;
  };
  design: {
    reasoningMode: string;
    reasoningModel: string | null;
  };
  copy: {
    writingRuntime: string | null;
    qaOk: boolean;
  };
  maya: {
    frozen: boolean;
    renderVersion: number | null;
    invocationOutcome: string | null;
  };
};

export async function runAnthropicActivationProbe(
  repoRoot = process.cwd(),
): Promise<AnthropicActivationProbeResult> {
  const runtime = inspectAnthropicRuntime(repoRoot);
  const spec = await reasonFlyerDesignSpec({
    truth: millwrightFlyerTruth(),
    preferAnthropic: true,
  });
  const produced = await produceCopyFromFacts(MILLWRIGHT_COPY_FACTS);
  const copyQa =
    produced.ok &&
    gateCopyQualityForQaPass({
      brief: produced.brief,
      submission: produced.submission,
      attestations: {
        brandVoiceReviewed: true,
        grammarSpellingReviewed: true,
        notes: "In-process Anthropic activation probe.",
      },
    });

  const envelope = await readCampaignEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
  const flyer = envelope?.record.dispatchExecution?.records.find(
    (record) => record.skuId === "v2-rtu-flyer",
  );
  let invocationOutcome: string | null = null;
  if (envelope && flyer) {
    const hooked = await invokeDesignRendererDispatchHook({
      repoRoot: path.resolve(repoRoot),
      campaign: envelope.record,
      dispatchRecord: flyer,
      materials: [],
      preferAnthropic: true,
    });
    invocationOutcome = hooked.ok ? hooked.invocationOutcome : "HOOK_FAILED";
  }

  return {
    process: "next_app",
    runtime: {
      available: runtime.available,
      envFile: runtime.envFile,
      keyNamedInEnvFile: runtime.keyNamedInEnvFile,
      prefixClass: runtime.prefixClass,
      processEnvSet: runtime.processEnvSet,
    },
    design: {
      reasoningMode: spec.reasoningMode,
      reasoningModel: spec.reasoningModel ?? null,
    },
    copy: {
      writingRuntime: produced.ok ? produced.writingRuntime ?? null : null,
      qaOk: Boolean(copyQa && copyQa.ok),
    },
    maya: {
      frozen: isProductionFrozen(envelope?.record, "v2-rtu-flyer"),
      renderVersion: envelope?.record.productionFreeze?.renderVersion ?? null,
      invocationOutcome,
    },
  };
}
