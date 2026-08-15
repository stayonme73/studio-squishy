/**
 * Harbor & Oak fixtures for RM-J007 PROOF-1 — Reference-Guided Promotion Update.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { captureFlyerExports } from "./capture";
import { recipeForRmJ007Update } from "./rm-j007-contracts";
import {
  DESIGN_RENDERER_RM_J007_SKU,
  RM_J007_UPDATE_PLATE,
  type RmJ007BoundedChanges,
  type RmJ007ReferenceMaterial,
  type RmJ007UpdateProjectTruth,
} from "./rm-j007-types";

export const RM_J007_PROOF_PACKAGE_ID =
  "STUDIO-OPERATING-DESIGN-RM-J007-PROOF-1" as const;

export const RM_J007_PROOF_ARTIFACT_ROOT =
  "docs/launch/studio-operating-design-rm-j007-proof-1/artifacts/rm-j007" as const;

export const RM_J007_MATERIALS_DIR_REL =
  `${RM_J007_PROOF_ARTIFACT_ROOT}/materials` as const;

const REFERENCE_BEFORE_REL =
  `${RM_J007_MATERIALS_DIR_REL}/reference-before.png` as const;

const REFERENCE_BEFORE_HTML_REL =
  `${RM_J007_MATERIALS_DIR_REL}/reference-before.html` as const;

function buildBeforeHtml(): string {
  const w = RM_J007_UPDATE_PLATE.widthPx;
  const h = RM_J007_UPDATE_PLATE.heightPx;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Harbor &amp; Oak — Spring Session (before)</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: ${w}px; height: ${h}px; overflow: hidden; background: #1F3A5F; }
  .canvas {
    width: ${w}px; height: ${h}px;
    position: relative;
    background: linear-gradient(165deg, #1F3A5F 0%, #2C4A6E 55%, #C4A574 100%);
    color: #F7F4EF;
    font-family: Georgia, "Times New Roman", serif;
    padding: 72px 64px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .eyebrow { letter-spacing: 0.18em; text-transform: uppercase; font-size: 18px; opacity: 0.85; }
  h1 { font-size: 64px; line-height: 1.1; margin-top: 24px; font-weight: 400; }
  .offer { font-size: 28px; margin-top: 28px; }
  .price { font-size: 48px; margin-top: 12px; color: #F7F4EF; }
  .footer { font-size: 20px; opacity: 0.9; }
</style>
</head>
<body>
  <div class="canvas">
    <div>
      <div class="eyebrow">Harbor &amp; Oak Studio</div>
      <h1>Spring Portrait Session</h1>
      <p class="offer">Saturday, March 15 · Downtown courtyard</p>
      <p class="price">$49</p>
    </div>
    <p class="footer">harborandoak.example · (555) 010-2200</p>
  </div>
</body>
</html>
`;
}

/**
 * Ensure materials dir + reference-before.png exist.
 * Writes a simple "before" HTML and captures PNG via Playwright when missing.
 */
export async function ensureRmJ007ReferenceFixture(
  repoRoot: string,
): Promise<RmJ007ReferenceMaterial> {
  const materialsAbs = path.join(repoRoot, RM_J007_MATERIALS_DIR_REL);
  mkdirSync(materialsAbs, { recursive: true });

  const htmlAbs = path.join(repoRoot, REFERENCE_BEFORE_HTML_REL);
  const pngAbs = path.join(repoRoot, REFERENCE_BEFORE_REL);
  const pdfAbs = path.join(
    repoRoot,
    RM_J007_MATERIALS_DIR_REL,
    "reference-before.pdf",
  );

  const html = buildBeforeHtml();
  if (!existsSync(htmlAbs) || readFileSync(htmlAbs, "utf8") !== html) {
    writeFileSync(htmlAbs, html, "utf8");
  }

  if (!existsSync(pngAbs)) {
    await captureFlyerExports({
      htmlAbsolutePath: htmlAbs,
      pngAbsolutePath: pngAbs,
      pdfAbsolutePath: pdfAbs,
      widthPx: RM_J007_UPDATE_PLATE.widthPx,
      heightPx: RM_J007_UPDATE_PLATE.heightPx,
    });
  }

  const contentSha256 = createHash("sha256")
    .update(readFileSync(pngAbs))
    .digest("hex");

  return {
    materialId: "mat-harbor-oak-promo-reference-before-v1",
    relativePath: REFERENCE_BEFORE_REL,
    contentSha256,
    mime: "png",
  };
}

export function buildRmJ007UpdateTruth(input: {
  campaignId: string;
  repoRoot: string;
  referenceMaterial: RmJ007ReferenceMaterial;
  overrides?: Partial<
    Pick<
      RmJ007UpdateProjectTruth,
      | "businessName"
      | "itemIdentity"
      | "whereLive"
      | "boundedChanges"
      | "whatChange"
      | "newInfo"
      | "replacementImage"
      | "label"
      | "plannedMembers"
      | "lockedPackageMemberCount"
      | "acceptRecreationLimits"
      | "redesignRequested"
      | "fulfillmentMode"
      | "referenceMaterial"
    >
  >;
}): RmJ007UpdateProjectTruth {
  const recipe = recipeForRmJ007Update();
  const o = input.overrides ?? {};
  const boundedChanges: RmJ007BoundedChanges = o.boundedChanges ?? {
    dates: "April 12",
    prices: "$59",
    contact: "(555) 010-2299",
    wording: "Spring Portrait Session — courtyard seats limited",
  };

  return {
    skuId: DESIGN_RENDERER_RM_J007_SKU,
    campaignId: input.campaignId,
    jobId: `${input.campaignId}::rm-j007`,
    dispatchId: `dispatch-${input.campaignId}`,
    businessName: o.businessName ?? "Harbor & Oak Studio",
    itemIdentity:
      o.itemIdentity ?? "Spring Portrait Session flyer (existing)",
    whereLive: o.whereLive ?? "Facebook event cover + lobby print stand",
    referenceMaterial:
      o.referenceMaterial !== undefined
        ? o.referenceMaterial
        : input.referenceMaterial,
    replacementImage: o.replacementImage ?? null,
    boundedChanges,
    whatChange:
      o.whatChange ??
      "Update the session date from March to April, raise the price, and refresh the phone number.",
    newInfo:
      o.newInfo ??
      "New date: Saturday, April 12. New price: $59. Phone: (555) 010-2299.",
    acceptRecreationLimits: (o.acceptRecreationLimits ?? true) as true,
    redesignRequested: (o.redesignRequested ?? false) as false,
    lockedPackageMemberCount: (o.lockedPackageMemberCount ?? 1) as 1,
    plannedMembers: o.plannedMembers ?? recipe.plannedMembers,
    fulfillmentMode: (o.fulfillmentMode ?? "recreation") as "recreation",
    label: o.label ?? "Harbor & Oak — rm-j007 reference-guided update",
  };
}
