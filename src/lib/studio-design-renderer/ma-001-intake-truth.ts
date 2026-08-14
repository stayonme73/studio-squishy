/**
 * STUDIO-OPERATING-DESIGN-MA-001-INTAKE-TRUTH-1
 *
 * Map customer-locked Promotion Pack composition → authoritative live truth
 * **before payment**. Does not wire dispatch. Does not remap primaryTool.
 *
 * Critical lock: skuId `ma-001` alone is NOT sufficient for checkout. The Machine
 * must know exact lockedPackMemberCount + ordered member identities.
 */

import { PROMO_PORTRAIT_PLATE, PROMO_SQUARE_PLATE } from "./promo-types";
import {
  isMa001SupportedKind,
  producerFamilyForKind,
} from "./ma-001-contracts";
import type {
  Ma001LockedPackMemberCount,
  Ma001PlannedPackMember,
  Ma001SupportedKind,
} from "./ma-001-types";
import { DESIGN_RENDERER_MA_001_SKU } from "./ma-001-types";

export const MA_001_INTAKE_TRUTH_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-MA-001-INTAKE-TRUTH-1" as const;

/** Customer-facing kind labels — never expose internal producer / SKU jargon. */
export const MA_001_CUSTOMER_KIND_OPTIONS = [
  "Flyer",
  "Menu",
  "Service sheet",
  "Business card",
  "Campaign graphic",
] as const;

export type Ma001CustomerKindOption =
  (typeof MA_001_CUSTOMER_KIND_OPTIONS)[number];

const CUSTOMER_KIND_TO_MACHINE: Record<
  Ma001CustomerKindOption,
  Ma001SupportedKind
> = {
  Flyer: "flyer",
  Menu: "menu",
  "Service sheet": "service_sheet",
  "Business card": "business_card",
  "Campaign graphic": "promotion_graphic",
};

/** Customer-facing format options — only required for Campaign graphic. */
export const MA_001_CUSTOMER_CAMPAIGN_GRAPHIC_FORMAT_OPTIONS = [
  "Square (social / feed)",
  "Portrait (print / tall)",
] as const;

export type Ma001CustomerCampaignGraphicFormatOption =
  (typeof MA_001_CUSTOMER_CAMPAIGN_GRAPHIC_FORMAT_OPTIONS)[number];

const FORMAT_TO_PLATE: Record<
  Ma001CustomerCampaignGraphicFormatOption,
  string
> = {
  "Square (social / feed)": PROMO_SQUARE_PLATE.plateId,
  "Portrait (print / tall)": PROMO_PORTRAIT_PLATE.plateId,
};

/** Default plates for kinds that inherit sealed producer plate (Studio production). */
export const MA_001_INHERITED_PLATE_BY_KIND: Record<
  Exclude<Ma001SupportedKind, "promotion_graphic">,
  string
> = {
  flyer: "cert-portrait-1024x1536",
  menu: "cert-portrait-1024x1536",
  service_sheet: "cert-portrait-1024x1536",
  business_card: "cert-landscape-1536x1024",
};

/**
 * Member-level content/material requirements — inherited from sealed producers.
 * Pack does NOT add a pack-level copywriting service.
 */
export const MA_001_MEMBER_CONTENT_INHERITANCE = {
  flyer: {
    source: "sealed_flyer_producer_contract",
    customerFacingSummary:
      "Final wording, prices, logo, images, and contact details for this flyer.",
    packLevelCopywriting: false,
  },
  menu: {
    source: "sealed_menu_producer_contract",
    customerFacingSummary:
      "Accurate menu sections, items, prices, and dietary or allergen wording for this menu.",
    packLevelCopywriting: false,
  },
  service_sheet: {
    source: "sealed_service_sheet_producer_contract",
    customerFacingSummary:
      "Service names, descriptions, pricing mode, and contact details for this service sheet.",
    packLevelCopywriting: false,
  },
  business_card: {
    source: "sealed_business_card_producer_contract",
    customerFacingSummary:
      "Person name, role, and contact fields for this business card.",
    packLevelCopywriting: false,
  },
  promotion_graphic: {
    source: "sealed_promo_surface_content_contract",
    customerFacingSummary:
      "Campaign offer facts, price, dates, and CTA for this campaign graphic.",
    packLevelCopywriting: false,
  },
} as const;

