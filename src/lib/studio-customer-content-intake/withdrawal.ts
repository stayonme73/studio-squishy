import { isSupabasePrivateStorageRef } from "@/lib/file-registry/types";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "@/lib/materials/types";
import { parseConsolidatedRequestId } from "@/lib/materials/client-requests";

import { markContentCertificationWithdrawn } from "./routing";
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

export function canCustomerWithdrawStoredFile(item: CampaignMaterialItem): boolean {
  if (item.contentKind !== "file-metadata" || !isPrivateStoredMaterial(item)) return false;
  const cert = item.contentCertification;
  if (!cert) return false;
  if (cert.routingState === "WITHDRAWN_BY_CUSTOMER") return false;
  if (cert.routingState === "SUPERSEDED") return false;
  return true;
}

export function withdrawCustomerContentCertification(
  certification: CustomerContentCertification,
  withdrawnAt?: string,
): CustomerContentCertification {
  return markContentCertificationWithdrawn(certification, withdrawnAt);
}

export function applyCustomerWithdrawFile(
  envelope: ServerMaterialsEnvelope,
  itemId: string,
): { ok: true; envelope: ServerMaterialsEnvelope } | { ok: false; error: string; status: number } {
  const item = envelope.items.find((entry) => entry.id === itemId);
  if (!item) {
    return { ok: false, error: "Material item not found.", status: 404 };
  }
  if (!canCustomerWithdrawStoredFile(item)) {
    return {
      ok: false,
      error: "This file cannot be withdrawn. It may not be stored or is already withdrawn.",
      status: 400,
    };
  }

  const now = new Date().toISOString();
  const withdrawn = withdrawCustomerContentCertification(item.contentCertification!, now);
  const items = envelope.items.map((entry) =>
    entry.id === itemId
      ? {
          ...entry,
          contentCertification: withdrawn,
          reviewStatus: "needs_clarification" as const,
        }
      : entry,
  );

  return {
    ok: true,
    envelope: {
      ...envelope,
      items,
      updatedAt: now,
      syncedAt: now,
    },
  };
}

export function resolveWithdrawTargetItemId(
  envelope: ServerMaterialsEnvelope,
  input: { itemId?: string; consolidatedItemId?: string },
): string | null {
  if (input.itemId) {
    const item = envelope.items.find((entry) => entry.id === input.itemId);
    return item && canCustomerWithdrawStoredFile(item) ? item.id : null;
  }
  if (!input.consolidatedItemId) return null;
  const parsed = parseConsolidatedRequestId(input.consolidatedItemId);
  if (!parsed) return null;
  const candidates = envelope.items
    .filter(
      (item) =>
        item.category === parsed.category &&
        item.contentKind === parsed.contentKind &&
        canCustomerWithdrawStoredFile(item),
    )
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  return candidates.at(-1)?.id ?? null;
}
