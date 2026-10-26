/**
 * Static-creative lane readiness matrix.
 *
 * Grades are evidence-backed snapshots, not hopes. A SKU that already has a
 * working CERT pipeline can still be NOT_CERTIFIED on a shared rule the live
 * path does not yet honour. Room 4B sold-menu classifications are left alone.
 */

import {
  SHARED_LANE_CAPABILITIES,
  STATIC_CREATIVE_LANE_SKUS,
  type LaneReadinessGrade,
  type SharedLaneCapabilityId,
  type StaticCreativeLaneSku,
} from "@/config/studio-static-creative-lane-readiness-v1";

export type CapabilityGrade = {
  capabilityId: SharedLaneCapabilityId;
  grade: LaneReadinessGrade;
  /** Why this grade, in one sentence. */
  why: string;
  /** Whether the gap is shared machinery or a true SKU-only hold. */
  scope: "shared" | "sku";
};

export type SkuLaneRow = {
  skuId: StaticCreativeLaneSku;
  label: string;
  intent: "print_customer_managed" | "digital";
  capabilities: readonly CapabilityGrade[];
  overall: LaneReadinessGrade;
  skuSpecificHolds: readonly string[];
};

const GRADE_RANK: Record<LaneReadinessGrade, number> = {
  READY: 0,
  READY_WITH_LIMITS: 1,
  HOLD: 2,
  NOT_CERTIFIED: 3,
};

function worstGrade(grades: readonly LaneReadinessGrade[]): LaneReadinessGrade {
  return grades.reduce<LaneReadinessGrade>((worst, grade) => {
    return GRADE_RANK[grade] > GRADE_RANK[worst] ? grade : worst;
  }, "READY");
}

function row(
  skuId: StaticCreativeLaneSku,
  label: string,
  intent: SkuLaneRow["intent"],
  capabilities: readonly CapabilityGrade[],
  skuSpecificHolds: readonly string[] = [],
): SkuLaneRow {
  return {
    skuId,
    label,
    intent,
    capabilities,
    overall: worstGrade(capabilities.map((entry) => entry.grade)),
    skuSpecificHolds,
  };
}

/**
 * Shared grades that do not change by SKU. If a later SKU looks different here,
 * that is a smell that we started inventing per-SKU patches again.
 */
const SHARED: Record<
  SharedLaneCapabilityId,
  Omit<CapabilityGrade, "capabilityId">
> = {
  customer_direction_fidelity: {
    grade: "NOT_CERTIFIED",
    why: "Stage 0 is live on flyer customer dispatch only. Promo, social, card, menu, and service-sheet still compose on SKU HTML and have no Cedar-class direction proof.",
    scope: "shared",
  },
  exact_fact_preservation: {
    grade: "READY_WITH_LIMITS",
    why: "The Maya headline→CTA overwrite is closed at the flyer mapper; emphasis is composition-only. Shared assert fails closed. Other SKUs do not have that mutation class.",
    scope: "shared",
  },
  openai_visual_generation_routing: {
    grade: "READY_WITH_LIMITS",
    why: "Routing exists (`routeProductionMethod`): customer assets, generated atmosphere, or renderer-first. Facts stay out of the image. Full-bleed generated print is not launchable at 300 DPI.",
    scope: "shared",
  },
  deterministic_fonts: {
    grade: "READY_WITH_LIMITS",
    why: "All six launch HTML renderers embed Source Serif 4 and drop named host fallbacks. Missing font files fail closed. Stage 0 Chromium still verifies resolved faces on the flyer path.",
    scope: "shared",
  },
  crop_focal_control: {
    grade: "NOT_CERTIFIED",
    why: "Real crop windows and headroom-at-output-size are Stage 0 only. Live hybrid generation has produced sources at canvas size, which makes focal a no-op.",
    scope: "shared",
  },
  composition_primitives: {
    grade: "NOT_CERTIFIED",
    why: "The Studio Design Document path is live for flyer customer jobs. The other five launch SKUs still use their own HTML composers — that is a remaining shared gap, not five repair packages.",
    scope: "shared",
  },
  print_vs_digital_resolution: {
    grade: "READY_WITH_LIMITS",
    why: "Live print-claim gate: only an explicit 300 DPI claim is measured; missing headroom blocks sellable print. Digital CERT plates remain the sold default. The 1.25× / 300 DPI rule is unchanged.",
    scope: "shared",
  },
  launch_blocking_exceptions: {
    grade: "READY_WITH_LIMITS",
    why: "Controlled-proof exceptions stay non-launchable. Live flyer compose and the shared SKU entry gate refuse sellable print when the claim fails.",
    scope: "shared",
  },
  qa_before_review: {
    grade: "READY",
    why: "QA runs before Review eligibility on every launch design SKU. Fail keeps Review closed. This is already live.",
    scope: "shared",
  },
  revision_neutrality: {
    grade: "READY_WITH_LIMITS",
    why: "Internal budgets are 3 attempts (flyer Package A; other design SKUs general-design runtime). Non-flyer exhaust still escalates. Flyer exhaust fail-closes.",
    scope: "shared",
  },
  output_export: {
    grade: "READY_WITH_LIMITS",
    why: "Each SKU already exports the formats it sold (PNG; print SKUs also PDF). Print-ready means flattened customer-managed files. Studio fulfillment is DIGITAL_FILES_ONLY.",
    scope: "shared",
  },
  delivery_readiness: {
    grade: "HOLD",
    why: "Owner rescue is still the fail-closed backstop after correction exhaust (`ownerApprovalPending`). Doctrine forbids treating that as a production path.",
    scope: "shared",
  },
};

