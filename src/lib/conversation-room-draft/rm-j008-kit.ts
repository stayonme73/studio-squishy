/**
 * Working-draft helpers for rm-j008 Update Kit lock (pre-payment).
 */

import type { WorkingDraftRecord } from "@/lib/studio-working-draft/types";
import { isWorkingDraftEditable } from "@/config/studio-working-draft-v1";
import type {
  RmJ008KitLiveTruth,
  RmJ008LiveKitLockInput,
} from "@/lib/studio-design-renderer/rm-j008-intake-truth";
import {
  normalizeRmJ008KitForPayment,
  type RmJ008KitPaymentSeal,
} from "@/lib/studio-design-renderer/rm-j008-kit-payment-gate";

export function readRmJ008KitLock(
  draft: WorkingDraftRecord | null | undefined,
): RmJ008LiveKitLockInput | RmJ008KitLiveTruth | null {
  if (!draft) return null;
  const raw = draft.slices.rmj008KitLock;
  if (!raw || typeof raw !== "object") return null;
  return raw as RmJ008LiveKitLockInput | RmJ008KitLiveTruth;
}

export function writeRmJ008KitLock(
  draft: WorkingDraftRecord,
  kitLock: RmJ008LiveKitLockInput | RmJ008KitLiveTruth,
):
  | { ok: true; draft: WorkingDraftRecord }
  | { ok: false; code: "NOT_EDITABLE" | "INVALID_KIT_LOCK"; message: string } {
  if (!isWorkingDraftEditable(draft.status)) {
    return {
      ok: false,
      code: "NOT_EDITABLE",
      message:
        "NOT_EDITABLE: Social Profile Update Kit lock cannot change after purchase without a new authorized scope/payment decision",
    };
  }
  const normalized = normalizeRmJ008KitForPayment(kitLock);
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
        rmj008KitLock: normalized.truth,
      },
      updatedAt: new Date().toISOString(),
    },
  };
}

export function readRmJ008PaymentSealFromCampaign(paymentTruth: {
  rmj008KitSeal?: RmJ008KitPaymentSeal;
} | null | undefined): RmJ008KitPaymentSeal | null {
  return paymentTruth?.rmj008KitSeal ?? null;
}
