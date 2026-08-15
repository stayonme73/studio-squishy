/**
 * Working-draft helpers for rm-j007 Reference-Guided Promotion Update lock.
 */

import type { WorkingDraftRecord } from "@/lib/studio-working-draft/types";
import { isWorkingDraftEditable } from "@/config/studio-working-draft-v1";
import type {
  RmJ007LiveUpdateLockInput,
  RmJ007UpdateLiveTruth,
} from "@/lib/studio-design-renderer/rm-j007-intake-truth";
import {
  normalizeRmJ007UpdateForPayment,
  type RmJ007UpdatePaymentSeal,
} from "@/lib/studio-design-renderer/rm-j007-kit-payment-gate";

export function readRmJ007UpdateLock(
  draft: WorkingDraftRecord | null | undefined,
): RmJ007LiveUpdateLockInput | RmJ007UpdateLiveTruth | null {
  if (!draft) return null;
  const raw = draft.slices.rmj007UpdateLock;
  if (!raw || typeof raw !== "object") return null;
  return raw as RmJ007LiveUpdateLockInput | RmJ007UpdateLiveTruth;
}

export function writeRmJ007UpdateLock(
  draft: WorkingDraftRecord,
  updateLock: RmJ007LiveUpdateLockInput | RmJ007UpdateLiveTruth,
):
  | { ok: true; draft: WorkingDraftRecord }
  | {
      ok: false;
      code: "NOT_EDITABLE" | "INVALID_UPDATE_LOCK";
      message: string;
    } {
  if (!isWorkingDraftEditable(draft.status)) {
    return {
      ok: false,
      code: "NOT_EDITABLE",
      message:
        "NOT_EDITABLE: Reference-Guided Promotion Update lock cannot change after purchase without a new authorized scope/payment decision",
    };
  }
  const normalized = normalizeRmJ007UpdateForPayment(updateLock);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "INVALID_UPDATE_LOCK",
      message: normalized.message,
    };
  }
  return {
    ok: true,
    draft: {
      ...draft,
      slices: {
        ...draft.slices,
        rmj007UpdateLock: normalized.truth,
      },
      updatedAt: new Date().toISOString(),
    },
  };
}

export function readRmJ007UpdateSealFromCampaign(
  paymentTruth:
    | {
        rmj007UpdateSeal?: RmJ007UpdatePaymentSeal;
      }
    | null
    | undefined,
): RmJ007UpdatePaymentSeal | null {
  return paymentTruth?.rmj007UpdateSeal ?? null;
}
