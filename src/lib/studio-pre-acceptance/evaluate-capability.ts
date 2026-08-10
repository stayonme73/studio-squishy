import {
  buildFinalActiveSkuLedger,
  weakestDisposition,
  type LaunchDisposition,
} from "@/lib/studio-kitchen-production/closeout";

import type { PreAcceptanceSkuCapabilityResult } from "./types";

const LAUNCHABLE: ReadonlySet<string> = new Set([
  "SELL",
  "SELL WITH LIMITS",
]);

export function evaluateCapabilityForServices(
  selectedServiceIds: readonly string[],
): {
  verdict: "pass" | "fail";
  perSku: PreAcceptanceSkuCapabilityResult[];
  weakestDisposition: LaunchDisposition | null;
  reasons: string[];
} {
  const ledger = buildFinalActiveSkuLedger();
  const byId = new Map(ledger.map((row) => [row.skuId, row]));
  const perSku: PreAcceptanceSkuCapabilityResult[] = [];
  const dispositions: LaunchDisposition[] = [];

  for (const skuId of selectedServiceIds) {
    const row = byId.get(skuId);
    if (!row) {
      perSku.push({
        skuId,
        launchDisposition: null,
        verdict: "unmapped",
        reason: `Service ${skuId} is not on the active Kitchen launch ledger.`,
      });
      continue;
    }
    dispositions.push(row.launchDisposition);
    if (!LAUNCHABLE.has(row.launchDisposition)) {
      perSku.push({
        skuId,
        launchDisposition: row.launchDisposition,
        verdict: "not_launchable",
        reason: `${row.customerFacingName} is ${row.launchDisposition}.`,
      });
      continue;
    }
    perSku.push({
      skuId,
      launchDisposition: row.launchDisposition,
      verdict: "launchable",
      reason: `${row.customerFacingName} is ${row.launchDisposition}.`,
    });
  }

  const fail = perSku.some((r) => r.verdict !== "launchable");
  const weakest =
    dispositions.length > 0 ? weakestDisposition(dispositions) : null;

  return {
    verdict: fail ? "fail" : "pass",
    perSku,
    weakestDisposition: weakest,
    reasons: fail
      ? perSku.filter((r) => r.verdict !== "launchable").map((r) => r.reason)
      : perSku.map((r) => r.reason),
  };
}
