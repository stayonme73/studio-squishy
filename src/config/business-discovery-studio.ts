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
  "your-business": { x: 244, y: 176, width: 161, height: 89 },
  "your-situation": { x: 415, y: 152, width: 165, height: 113 },
  "your-challenge": { x: 591, y: 175, width: 168, height: 90 },
  "your-current-tools": { x: 224, y: 245, width: 174, height: 120 },
  "your-focus": { x: 409, y: 245, width: 178, height: 120 },
  "success-looks-like": { x: 598, y: 245, width: 182, height: 120 },
  "whats-slowing-you-down": { x: 220, y: 345, width: 171, height: 125 },
  "anything-else": { x: 403, y: 345, width: 191, height: 125 },
  "submit-project": { x: 606, y: 345, width: 174, height: 125 },
} satisfies Record<DiscoveryTileId, SceneRect>;

const DONE_BADGE_INSET = 4;
const DONE_BADGE_TOP_INSET = 8;
const STATUS_COVER_SIZE = 20;

export type DiscoveryTileDerivedGeometry = {
  face: SceneRect;
  doneBadge: DoneBadgeAnchor;
  statusCover: SceneRect;
};

/** Derive overlay anchors from painted card face — one source, three consumers. */
export function discoveryTileDerivedGeometry(
  face: SceneRect,
): DiscoveryTileDerivedGeometry {
  return {
    face,
    doneBadge: {
      x: face.x + face.width - DONE_BADGE_SIZE - DONE_BADGE_INSET,
      y: face.y + DONE_BADGE_TOP_INSET,
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
  DISCOVERY_TILE_ORDER.map((id) => [id, discoveryTileDerivedGeometry(DISCOVERY_TILE_GEOMETRY[id])]),
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
