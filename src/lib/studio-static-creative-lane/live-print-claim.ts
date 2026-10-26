/**
 * When a live job is allowed to claim measured print, and when it must stop.
 */

import { evaluatePrintResolutionClaim } from "./print-resolution-policy";
import type { ResolutionVerdict } from "./print-resolution-policy";

const MEASURED_DPI_RE = /300\s*dpi/i;

export function intakeClaimsMeasuredPrint(
  sizeNotes?: string,
  intendedUse?: string,
): boolean {
  return MEASURED_DPI_RE.test(`${sizeNotes ?? ""} ${intendedUse ?? ""}`);
}

/**
 * CERT-plate digital files are the sold default. A 300 DPI claim is the only
 * thing that invokes the headroom rule. An 8.5×11 size note without 300 DPI
 * does not invent a DPI claim — format selection stays a frozen business rule.
 */
export function evaluateLivePrintDelivery(input: {
  sizeNotes?: string;
  intendedUse?: string;
  sourcePx: { width: number; height: number };
  boxInches?: { width: number; height: number };
  fit?: "cover" | "contain";
}): ResolutionVerdict {
  if (!intakeClaimsMeasuredPrint(input.sizeNotes, input.intendedUse)) {
    return evaluatePrintResolutionClaim({
      intent: "digital",
      sourcePx: input.sourcePx,
      fit: input.fit ?? "cover",
    });
  }
  return evaluatePrintResolutionClaim({
    intent: "print_customer_managed",
    sourcePx: input.sourcePx,
    boxInches: input.boxInches ?? { width: 8.5, height: 11 },
    claimedDpi: 300,
    fit: input.fit ?? "cover",
  });
}

export function blocksSellablePrint(verdict: ResolutionVerdict): boolean {
  return !verdict.launchable && verdict.code !== "digital_ok";
}
