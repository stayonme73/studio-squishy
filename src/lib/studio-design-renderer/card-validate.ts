/**
 * Fail-closed validation for BusinessCardDesignSpec (double-sided).
 */

import { existsSync } from "fs";
import path from "path";

import { BUSINESS_CARD_PROOF_CONTRACT } from "./card-contracts";
import type {
  BusinessCardDesignSpec,
  BusinessCardProjectTruth,
  BusinessCardSideSpec,
} from "./card-types";
import {
  BUSINESS_CARD_CANVAS,
  BUSINESS_CARD_DESIGN_SPEC_VERSION,
  DESIGN_RENDERER_BUSINESS_CARD_SKU,
} from "./card-types";

export type CardSpecValidationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "INVALID_DESIGN_SPEC"
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE";
      message: string;
    };

function isHexColor(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v);
}

function validateSide(
  side: BusinessCardSideSpec,
  canvas: { widthPx: number; heightPx: number },
  materialById: Map<string, { materialId: string }>,
  requiredTextRoles: readonly string[],
): CardSpecValidationResult {
  if (side.side !== "front" && side.side !== "back") {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Invalid side id ${String(side.side)}`,
    };
  }
  if (!isHexColor(side.background.color)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `${side.side} background.color must be #RRGGBB`,
    };
  }
  if (!Array.isArray(side.layers) || side.layers.length < 3) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `${side.side} must include enough layers for identity`,
    };
  }

  const roles = new Set(
    side.layers.filter((l) => l.type === "text").map((l) => l.role),
  );
  for (const required of requiredTextRoles) {
    if (!roles.has(required as never)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `${side.side} missing required text role: ${required}`,
      };
    }
  }

  for (const layer of side.layers) {
    if (layer.type === "image") {
      if (!materialById.has(layer.materialId)) {
        return {
          ok: false,
          code: "BROKEN_ASSET_REFERENCE",
          message: `${side.side} image ${layer.id} references unknown material ${layer.materialId}`,
        };
      }
    }
    if (layer.type !== "text") {
      if (
        layer.x < 0 ||
        layer.y < 0 ||
        layer.width <= 0 ||
        layer.height <= 0 ||
        layer.x + layer.width > canvas.widthPx + 1 ||
        layer.y + layer.height > canvas.heightPx + 1
      ) {
        return {
          ok: false,
          code: "INVALID_DESIGN_SPEC",
          message: `${side.side} layer ${layer.id} exceeds canvas bounds`,
        };
      }
    } else if (
      layer.x < 0 ||
      layer.y < 0 ||
      layer.width <= 0 ||
      layer.x + layer.width > canvas.widthPx + 1
    ) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `${side.side} text layer ${layer.id} exceeds canvas bounds`,
      };
    }
  }

  return { ok: true };
}

export function validateBusinessCardDesignSpec(
  repoRoot: string,
  spec: BusinessCardDesignSpec,
  truth?: BusinessCardProjectTruth,
): CardSpecValidationResult {
  if (spec.specVersion !== BUSINESS_CARD_DESIGN_SPEC_VERSION) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Unsupported specVersion ${spec.specVersion}`,
    };
  }
  if (spec.skuId !== DESIGN_RENDERER_BUSINESS_CARD_SKU) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `SKU ${spec.skuId} is outside business-card proof scope`,
    };
  }
  if (
    spec.canvas.widthPx !== BUSINESS_CARD_CANVAS.widthPx ||
    spec.canvas.heightPx !== BUSINESS_CARD_CANVAS.heightPx
  ) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Canvas must be ${BUSINESS_CARD_CANVAS.widthPx}x${BUSINESS_CARD_CANVAS.heightPx} landscape CERT plate`,
    };
  }
  if (spec.front.side !== "front" || spec.back.side !== "back") {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Spec must define distinct front and back sides",
    };
  }

  for (const key of ["primary", "secondary", "background", "text", "muted"] as const) {
    if (!isHexColor(spec.colors[key])) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `colors.${key} must be #RRGGBB`,
      };
    }
  }

  const formats = new Set(spec.outputFormats);
  for (const f of BUSINESS_CARD_PROOF_CONTRACT.requiredDeliverableFormats) {
    if (!formats.has(f)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `outputFormats must include ${f}`,
      };
    }
  }

  if (spec.materials.length < 1) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_MATERIAL",
      message: "At least one logo material is required",
    };
  }

  const materialById = new Map(spec.materials.map((m) => [m.materialId, m]));
  for (const m of spec.materials) {
    if (!m.relativePath || !m.contentSha256) {
      return {
        ok: false,
        code: "MISSING_REQUIRED_MATERIAL",
        message: `Material ${m.materialId} missing path or hash`,
      };
    }
    const abs = path.join(repoRoot, m.relativePath);
    if (!existsSync(abs)) {
      return {
        ok: false,
        code: "BROKEN_ASSET_REFERENCE",
        message: `Material ${m.materialId} missing on disk: ${m.relativePath}`,
      };
    }
  }

  const frontCheck = validateSide(
    spec.front,
    spec.canvas,
    materialById,
    ["wordmark", "person_name", "phone", "email"],
  );
  if (!frontCheck.ok) return frontCheck;

  const backCheck = validateSide(spec.back, spec.canvas, materialById, [
    "wordmark",
  ]);
  if (!backCheck.ok) return backCheck;

  const frontHasLogo = spec.front.layers.some((l) => l.type === "image");
  const backHasLogo = spec.back.layers.some((l) => l.type === "image");
  if (!frontHasLogo || !backHasLogo) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "Both front and back must include logo image layers",
    };
  }

  if (truth) {
    const joined = [...spec.front.layers, ...spec.back.layers]
      .filter((l) => l.type === "text")
      .map((l) => l.content)
      .join(" ");
    for (const token of truth.requiredTextTokens) {
      if (!joined.includes(token)) {
        return {
          ok: false,
          code: "INVALID_DESIGN_SPEC",
          message: `Spec text missing required project token: ${token}`,
        };
      }
    }
    for (const bad of truth.prohibitedClaimPatterns) {
      if (joined.toLowerCase().includes(bad.toLowerCase())) {
        return {
          ok: false,
          code: "INVALID_DESIGN_SPEC",
          message: `Spec text contains prohibited claim: ${bad}`,
        };
      }
    }
    if (truth.outputMode === "customer") {
      const leak =
        /CERTIFICATION FIXTURE|INTERNAL TEST — not a live customer|harborandoak\.example/i;
      if (leak.test(joined)) {
        return {
          ok: false,
          code: "INVALID_DESIGN_SPEC",
          message:
            "Customer-mode card must not leak certification fixture labeling or Harbor demo destinations",
        };
      }
    }
  }

  return { ok: true };
}
