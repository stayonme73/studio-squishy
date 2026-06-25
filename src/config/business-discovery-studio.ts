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

/** Done checkmark badge anchor on native plate pixels — verify with ?debug=1. */
export type DoneBadgeAnchor = {
  x: number;
  y: number;
  size: number;
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
  | "multiselect-other"
  | "submit";

export type DiscoveryTileConfig = {
  title: string;
  question: string;
  fieldType: DiscoveryFieldType;
  options?: readonly string[];
  placeholder?: string;
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
    fieldType: "multiselect-other",
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
    otherLabel: "Other",
    otherPlaceholder: "Other tools or platforms…",
  },
  "your-focus": {
    title: "Your Focus",
    question: "What should we focus on first?",
    fieldType: "text",
    placeholder: "Top priority",
  },
  "success-looks-like": {
    title: "Success Looks Like",
    question: "What does success look like for this project?",
    fieldType: "textarea",
    placeholder: "Outcomes, metrics, milestones…",
  },
  "whats-slowing-you-down": {
    title: "What's Slowing You Down?",
    question: "What's getting in the way?",
    fieldType: "textarea",
    placeholder: "Blockers, friction, gaps…",
  },
  "anything-else": {
    title: "Anything Else?",
    question: "Anything else we should know?",
    fieldType: "textarea",
    placeholder: "Context, constraints, notes…",
  },
  "submit-project": {
    title: "Submit Project",
    question: "Ready to send your discovery brief?",
    fieldType: "submit",
  },
};

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

  /**
   * Inline ✓ badge per tile (native plate pixels) — immediately right of baked title.
   * x/y = top-left of badge square; y aligned to title cap-height center.
   * Calibrated on discovery-studio-plate-v1.png — verify with ?debug=1.
   */
  tileDoneBadges: {
    "your-business": { x: 360, y: 224, size: 14 },
    "your-situation": { x: 543, y: 225, size: 14 },
    "your-challenge": { x: 730, y: 224, size: 14 },
    "your-current-tools": { x: 333, y: 348, size: 14 },
    "your-focus": { x: 510, y: 342, size: 14 },
    "success-looks-like": { x: 696, y: 348, size: 14 },
    "whats-slowing-you-down": { x: 394, y: 439, size: 14 },
    "anything-else": { x: 515, y: 440, size: 14 },
    "submit-project": { x: 729, y: 444, size: 14 },
  } satisfies Record<DiscoveryTileId, DoneBadgeAnchor>,

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

  /** Cover-fill framing — matches object-fit: cover on the plate art. */
  plateFraming: { x: 0.5, y: 0.5, fit: "cover" as const },

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
