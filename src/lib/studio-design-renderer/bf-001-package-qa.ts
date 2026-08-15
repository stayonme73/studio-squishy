/**
 * BF-001 package QA — member + package gates from CONTRACT-TRUTH-1.
 */

import { readFileSync } from "fs";
import path from "path";

import { isBf001StudioSafeFont } from "./bf-001-contracts";
import type {
  Bf001MemberResult,
  Bf001RefreshProjectTruth,
} from "./bf-001-types";

export function evaluateBf001PackageQa(input: {
  repoRoot: string;
  truth: Bf001RefreshProjectTruth;
  members: readonly Bf001MemberResult[];
}): { ok: true } | { ok: false; message: string } {
  const { truth, members, repoRoot } = input;

  if (members.length !== 2) {
    return { ok: false, message: "PACKAGE_QA_FAIL: expected exactly 2 members" };
  }
  if (!members.every((m) => m.producerQaOk)) {
    return { ok: false, message: "PACKAGE_QA_FAIL: member producer QA failed" };
  }

  const sheet = members.find((m) => m.memberId === "brand_direction_sheet");
  const graphic = members.find((m) => m.memberId === "profile_or_cover_graphic");
  if (!sheet || !graphic) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: sheet and graphic members required (2/2)",
    };
  }

  const sheetHtmlArt = sheet.artifacts.find((a) => a.role === "sheet_html");
  if (!sheetHtmlArt) {
    return { ok: false, message: "PACKAGE_QA_FAIL: sheet HTML missing" };
  }
  const sheetHtml = readFileSync(
    path.join(repoRoot, sheetHtmlArt.relativePath),
    "utf8",
  );

  if (!/Brand Direction Sheet/i.test(sheetHtml)) {
    return { ok: false, message: "PACKAGE_QA_FAIL: sheet title missing" };
  }
  if (!/recommendation/i.test(sheetHtml)) {
    return {
      ok: false,
      message:
        "PACKAGE_QA_FAIL: font section must label recommendations (not guarantees)",
    };
  }
  if (!/HEX|#[0-9A-Fa-f]{6}/i.test(sheetHtml)) {
    return { ok: false, message: "PACKAGE_QA_FAIL: HEX palette missing on sheet" };
  }
  if (!/clear space|usage/i.test(sheetHtml)) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: logo usage rules missing on sheet",
    };
  }
  if (/new logo from scratch|rename your business|tagline options/i.test(sheetHtml)) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: sheet contains forbidden branding-from-scratch copy",
    };
  }
  // Recommendation fonts must not claim they are rendered on the graphic.
  if (/this graphic (uses|embeds|renders) Playfair/i.test(sheetHtml)) {
    return {
      ok: false,
      message:
        "PACKAGE_QA_FAIL: sheet must not claim recommended fonts are rendered on the graphic",
    };
  }

  if (!isBf001StudioSafeFont(truth.graphicRenderFontFamily)) {
    return {
      ok: false,
      message: "PACKAGE_QA_FAIL: graphic render font is not Studio-safe",
    };
  }

  const graphicHtmlRole =
    truth.graphicKind === "profile" ? "avatar_html" : "cover_html";
  const graphicHtmlArt = graphic.artifacts.find((a) => a.role === graphicHtmlRole);
  if (!graphicHtmlArt) {
    return { ok: false, message: `PACKAGE_QA_FAIL: ${graphicHtmlRole} missing` };
  }
  const graphicHtml = readFileSync(
    path.join(repoRoot, graphicHtmlArt.relativePath),
    "utf8",
  );
  if (!/data:image\/svg\+xml;base64,/.test(graphicHtml)) {
    return {
      ok: false,
      message:
        "PACKAGE_QA_FAIL: graphic must place supplied logo as image (no redraw)",
    };
  }
  if (/Playfair Display|Source Sans/i.test(graphicHtml)) {
    return {
      ok: false,
      message:
        "PACKAGE_QA_FAIL: graphic must not use recommendation-only fonts as render fonts",
    };
  }

  const pngRole = truth.graphicKind === "profile" ? "avatar_png" : "cover_png";
  if (!graphic.artifacts.some((a) => a.role === pngRole)) {
    return { ok: false, message: `PACKAGE_QA_FAIL: ${pngRole} missing` };
  }
  if (!sheet.artifacts.some((a) => a.role === "sheet_png")) {
    return { ok: false, message: "PACKAGE_QA_FAIL: sheet_png missing" };
  }
  if (!sheet.artifacts.some((a) => a.role === "sheet_pdf")) {
    return { ok: false, message: "PACKAGE_QA_FAIL: sheet_pdf missing" };
  }

  return { ok: true };
}
