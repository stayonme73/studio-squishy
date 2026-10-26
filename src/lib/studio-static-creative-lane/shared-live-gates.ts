/**
 * Shared live-lane gates applied on every launch static-design SKU.
 *
 * SKU composers stay in place. These gates are the inheritance: facts, fonts,
 * and print claims fail the same way no matter which HTML renderer draws.
 */

import { loadHouseFonts } from "@/lib/studio-static-design-composition/fonts";

import { blocksSellablePrint, evaluateLivePrintDelivery } from "./live-print-claim";
import { assertLiveFactsPreserved, type SuppliedFactLine } from "./preserve-supplied-facts";

export function assertHouseFontsAvailable(repoRoot: string): void {
  loadHouseFonts(repoRoot);
}

export function refuseSellablePrintIfClaimed(input: {
  sizeNotes?: string;
  intendedUse?: string;
  sourcePx: { width: number; height: number };
  boxInches?: { width: number; height: number };
}): { ok: true } | { ok: false; message: string } {
  const verdict = evaluateLivePrintDelivery(input);
  if (blocksSellablePrint(verdict)) {
    return { ok: false, message: verdict.detail };
  }
  return { ok: true };
}

/** Plate pixels and print-gate pixels are the same counts under two names. */
export function sourcePxFromPlate(plate: {
  readonly widthPx: number;
  readonly heightPx: number;
}): { width: number; height: number } {
  return { width: plate.widthPx, height: plate.heightPx };
}

export function applySharedLiveLaneEntryGate(input: {
  repoRoot: string;
  sizeNotes?: string;
  intendedUse?: string;
  sourcePx: { width: number; height: number };
  boxInches?: { width: number; height: number };
}):
  | { ok: true }
  | { ok: false; code: "RENDER_FAILURE" | "QA_FAILURE"; message: string } {
  try {
    assertHouseFontsAvailable(input.repoRoot);
  } catch (error) {
    return {
      ok: false,
      code: "RENDER_FAILURE",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  const print = refuseSellablePrintIfClaimed(input);
  if (!print.ok) {
    return { ok: false, code: "QA_FAILURE", message: print.message };
  }
  return { ok: true };
}

export function refuseIfFactsDropped(input: {
  supplied: readonly SuppliedFactLine[];
  truthValues: readonly string[];
  suppliedHeadline?: string;
  mappedHeadline?: string;
  mappedCta?: string;
}): { ok: true } | { ok: false; message: string } {
  const facts = assertLiveFactsPreserved(input);
  if (!facts.ok) {
    return { ok: false, message: facts.message };
  }
  return { ok: true };
}
