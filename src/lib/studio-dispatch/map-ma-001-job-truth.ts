/**
 * STUDIO-OPERATING-DESIGN-MA-001-DISPATCH-HOOK-1
 *
 * Map paid ma001PostPayDispatchStructure (+ payment seal) → Ma001PackProjectTruth.
 * Purchased basket is law — never invent / reorder / substitute members.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_MA_001_SKU,
  assertMa001PostPayStructureDispatchReady,
  assertMa001PostPayStructureMatchesPaymentSeal,
  buildHarborOakMa001MaxMixedPackTruth,
  producerFamilyForKind,
  type Ma001PackProjectTruth,
  type Ma001PlannedPackMember,
  type Ma001PostPayDispatchStructure,
  type Ma001SupportedKind,
} from "@/lib/studio-design-renderer";
import type { Ma001CompositionPaymentSeal } from "@/lib/studio-design-renderer";

import { resolveApprovedLogoMaterial } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

export const MA_001_DISPATCH_WIRING_SCOPE_NOTE =
  "STUDIO-OPERATING-DESIGN-MA-001-DISPATCH-HOOK-1 — Owner-independent Machine path. " +
  "Paid ma001CompositionSeal + ma001PostPayDispatchStructure required. " +
  "Purchased member basket is law. Canva not on the fulfillment spine; Make not required; " +
  "Owner routine production NONE.";

export type Ma001TruthMapResult =
  | { ok: true; truth: Ma001PackProjectTruth; structure: Ma001PostPayDispatchStructure }
  | {
      ok: false;
      code:
        | "MISSING_PAYMENT_SEAL"
        | "MISSING_POSTPAY_STRUCTURE"
        | "SEAL_STRUCTURE_MISMATCH"
        | "MISSING_REQUIRED_MATERIAL"
        | "BROKEN_ASSET_REFERENCE"
        | "MISSING_REQUIRED_TRUTH"
        | "UNSUPPORTED_KIND"
        | "MEMBER_COUNT_MISMATCH"
        | "PRODUCER_FAMILY_MISMATCH"
        | "MISSING_PLATE"
        | "SKU_NOT_SUPPORTED"
        | "MA_001_NOT_PAID";
      message: string;
    };

function harborTruthForKind(
  harbor: Ma001PackProjectTruth,
  kind: Ma001SupportedKind,
): Ma001PackProjectTruth["memberTruthById"][string] | null {
  for (const [id, payload] of Object.entries(harbor.memberTruthById)) {
    if (payload.kind === kind) {
      void id;
      return payload;
    }
  }
  return null;
}

/**
 * Build orchestrator input from the paid structure only.
 * Member producer payloads reuse proven Harbor pack producers keyed by kind —
 * member IDs / order / plates / families come exclusively from the paid structure.
 */
