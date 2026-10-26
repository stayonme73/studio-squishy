import {
  CLIP_SOLD_CONTRACT_MEASURED_MS,
  CLIP_SOLD_CONTRACT_VENDOR,
  SHORT_FORM_PACK_MEASURED_MS,
  SHORT_FORM_PACK_VENDOR,
} from "@/config/studio-capacity-and-overload-certification-v1";
import {
  fourPackageEconomicFloorsUsd,
  fourPackageProposedPricesUsd,
  studioFourPackagePricingV1 as pack,
} from "@/config/studio-four-package-pricing-v1";

export type EvidenceKind = "MEASURED" | "DERIVED" | "UNKNOWN";

export function stripeFeeUsd(priceUsd: number): number {
  return Number((priceUsd * pack.stripeAssumption.percent + pack.stripeAssumption.flatUsd).toFixed(2));
}

export function clipShotstackUsdDerived(): { low: number; high: number; kind: EvidenceKind } {
  return {
    kind: "DERIVED",
    low: Number((CLIP_SOLD_CONTRACT_VENDOR.shotstackCredits * 0.2).toFixed(2)),
    high: Number((CLIP_SOLD_CONTRACT_VENDOR.shotstackCredits * 0.4).toFixed(2)),
  };
}

export function monthlyGrossUsd(
  priceUsd: number,
  orders: 25 | 50 | 75 | 100,
): number {
  return priceUsd * orders;
}

export function mixGrossUsd(
  mix: Record<keyof typeof fourPackageProposedPricesUsd, number>,
  tier: "launch" | "standard",
): number {
  let total = 0;
  for (const [id, count] of Object.entries(mix) as [
    keyof typeof fourPackageProposedPricesUsd,
    number,
  ][]) {
    total += fourPackageProposedPricesUsd[id][tier] * count;
  }
  return total;
}

export const measuredClocks = {
  clipFactoryElapsedMs: {
    value: CLIP_SOLD_CONTRACT_MEASURED_MS.factoryElapsed,
    kind: "MEASURED" as const,
  },
  clipHeavyOccupancyMs: {
    value: CLIP_SOLD_CONTRACT_MEASURED_MS.heavySlotOccupancy,
    kind: "MEASURED" as const,
  },
  clipQualityRevisionMs: {
    value: CLIP_SOLD_CONTRACT_MEASURED_MS.qualityRevision,
    kind: "MEASURED" as const,
  },
  clipRemakeMs: {
    value: CLIP_SOLD_CONTRACT_MEASURED_MS.remake,
    kind: "MEASURED" as const,
  },
  shortFormFirstCutMs: {
    value: SHORT_FORM_PACK_MEASURED_MS.firstCutElapsed,
    kind: "MEASURED" as const,
  },
  clipDeepgramUsd: {
    value: CLIP_SOLD_CONTRACT_VENDOR.deepgramUsdList,
    kind: "MEASURED" as const,
  },
  shortFormDeepgramUsd: {
    value: SHORT_FORM_PACK_VENDOR.deepgramUsd,
    kind: "MEASURED" as const,
  },
  ownerMinutes: { value: 0, kind: "MEASURED" as const },
};

export const proposedFloors = fourPackageEconomicFloorsUsd;
export const proposedPrices = fourPackageProposedPricesUsd;
