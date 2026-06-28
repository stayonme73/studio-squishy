/**
 * Business Discovery Studio — plate + invisible tile hotspots.
 * Customer-facing room name: Project Discovery (@see customer-journey-v1)
 * Plate art: public/business-discovery-studio/discovery-studio-plate-v2.png (1024×682)
 *
 * Hit rects calibrated on native plate pixels — verify alignment with ?debug=1.
 */

import { customerJourneyStepName } from "@/config/customer-journey-v1";

export type SceneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DiscoveryTileId =
  | "your-business"
  | "your-situation"
  | "your-challenge"
  | "your-current-tools"
  | "your-focus"
  | "success-looks-like"
  | "whats-slowing-you-down"
  | "anything-else"
  | "submit-project";

export const DISCOVERY_TILE_ORDER: DiscoveryTileId[] = [
  "your-business",
  "your-situation",
  "your-challenge",
  "your-current-tools",
  "your-focus",
  "success-looks-like",
  "whats-slowing-you-down",
  "anything-else",
  "submit-project",
];

/** Eight discovery prompts — excludes submit tile. */
export const DISCOVERY_FORM_TILE_IDS = DISCOVERY_TILE_ORDER.filter(
  (id): id is Exclude<DiscoveryTileId, "submit-project"> => id !== "submit-project",
);

export type DiscoveryFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "multiselect-other"
  | "submit";

/** How a tile's answer may be used by downstream automation (not wired yet). */
export type DiscoveryRecommendationUse = "standard" | "human-review-only";

export type DiscoveryTileConfig = {
  title: string;
  question: string;
  fieldType: DiscoveryFieldType;
  options?: readonly string[];
  placeholder?: string;
  /** Optional second text field on the same tile (stored with the primary value). */
  secondaryQuestion?: string;
  secondaryPlaceholder?: string;
  /** When false, tile is not required to unlock Submit. Defaults to true. */
  required?: boolean;
  /**
   * Recommendation Engine must not interpret free-form text from this tile.
   * `human-review-only` = collected for staff review; no automatic scoring.
   */
  recommendationUse?: DiscoveryRecommendationUse;
  /** Label for the custom "Other" chip (multiselect-other). Defaults to "Other". */
  otherLabel?: string;
  /** Placeholder for the Other text input (multiselect-other). */
  otherPlaceholder?: string;
  /** Customer-facing body copy for submit tiles. */
  description?: string;
  /**
   * Customer-facing copy shown after submission (future wiring).
   * Empty string reserves the slot without changing submit behavior.
   */
  postSubmissionNote?: string;
};

export const discoveryTileConfig: Record<DiscoveryTileId, DiscoveryTileConfig> = {
  "your-business": {
    title: "Your Business",
    question: "What's the name of your business or project?",
    fieldType: "text",
    placeholder: "Business or project name",
    secondaryQuestion: "What does your business offer?",
    secondaryPlaceholder: "Briefly describe what you sell or provide",
  },
  "your-situation": {
    title: "Your Situation",
    question: "Where are you in your journey?",
    fieldType: "select",
    options: [
      "Starting fresh",
      "Refreshing how my business looks",
      "Promoting an offer, event, sale, or launch",
      "Trying to stay visible more consistently",
    ],
  },
  "your-challenge": {
    title: "Your Challenge",
    question: "What's the main challenge right now?",
    fieldType: "select",
    options: [
      "My business does not look polished or consistent",
      "I am not sure what to say about my business",
      "I need help promoting something",
      "I do not have time to create marketing content",
      "I am not showing up consistently online",
      "I need better promotional materials",
    ],
  },
  "your-current-tools": {
    title: "Your Current Marketing Channels",
    question: "Which marketing channels do you currently use?",
    fieldType: "multiselect",
    options: [
      "Social media accounts",
      "Email list or email platform",
      "Website",
      "Online store",
      "None yet / starting from scratch",
    ],
  },
  "your-focus": {
    title: "Your Focus",
    question: "What would you like The Studio to help with first?",
    fieldType: "select",
    options: [
      "Refresh my brand look",
      "Create social media content",
      "Promote an offer, event, or launch",
      "Reach customers by email",
      "Get polished promotional graphics",
      "Save time on marketing",
    ],
  },
  "success-looks-like": {
    title: "Success Looks Like",
    question: "What would make this project feel successful?",
    fieldType: "multiselect",
    options: [
      "A stronger, more polished brand presence",
      "More consistent social media visibility",
      "A successful launch, event, sale, or promotion",
      "Better-looking promotional materials",
      "Reaching customers by email",
      "Spending less time creating and posting marketing",
    ],
  },
  "whats-slowing-you-down": {
    title: "What's Slowing You Down?",
    question: "What is getting in the way right now?",
    fieldType: "multiselect",
    options: [
      "I do not have time to create or post content",
      "My branding looks inconsistent",
      "I am unclear on what to promote or say",
      "I do not have enough marketing materials",
      "I am not visible enough online",
    ],
  },
  "anything-else": {
    title: "Anything Else?",
    question: "Anything else we should know?",
    fieldType: "textarea",
    placeholder: "Context, constraints, notes…",
    required: false,
    recommendationUse: "human-review-only",
  },
  "submit-project": {
    title: "Ready to build your Studio Plan?",
    question: "",
    description:
      "We've gathered everything we need to recommend the Studio Services that best fit your business. Submit when you're ready to continue.",
    fieldType: "submit",
    postSubmissionNote: "",
  },
};

