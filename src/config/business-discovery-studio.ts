/**
 * Business Discovery Studio — plate + invisible tile hotspots.
 * Plate art: public/business-discovery-studio/discovery-studio-plate-v1.png (1024×682)
 *
 * Hit rects calibrated on native plate pixels — verify alignment with ?debug=1.
 */

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
};

export const discoveryTileConfig: Record<DiscoveryTileId, DiscoveryTileConfig> = {
  "your-business": {
    title: "Your Business",
    question: "What's the name of your business or project?",
    fieldType: "text",
    placeholder: "Business or project name",
  },
  "your-situation": {
    title: "Your Situation",
    question: "Where are you in your journey?",
    fieldType: "select",
    options: [
      "Starting fresh",
      "Growing an existing business",
      "Pivoting or rebranding",
      "Scaling operations",
      "Other",
    ],
  },
  "your-challenge": {
    title: "Your Challenge",
    question: "What's the main challenge right now?",
    fieldType: "select",
    options: [
      "Lack of clarity or direction",
      "Marketing and visibility",
      "Operations and efficiency",
      "Technology and tools",
      "Team and hiring",
      "Other",
    ],
  },
  "your-current-tools": {
    title: "Your Current Tools",
    question: "What tools or platforms do you use today?",
    fieldType: "multiselect",
    options: [
      "Website / landing page",
      "CRM (HubSpot, Salesforce, etc.)",
      "Email marketing",
      "Social media ads",
      "Google Ads / SEO",
      "E-commerce platform",
      "Accounting / invoicing",
      "Project management",
      "None yet / starting from scratch",
    ],
  },
  "your-focus": {
    title: "Your Focus",
    question: "What should we focus on first?",
    fieldType: "select",
    options: [
      "Brand & identity",
      "Marketing & growth",
      "Operations & systems",
      "Customer experience",
      "Content & creative",
      "Sales & conversion",
    ],
  },
  "success-looks-like": {
    title: "Success Looks Like",
    question: "What does success look like for this project?",
    fieldType: "multiselect",
    options: [
      "More leads or customers",
      "Stronger brand recognition",
      "Better engagement online",
      "Streamlined operations",
      "Increased revenue",
      "Launching something new",
      "Saving time on marketing",
    ],
  },
  "whats-slowing-you-down": {
    title: "What's Slowing You Down?",
    question: "What's getting in the way?",
    fieldType: "multiselect",
    options: [
      "Lack of clarity or direction",
      "Limited time or resources",
      "Outdated tools or technology",
      "Inconsistent messaging",
      "Low visibility or reach",
      "Team capacity gaps",
      "Budget constraints",
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
    title: "Submit Project",
    question: "Ready to send your discovery brief?",
    fieldType: "submit",
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

const STATUS_COVER_SIZE = 20;

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

export type DiscoveryBadgeOffset = {
  dx?: number;
  dy?: number;
};

/** Per-tile done-badge nudge (native plate px) — only where painted art diverges from card 1. */
export const DISCOVERY_BADGE_OFFSET: Partial<Record<DiscoveryTileId, DiscoveryBadgeOffset>> = {
  "your-situation": { dx: -2, dy: 8 },
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
      x: face.x + Math.round(face.width * 0.22),
      y: face.y + face.height - 26,
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
  src: "/business-discovery-studio/discovery-studio-plate-v1.png?v=1",
  alt: "Business Discovery Studio — drafting table workspace",
  nativeSize: { width: 1024, height: 682 } as const,

  /** Tap targets — same rects as painted card faces in DISCOVERY_TILE_GEOMETRY. */
  tileHits: Object.fromEntries(
    DISCOVERY_TILE_ORDER.map((id) => [id, DISCOVERY_TILE_GEOMETRY[id]]),
  ) as Record<DiscoveryTileId, SceneRect>,


  tileLabels: {
    "your-business": "Your Business",
    "your-situation": "Your Situation",
    "your-challenge": "Your Challenge",
    "your-current-tools": "Your Current Tools",
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
    y: 190,
    width: 680,
    height: 300,
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
