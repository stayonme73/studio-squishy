/**
 * Map rm-j008 after-state → sealed rm-j002 kit truth for after-state producers.
 */

import { DESIGN_RENDERER_RM_J002_SKU } from "./rm-j002-types";
import { recipeForPlatform } from "./rm-j002-contracts";
import type { RmJ002KitProjectTruth } from "./rm-j002-types";
import type { RmJ008UpdateKitProjectTruth } from "./rm-j008-types";

export function mapRmJ008AfterToRmJ002Truth(
  truth: RmJ008UpdateKitProjectTruth,
): RmJ002KitProjectTruth {
  const recipe = recipeForPlatform(truth.platform);
  return {
    skuId: DESIGN_RENDERER_RM_J002_SKU,
    campaignId: truth.campaignId,
    jobId: truth.jobId,
    dispatchId: truth.dispatchId,
    platform: truth.platform,
    lockedKitMemberCount: recipe.lockedKitMemberCount,
    plannedKitMembers: recipe.plannedKitMembers,
    businessName: truth.after.businessName,
    profileGoal: truth.after.profileGoal,
    currentProfileNotes: truth.after.updateIntentNotes,
    website:
      truth.after.website.trim().toLowerCase() === "none"
        ? undefined
        : truth.after.website,
    phone:
      truth.after.phone.trim().toLowerCase() === "none"
        ? undefined
        : truth.after.phone,
    displayName: truth.after.displayName,
    brandNotes: truth.after.brandNotes,
    label: truth.label,
    credentialsPresent: false,
    mutationRequested: false,
    logoMaterial: truth.logoMaterial,
  };
}