/** Flat live intake field ids (customer-facing labels live in schema docs). */
export const MA_001_COMPOSITION_FIELD_IDS = {
  lockedPackMemberCount: "lockedPackMemberCount",
  memberKind: (n: 1 | 2 | 3 | 4) => `member${n}_kind` as const,
  memberPurpose: (n: 1 | 2 | 3 | 4) => `member${n}_purpose` as const,
  memberAgreedFormat: (n: 1 | 2 | 3 | 4) =>
    `member${n}_agreedFormat` as const,
  campaignFocus: "campaignFocus",
} as const;

/** Keys that must never appear as pack-level copywriting / caption authority. */
export const MA_001_FORBIDDEN_PACK_COPY_FIELDS = [
  "packCaption",
  "packCaptions",
  "studioWriteCaptions",
  "packCopywriting",
  "packMarketingCopy",
  "contentCalendar",
  "postingOrder",
] as const;

/** Ambiguous / superseded fields that must not substitute for composition. */
export const MA_001_AMBIGUOUS_LEGACY_FIELDS = [
  "assetKinds",
  "similarAssets",
  "orSimilar",
  "assetCountUpToFour",
  "marketingAssets",
  "producerFamily",
  "v2-rtu-flyer",
  "primaryTool",
] as const;

export type Ma001LiveMemberAnswer = {
  /** Customer-facing kind label from MA_001_CUSTOMER_KIND_OPTIONS. */
  kindLabel: string;
  /** Short intended use for this member (customer words). */
  purpose: string;
  /**
   * Required when kind is Campaign graphic.
   * Forbidden / ignored for kinds that inherit sealed plates.
   */
  agreedFormatLabel?: string;
};

export type Ma001LiveCompositionInput = {
  /** Explicit count 1–4 — must match members.length. */
  lockedPackMemberCount: number;
  members: readonly Ma001LiveMemberAnswer[];
  campaignFocus?: string;
  /**
   * Open bag for unauthorized-key detection (smuggled UI fields, legacy keys).
   */
  [extra: string]: unknown;
};

export type Ma001CompositionLiveTruth = {
  skuId: typeof DESIGN_RENDERER_MA_001_SKU;
  lockedPackMemberCount: Ma001LockedPackMemberCount;
  plannedPackMembers: readonly Ma001PlannedPackMember[];
  campaignFocus: string;
  /** Customer-facing kind labels parallel to planned members (no jargon). */
  customerKindLabels: readonly Ma001CustomerKindOption[];
  lockedBeforePayment: true;
  completenessAuthority: "exact_locked_member_nn";
  countUnit: "member_identities";
  packageId: typeof MA_001_INTAKE_TRUTH_PACKAGE_ID;
};

export type Ma001PackManifestSeed = {
  status: "composition_locked_pre_payment";
  skuId: typeof DESIGN_RENDERER_MA_001_SKU;
  lockedPackMemberCount: Ma001LockedPackMemberCount;
  countUnit: "member_identities";
  completenessAuthority: "exact_locked_member_nn";
  campaignFocus: string;
  members: readonly {
    memberId: string;
    order: number;
    customerKindLabel: Ma001CustomerKindOption;
    kind: Ma001SupportedKind;
    memberPurpose: string;
    agreedPlateId: string;
    /** Internal — Machine only; never customer UI. */
    producerFamily: string;
    contentInheritanceSource: string;
  }[];
  note: string;
};

