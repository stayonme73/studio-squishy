import type { PreAcceptanceProjectFacts } from "./types";

/** Stable fingerprint of material pre-acceptance facts (not cosmetic UI). */
export function buildPreAcceptanceFactFingerprint(
  facts: PreAcceptanceProjectFacts,
): string {
  const payload = [
    facts.routeId ?? "",
    [...facts.selectedServiceIds].map(String).sort().join(","),
    facts.projectNeed.trim().toLowerCase(),
    facts.requestedDeadline.trim(),
    facts.deadlineStatus,
    facts.existingMaterialsNote.trim().toLowerCase(),
    (facts.riskScanText ?? facts.projectNeed).trim().toLowerCase(),
  ].join("|");
  return simpleHash(payload);
}

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `pa:${(h >>> 0).toString(16)}`;
}
