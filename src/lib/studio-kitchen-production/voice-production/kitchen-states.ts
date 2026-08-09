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
  /** Steps blocked until credentials + successful generation produce a bound file. */
  blockedStepIds: readonly VoiceChainStepId[];
  adapterWired: true;
  credentialsPresent: boolean;
  canRepresentAudioArtifactProduced: boolean;
  generationIntegrated: true;
  customerReady: false;
  notes: string;
};

export function projectVoiceKitchenStates(skuId: VoiceProductionSku): VoiceKitchenStateSnapshot {
  const inventory = summarizeVoiceAudioInventory();
  const credentialsPresent = inventory.canGenerateCustomerDeliverableAudio;
  const blockedStepIds = credentialsPresent
    ? ([] as VoiceChainStepId[])
    : VOICE_PRODUCTION_CHAIN.filter(
        (s) => s.operationalStatus === "adapter_wired_credentials_required",
      ).map((s) => s.id);

  return {
    skuId,
    labels: VOICE_PRODUCTION_CHAIN.map((s) => s.kitchenStateLabel),
    blockedStepIds,
    adapterWired: true,
    credentialsPresent,
    canRepresentAudioArtifactProduced: false,
    generationIntegrated: true,
    customerReady: false,
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
  generationFailed?: boolean;
  generationPending?: boolean;
}): {
  claimable: readonly string[];
  blocked: readonly string[];
  inventedArtifact: false;
  customerReady: false;
} {
  const claimable: string[] = [];
  const blocked: string[] = [];

  if (input.hasApprovedScript) {
    claimable.push("script ready", "approved final script");
  } else {
    blocked.push("script ready", "approved final script");
  }

  if (input.generationPending) claimable.push("generation pending");
  else blocked.push("generation pending");

  if (input.generationFailed) claimable.push("generation failed");
  else blocked.push("generation failed");

  if (input.hasBoundAudioArtifact) {
    claimable.push("audio generated", "QA ready", "file registered");
  } else {
    blocked.push("audio generated", "QA ready", "file registered");
  }

  if (input.hasBoundAudioArtifact && !input.audioQaPassed) {
    claimable.push("QA correction required");
  } else {
    blocked.push("QA correction required");
  }

  if (input.audioQaPassed && input.hasBoundAudioArtifact) {
    claimable.push("QA pass", "review ready");
  } else {
    blocked.push("QA pass", "review ready");
  }

  return { claimable, blocked, inventedArtifact: false, customerReady: false };
}