export type Ma001CompositionMapResult =
  | { ok: true; truth: Ma001CompositionLiveTruth; manifestSeed: Ma001PackManifestSeed }
  | {
      ok: false;
      code:
        | "MISSING_COMPOSITION"
        | "INVALID_COMPOSITION"
        | "UNSUPPORTED_KIND"
        | "MEMBER_COUNT_MISMATCH"
        | "MISSING_REQUIRED_TRUTH"
        | "INVALID_PLATE"
        | "FORBIDDEN_PACK_COPY_FIELD"
        | "AMBIGUOUS_LEGACY_TRUTH"
        | "SILENT_SUBSTITUTION_FORBIDDEN";
      message: string;
    };

export type Ma001PaymentReadinessResult =
  | {
      ok: true;
      applicable: false;
      reason: "ma-001_not_selected";
    }
  | {
      ok: true;
      applicable: true;
      truth: Ma001CompositionLiveTruth;
      manifestSeed: Ma001PackManifestSeed;
    }
  | {
      ok: false;
      applicable: true;
      code:
        | "SKU_ONLY_INSUFFICIENT"
        | "MISSING_COMPOSITION"
        | "INVALID_COMPOSITION"
        | "UNSUPPORTED_KIND"
        | "MEMBER_COUNT_MISMATCH"
        | "MISSING_REQUIRED_TRUTH"
        | "INVALID_PLATE"
        | "FORBIDDEN_PACK_COPY_FIELD"
        | "AMBIGUOUS_LEGACY_TRUTH"
        | "SILENT_SUBSTITUTION_FORBIDDEN";
      message: string;
      blockCheckout: true;
    };

function isCustomerKindOption(v: string): v is Ma001CustomerKindOption {
  return (MA_001_CUSTOMER_KIND_OPTIONS as readonly string[]).includes(v);
}

function detectForbiddenCopyFields(
  input: Ma001LiveCompositionInput,
): string[] {
  return MA_001_FORBIDDEN_PACK_COPY_FIELDS.filter(
    (k) => k in input && input[k] != null && String(input[k]).trim() !== "",
  );
}

function detectAmbiguousLegacyFields(
  input: Ma001LiveCompositionInput,
): string[] {
  return MA_001_AMBIGUOUS_LEGACY_FIELDS.filter(
    (k) => k in input && input[k] != null && String(input[k]).trim() !== "",
  );
}

/**
 * Build durable memberId from order + kind — stable for a locked composition.
 * Not inferred from filenames.
 */
export function ma001MemberIdFor(order: number, kind: Ma001SupportedKind): string {
  return `pack-member-${order}-${kind}`;
}

/**
 * Map customer-locked live composition → Machine composition truth + manifest seed.
 * Fail closed: unsupported kinds, count mismatch, missing purpose, invalid promo format.
 * Never silently substitutes closest kind.
 */
