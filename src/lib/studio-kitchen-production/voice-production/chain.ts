/**
 * Authoritative voice production chain (roles reuse existing Kitchen roles).
 * ElevenLabs TTS adapter is wired; runtime still requires credentials + listening QA.
 */

import type { VoiceProductionSku } from "./contracts";

export type VoiceChainStepId =
  | "script_ready"
  | "script_validation"
  | "approved_final_script"
  | "voice_generation"
  | "audio_qa"
  | "correction_regeneration"
  | "export"
  | "file_registration"
  | "review_delivery";

export type VoiceChainStep = {
  id: VoiceChainStepId;
  ownerRole: "copy" | "creative_production" | "qa" | "producer_dispatcher" | "system";
  kitchenStateLabel: string;
  operationalStatus:
    | "defined"
    | "adapter_wired_credentials_required"
    | "ready_when_file_exists";
  notes: string;
};

export const VOICE_PRODUCTION_CHAIN: readonly VoiceChainStep[] = [
  {
    id: "script_ready",
    ownerRole: "copy",
    kitchenStateLabel: "script ready",
    operationalStatus: "defined",
    notes:
      "ap-001: customer supplies final script. v2-rtu-voice: Studio may write short script from approved facts (≤300 words).",
  },
  {
    id: "script_validation",
    ownerRole: "qa",
    kitchenStateLabel: "script validation",
    operationalStatus: "defined",
    notes: "Word limit, prohibited cloning intent, required facts/pronunciation notes present.",
  },
  {
    id: "approved_final_script",
    ownerRole: "creative_production",
    kitchenStateLabel: "approved final script",
    operationalStatus: "defined",
    notes: "Frozen scriptVersionId used for generation and QA binding.",
  },
  {
    id: "voice_generation",
    ownerRole: "creative_production",
    kitchenStateLabel: "generation pending",
    operationalStatus: "adapter_wired_credentials_required",
    notes:
      "generateVoiceArtifact → ElevenLabs TTS. States: generation pending / generation failed / audio generated. Never invent success without bytes.",
  },
  {
    id: "audio_qa",
    ownerRole: "qa",
    kitchenStateLabel: "QA ready",
    operationalStatus: "ready_when_file_exists",
    notes:
      "Deterministic checks + listening judgment. Generation success stops at QA ready — never auto QA pass.",
  },
  {
    id: "correction_regeneration",
    ownerRole: "creative_production",
    kitchenStateLabel: "QA correction required",
    operationalStatus: "adapter_wired_credentials_required",
    notes: "Routine path: Creative → QA → Creative → QA. Owner not required for ordinary audio defects.",
  },
  {
    id: "export",
    ownerRole: "creative_production",
    kitchenStateLabel: "audio generated",
    operationalStatus: "adapter_wired_credentials_required",
    notes: "Persisted MP3 (or WAV when account capability allows). Bound by SHA-256.",
  },
  {
    id: "file_registration",
    ownerRole: "system",
    kitchenStateLabel: "file registered",
    operationalStatus: "defined",
    notes: "Bind path + contentSha256 + scriptVersionId + provider evidence (not API keys).",
  },
  {
    id: "review_delivery",
    ownerRole: "producer_dispatcher",
    kitchenStateLabel: "review ready",
    operationalStatus: "ready_when_file_exists",
    notes: "After listening QA pass only. NOT CUSTOMER READY until certification package.",
  },
] as const;

export function kitchenVoiceStatesForSku(_sku: VoiceProductionSku): readonly string[] {
  return [
    "script ready",
    "generation pending",
    "generation failed",
    "audio generated",
    "QA ready",
    "QA correction required",
    "QA pass",
    "review ready",
  ] as const;
}
