/**
 * STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-INTAKE-TRUTH-1
 * Map live Route Map intake answers → authoritative per-graphic purpose + plate.
 * Does not wire dispatch. Does not remap primaryTool.
 */

import { resolvePromoPlate } from "./promo-contracts";
import {
  PROMO_LANDSCAPE_PLATE,
  PROMO_PORTRAIT_PLATE,
  PROMO_SQUARE_PLATE,
  type PromoAssetTruth,
  type PromoPlateId,
} from "./promo-types";

/** Customer-facing purpose options (intake select). */
export const PROMO_INTAKE_PURPOSE_OPTIONS = [
  "Print",
  "Social",
  "Email",
  "In-store",
  "Other",
] as const;

export type PromoIntakePurposeOption =
  (typeof PROMO_INTAKE_PURPOSE_OPTIONS)[number];

/** Customer-facing agreed-format options — map only to proven Studio plates. */
export const PROMO_INTAKE_PLATE_OPTIONS = [
  "Square 1024×1024 (social / feed)",
  "Portrait 1024×1536 (print / tall)",
  "Landscape 1536×1024 (wide)",
] as const;

export type PromoIntakePlateOption =
  (typeof PROMO_INTAKE_PLATE_OPTIONS)[number];

export const PROMO_INTAKE_FIELD_IDS = {
  graphicAPurpose: "graphicA_authorizedPurpose",
  graphicAPlate: "graphicA_agreedPlate",
  graphicBPurpose: "graphicB_authorizedPurpose",
  graphicBPlate: "graphicB_agreedPlate",
} as const;

const PLATE_OPTION_TO_ID: Record<PromoIntakePlateOption, PromoPlateId> = {
  "Square 1024×1024 (social / feed)": PROMO_SQUARE_PLATE.plateId,
  "Portrait 1024×1536 (print / tall)": PROMO_PORTRAIT_PLATE.plateId,
  "Landscape 1536×1024 (wide)": PROMO_LANDSCAPE_PLATE.plateId,
};

function layoutVariantForPlate(
  plateId: PromoPlateId,
): PromoAssetTruth["layoutVariant"] {
  if (plateId === PROMO_SQUARE_PLATE.plateId) return "compact_square";
  if (plateId === PROMO_PORTRAIT_PLATE.plateId) return "tall_portrait";
  return "wide_landscape";
}

export type PromoIntakeAssetTruthResult =
  | {
      ok: true;
      assets: readonly [PromoAssetTruth, PromoAssetTruth];
    }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_TRUTH"
        | "INVALID_PLATE"
        | "INVALID_PURPOSE";
      message: string;
    };

function parsePurpose(
  raw: string | undefined,
  which: "Graphic 1" | "Graphic 2",
): PromoIntakePurposeOption | PromoIntakeAssetTruthResult {
  const value = raw?.trim() ?? "";
  if (!value) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: `MISSING_REQUIRED_TRUTH: ${which} authorizedPurpose is required`,
    };
  }
  if (
    !(PROMO_INTAKE_PURPOSE_OPTIONS as readonly string[]).includes(value)
  ) {
    return {
      ok: false,
      code: "INVALID_PURPOSE",
      message: `INVALID_PURPOSE: ${which} purpose "${value}" is not an authorized option`,
    };
  }
  return value as PromoIntakePurposeOption;
}

function parsePlate(
  raw: string | undefined,
  which: "Graphic 1" | "Graphic 2",
): { plateId: PromoPlateId; canvas: { widthPx: number; heightPx: number } } | PromoIntakeAssetTruthResult {
  const value = raw?.trim() ?? "";
  if (!value) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: `MISSING_REQUIRED_TRUTH: ${which} agreedPlate is required`,
    };
  }
  const plateId = PLATE_OPTION_TO_ID[value as PromoIntakePlateOption];
  if (!plateId) {
    return {
      ok: false,
      code: "INVALID_PLATE",
      message: `INVALID_PLATE: ${which} format "${value}" is not a Studio agreed plate`,
    };
  }
  const plate = resolvePromoPlate(plateId);
  return {
    plateId: plate.plateId,
    canvas: { widthPx: plate.widthPx, heightPx: plate.heightPx },
  };
}

