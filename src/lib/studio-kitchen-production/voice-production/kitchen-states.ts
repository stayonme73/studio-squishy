/**
 * Minimal Kitchen representation of voice production states.
 * Read-only projection — never invents audio artifacts.
 */

import type { VoiceChainStepId } from "./chain";
import { VOICE_PRODUCTION_CHAIN } from "./chain";
import type { VoiceProductionSku } from "./contracts";
import { summarizeVoiceAudioInventory } from "./inventory";

export type VoiceKitchenStateSnapshot = {
  skuId: VoiceProductionSku;
  labels: readonly string[];
  /** Steps that are operationally blocked until vendor/path exists. */
  blockedStepIds: readonly VoiceChainStepId[];
  canRepresentAudioArtifactProduced: false;
  generationIntegrated: false;
  notes: string;
};

/**
 * Kitchen can name the chain states; it cannot honestly mark
 * "audio artifact produced" from Studio generation today.
 */
export function projectVoiceKitchenStates(skuId: VoiceProductionSku): VoiceKitchenStateSnapshot {
  const inventory = summarizeVoiceAudioInventory();
  const blockedStepIds = VOICE_PRODUCTION_CHAIN.filter(
    (s) => s.operationalStatus === "integration_required",
  ).map((s) => s.id);

  return {
    skuId,
    labels: VOICE_PRODUCTION_CHAIN.map((s) => s.kitchenStateLabel),
    blockedStepIds,
    canRepresentAudioArtifactProduced: false,
    generationIntegrated: false,
    notes: inventory.blockingGap,
  };
}

/**
 * Read-only: given known facts, which kitchen labels may be claimed.
 * Never invents an audio file path or hash.
 */
export function resolveClaimableVoiceKitchenLabels(input: {
  skuId: VoiceProductionSku;
  hasApprovedScript: boolean;
  hasBoundAudioArtifact: boolean;
  audioQaPassed: boolean;
}): {
  claimable: readonly string[];
  blocked: readonly string[];
  inventedArtifact: false;
} {
  const claimable: string[] = [];
  const blocked: string[] = [];

  for (const step of VOICE_PRODUCTION_CHAIN) {
    if (step.id === "script_ready" || step.id === "script_validation") {
      if (input.hasApprovedScript) claimable.push(step.kitchenStateLabel);
      else blocked.push(step.kitchenStateLabel);
      continue;
    }
    if (step.id === "approved_final_script") {
      if (input.hasApprovedScript) claimable.push(step.kitchenStateLabel);
      else blocked.push(step.kitchenStateLabel);
      continue;
    }
    if (step.operationalStatus === "integration_required") {
      blocked.push(step.kitchenStateLabel);
      continue;
    }
    if (step.id === "audio_qa" || step.id === "review_delivery") {
      if (input.hasBoundAudioArtifact && input.audioQaPassed) {
        claimable.push(step.kitchenStateLabel);
      } else {
        blocked.push(step.kitchenStateLabel);
      }
      continue;
    }
    if (step.id === "file_registration") {
      if (input.hasBoundAudioArtifact) claimable.push(step.kitchenStateLabel);
      else blocked.push(step.kitchenStateLabel);
      continue;
    }
    blocked.push(step.kitchenStateLabel);
  }

  return { claimable, blocked, inventedArtifact: false };
}
