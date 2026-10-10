/**
 * Owner-approved revision truth for the three-package journey.
 * Locked 2026-10-04. Does not apply to smaller legacy services.
 */

export const STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 = {
  lockedAt: "2026-10-04" as const,
  owner: "Tagia" as const,
  appliesTo: "three-package-journey" as const,
  legacyServicesUnchanged: true as const,
  noMerge: true as const,
  noPush: true as const,
  noPublish: true as const,
  oneRound:
    "One revision round is one complete list of requested changes within the original package scope." as const,
  roundsIncluded: "Three revision rounds are included." as const,
  packageCount:
    "Clip Repurposing, Short-Form Video Editing, and Social & Promo Graphics each include three revision rounds." as const,
  mayInclude:
    "A revision round may include reasonable changes within the original package scope, such as wording, a call-to-action adjustment, pacing or trim refinements, caption corrections, layout refinements, visual refinements within the approved direction, a clip swap to an already-ranked suitable alternate where applicable, music or B-roll adjustment or removal where applicable, and tightening an ending." as const,
  notIncluded:
    "A revision round does not include a new creative direction, a new project replacing the original project, unrelated new source material replacing the original source, extra deliverables beyond the package scope, a major scope expansion, or switching to a different package." as const,
  packages: {
    clip_repurposing: {
      name: "Clip Repurposing" as const,
      priceDisplay: "$399" as const,
      priceCents: 39900 as const,
      revisionRounds: 3 as const,
    },
    short_form_video_editing: {
      name: "Short-Form Video Editing" as const,
      priceDisplay: "$249" as const,
      priceCents: 24900 as const,
      revisionRounds: 3 as const,
    },
    social_and_promo_graphics: {
      name: "Social & Promo Graphics" as const,
      priceDisplay: "$199" as const,
      priceCents: 19900 as const,
      revisionRounds: 3 as const,
    },
  },
  stampDoc:
    "docs/launch/studio-customer-journey-condense-1/THREE-PACKAGE-REVISION-TRUTH-V1-LOCKED.md" as const,
} as const;

export function threePackageRevisionRule(packageName: string): string {
  const truth = STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1;
  return `${packageName} includes three revision rounds. ${truth.oneRound} ${truth.mayInclude} ${truth.notIncluded}`;
}

export const threePackageRevisionCustomerAnswer = [
  STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packageCount,
  STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.oneRound,
  STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.mayInclude,
  STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.notIncluded,
].join(" ");

/** Home FAQ only. Help keeps the fuller policy paragraph above. */
export const threePackageRevisionHomeAnswer = [
  STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packageCount,
  STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.oneRound,
].join(" ");
