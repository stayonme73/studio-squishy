/**
 * STUDIO-OPERATING-DESIGN-SM-001-INTAKE-TRUTH-1
 *
 * Map live campaign truth → authoritative sm-001 Launch Set structure:
 * plannedPostCount ∈ {4,5,6} (Studio-selected before execution), member
 * assignment, square-only executable plate, posting order + calendar
 * requirements, and campaign timing constraints.
 *
 * Scope guard — this package resolves structure only. Dispatch wiring and the
 * `primaryTool` remap arrived separately in SM-001-DISPATCH-HOOK-1 (sm-001 only);
 * the sealed v2-rtu-social-posts lane stays read-only here.
 *
 * Live-form reality (do not confuse the two SKUs):
 * The live `SocialPostsIntakeForm` belongs to **v2-rtu-social-posts** — a
 * fixed four-post square set. It is NOT an sm-001 form. sm-001 (Social Media
 * Launch Set, up to six posts + calendar) has **no dedicated customer form**
 * for layout role, plate, or post count. Those are Studio production
 * decisions derived from campaign truth and material availability.
 */

import {
  DESIGN_RENDERER_SM_001_SKU,
  SM_001_LAYOUT_TEMPLATES,
  SM_001_PLANNED_POST_COUNTS,
  SM_001_SQUARE_PLATE,
  type DesignRendererSm001Sku,
  type Sm001LayoutTemplate,
  type Sm001MaterialRef,
  type Sm001MemberTruth,
  type Sm001PlannedPostCount,
  type Sm001PlannedPostCountSelection,
  type Sm001PlateId,
  type Sm001TimingConstraints,
} from "./sm-001-types";
import { assignSm001MembersForCount } from "./sm-001-fixtures";
import {
  collectSm001NSelectSignals,
  selectSm001PlannedPostCount,
} from "./sm-001-n-select";

/**
 * Authoritative classification of the sm-001 layout templates
 * (`offer_lead` … `soft_close`).
 *
 * Mirrors `SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION` in intent: proven Machine
 * layout templates are production sequencing, never a customer contract and
 * never an intake menu.
 */
export const SM_001_LAYOUT_TEMPLATE_CLASSIFICATION = {
  /** No customer picks a layout template for any post. */
  customerConfigurable: false,
  /** The service contract promises a coordinated set — it never names templates. */
  fixedServiceContractRoles: false,
  /** No sm-001 intake select exists for template, plate, or count. */
  intakeSelectFields: false,
  /** Studio production layout library proven by SM-001-PROOF-1. */
  provenMachineLayoutTemplates: SM_001_LAYOUT_TEMPLATES,
  /** Live assignment authority for the Launch Set. */
  liveAuthority: "studio_production_layout_assignment" as const,
  /**
   * Assignment rule: Studio production takes the first N proven templates in
   * library order for the selected plannedPostCount. Under a six-template
   * library this is anti-clone layout sequencing, not a promise that every
   * campaign narrates offer → booking → dates → trust → proof → close.
   */
  assignmentRule: "first_n_templates_for_planned_post_count" as const,
  /** N is a Studio decision made before execution — never a customer field, never a QA outcome. */
  plannedPostCountAuthority: "studio_selected_before_execution" as const,
  /** Calendar timing comes from campaign constraints; the Studio never interrogates for publish dates. */
  customerPostingDateQuestionsAuthorized: false,
  liveFormNote:
    "The live SocialPostsIntakeForm is the v2-rtu-social-posts form (fixed four square posts). It is not an sm-001 form. sm-001 has no dedicated customer form for layout template, plate, or post count.",
} as const;

export type Sm001LayoutTemplateAuthority =
  | "fixture_cert"
  | "studio_production_layout_assignment";

/** Only proven executable plate shape for sm-001 today. */
export const SM_001_EXECUTABLE_PLATE_IDS: ReadonlySet<Sm001PlateId> = new Set([
  SM_001_SQUARE_PLATE.plateId,
]);

/**
 * Campaign-level live truth the Machine may read for sm-001 structure.
 * All fields are campaign-level — there are no per-post customer fields.
 *
 * The open index signature exists so smuggled keys reach
 * `detectSm001UnauthorizedFields` at runtime instead of being silently
 * dropped by the type system.
 */
