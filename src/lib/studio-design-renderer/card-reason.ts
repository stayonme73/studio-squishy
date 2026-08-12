/**
 * Deterministic business-card reasoner → bounded BusinessCardDesignSpec.
 * Front = contact identity; back = brand mark + wordmark + optional descriptor/URL.
 * Does not invent missing optional fields.
 */

import type {
  BusinessCardDesignSpec,
  BusinessCardProjectTruth,
  BusinessCardTextLayer,
} from "./card-types";
import {
  BUSINESS_CARD_CANVAS,
  BUSINESS_CARD_DESIGN_SPEC_VERSION,
} from "./card-types";

function textLayer(
  partial: Omit<BusinessCardTextLayer, "type">,
): BusinessCardTextLayer {
  return { type: "text", ...partial };
}

export function assertBusinessCardRequiredTruth(
  truth: BusinessCardProjectTruth,
): void {
  const missing: string[] = [];
  if (!truth.businessName?.trim()) missing.push("businessName");
  if (!truth.personName?.trim()) missing.push("personName");
  if (!truth.phone?.trim()) missing.push("phone");
  if (!truth.email?.trim()) missing.push("email");
  if (!truth.materials.some((m) => m.role === "logo")) missing.push("logo");
  if (missing.length) {
    throw new Error(
      `MISSING_REQUIRED_TRUTH: ${missing.join(", ")}`,
    );
  }
}

export function reasonBusinessCardDesignSpecDeterministic(
  truth: BusinessCardProjectTruth,
): BusinessCardDesignSpec {
  assertBusinessCardRequiredTruth(truth);
  const c = truth.brandColors;
  const logo = truth.materials.find((m) => m.role === "logo");
  if (!logo) {
    throw new Error("MISSING_REQUIRED_MATERIAL: logo");
  }

  const W = BUSINESS_CARD_CANVAS.widthPx;
  const H = BUSINESS_CARD_CANVAS.heightPx;

  const frontLayers = [
    {
      type: "shape" as const,
      id: "front-accent",
      role: "accent_bar" as const,
      x: 0,
      y: 0,
      width: 28,
      height: H,
      fill: c.primary,
    },
    {
      type: "shape" as const,
      id: "front-logo-plate",
      role: "logo_plate" as const,
      x: 72,
      y: 72,
      width: 160,
      height: 160,
      fill: "#FFFFFF",
      borderRadiusPx: 12,
    },
    {
      type: "image" as const,
      id: "front-logo",
      role: "logo" as const,
      materialId: logo.materialId,
      x: 88,
      y: 88,
      width: 128,
      height: 128,
      fit: "contain" as const,
    },
    textLayer({
      id: "front-wordmark",
      role: "wordmark",
      content: truth.wordmark,
      x: 280,
      y: 96,
      width: 1160,
      fontSizePx: 42,
      fontWeight: 700,
      lineHeight: 1.15,
      color: c.primary,
      align: "left",
    }),
    textLayer({
      id: "front-person",
      role: "person_name",
      content: truth.personName,
      x: 280,
      y: 200,
      width: 1160,
      fontSizePx: 36,
      fontWeight: 600,
      lineHeight: 1.2,
      color: c.text,
      align: "left",
    }),
    ...(truth.title?.trim()
      ? [
          textLayer({
            id: "front-title",
            role: "title",
            content: truth.title.trim(),
            x: 280,
            y: 260,
            width: 1160,
            fontSizePx: 26,
            fontWeight: 500,
            lineHeight: 1.2,
            color: c.muted,
            align: "left",
          }),
        ]
      : []),
    {
      type: "shape" as const,
      id: "front-divider",
      role: "divider" as const,
      x: 280,
      y: 340,
      width: 480,
      height: 3,
      fill: c.secondary,
    },
    textLayer({
      id: "front-phone",
      role: "phone",
      content: truth.phone,
      x: 280,
      y: 400,
      width: 1160,
      fontSizePx: 28,
      fontWeight: 500,
      lineHeight: 1.3,
      color: c.text,
      align: "left",
    }),
    textLayer({
      id: "front-email",
      role: "email",
      content: truth.email,
      x: 280,
      y: 460,
      width: 1160,
      fontSizePx: 26,
      fontWeight: 400,
      lineHeight: 1.3,
      color: c.text,
      align: "left",
    }),
    ...(truth.webDisplay?.trim()
      ? [
          textLayer({
            id: "front-web",
            role: "web",
            content: truth.webDisplay.trim(),
            x: 280,
            y: 520,
            width: 1160,
            fontSizePx: 26,
            fontWeight: 400,
            lineHeight: 1.3,
            color: c.primary,
            align: "left",
          }),
        ]
      : []),
    ...(truth.address?.trim()
      ? [
          textLayer({
            id: "front-address",
            role: "address",
            content: truth.address.trim(),
            x: 280,
            y: 580,
            width: 1160,
            fontSizePx: 24,
            fontWeight: 400,
            lineHeight: 1.3,
            color: c.muted,
            align: "left",
          }),
        ]
      : []),
  ];

  const backYDescriptor = 620;
  const backLayers = [
    {
      type: "shape" as const,
      id: "back-plate",
      role: "plate" as const,
      x: 0,
      y: 0,
      width: W,
      height: H,
      fill: c.primary,
    },
    {
      type: "shape" as const,
      id: "back-logo-plate",
      role: "logo_plate" as const,
      x: (W - 220) / 2,
      y: 220,
      width: 220,
      height: 220,
      fill: "#FFFFFF",
      borderRadiusPx: 16,
    },
    {
      type: "image" as const,
      id: "back-logo",
      role: "logo" as const,
      materialId: logo.materialId,
      x: (W - 180) / 2,
      y: 240,
      width: 180,
      height: 180,
      fit: "contain" as const,
    },
    textLayer({
      id: "back-wordmark",
      role: "wordmark",
      content: truth.wordmark,
      x: 80,
      y: 480,
      width: W - 160,
      fontSizePx: 40,
      fontWeight: 700,
      lineHeight: 1.15,
      color: "#F7F4EF",
      align: "center",
    }),
    ...(truth.backDescriptor?.trim()
      ? [
          textLayer({
            id: "back-descriptor",
            role: "descriptor",
            content: truth.backDescriptor.trim(),
            x: 120,
            y: backYDescriptor,
            width: W - 240,
            fontSizePx: 24,
            fontWeight: 400,
            lineHeight: 1.35,
            color: c.secondary,
            align: "center",
          }),
        ]
      : []),
    ...(truth.webDisplay?.trim()
      ? [
          textLayer({
            id: "back-web",
            role: "web",
            content: truth.webDisplay.trim(),
            x: 120,
            y: truth.backDescriptor?.trim() ? 700 : 640,
            width: W - 240,
            fontSizePx: 26,
            fontWeight: 500,
            lineHeight: 1.3,
            color: "#F7F4EF",
            align: "center",
          }),
        ]
      : []),
  ];

  return {
    specVersion: BUSINESS_CARD_DESIGN_SPEC_VERSION,
    skuId: truth.skuId,
    canvas: { ...BUSINESS_CARD_CANVAS },
    colors: { ...c },
    materials: [...truth.materials],
    outputFormats: ["png", "pdf"],
    reasoningMode: "deterministic_constrained",
    front: {
      side: "front",
      background: { color: c.background },
      layers: frontLayers,
    },
    back: {
      side: "back",
      background: { color: c.primary },
      layers: backLayers,
    },
  };
}
