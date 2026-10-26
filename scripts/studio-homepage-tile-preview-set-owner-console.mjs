/**
 * One Owner Console packet for the 8 fitted homepage tile previews.
 * Does not reopen the filed 8-sample family-plate packet.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeProductionReceipt } from "./owner-production-receipt.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRAY_JSON = path.join(ROOT, "docs/launch/project-alpha-owner-desk-tray.json");
const RETURN_DIR = path.join(
  ROOT,
  "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-CONSOLE-RETURN",
);
const DECISION_JSON = path.join(
  ROOT,
  "docs/launch/studio-homepage-what-we-create-sample-set-1/TILE-PREVIEW-SET-OWNER-DECISION.json",
);

export const TILE_PREVIEW_SET_MATTER_ID = "studio-homepage-what-we-create-tile-previews";
export const TILE_PREVIEW_SET_RECORD_ID = "studio-homepage-what-we-create-tile-previews";
export const TILE_PREVIEW_DESKTOP = path.join(RETURN_DIR, "homepage-previews/carousel-desktop.jpg");
export const TILE_PREVIEW_DESKTOP_END = path.join(
  RETURN_DIR,
  "homepage-previews/carousel-desktop-end.jpg",
);
export const TILE_PREVIEW_MOBILE = path.join(RETURN_DIR, "homepage-previews/carousel-mobile.jpg");
export const TILE_PREVIEW_MOBILE_END = path.join(
  RETURN_DIR,
  "homepage-previews/carousel-mobile-end.jpg",
);

export function previewSetAssetPath(name) {
  return path.join(RETURN_DIR, "homepage-previews", name);
}

export function readTray(fallback) {
  if (!existsSync(TRAY_JSON)) return fallback ?? { openMatterId: null, matters: [] };
  try {
    const parsed = JSON.parse(readFileSync(TRAY_JSON, "utf8"));
    if (!parsed || !Array.isArray(parsed.matters)) {
      return fallback ?? { openMatterId: null, matters: [] };
    }
    return parsed;
  } catch {
    return fallback ?? { openMatterId: null, matters: [] };
  }
}

export function writeTray(state) {
  writeFileSync(TRAY_JSON, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function raiseTilePreviewSetOwnerMatter(state, nowIso = new Date().toISOString()) {
  const matter = {
    id: TILE_PREVIEW_SET_MATTER_ID,
    recordId: TILE_PREVIEW_SET_RECORD_ID,
    matter: "What We Create tile previews",
    tray: "ACTION_REQUIRED",
    ownerActionRequiredNow: true,
    blocksScoutOrSystem: true,
    movingNormally: false,
    status: "WAITING ON OWNER",
    stateChangedAt: nowIso,
    whyOnDesk:
      "All 8 homepage tile previews are fitted inside the real What We Create carousel. This is not the filed 8-sample family-plate packet.",
    decisionRequired:
      "Judge the 8 fitted homepage previews together. Approve the set, reject it, or send it back.",
    ownerSteps: [
      "Look at the desktop and mobile carousel screenshots.",
      "Confirm each tile reads and nothing important is chopped.",
      "Approve the set, reject it, or send it back.",
    ],
    whatHappensAfterSend:
      "If you approve, the 8 fitted previews stay on the existing tiles. No Video 2 / 3. No Page 2. No publish / no merge / no push.",
    assignedRecipient: "Owner",
    nextHandoff: "Owner judges the 8 fitted homepage previews.",
    ruleRecordId: null,
    ownerQuestions: [],
    judgmentKind: "homepage_tile_preview_set_owner_acceptance",
    sampleImages: [
      {
        id: "desktop",
        label: "Desktop carousel — start",
        url: "/owner-judgment-asset/what-we-create-tile-preview/carousel-desktop.jpg",
      },
      {
        id: "desktop-end",
        label: "Desktop carousel — end",
        url: "/owner-judgment-asset/what-we-create-tile-preview/carousel-desktop-end.jpg",
      },
      {
        id: "mobile",
        label: "Mobile carousel — start",
        url: "/owner-judgment-asset/what-we-create-tile-preview/carousel-mobile.jpg",
      },
      {
        id: "mobile-end",
        label: "Mobile carousel — end",
        url: "/owner-judgment-asset/what-we-create-tile-preview/carousel-mobile-end.jpg",
      },
    ],
    qaResult:
      "READY WITH EXPLICIT LIMITS. All 8 tiles use contain-fit homepage previews. The homepage SAMPLE overlay chip is removed from all 8 tiles. Plate SAMPLE marks on the artwork stay. Approved plates unchanged. Page 1 layout unchanged. Cover was not used.",
    explicitLimits: [
      "This is homepage-preview fit only, not a new family-plate production.",
      "The filed 8-sample family packet stays filed.",
      "Tile art height is unchanged at 7.35rem. Fine plate type still will not read.",
      "Homepage SAMPLE overlay chips are off the tiles. Artwork SAMPLE marks remain on the approved plates.",
      "Do not treat this as Video 2, Video 3, or Page 2.",
    ],
    qualityClassification: "B",
    packageTruth:
      "Eight homepage-specific fitted previews in the existing What We Create tiles. SAMPLE. Not client results.",
    integrationAuthorized: false,
  };
  return {
    openMatterId: TILE_PREVIEW_SET_MATTER_ID,
    matters: [
      ...(state.matters ?? []).filter((entry) => entry.id !== TILE_PREVIEW_SET_MATTER_ID),
      matter,
    ],
  };
}

export function persistTilePreviewSetDecision(
  state,
  action,
  note = "",
  nowIso = new Date().toISOString(),
) {
  const matter = (state.matters ?? []).find((entry) => entry.id === TILE_PREVIEW_SET_MATTER_ID);
  if (!matter) return null;
  const decision =
    action === "approve" ? "APPROVE" : action === "reject" ? "REJECT" : "SEND_BACK";
  const record = {
    packageId: "STUDIO-HOMEPAGE-WHAT-WE-CREATE-TILE-PREVIEWS-1",
    decision,
    note: String(note ?? "").trim(),
    decidedAt: nowIso,
    cropRuleAuthorized: decision === "APPROVE",
    integrationAuthorized: false,
  };
  mkdirSync(path.dirname(DECISION_JSON), { recursive: true });
  writeFileSync(DECISION_JSON, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  if (decision === "SEND_BACK") {
    writeProductionReceipt({
      packetId: TILE_PREVIEW_SET_MATTER_ID,
      label: "What We Create tile previews",
      state: "RECEIVED",
      detail: "Received. Production has the tile-preview send-back.",
      updatedAt: nowIso,
    });
  }
  return record;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const next = raiseTilePreviewSetOwnerMatter(readTray());
  writeTray(next);
  writeProductionReceipt({
    packetId: TILE_PREVIEW_SET_MATTER_ID,
    label: "What We Create tile previews",
    state: "COMPLETE",
    detail: "Complete. The 8 fitted tile previews are on your desk. Not the filed family packet.",
  });
  process.stdout.write("What We Create tile previews are on the existing Owner Console.\n");
}
