/**
 * Working-draft helpers for ma-001 pack composition (pre-payment).
 */

import type { WorkingDraftRecord } from "@/lib/studio-working-draft/types";
import { isWorkingDraftEditable } from "@/config/studio-working-draft-v1";
import type {
  Ma001CompositionLiveTruth,
  Ma001LiveCompositionInput,
} from "@/lib/studio-design-renderer/ma-001-intake-truth";
import {
  normalizeMa001CompositionForPayment,
  type Ma001CompositionPaymentSeal,
} from "@/lib/studio-design-renderer/ma-001-composition-payment-gate";

export function readMa001PackComposition(
  draft: WorkingDraftRecord | null | undefined,
): Ma001LiveCompositionInput | Ma001CompositionLiveTruth | null {
  if (!draft) return null;
  const raw = draft.slices.ma001PackComposition;
  if (!raw || typeof raw !== "object") return null;
  return raw as Ma001LiveCompositionInput | Ma001CompositionLiveTruth;
}

export function writeMa001PackComposition(
  draft: WorkingDraftRecord,
  composition: Ma001LiveCompositionInput | Ma001CompositionLiveTruth,
):
  | { ok: true; draft: WorkingDraftRecord }
  | { ok: false; code: "NOT_EDITABLE" | "INVALID_COMPOSITION"; message: string } {
  if (!isWorkingDraftEditable(draft.status)) {
    return {
      ok: false,
      code: "NOT_EDITABLE",
      message:
        "NOT_EDITABLE: Promotion Pack composition cannot change after purchase without a new authorized scope/payment decision",
    };
  }
  const normalized = normalizeMa001CompositionForPayment(composition);
  if (!normalized.ok) {
    return {
      ok: false,
      code: "INVALID_COMPOSITION",
      message: normalized.message,
    };
  }
  return {
    ok: true,
    draft: {
      ...draft,
      slices: {
        ...draft.slices,
        ma001PackComposition: normalized.truth,
      },
      updatedAt: new Date().toISOString(),
    },
  };
}

export function readMa001PaymentSealFromCampaign(paymentTruth: {
  ma001CompositionSeal?: Ma001CompositionPaymentSeal;
} | null | undefined): Ma001CompositionPaymentSeal | null {
  return paymentTruth?.ma001CompositionSeal ?? null;
}
