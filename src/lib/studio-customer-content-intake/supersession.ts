import { isSupabasePrivateStorageRef } from "@/lib/file-registry/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { markContentCertificationSuperseded } from "./routing";
import type { CustomerContentCertification } from "./types";

function isPrivateStoredMaterial(item: CampaignMaterialItem): boolean {
  const ref = item.storageRef;
  return (
    item.uploadStatus === "stored" &&
    isSupabasePrivateStorageRef(ref) &&
    Boolean(ref.objectPath) &&
    Boolean(ref.checksumSha256)
  );
}

export function isActiveStoredCustomerFile(item: CampaignMaterialItem): boolean {
  if (item.contentKind !== "file-metadata" || !isPrivateStoredMaterial(item)) return false;
  const state = item.contentCertification?.routingState;
  if (state === "WITHDRAWN_BY_CUSTOMER" || state === "SUPERSEDED") return false;
  return true;
}

export function canReplaceStoredCustomerFile(item: CampaignMaterialItem): boolean {
  if (!isActiveStoredCustomerFile(item)) return false;
  return (
    item.reviewStatus === "submitted" ||
    item.reviewStatus === "needs_clarification" ||
    item.reviewStatus === "missing" ||
    item.reviewStatus === "requested"
  );
}

export function prepareSupersessionArchive(input: {
  item: CampaignMaterialItem;
  supersededByCertificationId: string;
  evaluatedAt?: string;
}): {
  archivedCertification: CustomerContentCertification;
  contentCertificationArchive: readonly CustomerContentCertification[];
} {
  const at = input.evaluatedAt ?? new Date().toISOString();
  const current = input.item.contentCertification;
  if (!current) {
    throw new Error("Cannot supersede a stored file without an active certification record.");
  }

  const archivedCertification: CustomerContentCertification = {
    ...markContentCertificationSuperseded(current, input.item.id, at),
    supersededByCertificationId: input.supersededByCertificationId,
    supersededByMaterialId: input.item.id,
  };

  return {
    archivedCertification,
    contentCertificationArchive: [
      ...(input.item.contentCertificationArchive ?? []),
      archivedCertification,
    ],
  };
}
