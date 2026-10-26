/**
 * Machine door for the one Long video homepage tile-crop review.
 * Does not reopen the 8-sample family packet.
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
  "docs/launch/studio-homepage-what-we-create-sample-set-1/TILE-CROP-OWNER-DECISION.json",
);

export const TILE_CROP_MATTER_ID = "studio-homepage-long-to-short-tile-crop";
export const TILE_CROP_RECORD_ID = "studio-homepage-long-to-short-tile-crop";
export const TILE_CROP_PREVIEW = path.join(RETURN_DIR, "homepage-previews/long-to-short.jpg");
export const TILE_CROP_CAROUSEL = path.join(
  RETURN_DIR,
  "homepage-previews/long-to-short-carousel.jpg",
);
export const TILE_CROP_PREVIEW_URL = "/owner-judgment-asset/long-to-short-tile-preview";
export const TILE_CROP_CAROUSEL_URL = "/owner-judgment-asset/long-to-short-tile-carousel";

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

export function raiseTileCropOwnerMatter(state, nowIso = new Date().toISOString()) {
  const matter = {
    id: TILE_CROP_MATTER_ID,
    recordId: TILE_CROP_RECORD_ID,
    matter: "Long video tile crop",
    tray: "ACTION_REQUIRED",
    ownerActionRequiredNow: true,
    blocksScoutOrSystem: true,
    movingNormally: false,
    status: "WAITING ON OWNER",
    stateChangedAt: nowIso,
    whyOnDesk:
      "This is the corrected homepage tile preview for Long video to short clips only. The full composition is fitted into the existing tile. It is not the 8-sample family packet.",
    decisionRequired:
      "Judge this one fitted tile preview. Approve the crop rule, reject it, or send it back.",
    ownerSteps: [
      "Look at the homepage preview and the real carousel screenshot.",
      "Confirm the presenter and three shorts all read, without a zoomed crop.",
      "Approve this crop rule, reject it, or send it back.",
    ],
    whatHappensAfterSend:
      "If you approve the crop rule, Scout may apply the same homepage-preview treatment to the remaining 7. No full-set Page 1 integration.",
    assignedRecipient: "Owner",
    nextHandoff: "Owner judges this one fitted tile preview. Other tiles stay empty.",
    ruleRecordId: null,
    ownerQuestions: [],
    judgmentKind: "homepage_tile_crop_owner_acceptance",
    sampleImages: [
      {
        id: "preview",
        label: "Homepage tile preview",
        url: TILE_CROP_PREVIEW_URL,
      },
      {
        id: "carousel",
        label: "In the real carousel",
        url: TILE_CROP_CAROUSEL_URL,
      },
    ],
    qaResult: "READY WITH EXPLICIT LIMITS. Tile preview now uses contain so the full presenter-plus-three-shorts composition reads. Approved 1920x1080 plate unchanged. Other 7 tiles empty. Page 1 layout unchanged.",
    explicitLimits: [
      "This is one homepage crop, not full-set approval.",
      "The SAMPLE chip still sits on the tile.",
      "Tile art height is unchanged at 7.35rem. The preview now fits inside it instead of covering and chopping.",
      "Do not treat Approve as Page 1 integration of the other 7.",
      "The approved 1920x1080 Long video plate was not altered.",
    ],
    qualityClassification: "B",
    packageTruth: "Homepage-specific preview from the approved Long video plate. Fitted, not zoomed. SAMPLE chip stays on the tile.",
    integrationAuthorized: false,
  };
  return {
    openMatterId: TILE_CROP_MATTER_ID,
    matters: [
      ...(state.matters ?? []).filter((entry) => entry.id !== TILE_CROP_MATTER_ID),
      matter,
    ],
  };
}

export function persistTileCropDecision(state, action, note = "", nowIso = new Date().toISOString()) {
  const matter = (state.matters ?? []).find((entry) => entry.id === TILE_CROP_MATTER_ID);
  if (!matter) return null;
  const decision =
    action === "approve" ? "APPROVE" : action === "reject" ? "REJECT" : "SEND_BACK";
  const record = {
    packageId: "STUDIO-HOMEPAGE-LONG-TO-SHORT-TILE-CROP-1",
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
      packetId: TILE_CROP_MATTER_ID,
      label: "Long video tile crop",
      state: "RECEIVED",
      detail: "Received. Production has the crop send-back.",
      updatedAt: nowIso,
    });
  }
  return record;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const next = raiseTileCropOwnerMatter(readTray());
  writeTray(next);
  writeProductionReceipt({
    packetId: TILE_CROP_MATTER_ID,
    label: "Long video tile crop",
    state: "COMPLETE",
    detail: "Complete. One tile crop is on your desk. Not the 8-sample family.",
  });
  process.stdout.write("Long video tile crop is on the existing Owner Console.\n");
}
