/**
 * RM-J002 member producers — copy, field-map (durable), avatar, Facebook cover.
 * No Canva. No account mutation. Kit delivery artifacts only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { FACEBOOK_ABOUT_MAX_CHARS } from "@/lib/studio-kitchen-production/social-profile/capability";
import { facebookAboutFits } from "@/lib/studio-kitchen-production/social-profile/copy";

import { sha256File } from "./bind";
import { captureFlyerExports } from "./capture";
import { ensureHarborOakRmJ002LogoMaterial } from "./rm-j002-fixtures";
import {
  RM_J002_AVATAR_VISUAL_VERSION,
  RM_J002_COVER_VISUAL_VERSION,
  RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
  type RmJ002ArtifactRef,
  type RmJ002KitProjectTruth,
  type RmJ002MemberResult,
  type RmJ002PlannedKitMember,
} from "./rm-j002-types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Studio-written scoped profile copy from approved customer facts.
 * Speaks as the business to a customer — not as an internal assignment brief.
 * Platform variants must differ (Instagram ≠ TikTok by default).
 * No silent truncation for Facebook about length.
 */
export function writeScopedProfileCopy(
  truth: RmJ002KitProjectTruth,
): { ok: true; text: string; field: string } | { ok: false; message: string } {
  const offering = customerFacingOfferingPhrase(truth.profileGoal);
  const cta = discoveryCallCta(truth.profileGoal);

  if (truth.platform === "facebook") {
    // Page About — business-named Page voice; Meta length honesty; no silent truncation.
    let about = `${truth.businessName} — ${offering}. ${cta}`;
    if (!facebookAboutFits(about)) {
      about = `${offering}. ${cta}`;
    }
    if (!facebookAboutFits(about)) {
      about = `${offering}. Book a discovery call.`;
    }
    if (!facebookAboutFits(about)) {
      about = "Calm portrait photography. Book a discovery call.";
    }
    if (!facebookAboutFits(about)) {
      return {
        ok: false,
        message: `COPY_QA_FAIL: Facebook about exceeds ${FACEBOOK_ABOUT_MAX_CHARS} chars — return to copy correction (no silent truncation)`,
      };
    }
    return { ok: true, text: about, field: "about" };
  }

  if (truth.platform === "instagram") {
    // Instagram bio — full offering + CTA; website stays a separate checklist field.
    const bio = `${offering}. ${cta}`;
    return { ok: true, text: bio, field: "bio" };
  }

  // TikTok — shorter, punchier line; not an Instagram twin (platform-tailored by default).
  const shortOffering = offering
    .replace(/^Calm,\s+timeless\s+portrait\s+photography$/i, "Calm portraits")
    .replace(/\bportrait photography\b/i, "portraits");
  const bio = `${shortOffering}. ${cta}`;
  return { ok: true, text: bio, field: "bio" };
}

/** Turn intake goal language into customer-facing offering words (no "Show a…" brief voice). */
function customerFacingOfferingPhrase(profileGoal: string): string {
  let g = profileGoal.trim();
  g = g.replace(/^show\s+a\s+/i, "");
  g = g.replace(/^show\s+an\s+/i, "");
  g = g.replace(/^show\s+/i, "");
  // Drop trailing production CTA clauses; CTA handled separately.
  g = g.replace(
    /\s+that\s+books?\s+(a\s+)?discovery\s+calls?\.?$/i,
    "",
  );
  g = g.replace(/\s+to\s+book\s+(a\s+)?discovery\s+calls?\.?$/i, "");
  g = g.replace(/\.$/, "");
  // Harbor fixture: "calm portrait photography studio" → business offering.
  g = g.replace(/\bstudio\b$/i, "").trim();
  if (/calm.*portrait/i.test(g)) {
    return "Calm, timeless portrait photography";
  }
  if (g.length > 0) {
    return g.charAt(0).toUpperCase() + g.slice(1);
  }
  return "Portrait photography";
}

function discoveryCallCta(profileGoal: string): string {
  if (/discovery\s+call/i.test(profileGoal) || /book/i.test(profileGoal)) {
    return "Book a discovery call.";
  }
  return "Get in touch.";
}

