/**
 * Authoritative voice production chain (roles reuse existing Kitchen roles).
 * Generation step is INTEGRATION REQUIRED until a Tagia-approved tool exists.
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
  operationalStatus: "defined" | "integration_required" | "ready_when_file_exists";
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
    notes: "Frozen script version ID used for generation and QA binding.",
  },
  {
    id: "voice_generation",
    ownerRole: "creative_production",
    kitchenStateLabel: "audio production started",
    operationalStatus: "integration_required",
    notes:
      "No wired approved AI voice vendor. Must not claim generation completed without a real artifact.",
  },
  {
    id: "audio_qa",
    ownerRole: "qa",
    kitchenStateLabel: "QA ready",
    operationalStatus: "ready_when_file_exists",
    notes: "Deterministic checks + listening judgment. Checklist alone insufficient.",
  },
  {
    id: "correction_regeneration",
    ownerRole: "creative_production",
    kitchenStateLabel: "QA fail / correction",
    operationalStatus: "integration_required",
    notes: "Routine path: Creative → QA → Creative → QA. Owner not required for ordinary audio defects.",
  },
  {
    id: "export",
    ownerRole: "creative_production",
    kitchenStateLabel: "audio artifact produced",
    operationalStatus: "integration_required",
    notes: "Promised formats: MP3 or WAV only.",
  },
  {
    id: "file_registration",
    ownerRole: "system",
    kitchenStateLabel: "file registered",
    operationalStatus: "defined",
    notes: "Bind path + contentSha256 + scriptVersionId + QA evidence (design-cert philosophy).",
  },
  {
    id: "review_delivery",
    ownerRole: "producer_dispatcher",
    kitchenStateLabel: "review ready",
    operationalStatus: "ready_when_file_exists",
    notes: "Client distributes unless separately scoped (RTU). Review Room handoff after QA pass.",
  },
] as const;

export function kitchenVoiceStatesForSku(_sku: VoiceProductionSku): readonly string[] {
  return VOICE_PRODUCTION_CHAIN.map((s) => s.kitchenStateLabel);
}
