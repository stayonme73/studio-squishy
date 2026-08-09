/**
 * Voice SKU contract truth — preserve existing catalog/production limits.
 * Do not expand the offer.
 */

import { resolveServiceProductionContract } from "../resolve-contract";

export const VOICE_PRODUCTION_SKUS = ["ap-001", "v2-rtu-voice"] as const;
export type VoiceProductionSku = (typeof VOICE_PRODUCTION_SKUS)[number];

export const VOICE_SCRIPT_WORD_LIMIT = 300 as const;
export const VOICE_ALLOWED_AUDIO_EXTENSIONS = ["mp3", "wav"] as const;

export type VoiceSkuContractTruth = {
  skuId: VoiceProductionSku;
  producerRole: string;
  readiness: string;
  scriptWordLimit: typeof VOICE_SCRIPT_WORD_LIMIT;
  promisedFormats: readonly string[];
  promisedOutputs: string;
  revisionRule: string;
  exclusionsSummary: readonly string[];
  clientInputs: readonly string[];
  qaRequirements: readonly string[];
  primaryToolIntegrationState: string;
  scriptwritingIncluded: boolean;
};

export function voiceSkuContractTruth(skuId: VoiceProductionSku): VoiceSkuContractTruth {
  const resolved = resolveServiceProductionContract(skuId);
  if (resolved.status !== "resolved") {
    throw new Error(`Voice SKU ${skuId} did not resolve a production contract`);
  }
  const c = resolved.contract;

  if (skuId === "ap-001") {
    return {
      skuId,
      producerRole: c.producerRole,
      readiness: c.readiness,
      scriptWordLimit: VOICE_SCRIPT_WORD_LIMIT,
      promisedFormats: ["mp3"],
      promisedOutputs: "One AI voice-over track (one style, one language)",
      revisionRule: "One revision round (catalog one_time revision rule)",
      exclusionsSummary: [
        "Scriptwriting unless selected separately",
        "Voice cloning / celebrity imitation",
        "Human voice recording",
        "Multiple speakers",
        "Translations",
        "Music / advanced mixing",
        "WAV deliverable (unverified / not currently offered)",
        ">300 words",
      ],
      clientInputs: [
        "Final script",
        "Pronunciation notes",
        "Accurate claims/names/offers",
        "Rights confirmation",
        "Approval",
      ],
      qaRequirements: [
        "Script ≤300 words",
        "No voice cloning",
        "MP3 deliverable (WAV not currently offered)",
        "Basic pacing/pronunciation review",
      ],
      primaryToolIntegrationState: c.primaryTool.integrationState,
      scriptwritingIncluded: false,
    };
  }

  return {
    skuId,
    producerRole: c.producerRole,
    readiness: c.readiness,
    scriptWordLimit: VOICE_SCRIPT_WORD_LIMIT,
    promisedFormats: ["mp3"],
    promisedOutputs:
      "Short announcement script when needed (≤300 words) + one final MP3 audio track for client distribution",
    revisionRule: "One revision round",
    exclusionsSummary: [
      "Outside voice talent",
      "Voice cloning / celebrity imitation",
      "Human recording beyond internal Studio AI/software tools",
      "Translations",
      "Music / advanced mixing",
      "Visual/social assembly",
      "Posting/publishing",
      "WAV deliverable (unverified / not currently offered)",
      ">300 words",
    ],
    clientInputs: [
      "Approved details/facts for script",
      "Pronunciation / claims / rights accuracy",
      "Client uploads/distributes finished audio",
    ],
    qaRequirements: [
      "Script ≤300 words",
      "Client distributes audio",
      "Studio QC review before delivery",
    ],
    primaryToolIntegrationState: c.primaryTool.integrationState,
    scriptwritingIncluded: true,
  };
}
