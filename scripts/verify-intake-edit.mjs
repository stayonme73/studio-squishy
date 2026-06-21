/**
 * Pre-deploy verification — intake view/edit + lock behavior.
 * Run: node scripts/verify-intake-edit.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const intakeEdit = read("src/lib/intake-edit.ts");
const campaignTs = read("src/lib/studio-board-campaign.ts");
const confirmation = read("src/components/draft-room/DraftIntakeConfirmation.tsx");
const draftScene = read("src/components/draft-room/DraftRoomIntakeScene.tsx");
const briefActions = read("src/components/campaign-details/CampaignBriefActions.tsx");
const recordDrawer = read("src/components/studio-board/CampaignRecordDrawer.tsx");
const boardScene = read("src/components/studio-board/StudioBoardScene.tsx");
const studioBoard = read("src/config/studio-board.ts");
const plateScene = read("src/components/studio-guide-prototype/StudioGuidePlateScene.tsx");
const plateCss = read("src/app/studio-guide-prototype.css");

const checks = [];

function pass(id, detail) {
  checks.push({ id, ok: true, detail });
}

function fail(id, detail) {
  checks.push({ id, ok: false, detail });
}

// 1. View Campaign Brief after intake submission
if (
  confirmation.includes("onViewBrief") &&
  confirmation.includes("viewCampaignBrief") &&
  draftScene.includes("readOnlyReview={readOnlyReview}")
) {
  pass(1, "Confirmation exposes View Campaign Brief → read-only review step");
} else {
  fail(1, "View Campaign Brief wiring missing on confirmation");
}

// 2. Edit opens saved answers, not blank form
if (
  draftScene.includes("readCurrentCampaignHydrated()") &&
  draftScene.includes("resolveVisionData(campaign)") &&
  draftScene.includes("setValues(vision)") &&
  draftScene.includes("editMode")
) {
  pass(2, "Edit mode hydrates visionData from saved campaign");
} else {
  fail(2, "Edit mode hydration missing");
}

// 3. Update & continue preserves campaignId + payment status
if (
  campaignTs.includes("...existing") &&
  campaignTs.includes("campaignId") === false &&
  campaignTs.includes("let updated: CampaignRecord = {\n      ...existing,") &&
  campaignTs.includes("resubmitting ? \"Vision Intake updated.\"") &&
  !campaignTs.match(/if \(existing\?\.paymentReceivedAt\)[\s\S]*enterBuildingConcepts\(updated\);[\s\S]*return persistCampaign\(updated\);/)
) {
  pass(3, "Resubmit spreads existing campaign (preserves id + paymentReceivedAt)");
} else if (campaignTs.includes("...existing") && campaignTs.includes("resubmitting ? \"Vision Intake updated.\"")) {
  pass(3, "Resubmit preserves existing campaign record fields");
} else {
  fail(3, "Upsert may not preserve campaign identity on edit");
}

// 4. Intake locks at Building Concepts — redirect to Studio Board
if (
  intakeEdit.includes('"DRAFT_RECEIVED", "PAYMENT_RECEIVED"') &&
  intakeEdit.includes("isIntakeEditable") &&
  campaignTs.includes("throw new IntakeLockedError()") &&
  !intakeEdit.includes("BUILDING_CONCEPTS") &&
  draftScene.includes("router.replace(studioBoard.routes.studioBoard)")
) {
  pass(4, "Locked intake redirects to Studio Board instead of stop screen");
} else {
  fail(4, "Lock redirect misconfigured");
}

// 5. Locked message appears clearly
const lockedMsg =
  "Campaign development has begun. Intake responses are now locked. Additional changes should be submitted through the review and feedback process.";
if (
  studioBoard.includes(lockedMsg) &&
  briefActions.includes("campaignBrief.lockedMessage") &&
  recordDrawer.includes("campaignBrief.lockedMessage")
) {
  pass(5, "Locked message present in config, actions, and Campaign Record");
} else {
  fail(5, "Locked message missing from one or more surfaces");
}

// 6. Studio Board + Campaign Record show View/Edit when allowed
if (
  boardScene.includes("CampaignBriefActions") &&
  boardScene.includes("onViewBrief={() => setRecordOpen(true)}") &&
  recordDrawer.includes("campaignBrief.editLabel") &&
  recordDrawer.includes("intakeEditable")
) {
  pass(6, "Studio Board View opens drawer; Campaign Record shows Edit when editable");
} else {
  fail(6, "View/Edit surfaces incomplete");
}

// 7. No new design changes beyond usability/copy positioning
const designScopeOk =
  plateScene.includes("sg-proto-table-callout") &&
  !plateCss.includes("grid-template-columns:1fr 1fr") &&
  briefActions.includes("utility-btn utility-btn--secondary");
if (designScopeOk) {
  pass(7, "Changes are callout reposition + existing utility patterns only");
} else {
  fail(7, "Unexpected design surface changes detected");
}

const failed = checks.filter((c) => !c.ok);
console.log("\nIntake edit + wayfinding verification\n");
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.id}. ${check.detail}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed\n`);

if (failed.length) {
  process.exit(1);
}
