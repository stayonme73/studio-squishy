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

export const businessDiscoveryStudio = {
  src: "/business-discovery-studio/discovery-studio-plate-v1.png?v=1",
  alt: "Business Discovery Studio — drafting table workspace",
  nativeSize: { width: 1024, height: 682 } as const,

  /** Baked tile faces on plate — tap targets; use ?debug=1 to verify. */
  tileHits: {
    "your-business": { x: 244, y: 162, width: 188, height: 98 },
    "your-situation": { x: 418, y: 158, width: 188, height: 98 },
    "your-challenge": { x: 592, y: 164, width: 188, height: 98 },
    "your-current-tools": { x: 244, y: 268, width: 188, height: 98 },
    "your-focus": { x: 418, y: 264, width: 188, height: 98 },
    "success-looks-like": { x: 592, y: 270, width: 188, height: 98 },
    "whats-slowing-you-down": { x: 244, y: 374, width: 188, height: 98 },
    "anything-else": { x: 418, y: 370, width: 188, height: 98 },
    "submit-project": { x: 592, y: 376, width: 188, height: 98 },
  } satisfies Record<DiscoveryTileId, SceneRect>,


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

  /** Contain framing — matches object-fit: contain so the full plate fits in the viewport. */
  plateFraming: { x: 0.5, y: 0.5, fit: "contain" as const },

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

/** Done ✓ badge size on native plate pixels — verify with ?debug=1. */
export const DONE_BADGE_SIZE = 14;

/** Padding from the visible card right edge to the badge (native px). */
const DONE_BADGE_RIGHT_PADDING = 8;

/** Gutter between painted card faces within a row (native px). */
const PAINTED_CARD_COLUMN_GUTTER = 8;

/** Rightmost column — no next tile; painted width comes from column spacing. */
const RIGHT_COLUMN_TILES: ReadonlySet<DiscoveryTileId> = new Set([
  "your-challenge",
  "success-looks-like",
  "submit-project",
]);

/** Next tile in the same row — its left edge minus gutter marks the painted right edge. */
const TILE_ROW_NEIGHBOR_RIGHT: Partial<Record<DiscoveryTileId, DiscoveryTileId>> = {
  "your-business": "your-situation",
  "your-situation": "your-challenge",
  "your-current-tools": "your-focus",
  "your-focus": "success-looks-like",
  "whats-slowing-you-down": "anything-else",
  "anything-else": "submit-project",
};

/** Painted card face width — gap between column hit left edges (e.g. 418 − 244 = 174). */
export function paintedCardWidth(
  hits: Record<DiscoveryTileId, SceneRect> = businessDiscoveryStudio.tileHits,
): number {
  return hits["your-situation"].x - hits["your-business"].x;
}

/**
 * Painted card face right edge in native plate pixels.
 * Hit rects are wider than painted faces and bleed into column gutters; anchor badges
 * to the face edge rather than hit.x + hit.width.
 */
export function paintedCardRightEdgeX(
  tileId: DiscoveryTileId,
  hits: Record<DiscoveryTileId, SceneRect> = businessDiscoveryStudio.tileHits,
): number {
  const hit = hits[tileId];

  if (RIGHT_COLUMN_TILES.has(tileId)) {
    return hit.x + paintedCardWidth(hits);
  }

  const nextId = TILE_ROW_NEIGHBOR_RIGHT[tileId];
  if (nextId && hits[nextId]) {
    return hits[nextId].x - PAINTED_CARD_COLUMN_GUTTER;
  }

  return hit.x + hit.width;
}

/**
 * Plate-space badge square for overlay positioning — one rect per tile, derived from
 * each tile hit so every checkmark sits at the same relative top-right inset.
 * Rendered on bds-done-badges via sceneRectToCoverPercent.
 */
export function doneBadgePlateRect(
  tileId: DiscoveryTileId,
  hits: Record<DiscoveryTileId, SceneRect> = businessDiscoveryStudio.tileHits,
  size = DONE_BADGE_SIZE,
): SceneRect {
  const hit = hits[tileId];
  const insetY = Math.round(hit.height * 0.12);
  const paintedRight = paintedCardRightEdgeX(tileId, hits);

  return {
    x: paintedRight - size - DONE_BADGE_RIGHT_PADDING,
    y: hit.y + insetY,
    width: size,
    height: size,
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

/** Cover-fill overlay mapping — same math as Studio Guide folder hotspots. */
export function sceneRectToCoverPercent(
  rect: SceneRect,
  viewport: { width: number; height: number },
  framing: BusinessDiscoveryFraming = businessDiscoveryStudio.plateFraming,
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
