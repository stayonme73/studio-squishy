import {
  WORKFORCE_LAUNCH_SKUS,
  WORKFORCE_PRINT_SKUS,
  launchMenuSkuCapabilityMap,
  type ProductionTeamCapabilityId,
  type ProductionTeamLaunchClassification,
} from "@/config/studio-production-team-workforce-v1";

export type LaunchSkuAssignment = {
  skuId: string;
  capability: ProductionTeamCapabilityId | null;
  supportingCapabilities: readonly ProductionTeamCapabilityId[];
  classification: ProductionTeamLaunchClassification;
  runtime: string;
};

export function assignmentForSku(skuId: string): LaunchSkuAssignment {
  const mapped =
    launchMenuSkuCapabilityMap[skuId as keyof typeof launchMenuSkuCapabilityMap];
  if (!mapped) {
    return {
      skuId,
      capability: null,
      supportingCapabilities: [],
      classification: "HOLD",
      runtime: "Not on the launch-menu inventory. HOLD — do not present as launch-ready.",
    };
  }
  return {
    skuId,
    capability: mapped.capability,
    supportingCapabilities: mapped.supporting,
    classification: mapped.classification,
    runtime: mapped.runtime,
  };
}

export function launchMenuRoster(): readonly LaunchSkuAssignment[] {
  const sold = WORKFORCE_LAUNCH_SKUS.map((skuId) => assignmentForSku(skuId));
  const held = [assignmentForSku("v2-rtu-voice"), assignmentForSku("cc-001")];
  const offMenu = [assignmentForSku("carousel")];
  return [...sold, ...held, ...offMenu];
}

export function printFileRequired(skuId: string): boolean {
  return (WORKFORCE_PRINT_SKUS as readonly string[]).includes(skuId);
}

export function capabilityForDispatchSku(
  skuId: string,
): ProductionTeamCapabilityId | null {
  return assignmentForSku(skuId).capability;
}