export function mapMa001CompositionFromLiveTruth(
  input: Ma001LiveCompositionInput | null | undefined,
): Ma001CompositionMapResult {
  if (!input) {
    return {
      ok: false,
      code: "MISSING_COMPOSITION",
      message:
        "MISSING_COMPOSITION: Promotion Pack requires a customer-locked member composition before payment — skuId ma-001 alone is not enough",
    };
  }

  const forbidden = detectForbiddenCopyFields(input);
  if (forbidden.length) {
    return {
      ok: false,
      code: "FORBIDDEN_PACK_COPY_FIELD",
      message: `FORBIDDEN_PACK_COPY_FIELD: pack-level copywriting/caption fields are not authorized (${forbidden.join(", ")}). Each member inherits its sealed producer content contract.`,
    };
  }

  const ambiguous = detectAmbiguousLegacyFields(input);
  if (ambiguous.length) {
    return {
      ok: false,
      code: "AMBIGUOUS_LEGACY_TRUTH",
      message: `AMBIGUOUS_LEGACY_TRUTH: fields ${ambiguous.join(", ")} cannot substitute for locked pack composition`,
    };
  }

  const n = input.lockedPackMemberCount;
  if (n !== 1 && n !== 2 && n !== 3 && n !== 4) {
    return {
      ok: false,
      code: "INVALID_COMPOSITION",
      message: `INVALID_COMPOSITION: lockedPackMemberCount must be 1|2|3|4; got ${n}`,
    };
  }
  if (!Array.isArray(input.members) || input.members.length !== n) {
    return {
      ok: false,
      code: "MEMBER_COUNT_MISMATCH",
      message: `MEMBER_COUNT_MISMATCH: members.length ${input.members?.length ?? 0} !== lockedPackMemberCount ${n}`,
    };
  }

  const planned: Ma001PlannedPackMember[] = [];
  const customerLabels: Ma001CustomerKindOption[] = [];

  for (let i = 0; i < n; i++) {
    const raw = input.members[i]!;
    const order = (i + 1) as 1 | 2 | 3 | 4;
    const kindLabel = raw.kindLabel?.trim() ?? "";
    const purpose = raw.purpose?.trim() ?? "";

    if (!kindLabel) {
      return {
        ok: false,
        code: "MISSING_REQUIRED_TRUTH",
        message: `MISSING_REQUIRED_TRUTH: member ${order} kind is required`,
      };
    }
    if (!isCustomerKindOption(kindLabel)) {
      // Explicit unsupported / free-text — no closest-match
      return {
        ok: false,
        code: "UNSUPPORTED_KIND",
        message: `UNSUPPORTED_KIND: "${kindLabel}" is not an allowed Promotion Pack asset kind. Choose Flyer, Menu, Service sheet, Business card, or Campaign graphic. No closest-match substitution.`,
      };
    }
    if (!purpose) {
      return {
        ok: false,
        code: "MISSING_REQUIRED_TRUTH",
        message: `MISSING_REQUIRED_TRUTH: member ${order} intended use is required`,
      };
    }

    const kind = CUSTOMER_KIND_TO_MACHINE[kindLabel];
    if (!isMa001SupportedKind(kind)) {
      return {
        ok: false,
        code: "UNSUPPORTED_KIND",
        message: `UNSUPPORTED_KIND: ${kind}`,
      };
    }

    let agreedPlateId: string;
    if (kind === "promotion_graphic") {
      const format = raw.agreedFormatLabel?.trim() ?? "";
      if (!format) {
        return {
          ok: false,
          code: "MISSING_REQUIRED_TRUTH",
          message: `MISSING_REQUIRED_TRUTH: member ${order} (Campaign graphic) requires an agreed format`,
        };
      }
      const plateId =
        FORMAT_TO_PLATE[format as Ma001CustomerCampaignGraphicFormatOption];
      if (!plateId) {
        return {
          ok: false,
          code: "INVALID_PLATE",
          message: `INVALID_PLATE: "${format}" is not an allowed Campaign graphic format (Square or Portrait only)`,
        };
      }
      agreedPlateId = plateId;
    } else {
      if (raw.agreedFormatLabel?.trim()) {
        // Customer must not invent plates for sealed singles in V1
        return {
          ok: false,
          code: "INVALID_PLATE",
          message: `INVALID_PLATE: member ${order} (${kindLabel}) inherits its sealed format — do not supply a custom agreed format`,
        };
      }
      agreedPlateId = MA_001_INHERITED_PLATE_BY_KIND[kind];
    }

    customerLabels.push(kindLabel);
    planned.push({
      memberId: ma001MemberIdFor(order, kind),
      kind,
      order,
      memberPurpose: purpose,
      producerFamily: producerFamilyForKind(kind),
      agreedPlateId,
    });
  }

  const campaignFocus =
    (typeof input.campaignFocus === "string" && input.campaignFocus.trim()) ||
    "Promotion Pack campaign";

  const truth: Ma001CompositionLiveTruth = {
    skuId: DESIGN_RENDERER_MA_001_SKU,
    lockedPackMemberCount: n,
    plannedPackMembers: planned,
    campaignFocus,
    customerKindLabels: customerLabels,
    lockedBeforePayment: true,
    completenessAuthority: "exact_locked_member_nn",
    countUnit: "member_identities",
    packageId: MA_001_INTAKE_TRUTH_PACKAGE_ID,
  };

  const manifestSeed = buildMa001PackManifestSeed(truth);
  return { ok: true, truth, manifestSeed };
}

