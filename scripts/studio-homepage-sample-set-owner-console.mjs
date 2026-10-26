/**
 * Machine door for the What We Create 8-sample Owner Console packet.
 * Quality raises one set. Owner judges the family. Scout does not integrate yet.
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
const SAMPLES_DIR = path.join(RETURN_DIR, "samples");
const DECISION_JSON = path.join(
  ROOT,
  "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-DECISION.json",
);

export const SAMPLE_SET_MATTER_ID = "studio-homepage-what-we-create-sample-set";
export const SAMPLE_SET_RECORD_ID = "studio-homepage-what-we-create-sample-set";
export const SAMPLE_SET_IDS = [
  "long-to-short",
  "short-form",
  "social-graphics",
  "ad-creative",
  "email-text",
  "menu-price",
  "reviews-proof",
  "flyer-card",
];
export const SAMPLE_SET_LABELS = {
  "long-to-short": "Long video to short clips",
  "short-form": "Short-form video editing",
  "social-graphics": "Social graphics",
  "ad-creative": "Ad creative",
  "email-text": "Email & text campaign materials",
  "menu-price": "Menu / price list",
  "reviews-proof": "Reviews & customer-proof materials",
  "flyer-card": "Flyers / business-card design",
};

const WHY =
  "Quality reviewed all 8 What We Create samples as one set. Final acceptance is Owner judgment of the full family. Scout cannot put any sample on Page 1 without you.";
const NEED =
  "Review the 8 samples together. Approve the full set, reject it, or send it back.";

export function samplePath(id) {
  return path.join(SAMPLES_DIR, `${id}.jpg`);
}

export function sampleAssetUrl(id) {
  return `/owner-judgment-asset/what-we-create-sample/${id}`;
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

export function collectedSampleImages() {
  mkdirSync(SAMPLES_DIR, { recursive: true });
  return SAMPLE_SET_IDS.filter((id) => existsSync(samplePath(id))).map((id) => ({
    id,
    label: SAMPLE_SET_LABELS[id],
    url: sampleAssetUrl(id),
  }));
}

export function qualityMayRaise(packet) {
  if (packet?.classification === "C") {
    return { ok: false, error: "Quality is blocked. Do not raise an Owner Console item." };
  }
  if (packet?.classification !== "A" && packet?.classification !== "B") {
    return { ok: false, error: "Quality has not passed this set." };
  }
  if (!String(packet.qaResult ?? "").trim()) {
    return { ok: false, error: "Quality return is incomplete." };
  }
  const images = collectedSampleImages();
  if (images.length !== SAMPLE_SET_IDS.length) {
    return {
      ok: false,
      error: `Quality cannot raise a partial set. Have ${images.length} of 8.`,
    };
  }
  return { ok: true };
}

export function raiseSampleSetOwnerMatter(state, packet, nowIso = new Date().toISOString()) {
  const allowed = qualityMayRaise(packet);
  if (!allowed.ok) throw new Error(allowed.error);
  const existing = (state.matters ?? []).find((matter) => matter.id === SAMPLE_SET_MATTER_ID);
  if (
    existing &&
    (existing.tray === "ACTION_REQUIRED" || existing.tray === "WAITING_ON_MY_DECISION")
  ) {
    return state;
  }
  const sampleImages = collectedSampleImages();
  const matter = {
    id: SAMPLE_SET_MATTER_ID,
    recordId: SAMPLE_SET_RECORD_ID,
    matter: "What We Create sample set",
    tray: "ACTION_REQUIRED",
    ownerActionRequiredNow: true,
    blocksScoutOrSystem: true,
    movingNormally: false,
    status: "WAITING ON OWNER",
    stateChangedAt: nowIso,
    whyOnDesk: WHY,
    decisionRequired: NEED,
    ownerSteps: [
      "Look at all 8 samples in one packet.",
      "Check family consistency, truthfulness, and no fake client claims.",
      "Approve the full set, reject it, or send it back to Production.",
    ],
    whatHappensAfterSend:
      "Scout places the approved set into the existing What We Create tiles only. No homepage redesign. No publish / no merge / no push.",
    assignedRecipient: "Owner",
    nextHandoff: "Owner accepts, rejects, or sends back the full set. Scout does not bring files.",
    ruleRecordId: null,
    ownerQuestions: [],
    judgmentKind: "homepage_sample_set_owner_acceptance",
    sampleImages,
    qaResult: packet.qaResult,
    explicitLimits: [...(packet.explicitLimits ?? [])],
    qualityClassification: packet.classification,
    packageTruth: packet.packageTruth ?? "",
    integrationAuthorized: false,
  };
  return {
    openMatterId: SAMPLE_SET_MATTER_ID,
    matters: [
      ...(state.matters ?? []).filter((entry) => entry.id !== SAMPLE_SET_MATTER_ID),
      matter,
    ],
  };
}

export function persistSampleSetDecision(state, action, note = "", nowIso = new Date().toISOString()) {
  const matter = (state.matters ?? []).find((entry) => entry.id === SAMPLE_SET_MATTER_ID);
  if (!matter) return null;
  const decision =
    action === "approve" ? "APPROVE" : action === "reject" ? "REJECT" : "SEND_BACK";
  const record = {
    packageId: "STUDIO-HOMEPAGE-WHAT-WE-CREATE-SAMPLE-SET-1",
    decision,
    note: String(note ?? "").trim(),
    decidedAt: nowIso,
    integrationAuthorized: decision === "APPROVE",
  };
  mkdirSync(path.dirname(DECISION_JSON), { recursive: true });
  writeFileSync(DECISION_JSON, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  if (decision === "SEND_BACK") {
    writeProductionReceipt({
      packetId: SAMPLE_SET_MATTER_ID,
      label: "What We Create sample set",
      state: "RECEIVED",
      detail: "Received. Production has your send-back.",
      updatedAt: nowIso,
    });
  }
  return record;
}
