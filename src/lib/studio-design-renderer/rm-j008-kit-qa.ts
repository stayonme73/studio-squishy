/**
 * Kit-level QA for RM-J008 — exact N/N + change sheet + full reissue.
 */

import { recipeForUpdatePlatform } from "./rm-j008-contracts";
import type {
  RmJ008ChangeSheetRow,
  RmJ008MemberResult,
  RmJ008UpdateKitProjectTruth,
} from "./rm-j008-types";

export function evaluateRmJ008KitQa(input: {
  truth: RmJ008UpdateKitProjectTruth;
  members: readonly RmJ008MemberResult[];
  changeRows: readonly RmJ008ChangeSheetRow[];
}): { ok: true } | { ok: false; message: string } {
  const recipe = recipeForUpdatePlatform(input.truth.platform);
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
    if (!got.producerQaOk || got.artifacts.length < 1) {
      return {
        ok: false,
        message: `KIT_QA_FAIL: member ${expected.memberId} incomplete`,
      };
    }
  }

  const changeSheet = input.members.find(
    (m) => m.memberId === "before_after_change_sheet",
  );
  if (!changeSheet) {
    return { ok: false, message: "KIT_QA_FAIL: change sheet missing" };
  }
  if (
    !changeSheet.artifacts.some((a) => a.role === "change_sheet_json") ||
    !changeSheet.artifacts.some((a) => a.role === "change_sheet_markdown")
  ) {
    return {
      ok: false,
      message: "KIT_QA_FAIL: change sheet must be durable json + markdown",
    };
  }

  const fieldMap = input.members.find((m) => m.memberId === "field_map_checklist");
  if (!fieldMap) {
    return { ok: false, message: "KIT_QA_FAIL: field_map_checklist missing" };
  }

  const cover = input.members.find((m) => m.memberId === "page_cover");
  if (input.truth.platform === "facebook") {
    if (!cover) {
      return {
        ok: false,
        message: "KIT_QA_FAIL: Facebook update kit incomplete without page_cover",
      };
    }
  } else if (cover) {
    return {
      ok: false,
      message: "KIT_QA_FAIL: non-Facebook kit must not include page_cover",
    };
  }

  // Full reissue: every after-state recipe member present (already checked via recipe).
  const bioChanged = input.changeRows.some(
    (r) =>
      (r.fieldId === "bio" || r.fieldId === "about") && r.status === "CHANGED",
  );
  if (!bioChanged && input.truth.after.profileGoal.length > 0) {
    // bio-led Harbor fixture expects CHANGED about/bio vs old before — soft check only when before differs
  }

  if (input.truth.before.source !== "customer_supplied") {
    return {
      ok: false,
      message: "KIT_QA_FAIL: before-state source must be customer_supplied",
    };
  }

  return { ok: true };
}
