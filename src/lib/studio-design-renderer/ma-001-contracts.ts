/**
 * ma-001 Promotion Pack — product contract locks for proof.
 */

import {
  DESIGN_RENDERER_MA_001_SKU,
  MA_001_SUPPORTED_KINDS,
  type DesignRendererMa001Sku,
  type Ma001LockedPackMemberCount,
  type Ma001PackProjectTruth,
  type Ma001SupportedKind,
} from "./ma-001-types";

export const MA_001_PROOF_CONTRACT = {
  skuId: DESIGN_RENDERER_MA_001_SKU,
  supportedKinds: MA_001_SUPPORTED_KINDS,
  lockedPackMemberCountMin: 1,
  lockedPackMemberCountMax: 4,
  countUnit: "member_identities" as const,
  mixedKindsAllowed: true,
  nestedMultiAssetSkuAsOneSlot: false,
  newPackCopyService: false,
  exactMemberNn: true,
  unsupportedKindPolicy: "fail_closed_before_payment" as const,
  remapAuthorized: true,
  dispatchAuthorized: true,
  note:
    "Pack orchestrator proven. Remap + dispatch hook authorized (MA-001-DISPATCH-HOOK-1). Canva not on fulfillment spine for ma-001. Single promotion_graphic via adapter — not exact-two promo job.",
} as const;

export function isDesignRendererMa001Sku(
  skuId: string,
): skuId is DesignRendererMa001Sku {
  return skuId === DESIGN_RENDERER_MA_001_SKU;
}

export function isMa001SupportedKind(kind: string): kind is Ma001SupportedKind {
  return (MA_001_SUPPORTED_KINDS as readonly string[]).includes(kind);
}

export function producerFamilyForKind(
  kind: Ma001SupportedKind,
): string {
  switch (kind) {
    case "flyer":
      return "v2-rtu-flyer";
    case "menu":
      return "v2-rtu-menu";
    case "service_sheet":
      return "v2-rtu-service-sheet";
    case "business_card":
      return "v2-rtu-business-card";
    case "promotion_graphic":
      return "v2-rtu-promotion-graphics-single-adapter";
  }
}

export function validateMa001PackComposition(
  truth: Ma001PackProjectTruth,
): { ok: true } | { ok: false; code: "INVALID_COMPOSITION" | "UNSUPPORTED_KIND" | "MEMBER_COUNT_MISMATCH"; message: string } {
  if (!isDesignRendererMa001Sku(truth.skuId)) {
    return {
      ok: false,
      code: "INVALID_COMPOSITION",
      message: `skuId must be ${DESIGN_RENDERER_MA_001_SKU}`,
    };
  }
  const n = truth.lockedPackMemberCount;
  if (n < 1 || n > 4) {
    return {
      ok: false,
      code: "INVALID_COMPOSITION",
      message: `lockedPackMemberCount must be 1–4; got ${n}`,
    };
  }
  if (truth.plannedPackMembers.length !== n) {
    return {
      ok: false,
      code: "MEMBER_COUNT_MISMATCH",
      message: `plannedPackMembers length ${truth.plannedPackMembers.length} !== lockedPackMemberCount ${n}`,
    };
  }
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const m of truth.plannedPackMembers) {
    if (!m.memberId?.trim()) {
      return {
        ok: false,
        code: "INVALID_COMPOSITION",
        message: "Each member requires durable memberId",
      };
    }
    if (ids.has(m.memberId)) {
      return {
        ok: false,
        code: "INVALID_COMPOSITION",
        message: `Duplicate memberId ${m.memberId}`,
      };
    }
    ids.add(m.memberId);
    if (orders.has(m.order)) {
      return {
        ok: false,
        code: "INVALID_COMPOSITION",
        message: `Duplicate order ${m.order}`,
      };
    }
    orders.add(m.order);
    if (!isMa001SupportedKind(m.kind)) {
      return {
        ok: false,
        code: "UNSUPPORTED_KIND",
        message: `UNSUPPORTED_KIND: ${m.kind} is not a frozen ma-001 pack member kind (no closest-match / no flyer fallback)`,
      };
    }
    if (m.producerFamily !== producerFamilyForKind(m.kind)) {
      return {
        ok: false,
        code: "INVALID_COMPOSITION",
        message: `producerFamily mismatch for ${m.memberId}: expected ${producerFamilyForKind(m.kind)}, got ${m.producerFamily}`,
      };
    }
    if (!(m.memberId in truth.memberTruthById)) {
      return {
        ok: false,
        code: "INVALID_COMPOSITION",
        message: `Missing memberTruthById for ${m.memberId}`,
      };
    }
    const payload = truth.memberTruthById[m.memberId]!;
    if (payload.kind !== m.kind) {
      return {
        ok: false,
        code: "INVALID_COMPOSITION",
        message: `memberTruth kind ${payload.kind} !== planned kind ${m.kind} for ${m.memberId}`,
      };
    }
  }
  const expectedOrders = Array.from({ length: n }, (_, i) => i + 1);
  for (const o of expectedOrders) {
    if (!orders.has(o)) {
      return {
        ok: false,
        code: "INVALID_COMPOSITION",
        message: `Missing order ${o} in plannedPackMembers`,
      };
    }
  }
  return { ok: true };
}

export function assertLockedPackMemberCount(
  n: number,
): asserts n is Ma001LockedPackMemberCount {
  if (n !== 1 && n !== 2 && n !== 3 && n !== 4) {
    throw new Error(`INVALID_COMPOSITION: lockedPackMemberCount must be 1|2|3|4; got ${n}`);
  }
}
