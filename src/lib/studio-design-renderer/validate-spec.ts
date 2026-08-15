/**
 * Fail-closed validation for FlyerDesignSpec.
 */

import { existsSync } from "fs";
import path from "path";

import { FLYER_PROOF_CONTRACT } from "./contracts";
import type { FlyerDesignSpec, FlyerProjectTruth } from "./types";
import {
  DESIGN_RENDERER_PROOF_SKU,
  FLYER_CANVAS,
  FLYER_DESIGN_SPEC_VERSION,
} from "./types";

export type SpecValidationResult =
  | { ok: true }
  | { ok: false; code: "INVALID_DESIGN_SPEC" | "MISSING_REQUIRED_MATERIAL" | "BROKEN_ASSET_REFERENCE"; message: string };

function isHexColor(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v);
}

export function validateFlyerDesignSpec(
  repoRoot: string,
  spec: FlyerDesignSpec,
  truth?: FlyerProjectTruth,
): SpecValidationResult {
  if (spec.specVersion !== FLYER_DESIGN_SPEC_VERSION) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Unsupported specVersion ${spec.specVersion}`,
    };
  }
  if (spec.skuId !== DESIGN_RENDERER_PROOF_SKU) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `SKU ${spec.skuId} is outside design-renderer proof scope`,
    };
  }
  if (
    spec.canvas.widthPx !== FLYER_CANVAS.widthPx ||
    spec.canvas.heightPx !== FLYER_CANVAS.heightPx
  ) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: `Canvas must be ${FLYER_CANVAS.widthPx}x${FLYER_CANVAS.heightPx}`,
    };
  }
  if (!isHexColor(spec.background.color)) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "background.color must be #RRGGBB",
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
  if (!Array.isArray(spec.layers) || spec.layers.length < 4) {
    return {
      ok: false,
      code: "INVALID_DESIGN_SPEC",
      message: "layers must include at least wordmark, offer, price, and contact",
    };
  }

  const roles = new Set(
    spec.layers.filter((l) => l.type === "text").map((l) => l.role),
  );
  for (const required of ["wordmark", "offer", "price", "contact_phone", "contact_web"] as const) {
    if (!roles.has(required)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `Missing required text role: ${required}`,
      };
    }
  }

  const formats = new Set(spec.outputFormats);
  for (const f of FLYER_PROOF_CONTRACT.requiredDeliverableFormats) {
    if (!formats.has(f)) {
      return {
        ok: false,
        code: "INVALID_DESIGN_SPEC",
        message: `outputFormats must include ${f} per flyer contract`,
      };
    }
  }

  const materialById = new Map(spec.materials.map((m) => [m.materialId, m]));
  const imageLayers = spec.layers.filter((l) => l.type === "image");
  if (imageLayers.length > 0 && spec.materials.length < 1) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_MATERIAL",
      message: "Image layers require bound materials on disk",
    };
  }

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

  for (const layer of spec.layers) {
    if (layer.type === "image") {
      if (!materialById.has(layer.materialId)) {
        return {
          ok: false,
          code: "BROKEN_ASSET_REFERENCE",
          message: `Image layer ${layer.id} references unknown material ${layer.materialId}`,
        };
      }
    }
    if (
      layer.x < 0 ||
      layer.y < 0 ||
      layer.width <= 0 ||
      layer.height <= 0 ||
      layer.x + layer.width > spec.canvas.widthPx + 1 ||
      layer.y + layer.height > spec.canvas.heightPx + 1
    ) {
      // text layers use width but height derived — check text separately
      if (layer.type !== "text") {
        return {
          ok: false,
          code: "INVALID_DESIGN_SPEC",
          message: `Layer ${layer.id} exceeds canvas bounds`,
        };
      }
      if (
        layer.x < 0 ||
        layer.y < 0 ||
        layer.width <= 0 ||
        layer.x + layer.width > spec.canvas.widthPx + 1
      ) {
        return {
          ok: false,
          code: "INVALID_DESIGN_SPEC",
          message: `Text layer ${layer.id} exceeds canvas bounds`,
        };
      }
    }
  }

  if (truth) {
    const joined = spec.layers
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
            "Customer-mode flyer must not leak certification fixture labeling or Harbor demo destinations",
        };
      }
    }
  }

  return { ok: true };
}
