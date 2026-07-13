export type ExclusionGroupKind = "studioDoesNotProvide" | "purchasedDeliverableChanges";

export type ClassifiedExclusions = {
  studioDoesNotProvide: readonly string[];
  purchasedDeliverableChanges: readonly string[];
};

const STUDIO_DOES_NOT_PROVIDE_PATTERNS = [
  /\bprinting\b/i,
  /\bshipping\b/i,
  /\bdistribution\b/i,
  /\bposting\b/i,
  /\bpublish/i,
  /\bvoice actor/i,
  /\bfreelancer/i,
  /\bvendor/i,
  /\baccount recovery\b/i,
  /\bongoing management\b/i,
  /\bcustom application/i,
  /\bperformance guarantee/i,
  /\beditable source files?\b/i,
  /\boriginal photography\b/i,
  /\bon-site filming\b/i,
  /\bfilming\b/i,
  /\boutside\b/i,
  /\bthird[- ]party\b/i,
  /\bhosting\b/i,
  /\baccount setup\b/i,
  /\blist management\b/i,
  /\bemail sending\b/i,
  /\bsocial media management\b/i,
  /\bad placement\b/i,
  /\bmedia buying\b/i,
  /\bautomation\b/i,
  /\bsegmentation\b/i,
  /\bmore than (?:two|four|six|ten|\d+) (?:emails?|messages?|posts?|items?|services?|pages?|videos?|assets?)/i,
  /\bmultiple (?:platforms?|sizes?|versions?|cuts?|aspect ratios?)/i,
  /\bdouble-sided\b/i,
  /\bfull website\b/i,
  /\becommerce\b/i,
  /\bcustom coding\b/i,
  /\binfluencer\b/i,
  /\btalent casting\b/i,
] as const;

/** Modifications to an already purchased deliverable the internal Studio team may perform via Project Change. */
const PURCHASED_DELIVERABLE_CHANGE_PATTERNS = [
  /\bmore than one revision\b/i,
  /\bproject change\b/i,
  /\bnew design direction after approval\b/i,
  /\bstructural rebuild\b/i,
  /\bcomplete redesign\b/i,
  /\bexpanding copywriting\b/i,
  /\badditional deliverable\b/i,
  /\bbeyond the purchased scope\b/i,
  /\bbeyond purchased scope\b/i,
  /\bwork beyond the purchased scope\b/i,
  /\bwork beyond purchased scope\b/i,
] as const;

function matchesAnyPattern(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Split legacy exclusion bullets into customer-facing groups.
 * Customer responsibilities remain in clientResponsibilities ("You'll Handle").
 */
export function classifyServiceExclusions(exclusions: readonly string[]): ClassifiedExclusions {
  const studioDoesNotProvide: string[] = [];
  const purchasedDeliverableChanges: string[] = [];

  for (const item of exclusions) {
    if (matchesAnyPattern(item, PURCHASED_DELIVERABLE_CHANGE_PATTERNS)) {
      purchasedDeliverableChanges.push(item);
      continue;
    }
    if (matchesAnyPattern(item, STUDIO_DOES_NOT_PROVIDE_PATTERNS)) {
      studioDoesNotProvide.push(item);
      continue;
    }
    studioDoesNotProvide.push(item);
  }

  return {
    studioDoesNotProvide,
    purchasedDeliverableChanges,
  };
}

/** @deprecated Use purchasedDeliverableChanges — kept for transitional imports. */
export type LegacyClassifiedExclusions = {
  studioDoesNotProvide: readonly string[];
  requiresSeparateService: readonly string[];
};

/** @deprecated */
export function classifyServiceExclusionsLegacy(
  exclusions: readonly string[],
): LegacyClassifiedExclusions {
  const groups = classifyServiceExclusions(exclusions);
  return {
    studioDoesNotProvide: groups.studioDoesNotProvide,
    requiresSeparateService: groups.purchasedDeliverableChanges,
  };
}
