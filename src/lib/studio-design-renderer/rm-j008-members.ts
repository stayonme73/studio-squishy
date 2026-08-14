/**
 * RM-J008 member production — reuse sealed rm-j002 producers for after-state;
 * add change sheet + replacement checklist framing.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { sha256File } from "./bind";
import { produceRmJ002Member } from "./rm-j002-members";
import { RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION } from "./rm-j002-types";
import { mapRmJ008AfterToRmJ002Truth } from "./rm-j008-after-adapter";
import { buildRmJ008ChangeSheetRows } from "./rm-j008-change-sheet";
import type {
  RmJ008ArtifactRef,
  RmJ008ChangeSheetRow,
  RmJ008MemberResult,
  RmJ008PlannedKitMember,
  RmJ008UpdateKitProjectTruth,
} from "./rm-j008-types";

function replacementChecklistRows(input: {
  truth: RmJ008UpdateKitProjectTruth;
  afterCopyText: string;
  changeRows: readonly RmJ008ChangeSheetRow[];
}): readonly { field: string; action: string; value: string }[] {
  const { truth, afterCopyText, changeRows } = input;
  const byId = new Map(changeRows.map((r) => [r.fieldId, r]));
  const rows: { field: string; action: string; value: string }[] = [];

  const display = byId.get("displayName")!;
  rows.push({
    field: "Display name",
    action:
      display.status === "UNCHANGED"
        ? "Leave as-is (UNCHANGED) — confirmed value is still listed below for one complete package"
        : "Replace with this display name",
    value: truth.after.displayName,
  });

  const bioField = truth.platform === "facebook" ? "about" : "bio";
  const bio = byId.get(bioField)!;
  rows.push({
    field: truth.platform === "facebook" ? "About" : "Bio",
    action:
      bio.status === "UNCHANGED"
        ? "Leave as-is (UNCHANGED) — confirmed copy is still listed below for one complete package"
        : "Replace with this text (do not shorten it yourself)",
    value: afterCopyText,
  });

  const website = byId.get("website")!;
  if (truth.after.website.trim().toLowerCase() !== "none") {
    rows.push({
      field: "Website / link",
      action:
        website.status === "UNCHANGED"
          ? "Leave as-is (UNCHANGED) — confirmed link is still listed below for one complete package"
          : "Replace with this website link",
      value: truth.after.website,
    });
  }

  const phone = byId.get("phone")!;
  if (truth.after.phone.trim().toLowerCase() !== "none") {
    rows.push({
      field: "Phone / contact",
      action:
        phone.status === "UNCHANGED"
          ? "Leave as-is (UNCHANGED) — confirmed number is still listed below for one complete package"
          : "Replace with this contact number",
      value: truth.after.phone,
    });
  }

  const avatar = byId.get("profile_image")!;
  rows.push({
    field: "Profile image",
    action:
      avatar.status === "UNCHANGED"
        ? "Leave as-is (UNCHANGED) — do not replace your current profile image"
        : "Replace by uploading the profile image included with this kit",
    value:
      avatar.status === "UNCHANGED"
        ? "No upload needed — a profile image file is still included only so this Update Kit stays complete"
        : "Use the profile image file in this kit",
  });

  if (truth.platform === "facebook") {
    const cover = byId.get("page_cover")!;
    rows.push({
      field: "Cover / banner",
      action:
        cover.status === "UNCHANGED"
          ? "Leave as-is (UNCHANGED) — do not replace your current Page cover"
          : "Replace by uploading the Facebook Page cover included with this kit",
      value:
        cover.status === "UNCHANGED"
          ? "No upload needed — a Page cover file is still included only so this Update Kit stays complete"
          : "Use the Page cover file in this kit",
    });
  }

  rows.push({
    field: "Save changes",
    action: "Save your changes on the platform when you are ready",
    value: "You apply this step — The Studio does not log in or publish",
  });

  return rows;
}

async function produceReplacementChecklist(input: {
  repoRoot: string;
  truth: RmJ008UpdateKitProjectTruth;
  planned: RmJ008PlannedKitMember;
  memberDirRel: string;
  afterCopyText: string;
  changeRows: readonly RmJ008ChangeSheetRow[];
}): Promise<
  | { ok: true; member: RmJ008MemberResult }
  | { ok: false; failureCode: string; message: string }
> {
  const absDir = path.join(input.repoRoot, input.memberDirRel);
  mkdirSync(absDir, { recursive: true });
  const rows = replacementChecklistRows({
    truth: input.truth,
    afterCopyText: input.afterCopyText,
    changeRows: input.changeRows,
  });
  const payload = {
    memberId: "field_map_checklist",
    kind: "field_map_package",
    platform: input.truth.platform,
    mode: "update",
    durableMember: true,
    customerApplies: true,
    accountMutation: false,
    presentationVersion: RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
    rows,
  };
  const jsonRel = `${input.memberDirRel}/field-map-checklist.json`;
  const mdRel = `${input.memberDirRel}/field-map-checklist.md`;
  const md = [
    `# ${input.truth.after.businessName} — ${input.truth.platform} update checklist`,
    "",
    "Customer applies every row on the platform. The Studio does not log in or publish.",
    "Rows marked UNCHANGED still include the matching kit files so you receive one complete package.",
    "",
    ...rows.map((r, i) => `${i + 1}. **${r.field}** — ${r.action}: ${r.value}`),
    "",
  ].join("\n");
  writeFileSync(
    path.join(input.repoRoot, jsonRel),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(path.join(input.repoRoot, mdRel), md, "utf8");
  const artifacts: RmJ008ArtifactRef[] = [
    {
      role: "field_map_json",
      relativePath: jsonRel,
      contentSha256: sha256File(path.join(input.repoRoot, jsonRel)),
    },
    {
      role: "field_map_markdown",
      relativePath: mdRel,
      contentSha256: sha256File(path.join(input.repoRoot, mdRel)),
    },
  ];
  const producerQaOk =
    rows.length >= 3 &&
    rows.some((r) => /profile image/i.test(r.field)) &&
    (input.truth.platform !== "facebook" ||
      rows.some((r) => /cover/i.test(r.field)));
  if (!producerQaOk) {
    return {
      ok: false,
      failureCode: "FIELD_MAP_QA_FAIL",
      message: "FIELD_MAP_QA_FAIL: replacement checklist incomplete",
    };
  }
  return {
    ok: true,
    member: {
      memberId: input.planned.memberId,
      kind: input.planned.kind,
      order: input.planned.order,
      memberPurpose: input.planned.memberPurpose,
      producerQaOk: true,
      artifacts,
    },
  };
}

async function produceChangeSheetMember(input: {
  repoRoot: string;
  truth: RmJ008UpdateKitProjectTruth;
  planned: RmJ008PlannedKitMember;
  memberDirRel: string;
  changeRows: readonly RmJ008ChangeSheetRow[];
}): Promise<
  | { ok: true; member: RmJ008MemberResult }
  | { ok: false; failureCode: string; message: string }
> {
  const absDir = path.join(input.repoRoot, input.memberDirRel);
  mkdirSync(absDir, { recursive: true });
  const payload = {
    memberId: "before_after_change_sheet",
    kind: "field_map_package",
    platform: input.truth.platform,
    beforeStateSource: input.truth.before.source,
    customerApplies: true,
    accountMutation: false,
    comparisonBasis:
      "authoritative_before_state_vs_approved_after_state_not_artifact_hashes",
    reviewedBeforeSummary: {
      displayName: input.truth.before.displayName,
      bioOrAbout: input.truth.before.bioOrAbout,
      website: input.truth.before.website,
      phone: input.truth.before.phone,
      profileImageNote: input.truth.before.profileImageNote,
      pageCoverNote: input.truth.before.pageCoverNote ?? null,
    },
    rows: input.changeRows,
  };
  const jsonRel = `${input.memberDirRel}/before-after-change-sheet.json`;
  const mdRel = `${input.memberDirRel}/before-after-change-sheet.md`;
  const md = [
    `# ${input.truth.after.businessName} — before → after change sheet`,
    "",
    `Platform: **${input.truth.platform}**`,
    "Current-profile details below came from what you provided. The Studio does not log in or scrape your account.",
    "",
    "## What is on the profile now",
    "",
    `- Display name: ${input.truth.before.displayName}`,
    `- Bio/about: ${input.truth.before.bioOrAbout}`,
    `- Website: ${input.truth.before.website}`,
    `- Phone: ${input.truth.before.phone}`,
    `- Avatar note: ${input.truth.before.profileImageNote}`,
    ...(input.truth.platform === "facebook"
      ? [`- Page cover note: ${input.truth.before.pageCoverNote}`]
      : []),
    "",
    "## Field changes",
    "",
    "| Field | Before | After | Status |",
    "|-------|--------|-------|--------|",
    ...input.changeRows.map(
      (r) =>
        `| ${r.fieldLabel} | ${r.beforeValue.replace(/\|/g, "/")} | ${r.afterValue.replace(/\|/g, "/")} | **${r.status}** |`,
    ),
    "",
    "Each status compares what you told us is on the profile now with the approved after version in this kit.",
    "UNCHANGED items are still included in this Update Kit so you receive one complete package to apply.",
    "",
  ].join("\n");
  writeFileSync(
    path.join(input.repoRoot, jsonRel),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(path.join(input.repoRoot, mdRel), md, "utf8");

  const hasBioRow = input.changeRows.some(
    (r) => r.fieldId === "bio" || r.fieldId === "about",
  );
  const hasAvatar = input.changeRows.some((r) => r.fieldId === "profile_image");
  const coverRow = input.changeRows.find((r) => r.fieldId === "page_cover");
  const coverOk =
    input.truth.platform === "facebook"
      ? coverRow?.status === "CHANGED" || coverRow?.status === "UNCHANGED"
      : coverRow?.status === "NOT_APPLICABLE";
  if (!hasBioRow || !hasAvatar || !coverOk) {
    return {
      ok: false,
      failureCode: "CHANGE_SHEET_QA_FAIL",
      message: "CHANGE_SHEET_QA_FAIL: incomplete authoritative field rows",
    };
  }

  const artifacts: RmJ008ArtifactRef[] = [
    {
      role: "change_sheet_json",
      relativePath: jsonRel,
      contentSha256: sha256File(path.join(input.repoRoot, jsonRel)),
    },
    {
      role: "change_sheet_markdown",
      relativePath: mdRel,
      contentSha256: sha256File(path.join(input.repoRoot, mdRel)),
    },
  ];
  return {
    ok: true,
    member: {
      memberId: input.planned.memberId,
      kind: input.planned.kind,
      order: input.planned.order,
      memberPurpose: input.planned.memberPurpose,
      producerQaOk: true,
      artifacts,
    },
  };
}

export async function produceRmJ008Member(input: {
  repoRoot: string;
  truth: RmJ008UpdateKitProjectTruth;
  planned: RmJ008PlannedKitMember;
  memberDirRel: string;
  changeRows: readonly RmJ008ChangeSheetRow[];
  afterCopyText: string;
}): Promise<
  | { ok: true; member: RmJ008MemberResult }
  | { ok: false; failureCode: string; message: string }
> {
  const { planned, truth } = input;

  if (planned.memberId === "before_after_change_sheet") {
    return produceChangeSheetMember({
      repoRoot: input.repoRoot,
      truth,
      planned,
      memberDirRel: input.memberDirRel,
      changeRows: input.changeRows,
    });
  }

  if (planned.memberId === "field_map_checklist") {
    return produceReplacementChecklist({
      repoRoot: input.repoRoot,
      truth,
      planned,
      memberDirRel: input.memberDirRel,
      afterCopyText: input.afterCopyText,
      changeRows: input.changeRows,
    });
  }

  // After-state copy / avatar / cover — sealed rm-j002 producers.
  const afterTruth = mapRmJ008AfterToRmJ002Truth(truth);
  const rmPlanned = afterTruth.plannedKitMembers.find(
    (m) => m.memberId === planned.memberId,
  );
  if (!rmPlanned) {
    return {
      ok: false,
      failureCode: "MEMBERSHIP_MISMATCH",
      message: `MEMBERSHIP_MISMATCH: sealed recipe missing ${planned.memberId}`,
    };
  }
  const produced = await produceRmJ002Member({
    repoRoot: input.repoRoot,
    truth: afterTruth,
    planned: rmPlanned,
    memberDirRel: input.memberDirRel,
  });
  if (!produced.ok) {
    return produced;
  }
  const change =
    input.changeRows.find((r) => r.memberId === planned.memberId)?.status ??
    undefined;
  return {
    ok: true,
    member: {
      ...produced.member,
      memberId: planned.memberId,
      kind: planned.kind,
      order: planned.order,
      memberPurpose: planned.memberPurpose,
      changeStatus: change,
      artifacts: produced.member.artifacts,
    },
  };
}

export { buildRmJ008ChangeSheetRows };