export type Sm001LiveTruthInput = {
  businessName: string;
  offerName: string;
  priceDisplay: string;
  wasPriceDisplay?: string;
  dateWindow?: string;
  body?: string;
  headline?: string;
  cta?: string;
  phone?: string;
  /** Approved material availability — logo presence gates N selection. */
  materials: { hasLogo: boolean };
  /** Authoritative campaign timing when the campaign already carries dates. */
  timingConstraints?: {
    startDate?: string;
    endDate?: string;
    blackoutDates?: readonly string[];
  };
  platformLabel?: string;
  [unauthorizedKey: string]: unknown;
};

/** Campaign-level keys the Machine is authorized to read. */
export const SM_001_AUTHORIZED_LIVE_TRUTH_KEYS = [
  "businessName",
  "offerName",
  "priceDisplay",
  "wasPriceDisplay",
  "dateWindow",
  "body",
  "headline",
  "cta",
  "phone",
  "materials",
  "timingConstraints",
  "platformLabel",
] as const;

export type Sm001TimingSource =
  /** Campaign already carried authoritative ISO constraints. */
  | "campaign_constraints"
  /** Simple ISO dates parsed out of the campaign date window. */
  | "parsed_date_window"
  /** No dates known — advisory calendar sequence resolved later, nothing invented. */
  | "none_pending_advisory";

export type Sm001SetStructureTruth = {
  skuId: DesignRendererSm001Sku;
  plannedPostCount: Sm001PlannedPostCount;
  plannedPostCountSelection: Sm001PlannedPostCountSelection;
  plateId: Sm001PlateId;
  canvas: { widthPx: number; heightPx: number };
  /** Square-only executable plate for the Machine. */
  executablePlate: "square";
  platformLabel: string;
  layoutTemplateAuthority: Sm001LayoutTemplateAuthority;
  layoutTemplateClassification: typeof SM_001_LAYOUT_TEMPLATE_CLASSIFICATION;
  /** Captions are never a customer intake field — the Studio writes them. */
  captionSource: "studio_written";
  calendarRequired: true;
  postingOrderRequired: true;
  timingConstraints: Sm001TimingConstraints;
  timingSource: Sm001TimingSource;
  assets: readonly Sm001MemberTruth[];
};

export type Sm001IntakeStructureFailureCode =
  | "MISSING_REQUIRED_TRUTH"
  | "INVALID_PLANNED_POST_COUNT"
  | "COUNT_MISMATCH"
  | "INVALID_PLATE"
  | "DATE_GOVERNANCE_FAILURE"
  | "SET_CONSISTENCY_FAILURE"
  /** Customer field that would override a Studio production decision. */
  | "UNAUTHORIZED_CUSTOMER_FIELD";

export type Sm001IntakeStructureResult =
  | { ok: true; structure: Sm001SetStructureTruth }
  | {
      ok: false;
      code: Sm001IntakeStructureFailureCode;
      message: string;
    };

export type Sm001DispatchReadinessResult =
  | { ok: true }
  | { ok: false; code: Sm001IntakeStructureFailureCode; message: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value.trim())) return false;
  return !Number.isNaN(new Date(`${value.trim()}T00:00:00Z`).getTime());
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Reject anything that would turn a Studio production decision into a
 * customer override: per-post layout templates, plate picks, post-count
 * picks, Harbor-style role menus, or posting-date questions.
 */
export function detectSm001UnauthorizedFields(
  input: Sm001LiveTruthInput,
): string[] {
  const authorized = new Set<string>(SM_001_AUTHORIZED_LIVE_TRUTH_KEYS);
  return Object.keys(input).filter((key) => !authorized.has(key));
}

