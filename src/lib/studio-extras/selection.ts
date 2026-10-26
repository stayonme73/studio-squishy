import type { CondensedPackageId } from "@/config/studio-customer-journey-condense-v1";
import {
  STUDIO_EXTRA_IDS,
  studioExtrasEligibilityByPackage,
  studioExtrasV1,
  type StudioExtraId,
} from "@/config/studio-extras-v1";

export type StudioExtrasSelectionResult =
  | { ok: true; extras: readonly StudioExtraId[] }
  | {
      ok: false;
      code:
        | "EXTRAS_NOT_A_LIST"
        | "EXTRA_UNKNOWN"
        | "EXTRA_DUPLICATE"
        | "EXTRA_NOT_ELIGIBLE_FOR_PACKAGE"
        | "EXTRAS_OVER_LIMIT";
      message: string;
    };

export function isStudioExtraId(value: unknown): value is StudioExtraId {
  return typeof value === "string" && (STUDIO_EXTRA_IDS as readonly string[]).includes(value);
}

export function eligibleStudioExtras(packageId: CondensedPackageId): readonly StudioExtraId[] {
  return studioExtrasEligibilityByPackage[packageId] ?? [];
}

/**
 * Server and client share this one check. Eligibility and the limit come only
 * from `studioExtrasV1` / `studioExtrasEligibilityByPackage`.
 */
export function validateStudioExtrasSelection(
  packageId: CondensedPackageId,
  raw: unknown,
): StudioExtrasSelectionResult {
  if (raw === undefined || raw === null) return { ok: true, extras: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, code: "EXTRAS_NOT_A_LIST", message: "Studio Extras must be a list." };
  }
  const seen = new Set<string>();
  const eligible = new Set<string>(eligibleStudioExtras(packageId));
  const extras: StudioExtraId[] = [];
  for (const value of raw) {
    if (!isStudioExtraId(value)) {
      return {
        ok: false,
        code: "EXTRA_UNKNOWN",
        message: "One of the selected Studio Extras is not offered.",
      };
    }
    if (seen.has(value)) {
      return {
        ok: false,
        code: "EXTRA_DUPLICATE",
        message: "Each Studio Extra can be selected once.",
      };
    }
    if (!eligible.has(value)) {
      return {
        ok: false,
        code: "EXTRA_NOT_ELIGIBLE_FOR_PACKAGE",
        message: "That Studio Extra is not offered with this package.",
      };
    }
    seen.add(value);
    extras.push(value);
  }
  if (extras.length > studioExtrasV1.maxSelectionsPerOrder) {
    return {
      ok: false,
      code: "EXTRAS_OVER_LIMIT",
      message: `You can choose up to ${studioExtrasV1.maxSelectionsPerOrder} Studio Extras.`,
    };
  }
  return { ok: true, extras };
}

/** Whether one more Extra may be added to a selection in progress. */
export function canAddStudioExtra(
  packageId: CondensedPackageId,
  current: readonly StudioExtraId[],
  next: StudioExtraId,
): boolean {
  if (current.includes(next)) return false;
  return validateStudioExtrasSelection(packageId, [...current, next]).ok;
}
