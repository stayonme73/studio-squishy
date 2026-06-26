/**
 * Studio Guide — interaction validation prototype.
 * Uses Studio Guide Plate V4 — portfolio folders + baked signature panels.
 *
 * LIMITATIONS (document before commissioning final art):
 * - Folder hit rects calibrated on 1536×1024 V4 plate — verify with ?debug=1.
 * - Expanded proposal is HTML overlay, not illustrated open state.
 * - Welcome Hall → Guide is CSS zoom + crossfade, not true camera parallax.
 * - Plate aspect (3:2) differs from Welcome Hall (16:9) — slight framing shift on land.
 *
 * SIGNATURE FILL — LOCKED (do not regress):
 * - Long client names wrap to 2 lines max, centered. No ellipsis. No nowrap.
 * - APPROVED stamp and date stay pinned at the bottom (flex-shrink: 0); they do not move.
 * - Fill height is not hard-coded in CSS — it comes from signaturePlateMeasurements.fill per folder.
 * - Each folder has independent plate-native fill coords — never copy Spark/Momentum offsets to Growth.
 * - QA: set prototypeClientName to STUDIO_GUIDE_SIGNATURE_FILL_TEST_NAME and verify SPARK, MOMENTUM,
 *   GROWTH with ?debug=1. If one folder is off, nudge that folder's fill only.
 * - Production escape hatch: deskApproval.showClientName = false → stamp + date only (no name block).
 */

import type { StudioGuidePackageId } from "@/config/studio-guide";
import { customerJourneyStepName } from "@/config/customer-journey-v1";
import { welcomeHallInteraction } from "@/config/welcome-hall-interaction";

/** Stress-test name for signature fill QA — long names, hyphen, two-line wrap. */
export const STUDIO_GUIDE_SIGNATURE_FILL_TEST_NAME = "Jennifer Montgomery-Washington";

export type StudioGuidePrototypeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StudioGuideSignaturePanelLayout = {
  width: number;
  height: number;
  rightOffset: number;
  bottomOffset: number;
  fillHeight: number;
  fillWidth?: number;
  fillRightOffset?: number;
};

/** Measured on plate — each folder has its own coords (perspective/placement differ). */
export type StudioGuidePlateSignatureMeasurement = {
  panel: StudioGuidePrototypeRect;
  fill: StudioGuidePrototypeRect;
};

export const studioGuidePrototype = {
  status: "interaction-validation" as const,
  route: "/business-discovery-studio",
  welcomeHallEntryHref: "/business-discovery-studio",
  transitionMs: welcomeHallInteraction.transitionMs,

  plate: {
    src: "/studio-guide/studio-guide-plate-v4.png",
    alt: "Draft Room — Studio Guide with SPARK, MOMENTUM, and GROWTH portfolio folders on the table",
    nativeSize: { width: 1536, height: 1024 } as const,
  },

  /** Visible folder face on V4 plate — tap target; use ?debug=1 to verify. */
  bookletHits: {
    spark: { x: 430, y: 480, width: 190, height: 268 },
    momentum: { x: 710, y: 480, width: 222, height: 268 },
    growth: { x: 975, y: 480, width: 248, height: 268 },
  } satisfies Record<StudioGuidePackageId, StudioGuidePrototypeRect>,

  /** Table callout — centered above folder row on V4 plate (percent of native plate). */
  tableCallout: {
    left: 53.1,
    top: 41.5,
  } as const,

  accents: {
    spark: { spine: "#f9d134", ink: "#2c3e50" },
    momentum: { spine: "#d94e2b", ink: "#2c3e50" },
    growth: { spine: "#2c3e50", ink: "#ebe2d4" },
  },

  copy: {
    banner: "Interaction prototype — V1 content lock · Plate V4",
    expandClose: "Fold Closed",
    selectedStatus: (label: string) => `${label} — client approved`,
    exploreHintEyebrow: "Start Here",
    exploreHint: "Tap a Folder to Explore Packages",
    exploreHintMobile: "Select a package below",
    paymentCta: `Continue to ${customerJourneyStepName("secure-checkout")}`,
    paymentNote: "Next: confirm your package and complete payment.",
  },

  deskApproval: {
    statusLabel: "Proposal Signed",
    signatureLabel: "Client Signature",
    stamp: "APPROVED",
    /**
     * Prototype only. Production: set false to hide client name — still shows APPROVED + date.
     * Baked art retains PROPOSAL SIGNED / Client Signature labels.
     */
    showClientName: false,
    prototypeClientName: STUDIO_GUIDE_SIGNATURE_FILL_TEST_NAME,
    prototypeApprovalDate: "06/20/2026",
    /**
     * Source of truth: absolute px on studio-guide-plate-v4.png (1536×1024).
     * panel = full baked signature card. fill = dynamic overlay (name, stamp, date).
     * Measure each folder independently — perspective/placement differ. Do not copy folder-to-folder.
     * Nudge fill.x / fill.y / fill.width / fill.height for one folder only if misaligned.
     */
    signaturePlateMeasurements: {
      spark: {
        panel: { x: 503, y: 651, width: 79, height: 62 },
        fill: { x: 503, y: 673, width: 79, height: 40 },
      },
      momentum: {
        panel: { x: 815, y: 651, width: 79, height: 62 },
        fill: { x: 815, y: 673, width: 79, height: 40 },
      },
      growth: {
        panel: { x: 1125, y: 651, width: 88, height: 62 },
        fill: { x: 1140, y: 673, width: 79, height: 40 },
      },
    } satisfies Record<StudioGuidePackageId, StudioGuidePlateSignatureMeasurement>,
  },
} as const;