function isFail(
  v: unknown,
): v is Extract<PromoIntakeAssetTruthResult, { ok: false }> {
  return (
    typeof v === "object" &&
    v !== null &&
    "ok" in v &&
    (v as { ok: unknown }).ok === false
  );
}

/**
 * Build authoritative Asset A + Asset B truth from live intake answers.
 * Fail-closed — never invent purpose or plate.
 */
export function mapPromoAssetsFromIntakeAnswers(
  answers: Record<string, string | undefined>,
): PromoIntakeAssetTruthResult {
  const purposeA = parsePurpose(
    answers[PROMO_INTAKE_FIELD_IDS.graphicAPurpose],
    "Graphic 1",
  );
  if (isFail(purposeA)) return purposeA;

  const plateA = parsePlate(
    answers[PROMO_INTAKE_FIELD_IDS.graphicAPlate],
    "Graphic 1",
  );
  if (isFail(plateA)) return plateA;

  const purposeB = parsePurpose(
    answers[PROMO_INTAKE_FIELD_IDS.graphicBPurpose],
    "Graphic 2",
  );
  if (isFail(purposeB)) return purposeB;

  const plateB = parsePlate(
    answers[PROMO_INTAKE_FIELD_IDS.graphicBPlate],
    "Graphic 2",
  );
  if (isFail(plateB)) return plateB;

  const assetA: PromoAssetTruth = {
    assetId: "campaign-graphic-a",
    authorizedPurpose: `${purposeA} — ${answers[PROMO_INTAKE_FIELD_IDS.graphicAPlate]}`,
    plateId: plateA.plateId,
    canvas: plateA.canvas,
    layoutVariant: layoutVariantForPlate(plateA.plateId),
  };
  const assetB: PromoAssetTruth = {
    assetId: "campaign-graphic-b",
    authorizedPurpose: `${purposeB} — ${answers[PROMO_INTAKE_FIELD_IDS.graphicBPlate]}`,
    plateId: plateB.plateId,
    canvas: plateB.canvas,
    layoutVariant: layoutVariantForPlate(plateB.plateId),
  };

  return { ok: true, assets: [assetA, assetB] };
}

/** True when intake answers include all four required per-graphic truth fields. */
export function hasPromoPerGraphicIntakeTruth(
  answers: Record<string, string | undefined>,
): boolean {
  return mapPromoAssetsFromIntakeAnswers(answers).ok;
}

/** Plates the promotion-graphics dispatch hook may execute (PROOF-1). */
export const PROMO_EXECUTABLE_PLATE_IDS: ReadonlySet<PromoPlateId> = new Set([
  PROMO_SQUARE_PLATE.plateId,
  PROMO_PORTRAIT_PLATE.plateId,
]);

/**
 * Intake may record Landscape; execution must fail closed until a promo
 * landscape layout is proven. Do not substitute Square/Portrait.
 */
export function assertPromoAssetsExecutableForDispatch(
  assets: readonly [PromoAssetTruth, PromoAssetTruth],
):
  | { ok: true }
  | {
      ok: false;
      code: "UNSUPPORTED_PLATE_EXECUTION";
      message: string;
    } {
  for (const asset of assets) {
    if (!PROMO_EXECUTABLE_PLATE_IDS.has(asset.plateId)) {
      return {
        ok: false,
        code: "UNSUPPORTED_PLATE_EXECUTION",
        message:
          `UNSUPPORTED_PLATE_EXECUTION: asset ${asset.assetId} agreed plate ` +
          `${asset.plateId} is recorded in intake but not yet proven for ` +
          `v2-rtu-promotion-graphics execution (executable now: ` +
          `${PROMO_SQUARE_PLATE.plateId}, ${PROMO_PORTRAIT_PLATE.plateId}). ` +
          `No silent substitution.`,
      };
    }
    if (asset.layoutVariant === "wide_landscape") {
      return {
        ok: false,
        code: "UNSUPPORTED_PLATE_EXECUTION",
        message:
          `UNSUPPORTED_PLATE_EXECUTION: landscape promo layout is intake-ready ` +
          `but not certified for Machine fulfillment yet.`,
      };
    }
  }
  return { ok: true };
}
