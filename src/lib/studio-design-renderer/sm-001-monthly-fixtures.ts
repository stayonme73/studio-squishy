/**
 * Proof fixtures for sm-001-monthly — cycle IDs are pre-supplied (never minted).
 */

import {
  assignSm001MembersForCount,
  buildHarborOakSm001ProjectTruth,
  ensureHarborOakSm001LogoMaterial,
} from "./sm-001-fixtures";
import {
  DESIGN_RENDERER_SM_001_MONTHLY_SKU,
  SM_001_MONTHLY_PROOF_PACKAGE_ID,
  type Sm001MonthlyCycleIdentity,
  type Sm001MonthlyProjectTruth,
} from "./sm-001-monthly-types";
import type { Sm001PlannedPostCount } from "./sm-001-types";
import { isSm001PlannedPostCount } from "./sm-001-contracts";

export const SM_001_MONTHLY_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-sm-001-monthly-proof-1/artifacts/sm-001-monthly" as const;

export const SM_001_MONTHLY_PROOF_SCOPE_NOTE =
  "PROOF ONLY — cycle-keyed wrapper around sealed sm-001. Consumes authoritative cycle identity. Does not mint productionCycleId. Does not remap Canva. Does not wire dispatch." as const;

/** Pre-authored Cycle A — early March service period inside Harbor campaign window, N=4. */
export const SM_001_MONTHLY_PROOF_CYCLE_A: Sm001MonthlyCycleIdentity = {
  productionCycleId: "cyc-harbor-sm001m-2026-03-early",
  cycleStartDate: "2026-03-10",
  cycleEndDate: "2026-03-20",
  monthlyContentFocus: "March Spring Tune-Up awareness",
};

/** Pre-authored Cycle B — late March/April service period, N=6. */
export const SM_001_MONTHLY_PROOF_CYCLE_B: Sm001MonthlyCycleIdentity = {
  productionCycleId: "cyc-harbor-sm001m-2026-04-late",
  cycleStartDate: "2026-03-25",
  cycleEndDate: "2026-04-15",
  monthlyContentFocus: "April Drain Clear booking push",
};

function lockPlannedPostCount(
  n: Sm001PlannedPostCount,
  rationale: string,
): Sm001MonthlyProjectTruth["plannedPostCountSelection"] {
  const signals = {
    hasLogo: true,
    hasOfferFacts: true,
    hasDateWindow: true,
    hasExtendedCopy: n >= 5,
    hasSecondaryProofPoint: n >= 6,
  };
  return {
    plannedPostCount: n,
    selectedBeforeExecution: true,
    rationale,
    signals,
    selectionFingerprint: `monthly-proof-lock-n${n}`,
  };
}

export function buildHarborOakSm001MonthlyProjectTruth(input: {
  repoRoot: string;
  cycle: Sm001MonthlyCycleIdentity;
  plannedPostCount: Sm001PlannedPostCount;
  campaignId?: string;
  /** Override creative focus body to prove stale-truth isolation. */
  focusBodySuffix?: string;
}): Sm001MonthlyProjectTruth {
  if (!isSm001PlannedPostCount(input.plannedPostCount)) {
    throw new Error(`INVALID_PLANNED_POST_COUNT: ${input.plannedPostCount}`);
  }
  ensureHarborOakSm001LogoMaterial(input.repoRoot);

  const richness =
    input.plannedPostCount === 6
      ? "full"
      : input.plannedPostCount === 5
        ? "extended"
        : "core";

  const campaignId =
    input.campaignId ?? "camp-design-sm-001-monthly-proof-harbor";
  const base = buildHarborOakSm001ProjectTruth({
    repoRoot: input.repoRoot,
    richness,
    campaignId,
    timingConstraints: {
      startDate: input.cycle.cycleStartDate,
      endDate: input.cycle.cycleEndDate,
    },
  });

  // Lock N explicitly to the cycle (may differ from auto-select richness edge cases).
  const selection = lockPlannedPostCount(
    input.plannedPostCount,
    `Monthly proof: cycle ${input.cycle.productionCycleId} locks plannedPostCount=${input.plannedPostCount} before execution.`,
  );
  const assets = assignSm001MembersForCount(input.plannedPostCount);

  const focusNote = `Cycle focus: ${input.cycle.monthlyContentFocus}`;
  const body = `${base.body} ${focusNote}${input.focusBodySuffix ?? ""}`.trim();

  const creative = {
    fixtureId: base.fixtureId,
    label: `Harbor & Oak — sm-001-monthly cycle ${input.cycle.productionCycleId} N=${input.plannedPostCount}`,
    outputMode: "certification_fixture" as const,
    businessName: base.businessName,
    wordmark: base.wordmark,
    descriptor: base.descriptor,
    headline:
      input.plannedPostCount >= 5
        ? `${base.headline} — ${input.cycle.monthlyContentFocus}`
        : base.headline,
    offerName: base.offerName,
    priceDisplay: base.priceDisplay,
    wasPriceDisplay: base.wasPriceDisplay,
    // Keep CERT fixture campaign date copy for sealed QA tokens; calendar governance uses cycle timing.
    dateWindow: "March 10 – April 15, 2026",
    body,
    cta: base.cta,
    phone: base.phone,
    webDisplay: base.webDisplay,
    webUrl: base.webUrl,
    disclaimer: base.disclaimer,
    platformLabel: base.platformLabel,
    brandColors: base.brandColors,
    materials: base.materials,
    approvedLogoVariantId: base.approvedLogoVariantId,
    requiredTextTokens: [
      base.priceDisplay,
      "March 10",
      "April 15",
      "2026",
      "Harbor",
    ],
    prohibitedClaimPatterns: base.prohibitedClaimPatterns,
    timingConstraints: {
      startDate: input.cycle.cycleStartDate,
      endDate: input.cycle.cycleEndDate,
    },
    assets,
    proofScopeNote: SM_001_MONTHLY_PROOF_SCOPE_NOTE,
    campaignTimingConstraints: undefined,
  };

  const jobId = `${campaignId}::${DESIGN_RENDERER_SM_001_MONTHLY_SKU}::${input.cycle.productionCycleId}`;

  return {
    campaignId,
    jobId,
    dispatchId: `dd:${jobId}`,
    skuId: DESIGN_RENDERER_SM_001_MONTHLY_SKU,
    cycle: { ...input.cycle },
    plannedPostCount: input.plannedPostCount,
    plannedPostCountSelection: selection,
    creative,
    outputMode: "certification_fixture",
    proofScopeNote: SM_001_MONTHLY_PROOF_SCOPE_NOTE,
  };
}

export { SM_001_MONTHLY_PROOF_PACKAGE_ID };
