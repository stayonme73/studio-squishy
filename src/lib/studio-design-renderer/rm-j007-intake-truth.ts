/**
 * STUDIO-OPERATING-DESIGN-RM-J007-INTAKE-PAYMENT-LOCK-1 (intake half)
 *
 * Lock reference-guided update truth before payment.
 * skuId `rm-j007` alone is NOT enough for checkout.
 *
 * Required: businessName, itemIdentity/itemLink, referenceMaterialNote,
 * whatChange, newInfo, whereLive, acceptRecreationLimits (Yes variant).
 * Optional: remove, replacementImageNote.
 * Forbidden: redesign fields.
 */

import { recipeForRmJ007Update } from "./rm-j007-contracts";
import {
  DESIGN_RENDERER_RM_J007_SKU,
  type RmJ007PlannedMember,
} from "./rm-j007-types";

export const RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J007-INTAKE-PAYMENT-LOCK-1" as const;

export const RM_J007_ACCEPT_RECREATION_YES_VARIANTS = [
  "Yes",
  "yes",
  "YES",
  "I understand",
  "I accept",
  "Accepted",
  "true",
  "True",
] as const;

export const RM_J007_UPDATE_LOCK_FIELD_IDS = {
  businessName: "businessName",
  itemIdentity: "itemIdentity",
  itemLink: "itemLink",
  referenceMaterialNote: "referenceMaterialNote",
  whatChange: "whatChange",
  newInfo: "newInfo",
  whereLive: "whereLive",
  acceptRecreationLimits: "acceptRecreationLimits",
  remove: "remove",
  replacementImageNote: "replacementImageNote",
} as const;

/** Redesign / new-concept / multi-item — fail closed. */
export const RM_J007_FORBIDDEN_REDESIGN_INTAKE_FIELDS = [
  "redesignRequested",
  "redesign",
  "newConcept",
  "newCampaign",
  "fullRedesign",
  "layoutRebuild",
  "newPromotion",
  "startFromScratch",
  "pixelPerfectRequired",
  "exactLayoutGuarantee",
  "editCanvaFile",
  "editSourceFile",
  "restoreEditableLayers",
  "multipleItems",
  "multiItem",
] as const;

export type RmJ007LiveUpdateLockInput = {
  businessName: string;
  /** Preferred identity of the named existing item. */
  itemIdentity?: string;
  /** Alternate: link identifying the named existing item. */
  itemLink?: string;
  referenceMaterialNote: string;
  whatChange: string;
  newInfo: string;
  whereLive: string;
  /** Must be a Yes-variant acknowledging recreation limits. */
  acceptRecreationLimits: string | boolean;
  remove?: string;
  replacementImageNote?: string;
  [extra: string]: unknown;
};

export type RmJ007UpdateStartingIdentity = {
  itemIdentity: string;
  referenceMaterialNote: string;
  whatChange: string;
  newInfo: string;
  whereLive: string;
  remove?: string;
  replacementImageNote?: string;
};

export type RmJ007UpdateLiveTruth = {
  skuId: typeof DESIGN_RENDERER_RM_J007_SKU;
  businessName: string;
  lockedPackageMemberCount: 1;
  plannedMembers: readonly RmJ007PlannedMember[];
  packageScope: "reference_guided_promotion_update_one_member";
  startingPoint: RmJ007UpdateStartingIdentity;
  acceptRecreationLimits: true;
  redesignRequested: false;
  fulfillmentMode: "recreation";
  lockedBeforePayment: true;
  completenessAuthority: "reference_and_bounded_change_locked_before_payment";
  countUnit: "member_identities";
  ownerRoutine: "NONE";
  canvaRequired: false;
  packageId: typeof RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID;
};

export type RmJ007UpdateManifestSeed = {
  status: "update_locked_pre_payment";
  skuId: typeof DESIGN_RENDERER_RM_J007_SKU;
  lockedPackageMemberCount: 1;
  packageScope: "reference_guided_promotion_update_one_member";
  countUnit: "member_identities";
  completenessAuthority: "reference_and_bounded_change_locked_before_payment";
  acceptRecreationLimits: true;
  redesignRequested: false;
  fulfillmentMode: "recreation";
  ownerRoutine: "NONE";
  canvaRequired: false;
  businessName: string;
  startingPoint: RmJ007UpdateStartingIdentity;
  members: readonly {
    memberId: string;
    order: number;
    kind: string;
    memberPurpose: string;
    agreedPlateId: string;
  }[];
  note: string;
};

