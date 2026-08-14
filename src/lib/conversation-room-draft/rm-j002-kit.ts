/**
 * Working-draft helpers for rm-j002 kit lock (pre-payment).
 */

import type { WorkingDraftRecord } from "@/lib/studio-working-draft/types";
import { isWorkingDraftEditable } from "@/config/studio-working-draft-v1";
import type {
  RmJ002KitLiveTruth,
  RmJ002LiveKitLockInput,
} from "@/lib/studio-design-renderer/rm-j002-intake-truth";
import {
  normalizeRmJ002KitForPayment,
  type RmJ002KitPaymentSeal,
} from "@/lib/studio-design-renderer/rm-j002-kit-payment-gate";

export function readRmJ002KitLock(
  draft: WorkingDraftRecord | null | undefined,
): RmJ002LiveKitLockInput | RmJ002KitLiveTruth | null {
  if (!draft) return null;
  const raw = draft.slices.rmj002KitLock;
  if (!raw || typeof raw !== "object") return null;
  return raw as RmJ002LiveKitLockInput | RmJ002KitLiveTruth;
}

export function writeRmJ002KitLock(
  draft: WorkingDraftRecord,
  kitLock: RmJ002LiveKitLockInput | RmJ002KitLiveTruth,
):
  | { ok: true; draft: WorkingDraftRecord }
  | { ok: false; code: "NOT_EDITABLE" | "INVALID_KIT_LOCK"; message: string } {
  if (!isWorkingDraftEditable(draft.status)) {
    return {
      ok: false,
      code: "NOT_EDITABLE",
      message:
        "NOT_EDITABLE: Social Profile Setup Kit lock cannot change after purchase without a new authorized scope/payment decision",
    };
  }
  const normalized = normalizeRmJ002KitForPayment(kitLock);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "INVALID_KIT_LOCK",
      message: normalized.message,
    };
  }
  return {
    ok: true,
    draft: {
      ...draft,
      slices: {
        ...draft.slices,
        rmj002KitLock: normalized.truth,
      },
      updatedAt: new Date().toISOString(),
    },
  };
}

export function readRmJ002PaymentSealFromCampaign(paymentTruth: {
  rmj002KitSeal?: RmJ002KitPaymentSeal;
} | null | undefined): RmJ002KitPaymentSeal | null {
  return paymentTruth?.rmj002KitSeal ?? null;
}
