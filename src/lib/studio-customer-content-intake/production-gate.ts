import { categoryRequiresUseClearance } from "@/lib/studio-material-use";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import type { ContentRoutingState } from "./types";

const PRODUCTION_CLEARED_STATES = new Set<ContentRoutingState>([
  "CLEARED_FOR_PRODUCTION",
  "CLEARED_WITH_LIMITS",
]);

export function requiresContentCertificationGate(item: CampaignMaterialItem): boolean {
  if (item.contentKind !== "file-metadata" || item.uploadStatus !== "stored") return false;
  if (item.contentCertification) return true;
  return categoryRequiresUseClearance(item.category);
}

export function isCustomerContentClearedForProduction(item: CampaignMaterialItem): boolean {
  if (!requiresContentCertificationGate(item)) return true;
  const cert = item.contentCertification;
  if (!cert) return false;
  if (cert.withdrawnAt) return false;
  if (!cert.productionCleared) return false;
  return PRODUCTION_CLEARED_STATES.has(cert.routingState);
}

export function customerContentProductionBlockReason(item: CampaignMaterialItem): string | null {
  if (!requiresContentCertificationGate(item)) return null;
  if (isCustomerContentClearedForProduction(item)) return null;
  return (
    item.contentCertification?.productionBlockReason ??
    "Customer file is not cleared for production use."
  );
}

export function jobHasUnclearedCustomerContent(
  materials: readonly CampaignMaterialItem[],
  skuId: string,
): boolean {
  return materials.some(
    (item) =>
      item.relatedServiceIds.includes(skuId as never) &&
      requiresContentCertificationGate(item) &&
      !isCustomerContentClearedForProduction(item),
  );
}

export function listUnclearedCustomerContentForSku(
  materials: readonly CampaignMaterialItem[],
  skuId: string,
): CampaignMaterialItem[] {
  return materials.filter(
    (item) =>
      item.relatedServiceIds.includes(skuId as never) &&
      requiresContentCertificationGate(item) &&
      !isCustomerContentClearedForProduction(item),
  );
}