export type RmJ007UpdateFailureCode =
  | "MISSING_UPDATE_LOCK"
  | "INVALID_UPDATE_LOCK"
  | "BUSINESS_NAME_MISSING"
  | "ITEM_IDENTITY_MISSING"
  | "MISSING_REQUIRED_TRUTH"
  | "MISSING_REFERENCE_NOTE"
  | "MISSING_BOUNDED_CHANGES"
  | "MISSING_ACCEPTANCE"
  | "REDESIGN_REQUESTED"
  | "FORBIDDEN_SCOPE_INTAKE"
  | "MEMBERSHIP_TAMPER";

export type RmJ007UpdateMapResult =
  | {
      ok: true;
      truth: RmJ007UpdateLiveTruth;
      manifestSeed: RmJ007UpdateManifestSeed;
    }
  | {
      ok: false;
      code: RmJ007UpdateFailureCode;
      message: string;
    };

export type RmJ007PaymentReadinessResult =
  | {
      ok: true;
      applicable: false;
      reason: "rm-j007_not_selected";
    }
  | {
      ok: true;
      applicable: true;
      truth: RmJ007UpdateLiveTruth;
      manifestSeed: RmJ007UpdateManifestSeed;
    }
  | {
      ok: false;
      applicable: true;
      code: "SKU_ONLY_INSUFFICIENT" | RmJ007UpdateFailureCode;
      message: string;
      blockCheckout: true;
    };

function isYesAcceptance(raw: string | boolean): boolean {
  if (raw === true) return true;
  if (typeof raw !== "string") return false;
  const t = raw.trim();
  return (RM_J007_ACCEPT_RECREATION_YES_VARIANTS as readonly string[]).includes(
    t,
  );
}

function detectForbidden(input: RmJ007LiveUpdateLockInput): string[] {
  return RM_J007_FORBIDDEN_REDESIGN_INTAKE_FIELDS.filter((k) => {
    if (!(k in input) || input[k] == null) return false;
    if (typeof input[k] === "boolean") return input[k] === true;
    return String(input[k]).trim() !== "";
  });
}

export function buildRmJ007UpdateManifestSeed(
  truth: RmJ007UpdateLiveTruth,
): RmJ007UpdateManifestSeed {
  return {
    status: "update_locked_pre_payment",
    skuId: DESIGN_RENDERER_RM_J007_SKU,
    lockedPackageMemberCount: 1,
    packageScope: "reference_guided_promotion_update_one_member",
    countUnit: "member_identities",
    completenessAuthority: "reference_and_bounded_change_locked_before_payment",
    acceptRecreationLimits: true,
    redesignRequested: false,
    fulfillmentMode: "recreation",
    ownerRoutine: "NONE",
    canvaRequired: false,
    businessName: truth.businessName,
    startingPoint: truth.startingPoint,
    members: truth.plannedMembers.map((m) => ({
      memberId: m.memberId,
      order: m.order,
      kind: m.kind,
      memberPurpose: m.memberPurpose,
      agreedPlateId: m.agreedPlateId,
    })),
    note:
      "Reference-Guided Promotion Update = exactly 1 member (updated_promotion). Customer supplies existing promotion as reference plus bounded changes. Studio recreates an updated final — not a pixel-perfect source-file edit. Redesign fails closed. Canva OFF.",
  };
}

function assertMembership(
  truth: Pick<
    RmJ007UpdateLiveTruth,
    "lockedPackageMemberCount" | "plannedMembers"
  >,
): RmJ007UpdateMapResult | null {
  const recipe = recipeForRmJ007Update();
  if (
    truth.lockedPackageMemberCount !== 1 ||
    truth.plannedMembers.length !== 1
  ) {
    return {
      ok: false,
      code: "MEMBERSHIP_TAMPER",
      message:
        "MEMBERSHIP_TAMPER: sealed membership must be exactly 1 updated_promotion member",
    };
  }
  const expected = recipe.plannedMembers[0]!;
  const actual = truth.plannedMembers[0]!;
  if (
    actual.memberId !== expected.memberId ||
    actual.kind !== expected.kind ||
    actual.order !== expected.order ||
    actual.agreedPlateId !== expected.agreedPlateId
  ) {
    return {
      ok: false,
      code: "MEMBERSHIP_TAMPER",
      message: "MEMBERSHIP_TAMPER: member does not match frozen recipe",
    };
  }
  return null;
}

