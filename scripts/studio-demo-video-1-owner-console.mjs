/**
 * Machine door for Video 1 Owner Console retrieval.
 * Quality return raises the existing desk item.
 * Owner Approve / Reject / Send Back writes the decision Scout later reads.
 * Does not produce the video. Does not invent a customer campaign.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRAY_JSON = path.join(ROOT, "docs/launch/project-alpha-owner-desk-tray.json");
const RETURN_DIR = path.join(
  ROOT,
  "docs/launch/studio-demo-video-1-clip-repurposing-1/OWNER-CONSOLE-RETURN",
);
const RETURN_MP4 = path.join(RETURN_DIR, "clip-repurposing-studio-demo.mp4");
const DECISION_JSON = path.join(
  ROOT,
  "docs/launch/studio-demo-video-1-clip-repurposing-1/OWNER-DECISION.json",
);

export const VIDEO_1_MATTER_ID = "studio-demo-video-1-clip-repurposing";
export const VIDEO_1_RECORD_ID = "studio-demo-video-1-clip-repurposing";
export const VIDEO_1_ASSET_URL = "/owner-judgment-asset/studio-demo-video-1";
export const VIDEO_1_RETURN_MP4 = RETURN_MP4;

const WHY =
  "Quality passed this customer-facing homepage demo. Final acceptance is Owner judgment. Scout cannot put it on Page 1 without you.";
const NEED =
  "Watch the finished MP4. Read the QA result and any explicit limits. Approve, Reject, or Send Back.";

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

export function qualityMayRaise(packet) {
  if (packet?.classification === "C") {
    return { ok: false, error: "Quality is blocked. Do not raise an Owner Console item." };
  }
  if (packet?.classification !== "A" && packet?.classification !== "B") {
    return { ok: false, error: "Quality has not passed this cut." };
  }
  if (!String(packet.runtime ?? "").trim() || !String(packet.qaResult ?? "").trim()) {
    return { ok: false, error: "Quality return is incomplete." };
  }
  return { ok: true };
}

export function raiseVideo1OwnerMatter(state, packet, nowIso = new Date().toISOString()) {
  const allowed = qualityMayRaise(packet);
  if (!allowed.ok) throw new Error(allowed.error);
  const existing = (state.matters ?? []).find((matter) => matter.id === VIDEO_1_MATTER_ID);
  if (
    existing &&
    (existing.tray === "ACTION_REQUIRED" || existing.tray === "WAITING_ON_MY_DECISION")
  ) {
    return state;
  }
  const matter = {
    id: VIDEO_1_MATTER_ID,
    recordId: VIDEO_1_RECORD_ID,
    matter: "Video 1: Clip Repurposing",
    tray: "ACTION_REQUIRED",
    ownerActionRequiredNow: true,
    blocksScoutOrSystem: true,
    movingNormally: false,
    status: "WAITING ON OWNER",
    stateChangedAt: nowIso,
    whyOnDesk: WHY,
    decisionRequired: NEED,
    ownerSteps: [
      "Watch the playable final MP4.",
      "Read the QA result and any explicit limits.",
      "Approve for Page 1, reject it, or send it back to Production.",
    ],
    whatHappensAfterSend:
      "Scout replaces the existing Page 1 demo asset only. No homepage redesign. No publish / no merge / no push.",
    assignedRecipient: "Owner",
    nextHandoff: "Owner accepts, rejects, or sends back. Scout does not bring files.",
    ruleRecordId: null,
    ownerQuestions: [],
    judgmentKind: "studio_demo_owner_acceptance",
    playableAssetUrl: VIDEO_1_ASSET_URL,
    runtime: packet.runtime,
    qaResult: packet.qaResult,
    explicitLimits: [...(packet.explicitLimits ?? [])],
    audioStatus: packet.audioStatus ?? "",
    qualityClassification: packet.classification,
    sourceConcept: packet.sourceConcept ?? "",
    presenterConsistency: packet.presenterConsistency ?? "",
    packageTruth: packet.packageTruth ?? "",
    integrationAuthorized: false,
  };
  return {
    openMatterId: VIDEO_1_MATTER_ID,
    matters: [...(state.matters ?? []).filter((entry) => entry.id !== VIDEO_1_MATTER_ID), matter],
  };
}

export function persistVideo1Decision(state, action, note = "", nowIso = new Date().toISOString()) {
  const matter = (state.matters ?? []).find((entry) => entry.id === VIDEO_1_MATTER_ID);
  if (!matter) return null;
  const decision =
    action === "approve" ? "APPROVE" : action === "reject" ? "REJECT" : "SEND_BACK";
  const record = {
    packageId: "STUDIO-DEMO-VIDEO-1-CLIP-REPURPOSING",
    matterId: VIDEO_1_MATTER_ID,
    decision,
    integrationAuthorized: decision === "APPROVE",
    homepageDesignMayChange: false,
    noPublishNoMergeNoPush: true,
    decidedAt: nowIso,
    note: String(note ?? "").trim(),
    nextActor:
      decision === "APPROVE" ? "scout" : decision === "SEND_BACK" ? "production_team" : "none",
    ownerDecision: matter.ownerDecision ?? decision,
  };
  mkdirSync(path.dirname(DECISION_JSON), { recursive: true });
  writeFileSync(DECISION_JSON, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

export function stageReturnedMp4(sourcePath) {
  if (!sourcePath || !existsSync(sourcePath)) {
    throw new Error("Quality return is missing a playable MP4.");
  }
  mkdirSync(RETURN_DIR, { recursive: true });
  copyFileSync(sourcePath, RETURN_MP4);
  return RETURN_MP4;
}
