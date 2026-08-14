/**
 * Pack-level QA — member identities, composition, cross-member campaign consistency.
 */

import type { Ma001MemberResult, Ma001PackProjectTruth } from "./ma-001-types";
import { isMa001SupportedKind } from "./ma-001-contracts";

export type Ma001PackQaResult =
  | { ok: true; summary: string }
  | {
      ok: false;
      code:
        | "PACK_QA_FAILURE"
        | "PARTIAL_PACK_FAILURE"
        | "MANIFEST_INCOMPLETE"
        | "WRONG_KIND"
        | "WRONG_PLATE";
      message: string;
    };

export function evaluateMa001PackQa(input: {
  truth: Ma001PackProjectTruth;
  members: readonly Ma001MemberResult[];
}): Ma001PackQaResult {
  const { truth, members } = input;
  const n = truth.lockedPackMemberCount;

  if (members.length !== n) {
    return {
      ok: false,
      code: "PARTIAL_PACK_FAILURE",
      message: `Pack member results ${members.length} !== lockedPackMemberCount ${n}`,
    };
  }

  for (const planned of truth.plannedPackMembers) {
    const got = members.find((m) => m.memberId === planned.memberId);
    if (!got) {
      return {
        ok: false,
        code: "PARTIAL_PACK_FAILURE",
        message: `Missing member result for ${planned.memberId}`,
      };
    }
    if (got.kind !== planned.kind) {
      return {
        ok: false,
        code: "WRONG_KIND",
        message: `Member ${planned.memberId}: expected kind ${planned.kind}, got ${got.kind}`,
      };
    }
    if (got.order !== planned.order) {
      return {
        ok: false,
        code: "PACK_QA_FAILURE",
        message: `Member ${planned.memberId}: order mismatch`,
      };
    }
    if (got.producerFamily !== planned.producerFamily) {
      return {
        ok: false,
        code: "PACK_QA_FAILURE",
        message: `Member ${planned.memberId}: producerFamily mismatch`,
      };
    }
    if (!got.producerQaOk) {
      return {
        ok: false,
        code: "PARTIAL_PACK_FAILURE",
        message: `Member ${planned.memberId} producer QA failed`,
      };
    }
    if (!got.artifacts.length) {
      return {
        ok: false,
        code: "MANIFEST_INCOMPLETE",
        message: `Member ${planned.memberId} has no artifacts`,
      };
    }
    for (const a of got.artifacts) {
      if (!a.relativePath || !a.contentSha256) {
        return {
          ok: false,
          code: "MANIFEST_INCOMPLETE",
          message: `Member ${planned.memberId} artifact missing path/hash`,
        };
      }
    }
    if (planned.agreedPlateId && got.agreedPlateId !== planned.agreedPlateId) {
      return {
        ok: false,
        code: "WRONG_PLATE",
        message: `Member ${planned.memberId}: expected plate ${planned.agreedPlateId}, got ${got.agreedPlateId}`,
      };
    }
    if (!isMa001SupportedKind(got.kind)) {
      return {
        ok: false,
        code: "WRONG_KIND",
        message: `Unsupported kind slipped into results: ${got.kind}`,
      };
    }
  }

  // Cross-member brand/campaign consistency (same pack focus).
  const names = new Set(
    Object.values(truth.memberTruthById).map((p) => {
      if (p.kind === "flyer") return p.truth.businessName;
      if (p.kind === "business_card") return p.truth.businessName;
      if (p.kind === "service_sheet") return p.truth.businessName;
      if (p.kind === "promotion_graphic") return p.truth.businessName;
      return "";
    }),
  );
  if (names.size !== 1 || ![...names][0]) {
    return {
      ok: false,
      code: "PACK_QA_FAILURE",
      message: "Cross-member businessName contradiction",
    };
  }
  if ([...names][0] !== truth.businessName) {
    return {
      ok: false,
      code: "PACK_QA_FAILURE",
      message: "Member businessName does not match pack businessName",
    };
  }

  // Artifact multiplicity must not inflate member count (structural check).
  const artifactTotal = members.reduce((s, m) => s + m.artifacts.length, 0);
  if (artifactTotal < n) {
    return {
      ok: false,
      code: "MANIFEST_INCOMPLETE",
      message: "Fewer artifacts than members",
    };
  }

  return {
    ok: true,
    summary: `Pack QA pass: ${n} members, ${artifactTotal} artifacts (member≠file), campaign="${truth.campaignFocus}"`,
  };
}