function classifyUnauthorizedField(key: string): string {
  if (/^(post|sm001Post|socialPost)\d+_?(layoutTemplate|template)/i.test(key)) {
    return `"${key}" would let a customer choose an sm-001 layout template. Layout templates are Studio production assignment, not a customer contract or intake select.`;
  }
  if (/^(post|sm001Post|socialPost)\d+_?(role|roleAngle|angle)/i.test(key)) {
    return `"${key}" is a Harbor-as-menu field. Proven CERT template names are not customer role selects.`;
  }
  if (/^(post|sm001Post|socialPost)\d+_?(plate|size|format)/i.test(key)) {
    return `"${key}" would let a customer choose a plate. sm-001 Machine execution is square-only.`;
  }
  if (/(plannedPostCount|postCount|numberOfPosts|howManyPosts)/i.test(key)) {
    return `"${key}" would let a customer set N. plannedPostCount ∈ {4,5,6} is chosen by the Studio from campaign truth before execution.`;
  }
  if (/(publishDate|postingDate|postDate|postingSchedule|whenToPost)/i.test(key)) {
    return `"${key}" is a customer posting-date question. Calendar timing comes from campaign constraints — the Studio does not ask customers for publish dates.`;
  }
  if (/(caption)/i.test(key)) {
    return `"${key}" would collect captions from the customer. Captions are Studio-written from campaign truth.`;
  }
  return `"${key}" is not an authorized sm-001 campaign-truth field.`;
}

/**
 * Resolve campaign timing without inventing customer facts.
 * - Explicit ISO constraints win.
 * - Otherwise attempt simple ISO extraction from the campaign date window.
 * - Otherwise leave empty; the advisory calendar resolves dates later.
 */
export function resolveSm001TimingConstraints(input: Sm001LiveTruthInput):
  | { ok: true; timing: Sm001TimingConstraints; source: Sm001TimingSource }
  | {
      ok: false;
      code: "DATE_GOVERNANCE_FAILURE";
      message: string;
    } {
  const provided = input.timingConstraints;
  if (provided) {
    const timing: Sm001TimingConstraints = {};
    for (const field of ["startDate", "endDate"] as const) {
      const raw = provided[field];
      if (raw === undefined) continue;
      if (!isIsoDate(raw)) {
        return {
          ok: false,
          code: "DATE_GOVERNANCE_FAILURE",
          message: `DATE_GOVERNANCE_FAILURE: ${field} must be ISO YYYY-MM-DD, got "${String(raw)}"`,
        };
      }
      timing[field] = raw.trim();
    }
    if (provided.blackoutDates?.length) {
      for (const blackout of provided.blackoutDates) {
        if (!isIsoDate(blackout)) {
          return {
            ok: false,
            code: "DATE_GOVERNANCE_FAILURE",
            message: `DATE_GOVERNANCE_FAILURE: blackout date must be ISO YYYY-MM-DD, got "${String(blackout)}"`,
          };
        }
      }
      timing.blackoutDates = provided.blackoutDates.map((d) => d.trim());
    }
    if (
      timing.startDate &&
      timing.endDate &&
      timing.startDate > timing.endDate
    ) {
      return {
        ok: false,
        code: "DATE_GOVERNANCE_FAILURE",
        message: `DATE_GOVERNANCE_FAILURE: startDate ${timing.startDate} is after endDate ${timing.endDate}`,
      };
    }
    if (Object.keys(timing).length > 0) {
      return { ok: true, timing, source: "campaign_constraints" };
    }
  }

  // Only lift dates already written in unambiguous ISO form. A human-readable
  // window such as "March 10 – April 15, 2026" stays unparsed rather than
  // becoming an invented publish schedule.
  const found = text(input.dateWindow).match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  const isoDates = found.filter(isIsoDate);
  if (isoDates.length >= 2) {
    const [startDate, endDate] = [isoDates[0]!, isoDates[1]!];
    if (startDate > endDate) {
      return {
        ok: false,
        code: "DATE_GOVERNANCE_FAILURE",
        message: `DATE_GOVERNANCE_FAILURE: parsed window start ${startDate} is after end ${endDate}`,
      };
    }
    return {
      ok: true,
      timing: { startDate, endDate },
      source: "parsed_date_window",
    };
  }
  if (isoDates.length === 1) {
    return {
      ok: true,
      timing: { startDate: isoDates[0]! },
      source: "parsed_date_window",
    };
  }

  return { ok: true, timing: {}, source: "none_pending_advisory" };
}

function synthesizeMaterialRefs(hasLogo: boolean): readonly Sm001MaterialRef[] {
  if (!hasLogo) return [];
  return [
    {
      materialId: "live-approved-logo",
      role: "logo",
      relativePath: "",
      contentSha256: "",
    },
  ];
}

/**
 * Build the authoritative sm-001 Launch Set structure from live campaign
 * truth. Fail-closed — never invent N, plate, publish dates, or members.
 */
