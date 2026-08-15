/**
 * RM-J007 package QA — reference present, bounded change applied, honesty, Canva OFF.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import { hasAtLeastOneBoundedChange } from "./rm-j007-contracts";
import { RM_J007_HONESTY_LINE } from "./rm-j007-types";
import type {
  RmJ007MemberResult,
  RmJ007UpdateProjectTruth,
} from "./rm-j007-types";

export function evaluateRmJ007PackageQa(input: {
  repoRoot: string;
  truth: RmJ007UpdateProjectTruth;
  members: readonly RmJ007MemberResult[];
  canvaUsed: boolean;
}): { ok: true } | { ok: false; message: string } {
  const { truth, members, repoRoot, canvaUsed } = input;

  if (canvaUsed !== false) {
    return { ok: false, message: "PACKAGE_QA_FAIL: canvaUsed must be false" };
  }

  if (members.length !== 1) {
    return { ok: false, message: "PACKAGE_QA_FAIL: expected exactly 1 member" };
  }
  const member = members[0]!;
  if (member.memberId !== "updated_promotion") {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: memberId must be updated_promotion",
    };
  }
  if (!member.producerQaOk) {
    return { ok: false, message: "PACKAGE_QA_FAIL: member producer QA failed" };
  }

  if (!truth.referenceMaterial?.relativePath) {
    return { ok: false, message: "PACKAGE_QA_FAIL: reference material missing" };
  }
  const refAbs = path.join(repoRoot, truth.referenceMaterial.relativePath);
  if (!existsSync(refAbs)) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: reference file not present on disk",
    };
  }

  if (!hasAtLeastOneBoundedChange(truth.boundedChanges)) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: no bounded change applied in truth",
    };
  }

  const htmlArt = member.artifacts.find((a) => a.role === "update_html");
  if (!htmlArt) {
    return { ok: false, message: "PACKAGE_QA_FAIL: update_html missing" };
  }
  const html = readFileSync(path.join(repoRoot, htmlArt.relativePath), "utf8");

  if (!html.includes(RM_J007_HONESTY_LINE)) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: honesty line missing from HTML",
    };
  }
  if (!html.includes(truth.businessName) && !html.includes(truth.businessName.replace(/&/g, "&amp;"))) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: business name missing from HTML",
    };
  }

  const appliedValues = [
    truth.boundedChanges.dates,
    truth.boundedChanges.prices,
    truth.boundedChanges.contact,
    truth.boundedChanges.wording,
    truth.boundedChanges.remove,
  ].filter((v): v is string => Boolean(v?.trim()));

  const anyApplied = appliedValues.some((v) => html.includes(v.trim()));
  if (!anyApplied) {
    return {
      ok: false,
      message:
        "PACKAGE_QA_FAIL: at least one bounded change must appear in HTML",
    };
  }

  if (!member.artifacts.some((a) => a.role === "update_png")) {
    return { ok: false, message: "PACKAGE_QA_FAIL: update_png missing" };
  }
  if (!member.artifacts.some((a) => a.role === "update_pdf")) {
    return { ok: false, message: "PACKAGE_QA_FAIL: update_pdf missing" };
  }
  if (!member.artifacts.some((a) => a.role === "reference_before_png")) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: reference_before_png missing",
    };
  }
  if (!member.artifacts.some((a) => a.role === "change_request_json")) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: change_request_json missing",
    };
  }

  return { ok: true };
}