function plateRectToFolderOffsets(
  folder: StudioGuidePrototypeRect,
  plateRect: StudioGuidePrototypeRect,
) {
  return {
    width: plateRect.width,
    height: plateRect.height,
    rightOffset: folder.x + folder.width - (plateRect.x + plateRect.width),
    bottomOffset: folder.y + folder.height - (plateRect.y + plateRect.height),
  };
}

function buildSignatureLayoutFromPlate(
  packageId: StudioGuidePackageId,
): StudioGuideSignaturePanelLayout {
  const folder = studioGuidePrototype.bookletHits[packageId];
  const { panel, fill } = studioGuidePrototype.deskApproval.signaturePlateMeasurements[packageId];
  const panelOffsets = plateRectToFolderOffsets(folder, panel);
  const fillOffsets = plateRectToFolderOffsets(folder, fill);
  return {
    ...panelOffsets,
    fillHeight: fill.height,
    fillWidth: fill.width,
    fillRightOffset: fillOffsets.rightOffset,
  };
}

export function getSignaturePanelLayout(
  packageId: StudioGuidePackageId,
): StudioGuideSignaturePanelLayout {
  return buildSignatureLayoutFromPlate(packageId);
}

export function getSignaturePlateMeasurement(
  packageId: StudioGuidePackageId,
): StudioGuidePlateSignatureMeasurement {
  return studioGuidePrototype.deskApproval.signaturePlateMeasurements[packageId];
}

function resolveFillLayout(layout: StudioGuideSignaturePanelLayout) {
  return {
    width: layout.fillWidth ?? layout.width,
    rightOffset: layout.fillRightOffset ?? layout.rightOffset,
    bottomOffset: layout.bottomOffset,
    fillHeight: layout.fillHeight,
  };
}

/** Full baked signature panel — derived from folder + shared layout. */
export function resolveSignaturePanelRect(
  folder: StudioGuidePrototypeRect,
  layout: StudioGuideSignaturePanelLayout,
): StudioGuidePrototypeRect {
  return {
    x: folder.x + folder.width - layout.rightOffset - layout.width,
    y: folder.y + folder.height - layout.bottomOffset - layout.height,
    width: layout.width,
    height: layout.height,
  };
}

/** Dynamic fill zone — bottom of panel; name, stamp, date only. */
export function resolveSignatureFillRect(
  folder: StudioGuidePrototypeRect,
  layout: StudioGuideSignaturePanelLayout,
): StudioGuidePrototypeRect {
  const fill = resolveFillLayout(layout);
  return {
    x: folder.x + folder.width - fill.rightOffset - fill.width,
    y: folder.y + folder.height - fill.bottomOffset - fill.fillHeight,
    width: fill.width,
    height: fill.fillHeight,
  };
}

export function signatureFillPercentStyle(
  folder: StudioGuidePrototypeRect,
  layout: StudioGuideSignaturePanelLayout,
): {
  right: string;
  bottom: string;
  width: string;
  height: string;
} {
  const fill = resolveFillLayout(layout);
  return {
    right: `${(fill.rightOffset / folder.width) * 100}%`,
    bottom: `${(fill.bottomOffset / folder.height) * 100}%`,
    width: `${(fill.width / folder.width) * 100}%`,
    height: `${(fill.fillHeight / folder.height) * 100}%`,
  };
}

export function signaturePanelPercentStyle(
  folder: StudioGuidePrototypeRect,
  layout: StudioGuideSignaturePanelLayout,
): {
  right: string;
  bottom: string;
  width: string;
  height: string;
} {
  return {
    right: `${(layout.rightOffset / folder.width) * 100}%`,
    bottom: `${(layout.bottomOffset / folder.height) * 100}%`,
    width: `${(layout.width / folder.width) * 100}%`,
    height: `${(layout.height / folder.height) * 100}%`,
  };
}

export function studioGuidePrototypeRectToPercent(
  rect: StudioGuidePrototypeRect,
  native = studioGuidePrototype.plate.nativeSize,
) {
  return {
    left: `${(rect.x / native.width) * 100}%`,
    top: `${(rect.y / native.height) * 100}%`,
    width: `${(rect.width / native.width) * 100}%`,
    height: `${(rect.height / native.height) * 100}%`,
  };
}

/** Cover-fill overlay mapping — same math as draft-room plate hotspots. */
export function studioGuidePrototypeRectToCoverPercent(
  rect: StudioGuidePrototypeRect,
  viewport: { width: number; height: number },
  native = studioGuidePrototype.plate.nativeSize,
  framing = { x: 0.5, y: 0.5, fit: "cover" as const },
) {
  const { width: iw, height: ih } = native;
  const { width: vw, height: vh } = viewport;
  if (vw <= 0 || vh <= 0) {
    return studioGuidePrototypeRectToPercent(rect, native);
  }

  const scale = Math.max(vw / iw, vh / ih);
  const renderedW = iw * scale;
  const renderedH = ih * scale;
  const marginX = (vw - renderedW) * framing.x;
  const marginY = (vh - renderedH) * framing.y;
  const topLeft = {
    x: rect.x * scale + marginX,
    y: rect.y * scale + marginY,
  };

  return {
    left: `${(topLeft.x / vw) * 100}%`,
    top: `${(topLeft.y / vh) * 100}%`,
    width: `${((rect.width * scale) / vw) * 100}%`,
    height: `${((rect.height * scale) / vh) * 100}%`,
  };
}
