/**
 * Builder QA — submitted Intake must activate Machine Design Production
 * on the Owner's real Samsung confirmation campaign.
 *
 * Does not remint Maya. Does not merge. Does not push. Does not open Review.
 *
 * Usage: npx tsx scripts/mobile-intake-activate-production-qa.mts
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth/session";
import { findUserById, toPublicUser } from "../src/lib/auth/users";
import { readCampaignEnvelope } from "../src/lib/campaign-store/store";
import { readTasksEnvelope } from "../src/lib/campaign-tasks/store";
import { isJobIntakeComplete } from "../src/lib/job-control/resolve-jobs";
import { isFlyerProductionIntakeReady } from "../src/lib/project-intake-flyer-production";
import { needsPaidOperatingRecovery } from "../src/lib/studio-paid-activation-recovery/needs-recovery";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery/recover";
import { resolveBoardNextActionPresentation } from "../src/lib/studio-board-next-action";

const BASE = process.env.STUDIO_PROOF_ORIGIN ?? "https://localhost:3000";
const OWNER_CAMPAIGN_ID = "9c6c25f2-2562-4192-97a5-44536e45cd18";
const OWNER_USER_ID = "1ae91f0a-0d15-4a11-8db7-1de627f74ea7";
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const MAYA_SHA =
  "3b19cfe722511f6358602b5635f0e65a7df4f2ab209a9cffdeba436da84983e3";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

async function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* .env.local is optional when the shell already has secrets */
  }
}

async function sha256File(file: string) {
  const buf = await readFile(file);
  return createHash("sha256").update(buf).digest("hex");
}