function customerFacingChecklistRows(input: {
  truth: RmJ002KitProjectTruth;
  copyText: string;
  copyField: string;
}): readonly { field: string; action: string; value: string }[] {
  const { truth, copyText, copyField } = input;
  const rows: { field: string; action: string; value: string }[] = [];
  if (truth.displayName) {
    rows.push({
      field: "Display name",
      action: "Enter this display name",
      value: truth.displayName,
    });
  }
  if (truth.platform === "facebook") {
    rows.push({
      field: "About",
      action: "Paste this About text (do not shorten it yourself)",
      value: copyText,
    });
  } else {
    rows.push({
      field: "Bio",
      action: "Paste this bio (do not shorten it yourself)",
      value: copyText,
    });
  }
  if (truth.website) {
    rows.push({
      field: "Website / link",
      action: "Enter this website link",
      value: truth.website,
    });
  }
  if (truth.phone) {
    rows.push({
      field: "Phone / contact",
      action: "Enter this contact number",
      value: truth.phone,
    });
  }
  rows.push({
    field: "Profile image",
    action: "Upload the profile image included with this kit",
    value: "profile_image (avatar.png)",
  });
  if (truth.platform === "facebook") {
    rows.push({
      field: "Cover / banner",
      action: "Upload the Facebook Page cover included with this kit",
      value: "page_cover (page-cover.png)",
    });
  }
  rows.push({
    field: "Save changes",
    action: "Save your changes on the platform when you are ready",
    value: "You apply this step — The Studio does not log in or publish",
  });
  void copyField;
  return rows;
}

export async function produceRmJ002Member(input: {
  repoRoot: string;
  truth: RmJ002KitProjectTruth;
  planned: RmJ002PlannedKitMember;
  memberDirRel: string;
}): Promise<
  | { ok: true; member: RmJ002MemberResult }
  | { ok: false; failureCode: string; message: string }