/** Tiles that must be answered before Submit unlocks (excludes optional prompts). */
export const DISCOVERY_REQUIRED_TILE_IDS = DISCOVERY_FORM_TILE_IDS.filter(
  (id) => discoveryTileConfig[id].required !== false,
);

export type BusinessDiscoveryFraming = {
  x: number;
  y: number;
  fit: "cover" | "contain";
};

/** Done ✓ badge size on native plate pixels. */
export const DONE_BADGE_SIZE = 14;

export type DoneBadgeAnchor = {
  x: number;
  y: number;
  size: number;
};

/** Painted card faces on the plate — single geometry source for hits, badges, covers. */
export const DISCOVERY_TILE_GEOMETRY = {
  "your-business": { x: 221, y: 163, width: 174, height: 124 },
  "your-situation": { x: 395, y: 152, width: 189, height: 135 },
  "your-challenge": { x: 580, y: 174, width: 199, height: 113 },
  "your-current-tools": { x: 221, y: 297, width: 174, height: 121 },
  "your-focus": { x: 395, y: 297, width: 189, height: 122 },
  "success-looks-like": { x: 580, y: 296, width: 199, height: 123 },
  "whats-slowing-you-down": { x: 221, y: 429, width: 174, height: 112 },
  "anything-else": { x: 395, y: 430, width: 189, height: 111 },
  "submit-project": { x: 580, y: 420, width: 199, height: 121 },
} satisfies Record<DiscoveryTileId, SceneRect>;

const STATUS_COVER_SIZE = 15;

/** Next tile in the same row — its left edge marks the painted right edge of the current tile. */
const TILE_ROW_NEIGHBOR_RIGHT: Partial<Record<DiscoveryTileId, DiscoveryTileId>> = {
  "your-business": "your-situation",
  "your-situation": "your-challenge",
  "your-current-tools": "your-focus",
  "your-focus": "success-looks-like",
  "whats-slowing-you-down": "anything-else",
  "anything-else": "submit-project",
};

const TILE_ROW_NEIGHBOR_LEFT: Partial<Record<DiscoveryTileId, DiscoveryTileId>> = {
  "your-challenge": "your-situation",
  "success-looks-like": "your-focus",
  "submit-project": "anything-else",
};

/** Painted card-face right edge — hit rects can bleed into column gutters. */
function discoveryTilePaintedRightEdgeX(tileId: DiscoveryTileId): number {
  const nextId = TILE_ROW_NEIGHBOR_RIGHT[tileId];
  if (nextId) return DISCOVERY_TILE_GEOMETRY[nextId].x;

  const prevId = TILE_ROW_NEIGHBOR_LEFT[tileId];
  const face = DISCOVERY_TILE_GEOMETRY[tileId];
  if (prevId) return face.x + (face.x - DISCOVERY_TILE_GEOMETRY[prevId].x);

  return face.x + face.width;
}

const DONE_BADGE_REFERENCE_TILE: DiscoveryTileId = "your-business";
const _refFace = DISCOVERY_TILE_GEOMETRY[DONE_BADGE_REFERENCE_TILE];
const _refPaintedRight = discoveryTilePaintedRightEdgeX(DONE_BADGE_REFERENCE_TILE);
/** Approved card 1 anchor on the painted face (native plate px). */
const _refBadgeX = _refFace.x + _refFace.width - DONE_BADGE_SIZE - 4;
const _refBadgeY = _refFace.y + 8;

