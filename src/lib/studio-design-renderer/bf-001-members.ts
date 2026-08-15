/**
 * BF-001 member producers — Brand Direction Sheet + profile/cover graphic.
 * Logo is placed (SVG data URI), never redrawn. Graphic fonts = Studio-safe only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { sha256File } from "./bind";
import { captureFlyerExports } from "./capture";
import { ensureHarborOakBf001LogoMaterial } from "./bf-001-fixtures";
import {
  BF_001_COVER_PLATE,
  BF_001_GRAPHIC_VISUAL_VERSION,
  BF_001_PROFILE_PLATE,
  BF_001_SHEET_PLATE,
  BF_001_SHEET_VISUAL_VERSION,
  type Bf001ArtifactRef,
  type Bf001MemberResult,
  type Bf001PlannedMember,
  type Bf001RefreshProjectTruth,
} from "./bf-001-types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveLogo(
  repoRoot: string,
  truth: Bf001RefreshProjectTruth,
):
  | { ok: true; logo: NonNullable<Bf001RefreshProjectTruth["logoMaterial"]>; uri: string }
  | { ok: false; message: string } {
  const logo = truth.logoMaterial ?? ensureHarborOakBf001LogoMaterial(repoRoot);
  const abs = path.join(repoRoot, logo.relativePath);
  if (!existsSync(abs)) {
    return {
      ok: false,
      message: `DESIGN_QA_FAIL: logo material missing at ${logo.relativePath}`,
    };
  }
  const buf = readFileSync(abs);
  return {
    ok: true,
    logo,
    uri: `data:image/svg+xml;base64,${buf.toString("base64")}`,
  };
}

export async function produceBf001Member(input: {
  repoRoot: string;
  truth: Bf001RefreshProjectTruth;
  planned: Bf001PlannedMember;
  memberDirRel: string;
}): Promise<
  | { ok: true; member: Bf001MemberResult }
  | { ok: false; failureCode: string; message: string }
> {
  const { repoRoot, truth, planned } = input;
  mkdirSync(path.join(repoRoot, input.memberDirRel), { recursive: true });

  if (planned.kind === "strategy_document") {
    return produceSheet(input);
  }
  if (planned.kind === "design_profile" || planned.kind === "design_cover") {
    return produceGraphic(input);
  }
  return {
    ok: false,
    failureCode: "MEMBERSHIP_MISMATCH",
    message: `MEMBERSHIP_MISMATCH: unknown kind ${planned.kind}`,
  };
}

async function produceSheet(input: {
  repoRoot: string;
  truth: Bf001RefreshProjectTruth;
  planned: Bf001PlannedMember;
  memberDirRel: string;
}): Promise<
  | { ok: true; member: Bf001MemberResult }
  | { ok: false; failureCode: string; message: string }
> {
  const { repoRoot, truth, planned } = input;
  const w = BF_001_SHEET_PLATE.widthPx;
  const h = BF_001_SHEET_PLATE.heightPx;
  const logoResolved = resolveLogo(repoRoot, truth);
  if (!logoResolved.ok) {
    return {
      ok: false,
      failureCode: "STARTING_POINT_INSUFFICIENT",
      message: logoResolved.message,
    };
  }

  const swatches = truth.hexPalette
    .map(
      (s) => `<div class="swatch">
  <div class="chip" style="background:${escapeHtml(s.hex)}"></div>
  <div class="swatch-meta">
    <div class="swatch-label">${escapeHtml(s.label)}</div>
    <div class="swatch-hex">${escapeHtml(s.hex)}</div>
    <div class="swatch-role">${escapeHtml(s.role)}</div>
  </div>
</div>`,
    )
    .join("");

  const fonts = truth.fontRecommendations
    .map(
      (f) => `<div class="font-item">
  <div class="font-head">
    <span class="font-role">${escapeHtml(f.role)}</span>
    <span class="rec-tag">Recommendation only</span>
  </div>
  <div class="font-name">${escapeHtml(f.recommendedFamily)}</div>
  <div class="muted">${escapeHtml(f.notes)}</div>
</div>`,
    )
    .join("");

  const usage = truth.logoUsageRules;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden;background:#F7F4EF;color:#2C3E50;
  font-family:Georgia,"Times New Roman",serif}
.canvas{width:${w}px;height:${h}px;box-sizing:border-box;padding:44px 52px 40px;display:grid;
  grid-template-rows:auto 1fr auto;gap:0}
.header{margin-bottom:22px}
.eyebrow{font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:#5C7A8A;margin:0 0 12px}
h1{font-size:44px;font-weight:500;margin:0 0 12px;line-height:1.12}
.sub{font-size:19px;margin:0;color:#5C7A8A;line-height:1.5;max-width:96%}
.grid{min-height:0;height:100%;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr;gap:22px;align-items:stretch}
.card{background:#fff;border:1px solid #E4DDD2;border-radius:12px;padding:26px 28px 24px;
  display:flex;flex-direction:column;box-sizing:border-box;min-height:0;height:100%;overflow:hidden}
.card h2{font-size:22px;margin:0 0 18px;font-weight:600;letter-spacing:.01em}
.card h2.section-gap{margin-top:28px}
.swatches{display:grid;grid-template-columns:1fr 1fr;gap:22px 18px;margin-bottom:4px}
.swatch{display:flex;align-items:center;gap:14px}
.chip{width:64px;height:64px;border-radius:12px;border:1px solid #d8d0c4;flex:0 0 auto;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
.swatch-meta{min-width:0}
.swatch-label{font-size:18px;font-weight:600;line-height:1.25}
.swatch-hex{font-size:17px;font-family:Arial,Helvetica,sans-serif;letter-spacing:.03em;margin-top:4px;color:#2C3E50}
.swatch-role{font-size:15px;color:#6b7280;text-transform:capitalize;margin-top:3px}
.font-stack{display:flex;flex-direction:column;justify-content:space-evenly;flex:1 1 auto;gap:12px;min-height:0}
.font-item{padding:8px 0}
.font-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.font-role{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:#5C7A8A;font-weight:600}
.font-name{font-size:24px;font-weight:500;line-height:1.2;margin-bottom:8px}
.rec-tag{display:inline-block;font-size:12px;letter-spacing:.05em;text-transform:uppercase;
  color:#5C7A8A;border:1px solid #C4A574;border-radius:999px;padding:3px 10px;font-family:Arial,Helvetica,sans-serif}
.muted{font-size:16px;color:#6b7280;line-height:1.5}
.logo-row{display:flex;align-items:center;gap:18px;margin-bottom:10px;flex:0 0 auto}
.logo-row img{width:96px;height:96px;object-fit:contain;flex:0 0 auto}
.logo-title{font-size:19px;font-weight:600;margin-bottom:4px}
.rules{margin:0;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:space-between}
.rule{margin:0;padding:12px 0;border-bottom:1px solid #EFE8DE;flex:1 1 auto;display:flex;flex-direction:column;justify-content:center}
.rule:last-of-type{border-bottom:0}
.rule-label{font-size:17px;font-weight:600;margin:0 0 5px}
.rule-body{margin:0;font-size:17px;line-height:1.45;color:#3a4553}
.note{margin-top:auto;padding-top:16px;font-size:16px;color:#5C7A8A;line-height:1.5;flex:0 0 auto}
.footer{margin-top:20px;font-size:14px;color:#8a8278;
  display:flex;justify-content:space-between;gap:16px;border-top:1px solid #E4DDD2;padding-top:14px}
</style></head><body><div class="canvas">
<div class="header">
<p class="eyebrow">Brand Identity Refresh</p>
<h1>Brand Direction Sheet</h1>
<p class="sub">A one-page refresh for <strong>${escapeHtml(truth.businessName)}</strong> — built from your existing name and visual starting point. This is not naming, not a new logo, and not messaging or tagline work.</p>
</div>
<div class="grid">
  <div class="card">
    <h2>Color palette (HEX)</h2>
    <div class="swatches">${swatches}</div>
    <h2 class="section-gap">Font recommendations</h2>
    <div class="font-stack">${fonts}</div>
    <p class="note">Recommended typefaces guide your future materials. They are <strong>not</strong> font licenses and are <strong>not</strong> guaranteed to be the faces rendered on the accompanying Studio graphic.</p>
  </div>
  <div class="card">
    <h2>Existing-logo usage</h2>
    <div class="logo-row">
      <img src="${logoResolved.uri}" alt="${escapeHtml(truth.businessName)} existing mark"/>
      <div>
        <div class="logo-title">Supplied mark</div>
        <div class="muted">Placed as provided — not redrawn or redesigned.</div>
      </div>
    </div>
    <div class="rules">
      <div class="rule"><div class="rule-label">Clear space</div><div class="rule-body">${escapeHtml(usage.clearSpace)}</div></div>
      <div class="rule"><div class="rule-label">Placement</div><div class="rule-body">${escapeHtml(usage.placement)}</div></div>
      <div class="rule"><div class="rule-label">Background contrast</div><div class="rule-body">${escapeHtml(usage.backgroundContrast)}</div></div>
      <div class="rule"><div class="rule-label">Preferred lockup</div><div class="rule-body">${escapeHtml(usage.preferredLockup)}</div></div>
      <div class="rule"><div class="rule-label">Avoid distortion</div><div class="rule-body">${escapeHtml(usage.avoidDistortion)}</div></div>
      <div class="rule"><div class="rule-label">Minimum size</div><div class="rule-body">${escapeHtml(usage.minimumSize)}</div></div>
      <div class="rule"><div class="rule-label">Consistency</div><div class="rule-body">${escapeHtml(usage.consistency)}</div></div>
    </div>
    <p class="note">Logo guidance is usage-only. The Studio will not create a new logo, modernize letterforms, or invent alternate marks in this package.</p>
  </div>
</div>
<div class="footer">
  <span>${escapeHtml(truth.businessName)} · refresh package</span>
  <span>Accompanying graphic: ${escapeHtml(truth.graphicKind)} · Studio-safe render fonts only</span>
</div>
</div></body></html>`;

  const htmlRel = `${input.memberDirRel}/brand-direction-sheet.html`;
  const pngRel = `${input.memberDirRel}/brand-direction-sheet.png`;
  const pdfRel = `${input.memberDirRel}/brand-direction-sheet.pdf`;
  const metaRel = `${input.memberDirRel}/sheet-sections.json`;
  writeFileSync(path.join(repoRoot, htmlRel), html, "utf8");
  writeFileSync(
    path.join(repoRoot, metaRel),
    `${JSON.stringify(
      {
        plateId: BF_001_SHEET_PLATE.plateId,
        sheetVisualVersion: BF_001_SHEET_VISUAL_VERSION,
        sections: ["hex_palette", "font_recommendations", "logo_usage_rules"],
        fontSectionMode: "recommendations_only",
        logoUsageMode: "usage_guidance_only",
        customerFacing: true,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const capture = await captureFlyerExports({
    htmlAbsolutePath: path.join(repoRoot, htmlRel),
    pngAbsolutePath: path.join(repoRoot, pngRel),
    pdfAbsolutePath: path.join(repoRoot, pdfRel),
    widthPx: w,
    heightPx: h,
  });
  if (!capture.overflowOk) {
    return {
      ok: false,
      failureCode: "DESIGN_QA_FAIL",
      message: `DESIGN_QA_FAIL: sheet overflow ${capture.overflowDetail}`,
    };
  }

  const artifacts: Bf001ArtifactRef[] = [
    {
      role: "sheet_png",
      relativePath: pngRel,
      contentSha256: sha256File(path.join(repoRoot, pngRel)),
    },
    {
      role: "sheet_pdf",
      relativePath: pdfRel,
      contentSha256: sha256File(path.join(repoRoot, pdfRel)),
    },
    {
      role: "sheet_html",
      relativePath: htmlRel,
      contentSha256: sha256File(path.join(repoRoot, htmlRel)),
    },
    {
      role: "sheet_sections",
      relativePath: metaRel,
      contentSha256: sha256File(path.join(repoRoot, metaRel)),
    },
  ];

  return {
    ok: true,
    member: {
      memberId: planned.memberId,
      kind: planned.kind,
      order: planned.order,
      memberPurpose: planned.memberPurpose,
      agreedPlateId: BF_001_SHEET_PLATE.plateId,
      producerQaOk: true,
      artifacts,
      plateHonestyNote: BF_001_SHEET_PLATE.note,
    },
  };
}

async function produceGraphic(input: {
  repoRoot: string;
  truth: Bf001RefreshProjectTruth;
  planned: Bf001PlannedMember;
  memberDirRel: string;
}): Promise<
  | { ok: true; member: Bf001MemberResult }
  | { ok: false; failureCode: string; message: string }
> {
  const { repoRoot, truth, planned } = input;
  const isProfile = planned.kind === "design_profile";
  const plate = isProfile ? BF_001_PROFILE_PLATE : BF_001_COVER_PLATE;
  const w = plate.widthPx;
  const h = plate.heightPx;

  const logoResolved = resolveLogo(repoRoot, truth);
  if (!logoResolved.ok) {
    return {
      ok: false,
      failureCode: "STARTING_POINT_INSUFFICIENT",
      message: logoResolved.message,
    };
  }

  const fontStack = truth.graphicRenderFontFamily;
  const markLabel = escapeHtml(truth.businessName);
  let html: string;
  if (isProfile) {
    const markPx = Math.round(w * 0.82);
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden;background:#F7F4EF}
.canvas{width:${w}px;height:${h}px;position:relative;display:flex;align-items:center;justify-content:center;background:#F7F4EF}
.mark{width:${markPx}px;height:${markPx}px;display:block}
.mark img{width:100%;height:100%;object-fit:contain;display:block}
</style></head><body><div class="canvas">
<div class="mark" aria-label="${markLabel} existing brand mark"><img src="${logoResolved.uri}" alt="${markLabel} existing mark" /></div>
</div></body></html>`;
  } else {
    // Cover: place supplied logo + Studio-safe wordmark (Georgia stack) — no logo redraw.
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
html,body{margin:0;padding:0;width:${w}px;height:${h}px;overflow:hidden}
.canvas{width:${w}px;height:${h}px;position:relative;background:linear-gradient(115deg,#5c7a8a 0%,#c4a574 48%,#2c3e50 100%);color:#fff;
  font-family:${fontStack}}
.mark{position:absolute;left:40px;top:50%;transform:translateY(-50%);width:132px;height:132px;background:transparent}
.mark img{width:100%;height:100%;object-fit:contain;display:block;background:transparent}
.title{position:absolute;left:196px;right:40px;top:50%;transform:translateY(-50%);font-size:36px;font-weight:500;letter-spacing:.02em;line-height:1.15}
</style></head><body><div class="canvas">
<div class="mark" aria-label="${markLabel} existing brand mark"><img src="${logoResolved.uri}" alt="${markLabel} existing mark" /></div>
<div class="title">${markLabel}</div>
</div></body></html>`;
  }

  const base = isProfile ? "avatar" : "page-cover";
  const htmlRel = `${input.memberDirRel}/${base}.html`;
  const pngRel = `${input.memberDirRel}/${base}.png`;
  const pdfRel = `${input.memberDirRel}/${base}.pdf`;
  const plateRel = `${input.memberDirRel}/plate-honesty.json`;
  writeFileSync(path.join(repoRoot, htmlRel), html, "utf8");

  const capture = await captureFlyerExports({
    htmlAbsolutePath: path.join(repoRoot, htmlRel),
    pngAbsolutePath: path.join(repoRoot, pngRel),
    pdfAbsolutePath: path.join(repoRoot, pdfRel),
    widthPx: w,
    heightPx: h,
  });

  const plateHonesty = {
    plateId: plate.plateId,
    graphicVisualVersion: BF_001_GRAPHIC_VISUAL_VERSION,
    graphicKind: truth.graphicKind,
    studioRenderPx: { width: w, height: h },
    logoPlacement: "customer_supplied_image_placed_not_redrawn",
    logoMaterialId: logoResolved.logo.materialId,
    logoContentSha256: logoResolved.logo.contentSha256,
    graphicRenderFontFamily: fontStack,
    recommendationFontsNotUsedOnGraphic: truth.fontRecommendations.map(
      (f) => f.recommendedFamily,
    ),
    customerFacingLabelsInPng: false,
    note: plate.note,
    overflowOk: capture.overflowOk,
  };
  writeFileSync(
    path.join(repoRoot, plateRel),
    `${JSON.stringify(plateHonesty, null, 2)}\n`,
    "utf8",
  );

  if (!capture.overflowOk) {
    return {
      ok: false,
      failureCode: "DESIGN_QA_FAIL",
      message: `DESIGN_QA_FAIL: graphic overflow ${capture.overflowDetail}`,
    };
  }

  const artifacts: Bf001ArtifactRef[] = [
    {
      role: isProfile ? "avatar_png" : "cover_png",
      relativePath: pngRel,
      contentSha256: sha256File(path.join(repoRoot, pngRel)),
    },
    {
      role: isProfile ? "avatar_pdf" : "cover_pdf",
      relativePath: pdfRel,
      contentSha256: sha256File(path.join(repoRoot, pdfRel)),
    },
    {
      role: isProfile ? "avatar_html" : "cover_html",
      relativePath: htmlRel,
      contentSha256: sha256File(path.join(repoRoot, htmlRel)),
    },
    {
      role: "plate_honesty",
      relativePath: plateRel,
      contentSha256: sha256File(path.join(repoRoot, plateRel)),
    },
  ];

  return {
    ok: true,
    member: {
      memberId: planned.memberId,
      kind: planned.kind,
      order: planned.order,
      memberPurpose: planned.memberPurpose,
      agreedPlateId: plate.plateId,
      producerQaOk: true,
      artifacts,
      plateHonestyNote: plate.note,
    },
  };
}