export function buildMa001PackManifestSeed(
  truth: Ma001CompositionLiveTruth,
): Ma001PackManifestSeed {
  return {
    status: "composition_locked_pre_payment",
    skuId: DESIGN_RENDERER_MA_001_SKU,
    lockedPackMemberCount: truth.lockedPackMemberCount,
    countUnit: "member_identities",
    completenessAuthority: "exact_locked_member_nn",
    campaignFocus: truth.campaignFocus,
    members: truth.plannedPackMembers.map((m, i) => ({
      memberId: m.memberId,
      order: m.order,
      customerKindLabel: truth.customerKindLabels[i]!,
      kind: m.kind as Ma001SupportedKind,
      memberPurpose: m.memberPurpose,
      agreedPlateId: m.agreedPlateId ?? "",
      producerFamily: m.producerFamily,
      contentInheritanceSource:
        MA_001_MEMBER_CONTENT_INHERITANCE[m.kind as Ma001SupportedKind]
          .source,
    })),
    note: "Pack completeness = locked member identities N/N. Artifact-file count is not the pack count.",
  };
}

/**
 * Map flat answer bag (form-style) → live composition input.
 */
export function ma001LiveCompositionFromFlatAnswers(
  answers: Record<string, string>,
): Ma001LiveCompositionInput | Ma001CompositionMapResult {
  const countRaw = answers[MA_001_COMPOSITION_FIELD_IDS.lockedPackMemberCount]?.trim();
  const n = Number(countRaw);
  if (n !== 1 && n !== 2 && n !== 3 && n !== 4) {
    return {
      ok: false,
      code: "INVALID_COMPOSITION",
      message: `INVALID_COMPOSITION: lockedPackMemberCount must be 1|2|3|4; got ${countRaw ?? "(missing)"}`,
    };
  }
  const members: Ma001LiveMemberAnswer[] = [];
  for (let i = 1; i <= n; i++) {
    const slot = i as 1 | 2 | 3 | 4;
    members.push({
      kindLabel: answers[MA_001_COMPOSITION_FIELD_IDS.memberKind(slot)] ?? "",
      purpose: answers[MA_001_COMPOSITION_FIELD_IDS.memberPurpose(slot)] ?? "",
      agreedFormatLabel:
        answers[MA_001_COMPOSITION_FIELD_IDS.memberAgreedFormat(slot)],
    });
  }
  const input: Ma001LiveCompositionInput = {
    lockedPackMemberCount: n,
    members,
    campaignFocus: answers[MA_001_COMPOSITION_FIELD_IDS.campaignFocus],
  };
  // Preserve forbidden/legacy keys for detection
  for (const k of [
    ...MA_001_FORBIDDEN_PACK_COPY_FIELDS,
    ...MA_001_AMBIGUOUS_LEGACY_FIELDS,
  ]) {
    if (answers[k] != null && String(answers[k]).trim() !== "") {
      input[k] = answers[k];
    }
  }
  return input;
}

/**
 * Checkout / payment gate: if ma-001 is selected, composition must be locked.
 * skuId alone → block checkout.
 */