export function mapRmJ007UpdateLockFromLiveTruth(
  input: RmJ007LiveUpdateLockInput | null | undefined,
): RmJ007UpdateMapResult {
  if (!input) {
    return {
      ok: false,
      code: "MISSING_UPDATE_LOCK",
      message:
        "MISSING_UPDATE_LOCK: Reference-Guided Promotion Update requires business name, named item, reference note, change instructions, where-live, and acceptance of recreation limits before payment — skuId rm-j007 alone is not enough",
    };
  }

  const forbidden = detectForbidden(input);
  if (forbidden.length) {
    return {
      ok: false,
      code: "REDESIGN_REQUESTED",
      message: `REDESIGN_REQUESTED: rm-j007 fails closed on redesign / source-edit / multi-item fields (${forbidden.join(", ")})`,
    };
  }

  const businessName = String(input.businessName ?? "").trim();
  if (!businessName) {
    return {
      ok: false,
      code: "BUSINESS_NAME_MISSING",
      message: "BUSINESS_NAME_MISSING: business name required before payment",
    };
  }

  const itemIdentity = String(
    input.itemIdentity ?? input.itemLink ?? "",
  ).trim();
  if (!itemIdentity) {
    return {
      ok: false,
      code: "ITEM_IDENTITY_MISSING",
      message:
        "ITEM_IDENTITY_MISSING: name or link the one existing promotional item before payment",
    };
  }

  const referenceMaterialNote = String(
    input.referenceMaterialNote ?? "",
  ).trim();
  if (!referenceMaterialNote) {
    return {
      ok: false,
      code: "MISSING_REFERENCE_NOTE",
      message:
        "MISSING_REFERENCE_NOTE: describe or attach the existing promotional reference before payment",
    };
  }

  const whatChange = String(input.whatChange ?? "").trim();
  const newInfo = String(input.newInfo ?? "").trim();
  if (!whatChange || !newInfo) {
    return {
      ok: false,
      code: "MISSING_BOUNDED_CHANGES",
      message:
        "MISSING_BOUNDED_CHANGES: whatChange and newInfo are required before payment",
    };
  }

  const whereLive = String(input.whereLive ?? "").trim();
  if (!whereLive) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_TRUTH",
      message: "MISSING_REQUIRED_TRUTH: whereLive is required before payment",
    };
  }

  if (!isYesAcceptance(input.acceptRecreationLimits)) {
    return {
      ok: false,
      code: "MISSING_ACCEPTANCE",
      message:
        "MISSING_ACCEPTANCE: accept recreation limits (Yes) — Studio recreates an updated final; it does not edit your original source file pixel-perfectly",
    };
  }

  const remove = String(input.remove ?? "").trim() || undefined;
  const replacementImageNote =
    String(input.replacementImageNote ?? "").trim() || undefined;

  const recipe = recipeForRmJ007Update();
  const truth: RmJ007UpdateLiveTruth = {
    skuId: DESIGN_RENDERER_RM_J007_SKU,
    businessName,
    lockedPackageMemberCount: 1,
    plannedMembers: recipe.plannedMembers,
    packageScope: "reference_guided_promotion_update_one_member",
    startingPoint: {
      itemIdentity,
      referenceMaterialNote,
      whatChange,
      newInfo,
      whereLive,
      ...(remove ? { remove } : {}),
      ...(replacementImageNote ? { replacementImageNote } : {}),
    },
    acceptRecreationLimits: true,
    redesignRequested: false,
    fulfillmentMode: "recreation",
    lockedBeforePayment: true,
    completenessAuthority: "reference_and_bounded_change_locked_before_payment",
    countUnit: "member_identities",
    ownerRoutine: "NONE",
    canvaRequired: false,
    packageId: RM_J007_INTAKE_PAYMENT_LOCK_PACKAGE_ID,
  };

  const membership = assertMembership(truth);
  if (membership) return membership;

  return {
    ok: true,
    truth,
    manifestSeed: buildRmJ007UpdateManifestSeed(truth),
  };
}

export function rmj007LiveUpdateLockFromFlatAnswers(
  answers: Record<string, string>,
): RmJ007LiveUpdateLockInput | RmJ007UpdateMapResult {
  const input: RmJ007LiveUpdateLockInput = {
    businessName:
      answers[RM_J007_UPDATE_LOCK_FIELD_IDS.businessName] ?? "",
    itemIdentity:
      answers[RM_J007_UPDATE_LOCK_FIELD_IDS.itemIdentity] ??
      answers[RM_J007_UPDATE_LOCK_FIELD_IDS.itemLink] ??
      "",
    itemLink: answers[RM_J007_UPDATE_LOCK_FIELD_IDS.itemLink] ?? "",
    referenceMaterialNote:
      answers[RM_J007_UPDATE_LOCK_FIELD_IDS.referenceMaterialNote] ?? "",
    whatChange: answers[RM_J007_UPDATE_LOCK_FIELD_IDS.whatChange] ?? "",
    newInfo: answers[RM_J007_UPDATE_LOCK_FIELD_IDS.newInfo] ?? "",
    whereLive: answers[RM_J007_UPDATE_LOCK_FIELD_IDS.whereLive] ?? "",
    acceptRecreationLimits:
      answers[RM_J007_UPDATE_LOCK_FIELD_IDS.acceptRecreationLimits] ?? "",
    remove: answers[RM_J007_UPDATE_LOCK_FIELD_IDS.remove] ?? "",
    replacementImageNote:
      answers[RM_J007_UPDATE_LOCK_FIELD_IDS.replacementImageNote] ?? "",
  };
  for (const k of RM_J007_FORBIDDEN_REDESIGN_INTAKE_FIELDS) {
    if (answers[k] != null && String(answers[k]).trim() !== "") {
      input[k] = answers[k];
    }
  }
  return input;
}

