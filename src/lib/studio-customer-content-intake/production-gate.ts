import { categoryRequiresUseClearance } from "@/lib/studio-material-use";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { NO_CROP_ADAPT_LIMIT } from "./routing";
import type { ContentRoutingState, CustomerContentCertification } from "./types";

export { NO_CROP_ADAPT_LIMIT };

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
  if (cert.routingState === "WITHDRAWN_BY_CUSTOMER" || cert.routingState === "SUPERSEDED") {
    return false;
  }
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

export function certificationPermitsCropOrAdapt(
  certification: CustomerContentCertification | null | undefined,
): boolean {
  if (!certification) return true;
  if (certification.rights.cropAdaptPermitted === false) return false;
  if (certification.limits.includes(NO_CROP_ADAPT_LIMIT)) return false;
  return true;
}

export function materialPermitsCropOrAdapt(item: CampaignMaterialItem): boolean {
  return certificationPermitsCropOrAdapt(item.contentCertification);
}

export function customerFileCropAdaptBlockReason(item: CampaignMaterialItem): string | null {
  if (materialPermitsCropOrAdapt(item)) return null;
  return "This file may be used as submitted. The Studio may not crop or adapt it.";
}

export function assertCustomerFileMayBeCroppedOrAdapted(item: CampaignMaterialItem): void {
  const reason = customerFileCropAdaptBlockReason(item);
  if (reason) {
    throw new Error(`NO_CROP_ADAPT: ${reason}`);
  }
}
