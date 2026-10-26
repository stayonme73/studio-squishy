/**
 * Builder-QA — recompute the Customer-One cost summary from its recorded calls.
 * The per-call ledger in the proof is raw measured data. The summary above it was
 * written before retry attribution was normalized to the run's first attempt, so
 * it overstated correction cost. This re-derives summary + margin from the same
 * recorded calls using the current pricing code. No provider calls. No new render.
 * Usage: npx tsx scripts/customer-one-hybrid-cost-recompute.mts
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  FLYER_SKU_ECONOMICS_V1,
} from "../src/config/studio-production-cost-telemetry-v1";
import {
  createProviderCostLedger,
  evaluateSkuMargin,
  summarizeProviderCost,
  type ProviderCallRecord,
} from "../src/lib/studio-project-alpha/cost-telemetry";

const REPORT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-project-alpha-hybrid-creative-certification-1/customer-one-hybrid-proofs/customer-one-hybrid-remint-qa.json",
);

type Report = {
  costTelemetry: {
    calls: ProviderCallRecord[];
    seriousAttemptsRun: number;
    summary: unknown;
    margin: unknown;
    summaryRecomputedFromRecordedCalls?: boolean;
    summaryRecomputeNote?: string;
  };
};

async function main() {
  const report = JSON.parse(await readFile(REPORT, "utf8")) as Report;
  const ledger = createProviderCostLedger();
  // Older proofs projected calls without `billable`; derive it the same way the
  // recorder does so the recomputed summary is not lossy.
  ledger.calls.push(
    ...report.costTelemetry.calls.map((call) => ({
      ...call,
      billable: call.billable ?? call.httpStatus < 400,
      rateMissing: call.rateMissing ?? false,
    })),
  );

  const summary = summarizeProviderCost(ledger);
  const attempts = Math.max(1, summary.imageGenerationCalls);
  const margin = evaluateSkuMargin({
    skuId: FLYER_SKU_ECONOMICS_V1.skuId,
    priceCents: FLYER_SKU_ECONOMICS_V1.priceCents,
    warningShareOfPrice: FLYER_SKU_ECONOMICS_V1.providerCostWarningShareOfPrice,
    failShareOfPrice: FLYER_SKU_ECONOMICS_V1.providerCostFailShareOfPrice,
    costPerSeriousAttemptUsd: summary.totalCostUsd / attempts,
  });

  report.costTelemetry.seriousAttemptsRun = attempts;
  report.costTelemetry.summary = summary;
  report.costTelemetry.margin = margin;
  report.costTelemetry.summaryRecomputedFromRecordedCalls = true;
  report.costTelemetry.summaryRecomputeNote =
    "Summary and margin re-derived from the recorded per-call ledger after retry attribution was normalized to the run's first attempt. Per-call usage and cost are unchanged measured values.";

  await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ summary, margin, attempts }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