export function mapSm001SetStructureFromLiveTruth(
  input: Sm001LiveTruthInput,
): Sm001IntakeStructureResult {
  const unauthorized = detectSm001UnauthorizedFields(input);
  if (unauthorized.length > 0) {
    return {
      ok: false,
      code: "UNAUTHORIZED_CUSTOMER_FIELD",
      message:
        `UNAUTHORIZED_CUSTOMER_FIELD: ${classifyUnauthorizedField(unauthorized[0]!)} ` +
        `Rejected keys: ${unauthorized.join(", ")}.`,
    };
  }

  if (!text(input.businessName)) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: "MISSING_REQUIRED_TRUTH: businessName is required",
    };
  }

  const signalsTruth = {
    materials: synthesizeMaterialRefs(input.materials?.hasLogo === true),
    offerName: text(input.offerName),
    priceDisplay: text(input.priceDisplay),
    cta: text(input.cta),
    dateWindow: text(input.dateWindow),
    body: text(input.body),
    headline: text(input.headline),
    wasPriceDisplay: text(input.wasPriceDisplay),
  };

  const signals = collectSm001NSelectSignals(signalsTruth);

  let selection: Sm001PlannedPostCountSelection;
  try {
    selection = selectSm001PlannedPostCount(signals);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      code: "INVALID_PLANNED_POST_COUNT",
      message,
    };
  }

  const plannedPostCount = selection.plannedPostCount;
  if (
    !(SM_001_PLANNED_POST_COUNTS as readonly number[]).includes(
      plannedPostCount,
    )
  ) {
    return {
      ok: false,
      code: "INVALID_PLANNED_POST_COUNT",
      message: `INVALID_PLANNED_POST_COUNT: ${plannedPostCount} is outside {4,5,6}`,
    };
  }

  const assets = assignSm001MembersForCount(plannedPostCount);
  if (assets.length !== plannedPostCount) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `COUNT_MISMATCH: assigned ${assets.length} members for plannedPostCount ${plannedPostCount}`,
    };
  }

  const timing = resolveSm001TimingConstraints(input);
  if (!timing.ok) return timing;

  return {
    ok: true,
    structure: {
      skuId: DESIGN_RENDERER_SM_001_SKU,
      plannedPostCount,
      plannedPostCountSelection: selection,
      plateId: SM_001_SQUARE_PLATE.plateId,
      canvas: {
        widthPx: SM_001_SQUARE_PLATE.widthPx,
        heightPx: SM_001_SQUARE_PLATE.heightPx,
      },
      executablePlate: "square",
      platformLabel:
        text(input.platformLabel) ||
        "Social feed — square 1024×1024 (Studio executable plate)",
      layoutTemplateAuthority: "studio_production_layout_assignment",
      layoutTemplateClassification: SM_001_LAYOUT_TEMPLATE_CLASSIFICATION,
      captionSource: "studio_written",
      calendarRequired: true,
      postingOrderRequired: true,
      timingConstraints: timing.timing,
      timingSource: timing.source,
      assets,
    },
  };
}

export function hasSm001SetStructureLiveTruth(
  input: Sm001LiveTruthInput,
): boolean {
  return mapSm001SetStructureFromLiveTruth(input).ok;
}

export function isProvenSm001LayoutTemplate(
  value: string,
): value is Sm001LayoutTemplate {
  return (SM_001_LAYOUT_TEMPLATES as readonly string[]).includes(value);
}

/**
 * Readiness gate for the sm-001 dispatch hook — fail closed on anything that
 * would let a bad set reach the Machine.
 */
