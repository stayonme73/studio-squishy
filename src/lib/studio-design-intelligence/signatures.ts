import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import type { FlyerDesignSpec } from "@/lib/studio-design-renderer/types";

import { measureCanvasDistribution } from "@/lib/studio-project-alpha/full-canvas";
import { BLOCKED_SEED_SIGNATURES } from "./anti-copy";
import type {
  DesignGeometryId,
  DesignLayoutFamilyId,
  DesignPaletteFamilyId,
  DesignTypeSystemId,
  FlyerCreativeDirection,
  VisualSignature,
} from "./types";

const SIGNATURE_REL = "data/design-intelligence/recent-signatures.json";

export function recentSignaturesPath(repoRoot: string): string {
  return path.join(repoRoot, SIGNATURE_REL);
}

export function readRecentSignatures(repoRoot: string): VisualSignature[] {
  const abs = recentSignaturesPath(repoRoot);
  let stored: VisualSignature[] = [];
  if (existsSync(abs)) {
    try {
      const parsed = JSON.parse(readFileSync(abs, "utf8")) as {
        signatures?: VisualSignature[];
      };
      stored = parsed.signatures ?? [];
    } catch {
      stored = [];
    }
  }
  const byId = new Map<string, VisualSignature>();
  for (const seed of BLOCKED_SEED_SIGNATURES) byId.set(seed.campaignId, seed);
  for (const item of stored) {
    if (item.campaignId === MAYA_PROTECTED_CAMPAIGN_ID) continue;
    byId.set(item.campaignId, item);
  }
  return [...byId.values()];
}

export function signatureFromDirection(
  campaignId: string,
  direction: FlyerCreativeDirection,
): VisualSignature {
  const palette = direction.selectedRoute.paletteFamilyId;
  return {
    campaignId,
    source: "successful_customer_job",
    paletteFamilyId: palette,
    primaryHex: "",
    secondaryHex: "",
    layoutFamilyId: direction.selectedRoute.layoutFamilyId,
    geometryId: direction.selectedRoute.geometryId,
    typeSystemId: direction.selectedRoute.typeSystemId,
    headlineAlign:
      direction.selectedRoute.layoutFamilyId === "centered_promotional_plate"
        ? "center"
        : "left",
    ctaTreatment:
      direction.selectedRoute.layoutFamilyId === "centered_promotional_plate"
        ? "pill"
        : direction.selectedRoute.layoutFamilyId === "bold_asymmetric" ||
            direction.selectedRoute.layoutFamilyId === "service_rail" ||
            direction.selectedRoute.layoutFamilyId === "modular_thirds" ||
            direction.selectedRoute.layoutFamilyId === "type_led_premium"
          ? "bar"
          : "text_rule",
    contentDistribution: "balanced_thirds",
    recordedAt: new Date().toISOString(),
  };
}

export function signatureFromSpec(
  campaignId: string,
  spec: FlyerDesignSpec,
  direction?: FlyerCreativeDirection,
): VisualSignature {
  const medallion = spec.layers.some((layer) => layer.id === "offer-medallion");
  const headline = spec.layers.find(
    (layer) => layer.type === "text" && layer.role === "headline",
  );
  const ctaPlate = spec.layers.find((layer) => layer.id === "cta-plate");
  const ctaBar = spec.layers.find((layer) => layer.id === "cta-bar");
  const footer = spec.layers.some((layer) => layer.id === "footer-band");
  const distribution = measureCanvasDistribution(spec);
  return {
    campaignId,
    source: "successful_customer_job",
    paletteFamilyId:
      (direction?.selectedRoute.paletteFamilyId as DesignPaletteFamilyId) ??
      "unknown",
    primaryHex: spec.colors.primary,
    secondaryHex: spec.colors.secondary,
    layoutFamilyId:
      (direction?.selectedRoute.layoutFamilyId as DesignLayoutFamilyId) ??
      (medallion ? "centered_promotional_plate" : "unknown"),
    geometryId: (direction?.selectedRoute.geometryId ??
      (medallion ? "centered_circle" : "none")) as DesignGeometryId,
    typeSystemId:
      (direction?.selectedRoute.typeSystemId as DesignTypeSystemId) ?? "unknown",
    headlineAlign:
      headline && headline.type === "text" ? headline.align : "unknown",
    ctaTreatment: ctaBar || footer
      ? "bar"
      : ctaPlate
        ? "pill"
        : "text_rule",
    contentDistribution: distribution.topHeavy ? "top_third" : "balanced_thirds",
    recordedAt: new Date().toISOString(),
  };
}

export function persistSuccessfulSignature(input: {
  repoRoot: string;
  campaignId: string;
  spec: FlyerDesignSpec;
  direction?: FlyerCreativeDirection;
}): void {
  if (input.campaignId === MAYA_PROTECTED_CAMPAIGN_ID) return;
  if (input.campaignId.startsWith("intel-qa-")) return;
  const next = signatureFromSpec(
    input.campaignId,
    input.spec,
    input.direction,
  );
  if (next.paletteFamilyId === "unknown") {
    const fromDirection = input.direction
      ? signatureFromDirection(input.campaignId, input.direction)
      : next;
    next.paletteFamilyId = fromDirection.paletteFamilyId;
    next.layoutFamilyId = fromDirection.layoutFamilyId;
    next.geometryId = fromDirection.geometryId;
    next.typeSystemId = fromDirection.typeSystemId;
  }
  const abs = recentSignaturesPath(input.repoRoot);
  mkdirSync(path.dirname(abs), { recursive: true });
  const current = readRecentSignatures(input.repoRoot).filter(
    (item) => item.source !== "blocked_seed" || item.campaignId.startsWith("seed:"),
  );
  const filtered = current.filter((item) => item.campaignId !== input.campaignId);
  writeFileSync(
    abs,
    `${JSON.stringify({ signatures: [...filtered, next].slice(-24) }, null, 2)}\n`,
    "utf8",
  );
}