/** Uniform inset from painted card-face top-right — derived from card 1. */
export const DONE_BADGE_RIGHT_PAD = _refPaintedRight - DONE_BADGE_SIZE - _refBadgeX;
export const DONE_BADGE_TOP_PAD = _refBadgeY - _refFace.y;

export type DiscoveryStatusCoverOffset = {
  dx?: number;
  dy?: number;
};

/** Card 1 baked ○ cover top-left on the painted face (native plate px). */
const _refStatusCoverX = _refFace.x + 60;
const _refStatusCoverY = _refFace.y + _refFace.height - STATUS_COVER_SIZE - 8;

/** Uniform inset from painted card-face bottom-left — derived from card 1. */
export const STATUS_COVER_LEFT_PAD = _refStatusCoverX - _refFace.x;
export const STATUS_COVER_BOTTOM_PAD =
  _refFace.y + _refFace.height - STATUS_COVER_SIZE - _refStatusCoverY;

/**
 * Per-tile status-cover nudge (native plate px) — only where baked ○ art diverges from card 1.
 * Separate from DISCOVERY_BADGE_OFFSET (top-right ✓).
 */
export const DISCOVERY_STATUS_COVER_OFFSET: Partial<
  Record<DiscoveryTileId, DiscoveryStatusCoverOffset>
> = {
  "your-situation": { dx: -52, dy: 9 },
  "your-challenge": { dx: -52, dy: 8 },
  "your-current-tools": { dx: 3, dy: 4 },
  "your-focus": { dx: -15, dy: 2 },
  "success-looks-like": { dx: -52, dy: 10 },
  "whats-slowing-you-down": { dx: -1, dy: -15 },
  "anything-else": { dx: 3, dy: 0 },
  "submit-project": { dx: -42, dy: 9 },
};

export type DiscoveryBadgeOffset = {
  dx?: number;
  dy?: number;
};

/**
 * Per-tile done-badge nudge (native plate px) — only where painted art diverges from card 1.
 * Tagia-approved positions — do not change without explicit approval.
 */
export const DISCOVERY_BADGE_OFFSET: Partial<Record<DiscoveryTileId, DiscoveryBadgeOffset>> = {
  "your-business": { dx: 8, dy: -3 }, // approved, locked
  "your-situation": { dx: -2, dy: 8 }, // approved, locked
  "your-challenge": { dx: -6, dy: -16 }, // approved, locked
  "your-current-tools": { dx: -4, dy: 0 }, // approved, locked
  "success-looks-like": { dx: 12, dy: 1 }, // approved, locked
  "whats-slowing-you-down": { dx: -12, dy: 0 }, // approved, locked
  "anything-else": { dx: 4, dy: 0 }, // approved, locked
};

export type DiscoveryTileDerivedGeometry = {
  face: SceneRect;
  doneBadge: DoneBadgeAnchor;
  statusCover: SceneRect;
};

/** Derive overlay anchors from painted card face — one source, three consumers. */
export function discoveryTileDerivedGeometry(
  tileId: DiscoveryTileId,
  face: SceneRect,
): DiscoveryTileDerivedGeometry {
  const paintedRight = discoveryTilePaintedRightEdgeX(tileId);
  return {
    face,
    doneBadge: {
      x: paintedRight - DONE_BADGE_SIZE - DONE_BADGE_RIGHT_PAD + (DISCOVERY_BADGE_OFFSET[tileId]?.dx ?? 0),
      y: face.y + DONE_BADGE_TOP_PAD + (DISCOVERY_BADGE_OFFSET[tileId]?.dy ?? 0),
      size: DONE_BADGE_SIZE,
    },
    statusCover: {
      x:
        face.x +
        STATUS_COVER_LEFT_PAD +
        (DISCOVERY_STATUS_COVER_OFFSET[tileId]?.dx ?? 0),
      y:
        face.y +
        face.height -
        STATUS_COVER_SIZE -
        STATUS_COVER_BOTTOM_PAD -
        (DISCOVERY_STATUS_COVER_OFFSET[tileId]?.dy ?? 0),
      width: STATUS_COVER_SIZE,
      height: STATUS_COVER_SIZE,
    },
  };
}