export function assertMa001CompositionReadyForPayment(input: {
  selectedServiceIds: readonly string[];
  composition: Ma001LiveCompositionInput | Ma001CompositionLiveTruth | null | undefined;
}): Ma001PaymentReadinessResult {
  const hasMa001 = input.selectedServiceIds.includes(DESIGN_RENDERER_MA_001_SKU);
  if (!hasMa001) {
    return { ok: true, applicable: false, reason: "ma-001_not_selected" };
  }

  if (!input.composition) {
    return {
      ok: false,
      applicable: true,
      code: "SKU_ONLY_INSUFFICIENT",
      message:
        "SKU_ONLY_INSUFFICIENT: selected service ma-001 (Promotion Pack) has no locked pack composition. Checkout cannot accept payment until the customer locks 1–4 member kinds and purposes.",
      blockCheckout: true,
    };
  }

  if (
    typeof input.composition === "object" &&
    "plannedPackMembers" in input.composition &&
    "lockedBeforePayment" in input.composition
  ) {
    const truth = input.composition as Ma001CompositionLiveTruth;
    if (
      !truth.lockedBeforePayment ||
      truth.plannedPackMembers.length !== truth.lockedPackMemberCount ||
      truth.lockedPackMemberCount < 1
    ) {
      return {
        ok: false,
        applicable: true,
        code: "INVALID_COMPOSITION",
        message: "INVALID_COMPOSITION: composition truth is incomplete for payment",
        blockCheckout: true,
      };
    }
    return {
      ok: true,
      applicable: true,
      truth,
      manifestSeed: buildMa001PackManifestSeed(truth),
    };
  }

  const mapped = mapMa001CompositionFromLiveTruth(
    input.composition as Ma001LiveCompositionInput,
  );
  if (!mapped.ok) {
    return {
      ok: false,
      applicable: true,
      code: mapped.code,
      message: mapped.message,
      blockCheckout: true,
    };
  }
  return {
    ok: true,
    applicable: true,
    truth: mapped.truth,
    manifestSeed: mapped.manifestSeed,
  };
}

/**
 * Customer-facing composition field descriptors (for Studio Plan / pre-checkout UI).
 * Labels are complete sentences / plain language — no producer jargon.
 */
export const MA_001_COMPOSITION_CUSTOMER_SCHEMA = {
  title: "Choose your Promotion Pack pieces",
  lead: "Select one to four finished marketing pieces for this campaign. Checkout locks this list.",
  fields: [
    {
      id: MA_001_COMPOSITION_FIELD_IDS.lockedPackMemberCount,
      label: "How many pieces should this pack include?",
      type: "select" as const,
      required: true,
      options: ["1", "2", "3", "4"] as const,
    },
    {
      id: MA_001_COMPOSITION_FIELD_IDS.campaignFocus,
      label: "What is the one campaign or offer focus for this pack?",
      type: "text" as const,
      required: true,
    },
    // Member slots 1–4 — UI shows first N based on count
    ...([1, 2, 3, 4] as const).flatMap((n) => [
      {
        id: MA_001_COMPOSITION_FIELD_IDS.memberKind(n),
        label: `Piece ${n} — what kind of asset is this?`,
        type: "select" as const,
        required: true,
        options: MA_001_CUSTOMER_KIND_OPTIONS,
      },
      {
        id: MA_001_COMPOSITION_FIELD_IDS.memberPurpose(n),
        label: `Piece ${n} — what is this piece for?`,
        type: "textarea" as const,
        required: true,
      },
      {
        id: MA_001_COMPOSITION_FIELD_IDS.memberAgreedFormat(n),
        label: `Piece ${n} — agreed format (required only for Campaign graphic)`,
        type: "select" as const,
        required: false,
        options: MA_001_CUSTOMER_CAMPAIGN_GRAPHIC_FORMAT_OPTIONS,
      },
    ]),
  ],
  forbiddenCustomerJargon: [
    "v2-rtu-*",
    "producerFamily",
    "promotion_graphic",
    "service_sheet",
    "primaryTool",
    "Canva",
  ] as const,
  ownerRoutine: "NONE" as const,
  remapAuthorized: false,
  dispatchAuthorized: false,
} as const;