export function assertSm001StructureExecutableForDispatch(
  structure: Sm001SetStructureTruth,
): Sm001DispatchReadinessResult {
  const n = structure.plannedPostCount;

  if (!(SM_001_PLANNED_POST_COUNTS as readonly number[]).includes(n)) {
    return {
      ok: false,
      code: "INVALID_PLANNED_POST_COUNT",
      message: `INVALID_PLANNED_POST_COUNT: plannedPostCount ${n} is outside {4,5,6}`,
    };
  }

  if (structure.plannedPostCountSelection.plannedPostCount !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message:
        `COUNT_MISMATCH: structure plannedPostCount ${n} does not match ` +
        `selection ${structure.plannedPostCountSelection.plannedPostCount}`,
    };
  }

  if (!structure.plannedPostCountSelection.selectedBeforeExecution) {
    return {
      ok: false,
      code: "INVALID_PLANNED_POST_COUNT",
      message:
        "INVALID_PLANNED_POST_COUNT: plannedPostCount must be selected before execution",
    };
  }

  const signals = structure.plannedPostCountSelection.signals;
  if (!signals.hasLogo || !signals.hasOfferFacts || !signals.hasDateWindow) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message:
        "MISSING_REQUIRED_TRUTH: logo, offer/price/CTA facts, and a campaign date window " +
        "are required signals behind plannedPostCount — N is invalid without them",
    };
  }

  // Re-derive N from the recorded signals; a drifted selection is not executable.
  let rederived: Sm001PlannedPostCount;
  try {
    rederived = selectSm001PlannedPostCount(signals).plannedPostCount;
  } catch (error) {
    return {
      ok: false,
      code: "INVALID_PLANNED_POST_COUNT",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  if (rederived !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `COUNT_MISMATCH: recorded signals resolve to ${rederived}, not ${n}`,
    };
  }

  if (
    structure.executablePlate !== "square" ||
    !SM_001_EXECUTABLE_PLATE_IDS.has(structure.plateId) ||
    structure.canvas.widthPx !== SM_001_SQUARE_PLATE.widthPx ||
    structure.canvas.heightPx !== SM_001_SQUARE_PLATE.heightPx
  ) {
    return {
      ok: false,
      code: "INVALID_PLATE",
      message:
        `INVALID_PLATE: sm-001 Machine execution is square-only ` +
        `(${SM_001_SQUARE_PLATE.plateId} ${SM_001_SQUARE_PLATE.widthPx}×${SM_001_SQUARE_PLATE.heightPx}); ` +
        `got ${structure.plateId} ${structure.canvas.widthPx}×${structure.canvas.heightPx} / ` +
        `plate shape "${structure.executablePlate}". No silent substitution.`,
    };
  }

  if (structure.assets.length !== n) {
    return {
      ok: false,
      code: "COUNT_MISMATCH",
      message: `COUNT_MISMATCH: plannedPostCount ${n} but ${structure.assets.length} members`,
    };
  }

  const seenTemplates = new Set<string>();
  for (let i = 0; i < structure.assets.length; i++) {
    const member = structure.assets[i]!;
    const expectedOrder = i + 1;
    if (member.orderIndex !== expectedOrder) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `SET_CONSISTENCY_FAILURE: posting order gap at position ${expectedOrder} (found orderIndex ${member.orderIndex})`,
      };
    }
    if (member.assetId !== `social-post-${expectedOrder}`) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `SET_CONSISTENCY_FAILURE: phantom member "${member.assetId}" at position ${expectedOrder}`,
      };
    }
    if (!isProvenSm001LayoutTemplate(member.layoutTemplate)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message:
          `SET_CONSISTENCY_FAILURE: layout template "${member.layoutTemplate}" is not proven. ` +
          `Do not invent layouts at dispatch.`,
      };
    }
    if (member.layoutTemplate !== SM_001_LAYOUT_TEMPLATES[i]) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message:
          `SET_CONSISTENCY_FAILURE: position ${expectedOrder} expects Studio template ` +
          `"${SM_001_LAYOUT_TEMPLATES[i]}", found "${member.layoutTemplate}"`,
      };
    }
    if (seenTemplates.has(member.layoutTemplate)) {
      return {
        ok: false,
        code: "SET_CONSISTENCY_FAILURE",
        message: `SET_CONSISTENCY_FAILURE: duplicate layout template "${member.layoutTemplate}"`,
      };
    }
    seenTemplates.add(member.layoutTemplate);
  }

  if (structure.captionSource !== "studio_written") {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message:
        "SET_CONSISTENCY_FAILURE: sm-001 captions must be Studio-written from campaign truth",
    };
  }

  if (!structure.calendarRequired || !structure.postingOrderRequired) {
    return {
      ok: false,
      code: "SET_CONSISTENCY_FAILURE",
      message:
        "SET_CONSISTENCY_FAILURE: sm-001 Launch Set requires posting order and calendar manifest",
    };
  }

  return { ok: true };
}
