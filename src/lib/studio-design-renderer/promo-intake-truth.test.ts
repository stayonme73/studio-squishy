/**
 * STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-INTAKE-TRUTH-1
 */

import { describe, expect, it } from "vitest";

import { getRouteMapIntakeSchema } from "@/catalog/intake";

import { PROMO_PROOF_CONTRACT } from "./promo-contracts";
import {
  hasPromoPerGraphicIntakeTruth,
  mapPromoAssetsFromIntakeAnswers,
  PROMO_INTAKE_FIELD_IDS,
  PROMO_INTAKE_PLATE_OPTIONS,
  PROMO_INTAKE_PURPOSE_OPTIONS,
} from "./promo-intake-truth";
import { PROMO_PORTRAIT_PLATE, PROMO_SQUARE_PLATE } from "./promo-types";

describe("promotion-graphics intake truth (INTAKE-TRUTH-1)", () => {
  it("schema requires per-graphic purpose + agreed plate for both assets", () => {
    const schema = getRouteMapIntakeSchema("rtu-promotion-graphics");
    const ids = schema.fields.map((f) => f.id);
    expect(ids).toContain(PROMO_INTAKE_FIELD_IDS.graphicAPurpose);
    expect(ids).toContain(PROMO_INTAKE_FIELD_IDS.graphicAPlate);
    expect(ids).toContain(PROMO_INTAKE_FIELD_IDS.graphicBPurpose);
    expect(ids).toContain(PROMO_INTAKE_FIELD_IDS.graphicBPlate);
    expect(ids).not.toContain("intendedUse");
    expect(ids).not.toContain("sizeNotes");

    for (const id of Object.values(PROMO_INTAKE_FIELD_IDS)) {
      const field = schema.fields.find((f) => f.id === id);
      expect(field?.required).toBe(true);
      expect(field?.type).toBe("select");
    }

    const purposeField = schema.fields.find(
      (f) => f.id === PROMO_INTAKE_FIELD_IDS.graphicAPurpose,
    );
    expect(purposeField?.options).toEqual([...PROMO_INTAKE_PURPOSE_OPTIONS]);

    const plateField = schema.fields.find(
      (f) => f.id === PROMO_INTAKE_FIELD_IDS.graphicAPlate,
    );
    expect(plateField?.options).toEqual([...PROMO_INTAKE_PLATE_OPTIONS]);

    expect(schema.fields.length).toBeLessThan(12);
    expect(PROMO_PROOF_CONTRACT.liveIntakePerAssetPurposeResolved).toBe(true);
  });

  it("maps authoritative Asset A/B purpose + plate without inventing", () => {
    const mapped = mapPromoAssetsFromIntakeAnswers({
      [PROMO_INTAKE_FIELD_IDS.graphicAPurpose]: "Social",
      [PROMO_INTAKE_FIELD_IDS.graphicAPlate]:
        "Square 1024×1024 (social / feed)",
      [PROMO_INTAKE_FIELD_IDS.graphicBPurpose]: "Print",
      [PROMO_INTAKE_FIELD_IDS.graphicBPlate]:
        "Portrait 1024×1536 (print / tall)",
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.assets[0]!.assetId).toBe("campaign-graphic-a");
    expect(mapped.assets[0]!.plateId).toBe(PROMO_SQUARE_PLATE.plateId);
    expect(mapped.assets[0]!.canvas).toEqual({
      widthPx: 1024,
      heightPx: 1024,
    });
    expect(mapped.assets[0]!.authorizedPurpose).toContain("Social");
    expect(mapped.assets[1]!.assetId).toBe("campaign-graphic-b");
    expect(mapped.assets[1]!.plateId).toBe(PROMO_PORTRAIT_PLATE.plateId);
    expect(mapped.assets[1]!.canvas).toEqual({
      widthPx: 1024,
      heightPx: 1536,
    });
    expect(mapped.assets[1]!.authorizedPurpose).toContain("Print");
    expect(hasPromoPerGraphicIntakeTruth({
      [PROMO_INTAKE_FIELD_IDS.graphicAPurpose]: "Social",
      [PROMO_INTAKE_FIELD_IDS.graphicAPlate]:
        "Square 1024×1024 (social / feed)",
      [PROMO_INTAKE_FIELD_IDS.graphicBPurpose]: "Print",
      [PROMO_INTAKE_FIELD_IDS.graphicBPlate]:
        "Portrait 1024×1536 (print / tall)",
    })).toBe(true);
  });

  it("fails closed when Graphic 1 purpose missing", () => {
    const mapped = mapPromoAssetsFromIntakeAnswers({
      [PROMO_INTAKE_FIELD_IDS.graphicAPlate]:
        "Square 1024×1024 (social / feed)",
      [PROMO_INTAKE_FIELD_IDS.graphicBPurpose]: "Print",
      [PROMO_INTAKE_FIELD_IDS.graphicBPlate]:
        "Portrait 1024×1536 (print / tall)",
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("MISSING_REQUIRED_TRUTH");
    expect(mapped.message).toMatch(/Graphic 1 authorizedPurpose/);
  });

  it("fails closed when Graphic 2 plate missing", () => {
    const mapped = mapPromoAssetsFromIntakeAnswers({
      [PROMO_INTAKE_FIELD_IDS.graphicAPurpose]: "Social",
      [PROMO_INTAKE_FIELD_IDS.graphicAPlate]:
        "Square 1024×1024 (social / feed)",
      [PROMO_INTAKE_FIELD_IDS.graphicBPurpose]: "Print",
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("MISSING_REQUIRED_TRUTH");
    expect(mapped.message).toMatch(/Graphic 2 agreedPlate/);
  });

  it("fails closed on invented plate / purpose", () => {
    const badPlate = mapPromoAssetsFromIntakeAnswers({
      [PROMO_INTAKE_FIELD_IDS.graphicAPurpose]: "Social",
      [PROMO_INTAKE_FIELD_IDS.graphicAPlate]: "Instagram Story 1080x1920",
      [PROMO_INTAKE_FIELD_IDS.graphicBPurpose]: "Print",
      [PROMO_INTAKE_FIELD_IDS.graphicBPlate]:
        "Portrait 1024×1536 (print / tall)",
    });
    expect(badPlate.ok).toBe(false);
    if (!badPlate.ok) expect(badPlate.code).toBe("INVALID_PLATE");

    const badPurpose = mapPromoAssetsFromIntakeAnswers({
      [PROMO_INTAKE_FIELD_IDS.graphicAPurpose]: "Billboard",
      [PROMO_INTAKE_FIELD_IDS.graphicAPlate]:
        "Square 1024×1024 (social / feed)",
      [PROMO_INTAKE_FIELD_IDS.graphicBPurpose]: "Print",
      [PROMO_INTAKE_FIELD_IDS.graphicBPlate]:
        "Portrait 1024×1536 (print / tall)",
    });
    expect(badPurpose.ok).toBe(false);
    if (!badPurpose.ok) expect(badPurpose.code).toBe("INVALID_PURPOSE");
  });

  it("does not treat legacy job-level intendedUse as sufficient", () => {
    expect(
      hasPromoPerGraphicIntakeTruth({
        intendedUse: "Social",
        sizeNotes: "square please",
      }),
    ).toBe(false);
  });
});