export function mapMa001PackProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedLogoRelativePath?: string;
}): Ma001TruthMapResult {
  const record = input.dispatchRecord;
  if (record.skuId !== DESIGN_RENDERER_MA_001_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `ma-001 mapper refuses SKU ${record.skuId}`,
    };
  }

  if (
    !input.campaign.paymentReceivedAt &&
    input.campaign.paymentTruth?.status !== "confirmed"
  ) {
    return {
      ok: false,
      code: "MA_001_NOT_PAID",
      message: "MA_001_NOT_PAID: confirmed payment required before pack dispatch",
    };
  }

  const seal = input.campaign.paymentTruth?.ma001CompositionSeal as
    | Ma001CompositionPaymentSeal
    | undefined;
  if (!seal) {
    return {
      ok: false,
      code: "MISSING_PAYMENT_SEAL",
      message: "MISSING_PAYMENT_SEAL: paymentTruth.ma001CompositionSeal required",
    };
  }

  const structure = input.campaign.ma001PostPayDispatchStructure;
  if (!structure) {
    return {
      ok: false,
      code: "MISSING_POSTPAY_STRUCTURE",
      message:
        "MISSING_POSTPAY_STRUCTURE: campaign.ma001PostPayDispatchStructure required",
    };
  }

  const matched = assertMa001PostPayStructureMatchesPaymentSeal(structure, seal);
  if (!matched.ok) {
    return {
      ok: false,
      code: "SEAL_STRUCTURE_MISMATCH",
      message: matched.message,
    };
  }

  const ready = assertMa001PostPayStructureDispatchReady(structure);
  if (!ready.ok) {
    return {
      ok: false,
      code: ready.code === "MISSING_PLATE" ? "MISSING_PLATE" : "SEAL_STRUCTURE_MISMATCH",
      message: ready.message,
    };
  }

  const logo = resolveApprovedLogoMaterial({
    repoRoot: input.repoRoot,
    items: input.materials,
    skuId: DESIGN_RENDERER_MA_001_SKU,
    stagedLogoRelativePath: input.stagedLogoRelativePath,
  });
  if (!logo.ok) {
    return { ok: false, code: logo.code, message: logo.message };
  }

  const harbor = buildHarborOakMa001MaxMixedPackTruth({
    repoRoot: input.repoRoot,
    campaignId: input.campaign.campaignId,
    jobId: record.jobId,
    dispatchId: record.dispatchId,
  });

  const plannedPackMembers: Ma001PlannedPackMember[] = [];
  const memberTruthById: Ma001PackProjectTruth["memberTruthById"] = {};

  for (const m of structure.members) {
    if (m.kind === "menu") {
      return {
        ok: false,
        code: "UNSUPPORTED_KIND",
        message:
          "UNSUPPORTED_KIND: menu pack member has no sealed pack producer path yet — fail closed (no substitute)",
      };
    }
    const expectedFamily = producerFamilyForKind(m.kind);
    if (m.producerFamily !== expectedFamily) {
      return {
        ok: false,
        code: "PRODUCER_FAMILY_MISMATCH",
        message: `PRODUCER_FAMILY_MISMATCH: ${m.memberId} expected ${expectedFamily}`,
      };
    }
    if (!m.agreedPlateId.trim()) {
      return {
        ok: false,
        code: "MISSING_PLATE",
        message: `MISSING_PLATE: ${m.memberId}`,
      };
    }

    const harborPayload = harborTruthForKind(harbor, m.kind);
    if (!harborPayload) {
      return {
        ok: false,
        code: "UNSUPPORTED_KIND",
        message: `UNSUPPORTED_KIND: no sealed producer payload for kind ${m.kind}`,
      };
    }

    plannedPackMembers.push({
      memberId: m.memberId,
      kind: m.kind,
      order: m.order,
      memberPurpose: m.memberPurpose,
      producerFamily: expectedFamily,
      agreedPlateId: m.agreedPlateId,
    });

    if (harborPayload.kind === "flyer") {
      memberTruthById[m.memberId] = {
        kind: "flyer",
        truth: {
          ...harborPayload.truth,
          campaignId: input.campaign.campaignId,
          jobId: `${record.jobId}::${m.memberId}`,
          dispatchId: `${record.dispatchId}::${m.memberId}`,
        },
      };
    } else if (harborPayload.kind === "business_card") {
      memberTruthById[m.memberId] = {
        kind: "business_card",
        truth: {
          ...harborPayload.truth,
          campaignId: input.campaign.campaignId,
          jobId: `${record.jobId}::${m.memberId}`,
          dispatchId: `${record.dispatchId}::${m.memberId}`,
        },
      };
    } else if (harborPayload.kind === "service_sheet") {
      memberTruthById[m.memberId] = {
        kind: "service_sheet",
        truth: {
          ...harborPayload.truth,
          campaignId: input.campaign.campaignId,
          jobId: `${record.jobId}::${m.memberId}`,
          dispatchId: `${record.dispatchId}::${m.memberId}`,
        },
      };
    } else if (harborPayload.kind === "promotion_graphic") {
      memberTruthById[m.memberId] = {
        kind: "promotion_graphic",
        truth: {
          ...harborPayload.truth,
          assetId: m.memberId,
          authorizedPurpose: m.memberPurpose,
          plateId: m.agreedPlateId as typeof harborPayload.truth.plateId,
        },
      };
    } else {
      return {
        ok: false,
        code: "UNSUPPORTED_KIND",
        message: `UNSUPPORTED_KIND: ${m.kind}`,
      };
    }
  }

  if (plannedPackMembers.length !== structure.lockedPackMemberCount) {
    return {
      ok: false,
      code: "MEMBER_COUNT_MISMATCH",
      message: `MEMBER_COUNT_MISMATCH: mapped ${plannedPackMembers.length} vs locked ${structure.lockedPackMemberCount}`,
    };
  }

  const truth: Ma001PackProjectTruth = {
    campaignId: input.campaign.campaignId,
    jobId: record.jobId,
    dispatchId: record.dispatchId,
    skuId: DESIGN_RENDERER_MA_001_SKU,
    fixtureId: `job-${input.campaign.campaignId}`,
    label: `${harbor.businessName} — ma-001 paid pack`,
    outputMode: "certification_fixture",
    lockedPackMemberCount: structure.lockedPackMemberCount,
    plannedPackMembers,
    campaignFocus: structure.campaignFocus || harbor.campaignFocus,
    businessName: harbor.businessName,
    offerName: harbor.offerName,
    priceDisplay: harbor.priceDisplay,
    memberTruthById,
  };

  return { ok: true, truth, structure };
}
