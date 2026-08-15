/**
 * Working-draft helpers for bf-001 Brand Identity Refresh package lock (pre-payment).
 */

import type { WorkingDraftRecord } from "@/lib/studio-working-draft/types";
import { isWorkingDraftEditable } from "@/config/studio-working-draft-v1";
import type {
  Bf001LivePackageLockInput,
  Bf001PackageLiveTruth,
} from "@/lib/studio-design-renderer/bf-001-intake-truth";
import {
  normalizeBf001PackageForPayment,
  type Bf001PackagePaymentSeal,
} from "@/lib/studio-design-renderer/bf-001-kit-payment-gate";

export function readBf001PackageLock(
  draft: WorkingDraftRecord | null | undefined,
): Bf001LivePackageLockInput | Bf001PackageLiveTruth | null {
  if (!draft) return null;
  const raw = draft.slices.bf001PackageLock;
  if (!raw || typeof raw !== "object") return null;
  return raw as Bf001LivePackageLockInput | Bf001PackageLiveTruth;
}

export function writeBf001PackageLock(
  draft: WorkingDraftRecord,
  packageLock: Bf001LivePackageLockInput | Bf001PackageLiveTruth,
):
  | { ok: true; draft: WorkingDraftRecord }
  | {
      ok: false;
      code: "NOT_EDITABLE" | "INVALID_PACKAGE_LOCK";
      message: string;
    } {
  if (!isWorkingDraftEditable(draft.status)) {
    return {
      ok: false,
      code: "NOT_EDITABLE",
      message:
        "NOT_EDITABLE: Brand Identity Refresh package lock cannot change after purchase without a new authorized scope/payment decision",
    };
  }
  const normalized = normalizeBf001PackageForPayment(packageLock);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "INVALID_PACKAGE_LOCK",
      message: normalized.message,
    };
  }
  return {
    ok: true,
    draft: {
      ...draft,
      slices: {
        ...draft.slices,
        bf001PackageLock: normalized.truth,
      },
      updatedAt: new Date().toISOString(),
    },
  };
}

export function readBf001PackageSealFromCampaign(
  paymentTruth:
    | {
        bf001PackageSeal?: Bf001PackagePaymentSeal;
      }
    | null
    | undefined,
): Bf001PackagePaymentSeal | null {
  return paymentTruth?.bf001PackageSeal ?? null;
}
