import type { CampaignRecord } from "@/config/studio-board";
import { ensureMa001PostPayDispatchStructureOnCampaign } from "@/lib/studio-design-renderer/ma-001-postpay-composition-dispatch-structure";
import { ensureRmJ002PostPayDispatchStructureOnCampaign } from "@/lib/studio-design-renderer/rm-j002-postpay-kit-dispatch-structure";
import { ensureRmJ008PostPayDispatchStructureOnCampaign } from "@/lib/studio-design-renderer/rm-j008-postpay-kit-dispatch-structure";
import { ensureBf001PostPayDispatchStructureOnCampaign } from "@/lib/studio-design-renderer/bf-001-postpay-kit-dispatch-structure";
import { ensureRmJ007PostPayDispatchStructureOnCampaign } from "@/lib/studio-design-renderer/rm-j007-postpay-kit-dispatch-structure";

export type SealedStructureApplyResult = {
  campaign: CampaignRecord;
  ok: boolean;
  lastError: string | null;
  changed: boolean;
};

function campaignHasSealedStructure(
  campaign: CampaignRecord,
  kind:
    | "ma001"
    | "rmj002"
    | "rmj008"
    | "bf001"
    | "rmj007",
): boolean {
  if (kind === "ma001") return Boolean(campaign.ma001PostPayDispatchStructure);
  if (kind === "rmj002") return Boolean(campaign.rmJ002PostPayDispatchStructure);
  if (kind === "rmj008") return Boolean(campaign.rmJ008PostPayDispatchStructure);
  if (kind === "bf001") return Boolean(campaign.bf001PostPayDispatchStructure);
  return Boolean(campaign.rmj007PostPayDispatchStructure);
}

/**
 * True when a sealed Machine kit was purchased but durable structure is missing.
 * Flyer-only purchases (Maya $69) have no seals — this is not a recovery need.
 */
export function sealedPostPayStructureMissing(campaign: CampaignRecord): boolean {
  const truth = campaign.paymentTruth;
  if (!truth || truth.status !== "confirmed") return false;
  if (truth.ma001CompositionSeal && !campaignHasSealedStructure(campaign, "ma001")) {
    return true;
  }
  if (truth.rmj002KitSeal && !campaignHasSealedStructure(campaign, "rmj002")) {
    return true;
  }
  if (truth.rmj008KitSeal && !campaignHasSealedStructure(campaign, "rmj008")) {
    return true;
  }
  if (truth.bf001PackageSeal && !campaignHasSealedStructure(campaign, "bf001")) {
    return true;
  }
  if (truth.rmj007UpdateSeal && !campaignHasSealedStructure(campaign, "rmj007")) {
    return true;
  }
  return false;
}

/**
 * Re-apply sealed post-pay kit/pack structure from payment truth.
 * Successful members persist; failures stay missing so recovery can retry.
 * Does not remap, dispatch, or invoke the renderer.
 */
export function applySealedPostPayStructures(
  campaign: CampaignRecord,
): SealedStructureApplyResult {
  let working = campaign;
  const errors: string[] = [];

  if (working.paymentTruth?.ma001CompositionSeal) {
    const ensured = ensureMa001PostPayDispatchStructureOnCampaign(working);
    if (ensured.ok) {
      working = ensured.campaign;
    } else {
      errors.push(ensured.message);
    }
  }

  if (working.paymentTruth?.rmj002KitSeal) {
    const ensured = ensureRmJ002PostPayDispatchStructureOnCampaign(working);
    if (ensured.ok) {
      working = ensured.campaign;
    } else {
      errors.push(ensured.message);
    }
  }

  if (working.paymentTruth?.rmj008KitSeal) {
    const ensured = ensureRmJ008PostPayDispatchStructureOnCampaign(working);
    if (ensured.ok) {
      working = ensured.campaign;
    } else {
      errors.push(ensured.message);
    }
  }

  if (working.paymentTruth?.bf001PackageSeal) {
    const ensured = ensureBf001PostPayDispatchStructureOnCampaign(working);
    if (ensured.ok) {
      working = ensured.campaign;
    } else {
      errors.push(ensured.message);
    }
  }

  if (working.paymentTruth?.rmj007UpdateSeal) {
    const ensured = ensureRmJ007PostPayDispatchStructureOnCampaign(working);
    if (ensured.ok) {
      working = ensured.campaign;
    } else {
      errors.push(ensured.message);
    }
  }

  return {
    campaign: working,
    ok: errors.length === 0,
    lastError: errors[0] ?? null,
    changed: working !== campaign,
  };
}
