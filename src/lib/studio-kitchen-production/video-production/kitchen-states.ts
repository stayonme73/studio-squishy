/**
 * Minimal Kitchen representation of short-video production states.
 * Read-only projection — never invents video artifacts.
 */

import type { VideoChainStepId } from "./chain";
import { VIDEO_PRODUCTION_CHAIN } from "./chain";
import type { VideoProductionSku } from "./contracts";
import { summarizeVideoCapabilityInventory } from "./inventory";

export type VideoKitchenStateSnapshot = {
  skuId: VideoProductionSku;
  labels: readonly string[];
  blockedStepIds: readonly VideoChainStepId[];
  assemblyIntegrated: boolean;
  canRepresentVideoArtifactProduced: boolean;
  customerReady: false;
  notes: string;
};

export function projectVideoKitchenStates(skuId: VideoProductionSku): VideoKitchenStateSnapshot {
  const inventory = summarizeVideoCapabilityInventory();
  const blockedStepIds = VIDEO_PRODUCTION_CHAIN.filter(
    (s) =>
      s.operationalStatus === "integration_required" ||
      s.operationalStatus === "unresolved_rights",
  ).map((s) => s.id);

  return {
    skuId,
    labels: VIDEO_PRODUCTION_CHAIN.map((s) => s.kitchenStateLabel),
    blockedStepIds,
    assemblyIntegrated: inventory.shotstackIntegrationProven,
    canRepresentVideoArtifactProduced: inventory.shotstackIntegrationProven,
    customerReady: false,
    notes: inventory.blockingGaps.join(" · "),
  };
}

/**
 * Read-only: given known facts, which kitchen labels may be claimed.
 * Never invents an MP4 path or hash.
 */
export function resolveClaimableVideoKitchenLabels(input: {
  skuId: VideoProductionSku;
  hasAssetsReady: boolean;
  hasScriptReady: boolean;
  hasStoryboardReady: boolean;
  productionStarted?: boolean;
  renderPending?: boolean;
  renderFailed?: boolean;
  hasBoundVideoArtifact: boolean;
  videoQaPassed: boolean;
}): {
  claimable: readonly string[];
  blocked: readonly string[];
  inventedArtifact: false;
  customerReady: false;
} {
  const claimable: string[] = [];
  const blocked: string[] = [];

  if (input.hasAssetsReady) claimable.push("assets ready");
  else blocked.push("assets ready");

  if (input.hasScriptReady) claimable.push("script ready");
  else blocked.push("script ready");

  if (input.hasStoryboardReady) claimable.push("storyboard ready");
  else blocked.push("storyboard ready");

  if (input.productionStarted) claimable.push("production started");
  else blocked.push("production started");

  if (input.renderPending) claimable.push("render pending");
  else blocked.push("render pending");

  if (input.renderFailed) claimable.push("render failed");
  else blocked.push("render failed");

  if (input.hasBoundVideoArtifact) {
    claimable.push("video artifact produced", "QA ready");
  } else {
    blocked.push("video artifact produced", "QA ready");
  }

  if (input.hasBoundVideoArtifact && !input.videoQaPassed) {
    claimable.push("QA correction required");
  } else {
    blocked.push("QA correction required");
  }

  if (input.videoQaPassed && input.hasBoundVideoArtifact) {
    claimable.push("QA pass", "review ready");
  } else {
    blocked.push("QA pass", "review ready");
  }

  return { claimable, blocked, inventedArtifact: false, customerReady: false };
}
