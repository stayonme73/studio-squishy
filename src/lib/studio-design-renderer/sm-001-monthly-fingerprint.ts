/**
 * Cycle-keyed production fingerprint for sm-001-monthly.
 */

import { createHash } from "crypto";

import {
  fingerprintSm001Materials,
  fingerprintSm001SharedSpec,
} from "./sm-001-bind";
import type { Sm001MonthlyProjectTruth } from "./sm-001-monthly-types";
import {
  SM_001_MONTHLY_WRAPPER_VERSION,
} from "./sm-001-monthly-types";
import type { Sm001SetSpec, Sm001TimingConstraints } from "./sm-001-types";

export function fingerprintSm001MonthlyProduction(input: {
  campaignId: string;
  skuId: "sm-001-monthly";
  productionCycleId: string;
  cycleStartDate: string;
  cycleEndDate: string;
  monthlyContentFocus: string;
  plannedPostCount: number;
  /** Creative/material fingerprint components from the mapped sm-001 set when available. */
  sharedSpecFingerprint?: string;
  materialFingerprint?: string;
  timing: Sm001TimingConstraints;
  offerName: string;
  priceDisplay: string;
  body: string;
  headline: string;
  wrapperVersion?: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        campaignId: input.campaignId,
        skuId: input.skuId,
        productionCycleId: input.productionCycleId,
        cycleStartDate: input.cycleStartDate,
        cycleEndDate: input.cycleEndDate,
        monthlyContentFocus: input.monthlyContentFocus,
        plannedPostCount: input.plannedPostCount,
        offerName: input.offerName,
        priceDisplay: input.priceDisplay,
        body: input.body,
        headline: input.headline,
        timing: {
          startDate: input.timing.startDate ?? null,
          endDate: input.timing.endDate ?? null,
          eventDate: input.timing.eventDate ?? null,
          blackoutDates: [...(input.timing.blackoutDates ?? [])].sort(),
        },
        sharedSpecFingerprint: input.sharedSpecFingerprint ?? null,
        materialFingerprint: input.materialFingerprint ?? null,
        wrapperVersion: input.wrapperVersion ?? SM_001_MONTHLY_WRAPPER_VERSION,
      }),
    )
    .digest("hex");
}

export function fingerprintSm001MonthlyFromTruth(
  truth: Sm001MonthlyProjectTruth,
  timing: Sm001TimingConstraints,
  spec?: Sm001SetSpec,
): string {
  return fingerprintSm001MonthlyProduction({
    campaignId: truth.campaignId,
    skuId: "sm-001-monthly",
    productionCycleId: truth.cycle.productionCycleId,
    cycleStartDate: truth.cycle.cycleStartDate,
    cycleEndDate: truth.cycle.cycleEndDate,
    monthlyContentFocus: truth.cycle.monthlyContentFocus,
    plannedPostCount: truth.plannedPostCount,
    sharedSpecFingerprint: spec
      ? fingerprintSm001SharedSpec(spec)
      : undefined,
    materialFingerprint: spec ? fingerprintSm001Materials(spec) : undefined,
    timing,
    offerName: truth.creative.offerName,
    priceDisplay: truth.creative.priceDisplay,
    body: truth.creative.body,
    headline: truth.creative.headline,
  });
}