function sharedCapabilities(
  overrides: Partial<Record<SharedLaneCapabilityId, Partial<CapabilityGrade>>> = {},
): CapabilityGrade[] {
  return SHARED_LANE_CAPABILITIES.map((capability) => {
    const base = SHARED[capability.id];
    const override = overrides[capability.id] ?? {};
    return {
      capabilityId: capability.id,
      grade: override.grade ?? base.grade,
      why: override.why ?? base.why,
      scope: override.scope ?? base.scope,
    };
  });
}

/**
 * Digital SKUs do not inherit the print-resolution blocker. They still inherit
 * every other shared gap. That is the point of a lane: the print rule is
 * shared, the digital exemption is the policy, not a SKU rewrite.
 */
function digitalResolution(): Partial<CapabilityGrade> {
  return {
    grade: "READY_WITH_LIMITS",
    why: "Digital CERT plates (1024 / 1536) are the sold output. The 300 DPI print claim does not apply. Generated art on these plates is a downsample, not an upscale.",
    scope: "shared",
  };
}

export const STATIC_CREATIVE_LANE_MATRIX: readonly SkuLaneRow[] = [
  row(
    "v2-rtu-flyer",
    "Flyer",
    "print_customer_managed",
    sharedCapabilities({
      customer_direction_fidelity: {
        grade: "READY_WITH_LIMITS",
        why: "Customer flyer jobs now compose on Stage 0. Cedar & Stone remains the direction proof. Harbor CERT stays on the legacy HTML composer.",
        scope: "shared",
      },
      exact_fact_preservation: {
        grade: "READY",
        why: "Live mapping keeps the supplied headline. Emphasis promotes the CTA in composition only. The Maya mutation class fails closed if it returns.",
        scope: "shared",
      },
      composition_primitives: {
        grade: "READY_WITH_LIMITS",
        why: "runDesignRendererPipeline uses composeAndRenderLiveFlyer for customer jobs without a spec override. CERT fixtures and injected specs stay on the legacy composer.",
        scope: "shared",
      },
      crop_focal_control: {
        grade: "READY_WITH_LIMITS",
        why: "Stage 0 crop windows and focal points are live on the flyer job path. A canvas-sized generated source still makes horizontal focal a no-op — that is the provider ceiling already on the print gate.",
        scope: "shared",
      },
      revision_neutrality: {
        grade: "READY",
        why: "Flyer internal budget is 3 attempts. Exhaust fail-closes to refund / cannot-deliver. Owner does not produce the flyer. One included customer revision stays separate.",
        scope: "sku",
      },
      delivery_readiness: {
        grade: "READY",
        why: "Flyer exhaust fail-closes. Owner rescue is not the completion path. Review stays closed. The honest next step is refund or cannot-deliver.",
        scope: "sku",
      },
    }),
    [
      "HARDEN #1 LIGHT 2026-09-23: $69 digital CERT-plate flyer. Type-led or customer-supplied rights-cleared photos. No certified 300 DPI print. No generated full-bleed hero as the sold default. Customer prints. One revision. Fail-closed / refund if QA exhausts.",
    ],
  ),
  row(
    "v2-rtu-promotion-graphics",
    "Promotion graphics",
    "digital",
    sharedCapabilities({
      print_vs_digital_resolution: digitalResolution(),
      openai_visual_generation_routing: {
        grade: "READY_WITH_LIMITS",
        why: "Type-led or customer-supplied rights-cleared assets are the sold path. Generated atmosphere is optional, not a print claim.",
        scope: "sku",
      },
      customer_direction_fidelity: {
        grade: "READY_WITH_LIMITS",
        why: "The sold offer is one coordinated two-graphic digital set on CERT plates. Stage 0 remains a flyer/promo shared gap, not this SKU’s sold path.",
        scope: "sku",
      },
      composition_primitives: {
        grade: "READY_WITH_LIMITS",
        why: "One campaign-set renderer produces both graphics together. Landscape is not sold. Shared Stage 0 remains a flyer gap.",
        scope: "sku",
      },
      crop_focal_control: {
        grade: "READY_WITH_LIMITS",
        why: "Sold plates are square and portrait CERT sizes. Crop/focal is not a sold landscape print claim.",
        scope: "sku",
      },
      revision_neutrality: {
        grade: "READY",
        why: "Campaign-graphics internal budget is 3 attempts. Exhaust fail-closes. Owner does not finish the set.",
        scope: "sku",
      },
      delivery_readiness: {
        grade: "READY",
        why: "Campaign-graphics exhaust fail-closes. Owner rescue is not the completion path. Two digital PNGs are the sold files.",
        scope: "sku",
      },
    }),
    [
      "HARDEN #4 LIGHT 2026-09-24: $79 two-graphic digital CERT set. Square 1024×1024 + portrait 1024×1536. Type-led or customer-supplied rights-cleared assets. Customer posts or shares. No certified 300 DPI. Landscape not sold. One revision. Fail-closed / refund if QA exhausts.",
    ],
  ),
  row(
    "v2-rtu-social-posts",
    "Social posts",
    "digital",
    sharedCapabilities({
      print_vs_digital_resolution: digitalResolution(),
      openai_visual_generation_routing: {
        grade: "READY_WITH_LIMITS",
        why: "Type-led or customer-supplied rights-cleared assets are the sold path. Generated atmosphere is optional, not a second size or a posting service.",
        scope: "sku",
      },
      customer_direction_fidelity: {
        grade: "READY_WITH_LIMITS",
        why: "The sold offer is one coordinated four-square digital set plus fact-bound captions and posting order. Stage 0 remains a flyer/promo shared gap, not this SKU’s sold path.",
        scope: "sku",
      },
      composition_primitives: {
        grade: "READY_WITH_LIMITS",
        why: "One social-posts campaign-set renderer produces all four plates, captions, and order together. Extra formats are not sold. Shared Stage 0 remains a flyer gap.",
        scope: "sku",
      },
      crop_focal_control: {
        grade: "READY_WITH_LIMITS",
        why: "Sold plates are square CERT 1024×1024 only. Crop/focal is not a sold portrait or TikTok claim.",
        scope: "sku",
      },
      revision_neutrality: {
        grade: "READY",
        why: "Social-posts internal budget is 3 attempts for the set. Exhaust fail-closes. One revision versions the whole set, not four independent redesigns.",
        scope: "sku",
      },
      delivery_readiness: {
        grade: "READY",
        why: "Social-posts exhaust fail-closes. Owner rescue is not the completion path. Four square PNGs plus captions and posting order are the sold files.",
        scope: "sku",
      },
    }),
    [
      "HARDEN #6 STANDARD 2026-09-24: $99 four-square digital CERT set. 1024×1024 each. One theme. One platform. Fact-bound captions + suggested posting order. Customer posts. No carousel / Stories / portrait / Reels / extra sizes / Studio posting. One set revision. Fail-closed / refund if QA exhausts.",
    ],
  ),
  row(
    "v2-rtu-business-card",
    "Business card",
    "print_customer_managed",
    sharedCapabilities({
      openai_visual_generation_routing: {
        grade: "READY_WITH_LIMITS",
        why: "Type-led identity work is correctly `renderer_first`. Generated hero art is not required. Customer logo is optional.",
        scope: "sku",
      },
      revision_neutrality: {
        grade: "READY",
        why: "Business-card internal budget is 3 attempts for the card. Exhaust fail-closes. One revision versions both sides together.",
        scope: "sku",
      },
      delivery_readiness: {
        grade: "READY",
        why: "Business-card exhaust fail-closes. Owner rescue is not the completion path. Front PNG, back PNG, and customer-print PDF are the sold files.",
        scope: "sku",
      },
    }),
    [
      "HARDEN #7 LIGHT 2026-09-24: $69 double-sided digital CERT card. 1536×1024 both sides. Front + back PNG + customer-print PDF. Customer prints. No 3.5×2 / 300 DPI. One card revision. Fail-closed / refund if QA exhausts.",
    ],
  ),
  row(
    "v2-rtu-menu",
    "Menu",
    "print_customer_managed",
    sharedCapabilities({
      openai_visual_generation_routing: {
        grade: "READY_WITH_LIMITS",
        why: "Type-led list work is correctly `renderer_first`. Imagery is optional atmosphere, not the product.",
        scope: "sku",
      },
      customer_direction_fidelity: {
        grade: "READY_WITH_LIMITS",
        why: "The sold offer typesets customer-supplied items, prices, and allergen wording exactly. Stage 0 is not this SKU’s sold path.",
        scope: "sku",
      },
      composition_primitives: {
        grade: "READY_WITH_LIMITS",
        why: "One single-page menu renderer. Overflow fail-closes at readable type floors. Shared Stage 0 remains a flyer gap.",
        scope: "sku",
      },
      crop_focal_control: {
        grade: "READY_WITH_LIMITS",
        why: "Type-led menu has no photo crop. Logo is contain-fit. Crop/focal is not part of this sold offer.",
        scope: "sku",
      },
      revision_neutrality: {
        grade: "READY",
        why: "Menu internal budget is 3 attempts. Exhaust fail-closes. Owner does not finish the menu.",
        scope: "sku",
      },
      delivery_readiness: {
        grade: "READY",
        why: "Menu exhaust fail-closes. Owner rescue is not the completion path. PNG + customer-print PDF are the sold files.",
        scope: "sku",
      },
    }),
    [
      "HARDEN #5 LIGHT 2026-09-24: $89 digital CERT-plate menu. One page, ≤5 sections / ≤30 items. Customer supplies and verifies facts, prices, and allergen wording. Studio typesets exactly. Overflow fail-closes. No certified 300 DPI. Customer prints. One revision. Fail-closed / refund if QA exhausts.",
    ],
  ),
  row(
    "v2-rtu-service-sheet",
    "Service sheet",
    "print_customer_managed",
    sharedCapabilities({
      openai_visual_generation_routing: {
        grade: "READY_WITH_LIMITS",
        why: "Type-led service list is correctly `renderer_first`. Pricing modes are SKU contract, not a lane gap.",
        scope: "sku",
      },
      customer_direction_fidelity: {
        grade: "READY_WITH_LIMITS",
        why: "The sold offer is a type-led list of customer-supplied names, prices, and contact. Stage 0 composition is not required for this SKU.",
        scope: "sku",
      },
      composition_primitives: {
        grade: "READY_WITH_LIMITS",
        why: "The service-sheet HTML composer is the sold path for a ≤10-row portrait list. Shared Stage 0 remains a flyer/promo gap.",
        scope: "sku",
      },
      crop_focal_control: {
        grade: "READY_WITH_LIMITS",
        why: "Type-led list has no photo crop. Logo is contain-fit. Crop/focal is not part of this sold offer.",
        scope: "sku",
      },
      revision_neutrality: {
        grade: "READY",
        why: "Service-sheet internal budget is 3 attempts. Exhaust fail-closes. Owner does not finish the sheet.",
        scope: "sku",
      },
      delivery_readiness: {
        grade: "READY",
        why: "Service-sheet exhaust fail-closes. Owner rescue is not the completion path. PNG + customer-print PDF are the sold files.",
        scope: "sku",
      },
    }),
    [
      "HARDEN #3 LIGHT 2026-09-24: $79 digital CERT-plate service list. Up to 10 services. Type-led or customer-supplied rights-cleared assets. No certified 300 DPI print. Customer prints. One revision. Fail-closed / refund if QA exhausts.",
    ],
  ),
];

export function skuLaneRow(skuId: StaticCreativeLaneSku): SkuLaneRow {
  const found = STATIC_CREATIVE_LANE_MATRIX.find((row) => row.skuId === skuId);
  if (!found) throw new Error(`UNKNOWN_STATIC_CREATIVE_SKU:${skuId}`);
  return found;
}

export function laneOverallGrade(): LaneReadinessGrade {
  return worstGrade(STATIC_CREATIVE_LANE_MATRIX.map((row) => row.overall));
}

export function sharedBlockers(): readonly {
  capabilityId: SharedLaneCapabilityId;
  grade: LaneReadinessGrade;
  why: string;
}[] {
  return SHARED_LANE_CAPABILITIES.map((capability) => ({
    capabilityId: capability.id,
    grade: SHARED[capability.id].grade,
    why: SHARED[capability.id].why,
  })).filter(
    (entry) => entry.grade === "HOLD" || entry.grade === "NOT_CERTIFIED",
  );
}

export function matrixCoversEveryLaunchDesignSku(): boolean {
  const graded = new Set(STATIC_CREATIVE_LANE_MATRIX.map((row) => row.skuId));
  return STATIC_CREATIVE_LANE_SKUS.every((sku) => graded.has(sku));
}
