/**
 * Pre-deploy verification — Campaign Record / brief / concepts read merged vision data.
 * Run: node scripts/verify-campaign-vision.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const campaignVision = read("src/lib/campaign-vision.ts");
const campaignRecord = read("src/lib/campaign-record.ts");
const studioBoardCampaign = read("src/lib/studio-board-campaign.ts");
const draftIntake = read("src/lib/draft-intake.ts");
const draftRoom = read("src/config/draft-room.ts");
const briefExport = read("src/lib/campaign-brief-export.ts");
const concepts = read("src/lib/campaign-concepts.ts");
const detailsView = read("src/lib/campaign-details-view.ts");

const checks = [];

function pass(id, detail) {
  checks.push({ id, ok: true, detail });
}

function fail(id, detail) {
  checks.push({ id, ok: false, detail });
}

// 1. Shared merge + project resolution helpers exist
if (
  campaignVision.includes("mergeVisionData") &&
  campaignVision.includes("resolveDraftIntakeProject") &&
  campaignVision.includes("normalizeDraftIntakePayload")
) {
  pass(1, "campaign-vision helpers for merge + project resolution");
} else {
  fail(1, "campaign-vision.ts missing merge/project helpers");
}

// 2. resolveVisionData merges record + last-draft (not record-only)
if (
  campaignRecord.includes("mergeVisionData(fromRecord, fromDraft)") &&
  campaignRecord.includes("readLastDraftIntake()")
) {
  pass(2, "resolveVisionData merges campaign record with last-draft fallback");
} else {
  fail(2, "resolveVisionData does not merge sources");
}

// 3. Hydration backfills partial visionData from draft
if (
  studioBoardCampaign.includes("mergeVisionData(recordVision, draftVision)") &&
  studioBoardCampaign.includes("visionDataFromPayload(draft)")
) {
  pass(3, "hydrateCampaignIntake merges draft into partial record visionData");
} else {
  fail(3, "hydrateCampaignIntake missing draft merge");
}

// 4. Resubmit merges instead of blind overwrite
if (
  studioBoardCampaign.includes("mergeVisionData(nextVision, existingVision)") &&
  studioBoardCampaign.includes("existingVision ? mergeVisionData")
) {
  pass(4, "upsertCampaignFromIntake merges vision on resubmit");
} else {
  fail(4, "upsert may overwrite visionData on resubmit");
}

// 5. Submit normalizes payload before persist
if (
  draftIntake.includes("normalizeDraftIntakePayload(payload)") &&
  draftIntake.includes("normalizeDraftIntakePayload(JSON.parse")
) {
  pass(5, "Draft intake normalize on submit + read");
} else {
  fail(5, "Draft intake normalization missing");
}

// 6. Summary uses resolved project label (starter + detail)
if (
  draftRoom.includes("formatProjectValue(values.projectStarter, values.projectDetail)") &&
  draftRoom.includes("draftRoomIntakeAnswerSummary")
) {
  pass(6, "Intake summary resolves project from starter/detail fields");
} else {
  fail(6, "draftRoomIntakeAnswerSummary missing project resolution");
}

// 7. Copy brief + concepts + details all use resolveVisionData
if (
  briefExport.includes("resolveVisionData(campaign)") &&
  concepts.includes("resolveVisionData(campaign)") &&
  detailsView.includes("resolveVisionData(campaign)")
) {
  pass(7, "Brief export, concepts, and Campaign Record share resolveVisionData");
} else {
  fail(7, "Not all surfaces use resolveVisionData");
}

// 8. Display name resolves project from vision fields
if (campaignRecord.includes("resolveDraftIntakeProject")) {
  pass(8, "Campaign display name resolves project from vision fields");
} else {
  fail(8, "resolveCampaignDisplayName missing project resolution");
}

const failed = checks.filter((c) => !c.ok);
console.log("\nCampaign vision verification\n");
for (const check of checks) {
  console.log(`${check.ok ? "✓" : "✗"} ${check.id}. ${check.detail}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} passed\n`);

if (failed.length > 0) {
  process.exit(1);
}

assert.equal(failed.length, 0);