async function shot(page: import("playwright").Page, name: string) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function main() {
  await loadEnvLocal();
  await mkdir(OUT, { recursive: true });
  const report: Record<string, unknown> = {
    ok: false,
    origin: BASE,
    campaignId: OWNER_CAMPAIGN_ID,
    checks: {},
    proofs: [] as string[],
  };

  const mayaPath = path.join(process.cwd(), "data", "campaigns", `${MAYA_ID}.json`);
  const mayaBefore = await sha256File(mayaPath);
  report.mayaBefore = mayaBefore;
  const campaignFilesBefore = (await readdir(path.join(process.cwd(), "data", "campaigns"))).filter(
    (name) => name.endsWith(".json"),
  );
  const envelope = await readCampaignEnvelope(OWNER_CAMPAIGN_ID);
  if (!envelope) {
    throw new Error("Owner campaign missing");
  }
  const before = envelope.record;
  const lockedMustInclude = String(
    before.routeMapIntake?.answers?.["v2-rtu-flyer:mustInclude"] ?? "",
  );
  report.before = {
    clientUserId: envelope.clientUserId,
    intakeSubmittedAt: before.routeMapIntakeSubmittedAt,
    activationPhase: before.postPayActivation?.phase,
    activationIntakeComplete: before.postPayActivation?.intakeComplete,
    dispatchStatus: before.dispatchExecution?.status,
    flyerBlocker: before.dispatchExecution?.records?.[0]?.blocker,
  };

  const checks = report.checks as Record<string, boolean>;
  checks.ownedByTagia = envelope.clientUserId === OWNER_USER_ID;
  checks.intakeSubmitted = Boolean(before.routeMapIntakeSubmittedAt);
  checks.intakeRecognized = isJobIntakeComplete(before);
  checks.flyerFieldsPresent = isFlyerProductionIntakeReady(before);
  checks.needsRecoveryBefore =
    needsPaidOperatingRecovery(before) ||
    before.postPayActivation?.phase === "ready_for_routing";
  checks.mayaShaBefore = mayaBefore === MAYA_SHA;
  checks.noInventedContactInLockedIntake =
    !/\(\d{3}\)/.test(lockedMustInclude) &&
    !/\$\d/.test(lockedMustInclude) &&
    !/\.example\b/i.test(lockedMustInclude);

  const recovered = await recoverPaidOperatingChain(before, {
    identitySession: {
      sessionCurrentCampaignId: OWNER_CAMPAIGN_ID,
      sessionClientUserId: OWNER_USER_ID,
      intakeCampaignId: OWNER_CAMPAIGN_ID,
    },
  });

  const afterEnvelope = await readCampaignEnvelope(OWNER_CAMPAIGN_ID);
  const after = afterEnvelope?.record ?? recovered.campaign;
  const flyer = after.dispatchExecution?.records?.find(
    (record) => record.skuId === "v2-rtu-flyer",
  );
  const observer = after.dispatchExecution?.designRendererObserver?.results?.find(
    (result) => result.skuId === "v2-rtu-flyer",
  );
  const tasks = await readTasksEnvelope(OWNER_CAMPAIGN_ID);
  const flyerJob = tasks?.jobRecords?.find((job) => job.skuId === "v2-rtu-flyer");
  const identity = after.dispatchExecution?.customerIdentitySafety ?? null;
  const board = resolveBoardNextActionPresentation({
    campaign: after,
    displayFacts: {
      blockingRequiredCount: after.materialsSummary?.blockingRequiredCount ?? 0,
      movedToProduction: Boolean(flyerJob?.productionStartedAt),
      productionGatePassed: Boolean(flyerJob?.productionStartedAt),
    },
  });

  report.after = {
    activationPhase: after.postPayActivation?.phase,
    activationIntakeComplete: after.postPayActivation?.intakeComplete,
    dispatchStatus: after.dispatchExecution?.status,
    flyerStatus: flyer?.status,
    executionIdentityReady: flyer?.executionIdentityReady ?? false,
    flyerBlocker: flyer?.blocker ?? null,
    observer,
    identity,
    flyerJobSpine: flyerJob?.spineStatus ?? null,
    productionStartedAt: flyerJob?.productionStartedAt ?? null,
    qaRecords: (tasks?.qaRecords ?? []).length,
    boardStatus: board.statusLabel,
    boardLead: board.lead,
    recovered: recovered.recovered,
    recoverReason: recovered.reason,
    lastError: recovered.lastError ?? null,
    revisionRoundsUsed: after.revisionRoundsUsed ?? 0,
  };

  checks.intakeStillSubmitted = Boolean(after.routeMapIntakeSubmittedAt);
  checks.sameCampaign = after.campaignId === OWNER_CAMPAIGN_ID;
  checks.sameOwner = afterEnvelope?.clientUserId === OWNER_USER_ID;
  checks.activationReady =
    after.postPayActivation?.phase === "ready_for_routing" &&
    after.postPayActivation?.intakeComplete === true;
  checks.identityNotBlocked = identity == null || identity.status !== "blocked";
  checks.executionIdentityReady = flyer?.executionIdentityReady === true;
  checks.designInvoked = observer?.action === "invoked";
  checks.designSucceeded = observer?.ok === true && observer?.action === "invoked";
  checks.noOwnerRoutine = observer?.ownerRoutineProduction === "NONE";
  checks.notAwaitingIntake = flyer?.blocker !== "activation_phase:awaiting_intake";
  checks.productionStarted = Boolean(flyerJob?.productionStartedAt);
  checks.qaPathBegan =
    flyerJob?.spineStatus === "ready_for_review" ||
    Boolean(flyerJob?.internalQaReviewAuthorization) ||
    (tasks?.qaRecords ?? []).length > 0;
  checks.boardMovedPastIntakeWait = board.statusLabel !== "Project Intake Received";
  checks.revisionUnconsumed = (after.revisionRoundsUsed ?? 0) === 0;
  checks.mustIncludeUnchanged =
    String(after.routeMapIntake?.answers?.["v2-rtu-flyer:mustInclude"] ?? "") ===
    lockedMustInclude;

  const userRecord = await findUserById(OWNER_USER_ID);
  if (!userRecord || !process.env.SESSION_SECRET) {
    throw new Error("Owner session cannot be minted — SESSION_SECRET or user missing");
  }
  const token = await createSessionToken(toPublicUser(userRecord));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      url: BASE,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/studio-board`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(3500);
    (report.proofs as string[]).push(
      await shot(page, "intake-activate-production-01-board.png"),
    );
    const status = page.getByText("CURRENT STATUS", { exact: true }).first();
    if (await status.count()) {
      await status.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      (report.proofs as string[]).push(
        await shot(page, "intake-activate-production-02-status.png"),
      );
    }
    const text = await page.locator("body").innerText();
    report.boardTextExcerpt = text.slice(0, 1200);
    checks.boardShowsTheStudio = /the Studio/i.test(text);
    checks.boardNotMaya = !/Maya’s Mobile Boutique/i.test(text);
    checks.boardGreetingTagia =
      /Good (morning|afternoon|evening), Tagia/i.test(text);
    checks.boardWhoActsStudio = /WHO ACTS NEXT[\s\S]{0,40}(The Studio|You)/i.test(
      text,
    );
    checks.boardReadyForReview = /Ready for Review/i.test(text);
    checks.boardLeftPreparingStage = !/Preparing Next Stage/i.test(text);
  } finally {
    await browser.close();
  }

  const campaignFilesAfter = (await readdir(path.join(process.cwd(), "data", "campaigns"))).filter(
    (name) => name.endsWith(".json"),
  );
  checks.noDuplicateCampaign = campaignFilesAfter.length === campaignFilesBefore.length;
  const mayaAfter = await sha256File(mayaPath);
  report.mayaAfter = mayaAfter;
  checks.mayaUntouched = mayaAfter === MAYA_SHA;

  const failed = Object.entries(checks).filter(([, value]) => !value);
  report.ok = failed.length === 0;
  report.failed = failed.map(([key]) => key);

  await writeFile(
    path.join(OUT, "intake-activate-production-qa.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