export function assertRmJ007UpdateReadyForPayment(input: {
  selectedServiceIds: readonly string[];
  updateLock:
    | RmJ007LiveUpdateLockInput
    | RmJ007UpdateLiveTruth
    | null
    | undefined;
}): RmJ007PaymentReadinessResult {
  const hasSku = input.selectedServiceIds.includes(DESIGN_RENDERER_RM_J007_SKU);
  if (!hasSku) {
    return { ok: true, applicable: false, reason: "rm-j007_not_selected" };
  }

  if (!input.updateLock) {
    return {
      ok: false,
      applicable: true,
      code: "SKU_ONLY_INSUFFICIENT",
      message:
        "SKU_ONLY_INSUFFICIENT: selected service rm-j007 (Reference-Guided Promotion Update) has no locked update. Checkout cannot accept payment until the customer names the existing item, supplies a reference note, describes bounded changes, where it lives, and accepts recreation limits.",
      blockCheckout: true,
    };
  }

  if (
    typeof input.updateLock === "object" &&
    "plannedMembers" in input.updateLock &&
    "lockedBeforePayment" in input.updateLock
  ) {
    const truth = input.updateLock as RmJ007UpdateLiveTruth;
    if (
      !truth.lockedBeforePayment ||
      truth.skuId !== DESIGN_RENDERER_RM_J007_SKU ||
      truth.acceptRecreationLimits !== true ||
      truth.redesignRequested !== false ||
      truth.fulfillmentMode !== "recreation" ||
      truth.packageScope !== "reference_guided_promotion_update_one_member" ||
      truth.ownerRoutine !== "NONE" ||
      truth.canvaRequired !== false
    ) {
      return {
        ok: false,
        applicable: true,
        code: "INVALID_UPDATE_LOCK",
        message:
          "INVALID_UPDATE_LOCK: update truth is incomplete or unsafe for payment",
        blockCheckout: true,
      };
    }
    if (!truth.businessName?.trim()) {
      return {
        ok: false,
        applicable: true,
        code: "BUSINESS_NAME_MISSING",
        message: "BUSINESS_NAME_MISSING: sealed update missing business name",
        blockCheckout: true,
      };
    }
    if (
      !truth.startingPoint?.itemIdentity?.trim() ||
      !truth.startingPoint?.referenceMaterialNote?.trim() ||
      !truth.startingPoint?.whatChange?.trim() ||
      !truth.startingPoint?.newInfo?.trim() ||
      !truth.startingPoint?.whereLive?.trim()
    ) {
      return {
        ok: false,
        applicable: true,
        code: "MISSING_REQUIRED_TRUTH",
        message:
          "MISSING_REQUIRED_TRUTH: sealed update missing reference or change identity",
        blockCheckout: true,
      };
    }
    const membership = assertMembership(truth);
    if (membership && !membership.ok) {
      return {
        ok: false,
        applicable: true,
        code: membership.code,
        message: membership.message,
        blockCheckout: true,
      };
    }
    return {
      ok: true,
      applicable: true,
      truth,
      manifestSeed: buildRmJ007UpdateManifestSeed(truth),
    };
  }

  const mapped = mapRmJ007UpdateLockFromLiveTruth(
    input.updateLock as RmJ007LiveUpdateLockInput,
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

export function customerFacingRmJ007UpdateLines(
  truth: RmJ007UpdateLiveTruth,
): readonly string[] {
  return [
    `Reference-Guided Promotion Update — one recreated updated final for “${truth.startingPoint.itemIdentity}”`,
    "Guided by your supplied existing promotion plus exact bounded changes (dates, prices, contact, wording, optional one image)",
    "Not a pixel-perfect edit of your original file — and not a redesign",
  ];
}