> {
  const absDir = path.join(input.repoRoot, input.memberDirRel);
  mkdirSync(absDir, { recursive: true });
  const { planned, truth } = input;

  if (planned.kind === "copy") {
    const copy = writeScopedProfileCopy(truth);
    if (!copy.ok) {
      return { ok: false, failureCode: "COPY_QA_FAIL", message: copy.message };
    }
    const payload = {
      memberId: planned.memberId,
      kind: "copy",
      platform: truth.platform,
      field: copy.field,
      studioWritten: true,
      text: copy.text,
      customerApplies: true,
      accountMutation: false,
      presentationVersion: RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
    };
    const jsonRel = `${input.memberDirRel}/copy.json`;
    const txtRel = `${input.memberDirRel}/copy-paste-ready.txt`;
    writeFileSync(
      path.join(input.repoRoot, jsonRel),
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
    writeFileSync(path.join(input.repoRoot, txtRel), `${copy.text}\n`, "utf8");
    const artifacts: RmJ002ArtifactRef[] = [
      {
        role: "copy_json",
        relativePath: jsonRel,
        contentSha256: sha256File(path.join(input.repoRoot, jsonRel)),
      },
      {
        role: "copy_paste_ready",
        relativePath: txtRel,
        contentSha256: sha256File(path.join(input.repoRoot, txtRel)),
      },
    ];
    return {
      ok: true,
      member: {
        memberId: planned.memberId,
        kind: planned.kind,
        order: planned.order,
        memberPurpose: planned.memberPurpose,
        producerQaOk: copy.text.trim().length > 0,
        artifacts,
      },
    };
  }

  if (planned.kind === "field_map_package") {
    const copy = writeScopedProfileCopy(truth);
    if (!copy.ok) {
      return { ok: false, failureCode: "COPY_QA_FAIL", message: copy.message };
    }
    const rows = customerFacingChecklistRows({
      truth,
      copyText: copy.text,
      copyField: copy.field,
    });

    const payload = {
      memberId: "field_map_checklist",
      kind: "field_map_package",
      platform: truth.platform,
      durableMember: true,
      customerApplies: true,
      accountMutation: false,
      publishSaveIsCustomerAction: true,
      presentationVersion: RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
      rows,
    };
    const jsonRel = `${input.memberDirRel}/field-map-checklist.json`;
    const mdRel = `${input.memberDirRel}/field-map-checklist.md`;
    const md = [
      `# ${truth.businessName} — ${truth.platform} setup checklist`,
      "",
      "Customer applies every row on the platform. Studio does not log in or publish.",
      "",
      ...rows.map((r, i) => `${i + 1}. **${r.field}** — ${r.action}: ${r.value}`),
      ...(truth.platform === "facebook"
        ? [
            "",
            "Cover tip: Keep important cover art away from the lower-left area — your profile picture overlaps that corner on Facebook. Desktop and mobile crop the cover differently, so keep the main message toward the center.",
          ]
        : []),
      "",
    ].join("\n");
    writeFileSync(
      path.join(input.repoRoot, jsonRel),
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
    writeFileSync(path.join(input.repoRoot, mdRel), md, "utf8");
    const artifacts: RmJ002ArtifactRef[] = [
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
    const serialized = `${JSON.stringify(rows)}\n${md}`;
    const producerQaOk =
      rows.length >= 3 &&
      rows.some((r) => /profile image/i.test(r.field)) &&
      (truth.platform !== "facebook" ||
        rows.some((r) => /cover/i.test(r.field))) &&
      !/\[profile asset/i.test(serialized) &&
      !/\[cover asset/i.test(serialized) &&
      !/`Customer action`/i.test(serialized) &&
      !/\bCustomer action\b/i.test(
        rows.map((r) => `${r.action} ${r.value}`).join("\n"),
      );
    if (!producerQaOk) {
      return {
        ok: false,
        failureCode: "FIELD_MAP_QA_FAIL",
        message:
          "FIELD_MAP_QA_FAIL: checklist missing required rows or still has internal placeholders",
      };
    }
    return {
      ok: true,
      member: {
        memberId: planned.memberId,
        kind: planned.kind,
        order: planned.order,
        memberPurpose: planned.memberPurpose,
        producerQaOk: true,
        artifacts,
      },
    };
  }

  if (planned.kind === "design_avatar") {
    const w = RM_J002_AVATAR_PLATE.widthPx;
    const h = RM_J002_AVATAR_PLATE.heightPx;
    // Brand mark does the recognition work at tiny circle sizes — not wordmark text.
    const logo =
      truth.logoMaterial ?? ensureHarborOakRmJ002LogoMaterial(input.repoRoot);
    const logoAbs = path.join(input.repoRoot, logo.relativePath);
    if (!existsSync(logoAbs)) {
      return {
        ok: false,
        failureCode: "DESIGN_QA_FAIL",
        message: `DESIGN_QA_FAIL: logo material missing at ${logo.relativePath}`,
      };
    }
    const logoBuf = readFileSync(logoAbs);
    const logoUri = `data:image/svg+xml;base64,${logoBuf.toString("base64")}`;
    // Proof fixture keeps Harbor mark a11y wording (no wordmark in PNG).
    // Customer logo path may name the mark after the approved display name.
    const markLabel = truth.logoMaterial
      ? escapeHtml(truth.displayName?.trim() || truth.businessName || "Brand")
      : "Harbor and Oak";
    // ~82% of canvas ≈ fills circular crop with mark as primary signal.
    const markPx = Math.round(w * 0.82);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden;background:#F7F4EF}
.canvas{width:${w}px;height:${h}px;position:relative;display:flex;align-items:center;justify-content:center;background:#F7F4EF}
.mark{width:${markPx}px;height:${markPx}px;display:block}
.mark img{width:100%;height:100%;object-fit:contain;display:block}
</style></head><body><div class="canvas">
<div class="mark" aria-label="${markLabel} brand mark"><img src="${logoUri}" alt="${markLabel} mark" /></div>
</div></body></html>`;
    const htmlRel = `${input.memberDirRel}/avatar.html`;
    const pngRel = `${input.memberDirRel}/avatar.png`;
    const pdfRel = `${input.memberDirRel}/avatar.pdf`;
    const plateRel = `${input.memberDirRel}/plate-honesty.json`;
    writeFileSync(path.join(input.repoRoot, htmlRel), html, "utf8");
    const capture = await captureFlyerExports({
      htmlAbsolutePath: path.join(input.repoRoot, htmlRel),
      pngAbsolutePath: path.join(input.repoRoot, pngRel),
      pdfAbsolutePath: path.join(input.repoRoot, pdfRel),
      widthPx: w,
      heightPx: h,
    });
    const plateHonesty = {
      plateId: RM_J002_AVATAR_PLATE.plateId,
      avatarVisualVersion: RM_J002_AVATAR_VISUAL_VERSION,
      studioRenderPx: { width: w, height: h },
      platformCropBehavior: "circular",
      guaranteedVisible:
        "Centered brand mark (~82% canvas) is the safe-zone signal — corner pixels not guaranteed",
      customerFacingLabelsInPng: false,
      productionLabelsRemoved: ["Profile photo", "Studio dimension footer"],
      note: RM_J002_AVATAR_PLATE.note,
      overflowOk: capture.overflowOk,
      logoMaterialId: logo.materialId,
      logoContentSha256: logo.contentSha256,
    };
    writeFileSync(
      path.join(input.repoRoot, plateRel),
      `${JSON.stringify(plateHonesty, null, 2)}\n`,
      "utf8",
    );
    if (!capture.overflowOk) {
      return {
        ok: false,
        failureCode: "DESIGN_QA_FAIL",
        message: `DESIGN_QA_FAIL: avatar overflow ${capture.overflowDetail}`,
      };
    }
    const artifacts: RmJ002ArtifactRef[] = [
      {
        role: "avatar_png",
        relativePath: pngRel,
        contentSha256: sha256File(path.join(input.repoRoot, pngRel)),
      },
      {
        role: "avatar_html",
        relativePath: htmlRel,
        contentSha256: sha256File(path.join(input.repoRoot, htmlRel)),
      },
      {
        role: "plate_honesty",
        relativePath: plateRel,
        contentSha256: sha256File(path.join(input.repoRoot, plateRel)),
      },
    ];
    return {
      ok: true,
      member: {
        memberId: planned.memberId,
        kind: planned.kind,
        order: planned.order,
        memberPurpose: planned.memberPurpose,
        agreedPlateId: RM_J002_AVATAR_PLATE.plateId,
        producerQaOk: true,
        artifacts,
        plateHonestyNote: RM_J002_AVATAR_PLATE.note,
      },
    };
  }

  if (planned.kind === "design_page_cover") {
    if (truth.platform !== "facebook") {
      return {
        ok: false,
        failureCode: "UNSUPPORTED_USE",
        message: "UNSUPPORTED_USE: page_cover only allowed for Facebook",
      };
    }
    const w = RM_J002_FACEBOOK_COVER_PLATE.widthPx;
    const h = RM_J002_FACEBOOK_COVER_PLATE.heightPx;
    // Customer artwork only — no production annotations in the delivered PNG.
    // Overlap / crop / upload guidance belongs in field-map/checklist + plate-honesty.json.
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden}
.canvas{width:${w}px;height:${h}px;position:relative;background:linear-gradient(115deg,#5c7a8a 0%,#c4a574 48%,#2c3e50 100%);color:#fff;font-family:Georgia,"Times New Roman",serif}
.title{position:absolute;left:26%;right:8%;top:34%;font-size:40px;font-weight:500;letter-spacing:.02em;line-height:1.15}
</style></head><body><div class="canvas">
<div class="title">${escapeHtml(truth.businessName)}</div>
</div></body></html>`;
    const htmlRel = `${input.memberDirRel}/page-cover.html`;
    const pngRel = `${input.memberDirRel}/page-cover.png`;
    const pdfRel = `${input.memberDirRel}/page-cover.pdf`;
    const plateRel = `${input.memberDirRel}/plate-honesty.json`;
    writeFileSync(path.join(input.repoRoot, htmlRel), html, "utf8");
    const capture = await captureFlyerExports({
      htmlAbsolutePath: path.join(input.repoRoot, htmlRel),
      pngAbsolutePath: path.join(input.repoRoot, pngRel),
      pdfAbsolutePath: path.join(input.repoRoot, pdfRel),
      widthPx: w,
      heightPx: h,
    });
    const plateHonesty = {
      plateId: RM_J002_FACEBOOK_COVER_PLATE.plateId,
      coverVisualVersion: RM_J002_COVER_VISUAL_VERSION,
      studioRenderPx: { width: w, height: h },
      platformCropBehavior:
        "Meta Page cover — desktop/mobile aspect differ; profile picture overlaps lower-left",
      guaranteedVisible: "centered safe content only — not every pixel",
      customerFacingLabelsInPng: false,
      productionAnnotationsRemoved: [
        "Facebook Page cover · customer uploads",
        "dashed profile-picture overlap cue",
        "crop-honesty footer",
      ],
      guidanceLocation: "field_map_checklist + plate-honesty.json",
      note: RM_J002_FACEBOOK_COVER_PLATE.note,
      overflowOk: capture.overflowOk,
    };
    writeFileSync(
      path.join(input.repoRoot, plateRel),
      `${JSON.stringify(plateHonesty, null, 2)}\n`,
      "utf8",
    );
    if (!capture.overflowOk) {
      return {
        ok: false,
        failureCode: "DESIGN_QA_FAIL",
        message: `DESIGN_QA_FAIL: cover overflow ${capture.overflowDetail}`,
      };
    }
    const artifacts: RmJ002ArtifactRef[] = [
      {
        role: "cover_png",
        relativePath: pngRel,
        contentSha256: sha256File(path.join(input.repoRoot, pngRel)),
      },
      {
        role: "cover_html",
        relativePath: htmlRel,
        contentSha256: sha256File(path.join(input.repoRoot, htmlRel)),
      },
      {
        role: "plate_honesty",
        relativePath: plateRel,
        contentSha256: sha256File(path.join(input.repoRoot, plateRel)),
      },
    ];
    return {
      ok: true,
      member: {
        memberId: planned.memberId,
        kind: planned.kind,
        order: planned.order,
        memberPurpose: planned.memberPurpose,
        agreedPlateId: RM_J002_FACEBOOK_COVER_PLATE.plateId,
        producerQaOk: true,
        artifacts,
        plateHonestyNote: RM_J002_FACEBOOK_COVER_PLATE.note,
      },
    };
  }

  return {
    ok: false,
    failureCode: "UNSUPPORTED_USE",
    message: `UNSUPPORTED_USE: unknown member kind`,
  };
}