export const discoveryTileGeometry = Object.fromEntries(
  DISCOVERY_TILE_ORDER.map((id) => [
    id,
    discoveryTileDerivedGeometry(id, DISCOVERY_TILE_GEOMETRY[id]),
  ]),
) as Record<DiscoveryTileId, DiscoveryTileDerivedGeometry>;

export const businessDiscoveryStudio = {
  src: "/business-discovery-studio/discovery-studio-plate-v2.png?v=2",
  alt: `${customerJourneyStepName("project-discovery")} — drafting table workspace`,
  nativeSize: { width: 1024, height: 682 } as const,

  /** Tap targets — same rects as painted card faces in DISCOVERY_TILE_GEOMETRY. */
  tileHits: Object.fromEntries(
    DISCOVERY_TILE_ORDER.map((id) => [id, DISCOVERY_TILE_GEOMETRY[id]]),
  ) as Record<DiscoveryTileId, SceneRect>,


  tileLabels: {
    "your-business": "Your Business",
    "your-situation": "Your Situation",
    "your-challenge": "Your Challenge",
    "your-current-tools": "Your Current Marketing Channels",
    "your-focus": "Your Focus",
    "success-looks-like": "Success Looks Like",
    "whats-slowing-you-down": "What's Slowing You Down?",
    "anything-else": "Anything Else?",
    "submit-project": "Submit Project",
  } satisfies Record<DiscoveryTileId, string>,

  /**
   * Expanded card rect on the drafting table (native plate pixels).
   * ~66% plate width, centered over the tile grid — comfortable fill area.
   */
  discoveryExpandedRect: {
    x: 172,
    y: 178,
    width: 680,
    height: 328,
  } satisfies SceneRect,
} as const;

/** Top-right ✓ badge per tile — derived from DISCOVERY_TILE_GEOMETRY card faces. */
export const tileDoneBadges = Object.fromEntries(
  DISCOVERY_TILE_ORDER.map((id) => [id, discoveryTileGeometry[id].doneBadge]),
) as Record<DiscoveryTileId, DoneBadgeAnchor>;

/**
 * Baked "Not completed" status circle on the plate — masked when a tile is complete
 * so only the single runtime top-right ✓ remains visible.
 */
export const tileStatusCoverRects = Object.fromEntries(
  DISCOVERY_TILE_ORDER.map((id) => [id, discoveryTileGeometry[id].statusCover]),
) as Record<DiscoveryTileId, SceneRect>;

/** Plate-space badge square for overlay positioning. */
export function doneBadgePlateRect(tileId: DiscoveryTileId): SceneRect {
  const badge = tileDoneBadges[tileId];
  return {
    x: badge.x,
    y: badge.y,
    width: badge.size,
    height: badge.size,
  };
}

export function sceneRectToPercent(
  rect: SceneRect,
  native = businessDiscoveryStudio.nativeSize,
) {
  return {
    left: `${(rect.x / native.width) * 100}%`,
    top: `${(rect.y / native.height) * 100}%`,
    width: `${(rect.width / native.width) * 100}%`,
    height: `${(rect.height / native.height) * 100}%`,
  };
}

/** Map native plate-pixel rect to overlay % inside bds-plate-canvas (1024×682 space). */
export const plateRectToOverlayPercent = sceneRectToPercent;

/** Contain-fit plate render size for a viewport — same math as object-fit: contain. */
export function discoveryPlateContainSize(
  viewport: { width: number; height: number },
  native = businessDiscoveryStudio.nativeSize,
) {
  const { width: vw, height: vh } = viewport;
  if (vw <= 0 || vh <= 0) return { width: 0, height: 0 };

  const scale = Math.min(vw / native.width, vh / native.height);
  return {
    width: native.width * scale,
    height: native.height * scale,
  };
}

/** Cover-fill overlay mapping — legacy; prefer sceneRectToPercent inside bds-plate-canvas. */
export function sceneRectToCoverPercent(
  rect: SceneRect,
  viewport: { width: number; height: number },
  framing: BusinessDiscoveryFraming = { x: 0.5, y: 0.5, fit: "contain" },
  native = businessDiscoveryStudio.nativeSize,
) {
  const { width: iw, height: ih } = native;
  const { width: vw, height: vh } = viewport;
  if (vw <= 0 || vh <= 0) {
    return sceneRectToPercent(rect, native);
  }

  const scale =
    framing.fit === "contain"
      ? Math.min(vw / iw, vh / ih)
      : Math.max(vw / iw, vh / ih);
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
