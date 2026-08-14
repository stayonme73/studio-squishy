/**
 * Before→after change sheet — compares authoritative before-state values to
 * approved after-state values (and Studio-written after copy). Not a filename
 * or artifact-hash diff.
 */

import { writeScopedProfileCopy } from "./rm-j002-members";
import { mapRmJ008AfterToRmJ002Truth } from "./rm-j008-after-adapter";
import type {
  RmJ008ChangeSheetRow,
  RmJ008UpdateKitProjectTruth,
} from "./rm-j008-types";

function norm(value: string): string {
  const v = value.trim();
  const lower = v.toLowerCase();
  if (
    lower === "" ||
    lower === "none" ||
    lower === "n/a" ||
    lower === "blank" ||
    lower === "unknown / blank"
  ) {
    return "none";
  }
  return v;
}

function statusForText(before: string, after: string): "CHANGED" | "UNCHANGED" {
  return norm(before) === norm(after) ? "UNCHANGED" : "CHANGED";
}

/**
 * Build change-sheet rows from locked before + approved after (+ derived copy).
 * Avatar/cover status uses explicit after actions — never artifact hashes.
 */
export function buildRmJ008ChangeSheetRows(
  truth: RmJ008UpdateKitProjectTruth,
):
  | { ok: true; rows: readonly RmJ008ChangeSheetRow[]; afterCopyText: string }
  | { ok: false; message: string } {
  const afterTruth = mapRmJ008AfterToRmJ002Truth(truth);
  const copy = writeScopedProfileCopy(afterTruth);
  if (!copy.ok) {
    return { ok: false, message: copy.message };
  }

  const rows: RmJ008ChangeSheetRow[] = [];

  rows.push({
    fieldId: "displayName",
    fieldLabel: "Display name",
    beforeValue: truth.before.displayName,
    afterValue: truth.after.displayName,
    status: statusForText(truth.before.displayName, truth.after.displayName),
    note: "Compare customer-supplied before display name to approved after display name.",
  });

  rows.push({
    fieldId: copy.field,
    fieldLabel: truth.platform === "facebook" ? "About" : "Bio",
    beforeValue: truth.before.bioOrAbout,
    afterValue: copy.text,
    status: statusForText(truth.before.bioOrAbout, copy.text),
    memberId:
      truth.platform === "facebook" ? "bio_about_copy" : "bio_profile_copy",
    note: "Compare customer-supplied before bio/about to Studio-written revised after copy (not artifact hashes).",
  });

  rows.push({
    fieldId: "website",
    fieldLabel: "Website / link",
    beforeValue: truth.before.website,
    afterValue: truth.after.website,
    status: statusForText(truth.before.website, truth.after.website),
    note: "Compare customer-supplied before URL to approved after URL.",
  });

  rows.push({
    fieldId: "phone",
    fieldLabel: "Phone / contact",
    beforeValue: truth.before.phone,
    afterValue: truth.after.phone,
    status: statusForText(truth.before.phone, truth.after.phone),
    note: "Compare customer-supplied before phone to approved after phone.",
  });

  rows.push({
    fieldId: "profile_image",
    fieldLabel: "Profile image / avatar",
    beforeValue: truth.before.profileImageNote,
    afterValue:
      truth.after.avatarAction === "replace"
        ? "New profile image from your approved brand materials (included in this kit)"
        : "Keep your current look — this kit still includes a profile image file so the package is complete",
    status: truth.after.avatarAction === "replace" ? "CHANGED" : "UNCHANGED",
    memberId: "profile_image",
    note: "Status follows the approved update decision. The profile image member is always included in the kit.",
  });

  if (truth.platform === "facebook") {
    rows.push({
      fieldId: "page_cover",
      fieldLabel: "Facebook Page cover",
      beforeValue: truth.before.pageCoverNote ?? "none",
      afterValue:
        truth.after.coverAction === "replace"
          ? "New Page cover from your approved brand materials (included in this kit)"
          : "Keep your current look — this kit still includes a Page cover file so the package is complete",
      status: truth.after.coverAction === "replace" ? "CHANGED" : "UNCHANGED",
      memberId: "page_cover",
      note: "Status follows the approved update decision. The Page cover member is always included for Facebook.",
    });
  } else {
    rows.push({
      fieldId: "page_cover",
      fieldLabel: "Cover / banner",
      beforeValue: "Not used on this platform",
      afterValue: "Not used on this platform",
      status: "NOT_APPLICABLE",
      note: "Instagram and TikTok kits do not include a profile cover.",
    });
  }

  return { ok: true, rows, afterCopyText: copy.text };
}
