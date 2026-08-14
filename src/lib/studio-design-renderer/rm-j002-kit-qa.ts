/**
 * Kit-level QA for RM-J002 — exact N/N + cover rules + durable field-map member.
 */

import type { RmJ002KitProjectTruth, RmJ002MemberResult } from "./rm-j002-types";
import { recipeForPlatform } from "./rm-j002-contracts";

export function evaluateRmJ002KitQa(input: {
  truth: RmJ002KitProjectTruth;
  members: readonly RmJ002MemberResult[];
}): { ok: true } | { ok: false; message: string } {
  const recipe = recipeForPlatform(input.truth.platform);
  if (input.members.length !== recipe.lockedKitMemberCount) {
    return {
      ok: false,
      message: `KIT_QA_FAIL: expected ${recipe.lockedKitMemberCount} members, got ${input.members.length}`,
    };
  }
  for (const expected of recipe.plannedKitMembers) {
    const got = input.members.find((m) => m.memberId === expected.memberId);
    if (!got) {
      return {
        ok: false,
        message: `KIT_QA_FAIL: missing member ${expected.memberId}`,
      };
    }
    if (!got.producerQaOk) {
      return {
        ok: false,
        message: `KIT_QA_FAIL: member QA failed for ${expected.memberId}`,
      };
    }
    if (got.artifacts.length < 1) {
      return {
        ok: false,
        message: `KIT_QA_FAIL: member ${expected.memberId} has no durable artifacts`,
      };
    }
  }

  const fieldMap = input.members.find((m) => m.memberId === "field_map_checklist");
  if (!fieldMap) {
    return { ok: false, message: "KIT_QA_FAIL: field_map_checklist missing" };
  }
  const hasJson = fieldMap.artifacts.some((a) => a.role === "field_map_json");
  const hasMd = fieldMap.artifacts.some((a) => a.role === "field_map_markdown");
  if (!hasJson || !hasMd) {
    return {
      ok: false,
      message:
        "KIT_QA_FAIL: field_map_checklist must be a durable artifact (json + markdown), not invisible metadata",
    };
  }

  const cover = input.members.find((m) => m.memberId === "page_cover");
  if (input.truth.platform === "facebook") {
    if (!cover) {
      return { ok: false, message: "KIT_QA_FAIL: Facebook kit incomplete without page_cover" };
    }
  } else if (cover) {
    return {
      ok: false,
      message: "KIT_QA_FAIL: non-Facebook kit must not include page_cover",
    };
  }

  return { ok: true };
}
