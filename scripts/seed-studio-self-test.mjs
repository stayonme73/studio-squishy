/**
 * Studio Self-Test V1 — seed campaign + deliberate scenario states.
 *
 * Prerequisites (recommended): dev server on localhost:3000, SESSION_SECRET in .env.local
 * Offline mode: writes campaign envelope directly; tasks/materials need server for generation.
 *
 * Usage:
 *   node scripts/seed-studio-self-test.mjs
 *   node scripts/seed-studio-self-test.mjs --offline
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  BASE,
  PATHS,
  STAFF_SELF_TEST,
  STUDIO_SELF_TEST_CAMPAIGN_ID,
  buildCampaignEnvelope,
  buildSelfTestCampaignRecord,
  fetchApi,
  login,
  CookieJar,
} from "./lib/studio-self-test-shared.mjs";

const OFFLINE = process.argv.includes("--offline");

const EXCEPTION_IDS = {
  complianceHold: "exc-self-test-compliance",
  directionDisagreement: "exc-self-test-direction",
  scopeChange: "exc-self-test-scope",
  deadlineRisk: "exc-self-test-deadline",
  missingClientFact: "exc-self-test-missing-fact",
  clientRequest: "exc-self-test-client-request",
};

async function ensureUsers() {
  await mkdir(path.dirname(PATHS.users), { recursive: true });
  let users = [];
  try {
    users = JSON.parse(await readFile(PATHS.users, "utf8"));
  } catch {
    users = [];
  }

  const upsert = (entry) => {
    const existing = users.find((user) => user.id === entry.id);
    if (existing) Object.assign(existing, entry);
    else users.push({ password: "dev-only", ...entry });
  };

  upsert({
    id: "client-self-test",
    email: "studio-self-test@local.dev",
    displayName: "Studio Self-Test Client",
    roles: ["client"],
    currentCampaignId: STUDIO_SELF_TEST_CAMPAIGN_ID,
  });

  for (const staff of Object.values(STAFF_SELF_TEST)) {
    upsert({
      id: staff.id,
      email: staff.email,
      displayName: staff.displayName,
      roles: ["staff"],
    });
  }

  await writeFile(PATHS.users, JSON.stringify(users, null, 2), "utf8");
}

async function ensureAssignments() {
  await mkdir(path.dirname(PATHS.assignments), { recursive: true });
  await writeFile(
    PATHS.assignments,
    JSON.stringify(
      {
        staffByUserId: {
          [STAFF_SELF_TEST.producer.id]: [STUDIO_SELF_TEST_CAMPAIGN_ID],
          [STAFF_SELF_TEST.qa.id]: [STUDIO_SELF_TEST_CAMPAIGN_ID],
          [STAFF_SELF_TEST.strategy.id]: [STUDIO_SELF_TEST_CAMPAIGN_ID],
        },
        staffCapabilities: {
          [STAFF_SELF_TEST.producer.id]: STAFF_SELF_TEST.producer.capabilities,
          [STAFF_SELF_TEST.qa.id]: STAFF_SELF_TEST.qa.capabilities,
          [STAFF_SELF_TEST.strategy.id]: STAFF_SELF_TEST.strategy.capabilities,
        },
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function writeCampaignEnvelopeDirect() {
  await mkdir(PATHS.campaigns, { recursive: true });
  const envelope = buildCampaignEnvelope(STUDIO_SELF_TEST_CAMPAIGN_ID);
  await writeFile(
    path.join(PATHS.campaigns, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`),
    JSON.stringify(envelope, null, 2),
    "utf8",
  );
}

async function bootstrapViaApi(jar) {
  await login({ email: "studio-self-test@local.dev", password: "dev-only" }, jar);
  const patch = await fetchApi("/api/campaigns/current", {
    method: "PATCH",
    json: { record: buildSelfTestCampaignRecord() },
    jar,
  });
  if (patch.status !== 200) {
    throw new Error(`Client sync failed: HTTP ${patch.status} ${patch.text?.slice(0, 200)}`);
  }

  await login({ email: "tagia@local.dev", password: "dev-only" }, jar);
  const tasks = await fetchApi(`/api/campaigns/${STUDIO_SELF_TEST_CAMPAIGN_ID}/tasks`, { jar });
  if (tasks.status !== 200) {
    throw new Error(`Tasks init failed: HTTP ${tasks.status}`);
  }
  const materials = await fetchApi(`/api/campaigns/${STUDIO_SELF_TEST_CAMPAIGN_ID}/materials`, {
    jar,
  });
  if (materials.status !== 200) {
    throw new Error(`Materials init failed: HTTP ${materials.status}`);
  }
}

async function isServerAvailable() {
  try {
    const res = await fetch(`${BASE}/api/auth/login`, { method: "GET" });
    return res.status === 405 || res.status === 200 || res.status === 401;
  } catch {
    return false;
  }
}

function buildExceptionRecord({
  id,
  kind,
  status,
  title,
  description,
  taskId,
  clientRequestDraft,
}) {
  const now = new Date().toISOString();
  return {
    id,
    campaignId: STUDIO_SELF_TEST_CAMPAIGN_ID,
    kind,
    status,
    title,
    description,
    createdAt: now,
    updatedAt: now,
    raisedByUserId: STAFF_SELF_TEST.qa.id,
    raisedByDisplayName: STAFF_SELF_TEST.qa.displayName,
    raisedByRole: "qa",
    taskId,
    clientRequestDraft,
  };
}

async function seedOfflineTasksEnvelope() {
  await mkdir(PATHS.tasks, { recursive: true });
  const now = new Date().toISOString();
  const baseTasks = [
    {
      id: "sm-001:strategy_content_direction",
      title: "Social Media Launch Set — Content direction",
      phase: "strategy_content_direction",
      status: "complete",
      workflowState: "complete",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "Social Media Launch Set",
      dependsOn: [],
      responsibleRole: "strategy",
    },
    {
      id: "sm-001:copy",
      title: "Social Media Launch Set — Copy",
      phase: "copy",
      status: "ready_for_qa",
      workflowState: "ready_for_qa",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "Social Media Launch Set",
      dependsOn: ["sm-001:strategy_content_direction"],
      responsibleRole: "copy",
    },
    {
      id: "sm-001:creative",
      title: "Social Media Launch Set — Creative",
      phase: "creative",
      status: "not_ready",
      workflowState: "unstarted",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "Social Media Launch Set",
      dependsOn: ["sm-001:copy"],
      responsibleRole: "creative_production",
    },
    {
      id: "sm-001:qa",
      title: "Social Media Launch Set — QA review",
      phase: "qa",
      status: "not_ready",
      workflowState: "unstarted",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "Social Media Launch Set",
      dependsOn: ["sm-001:creative"],
      responsibleRole: "qa",
    },
    {
      id: "sm-001:delivery_prep",
      title: "Social Media Launch Set — Delivery prep",
      phase: "delivery_prep",
      status: "not_ready",
      workflowState: "unstarted",
      relatedServiceIds: ["sm-001"],
      familyId: "social",
      catalogFamilyId: "social_media",
      serviceName: "Social Media Launch Set",
      dependsOn: ["sm-001:qa"],
      responsibleRole: "producer_dispatcher",
    },
  ];
  const envelope = {
    campaignId: STUDIO_SELF_TEST_CAMPAIGN_ID,
    planFingerprint: "sm-001:one_time",
    tasks: baseTasks,
    handoffs: [],
    qaRecords: [],
    exceptionRecords: [],
    exceptionEvents: [],
    version: 6,
    updatedAt: now,
    syncedAt: now,
  };
  await writeFile(
    path.join(PATHS.tasks, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`),
    JSON.stringify(envelope, null, 2),
    "utf8",
  );
}

async function seedOfflineMaterialsEnvelope() {
  await mkdir(PATHS.materials, { recursive: true });
  const now = new Date().toISOString();
  const envelope = {
    campaignId: STUDIO_SELF_TEST_CAMPAIGN_ID,
    items: [
      {
        id: "mat-self-test-logo",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Brand logo",
        reason: "Required for social post creative",
        relatedServiceIds: ["sm-001"],
        uploadStatus: "none",
      },
      {
        id: "mat-self-test-photos",
        category: "photo-video",
        requirementLevel: "optional",
        reviewStatus: "not_needed",
        contentKind: "file-metadata",
        label: "Product photos",
        reason: "Optional reference for posts",
        relatedServiceIds: ["sm-001"],
        uploadStatus: "none",
      },
    ],
    updatedAt: now,
    version: 1,
    syncedAt: now,
  };
  await writeFile(
    path.join(PATHS.materials, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`),
    JSON.stringify(envelope, null, 2),
    "utf8",
  );
}

async function seedTaskAndExceptionStates() {
  const tasksPath = path.join(PATHS.tasks, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`);
  let envelope;
  try {
    envelope = JSON.parse(await readFile(tasksPath, "utf8"));
  } catch {
    await seedOfflineTasksEnvelope();
    envelope = JSON.parse(await readFile(tasksPath, "utf8"));
  }

  for (const task of envelope.tasks ?? []) {
    if (task.id === "sm-001:strategy_content_direction") {
      task.workflowState = "complete";
      task.status = "complete";
    }
    if (task.id === "sm-001:copy") {
      task.workflowState = "ready_for_qa";
      task.status = "ready_for_qa";
      delete task.claimedByUserId;
      delete task.claimedByDisplayName;
      delete task.claimedAt;
      delete task.workflowBlockedReason;
    }
  }

  const now = new Date().toISOString();
  envelope.exceptionRecords = [
    buildExceptionRecord({
      id: EXCEPTION_IDS.complianceHold,
      kind: "compliance_hold",
      status: "waiting_owner",
      title: "Self-test: compliance hold",
      description: "Seeded compliance hold — Owner decision required",
      taskId: "sm-001:copy",
    }),
    buildExceptionRecord({
      id: EXCEPTION_IDS.directionDisagreement,
      kind: "direction_disagreement",
      status: "open",
      title: "Self-test: direction disagreement",
      description: "Seeded direction disagreement between strategy and copy",
      taskId: "sm-001:copy",
    }),
    buildExceptionRecord({
      id: EXCEPTION_IDS.scopeChange,
      kind: "scope_change",
      status: "waiting_owner",
      title: "Self-test: scope change",
      description: "Client asked to add extra post — scope change pending Owner",
      taskId: "sm-001:creative",
    }),
    buildExceptionRecord({
      id: EXCEPTION_IDS.deadlineRisk,
      kind: "deadline_risk",
      status: "open",
      title: "Self-test: deadline risk",
      description: "Launch date at risk due to missing logo",
      taskId: "sm-001:copy",
    }),
    buildExceptionRecord({
      id: EXCEPTION_IDS.missingClientFact,
      kind: "missing_client_fact",
      status: "open",
      title: "Self-test: missing client fact",
      description: "Need exact promo code for CTA copy",
      taskId: "sm-001:copy",
    }),
    buildExceptionRecord({
      id: EXCEPTION_IDS.clientRequest,
      kind: "client_request",
      status: "waiting_owner",
      title: "Self-test: client material request",
      description: "Need high-res logo from client — promotable",
      taskId: "sm-001:copy",
      clientRequestDraft: {
        whyTeamCannotSolveInternally: "Only client has vector logo file",
        exactClientOnlyItem: "Vector logo (.ai or .svg)",
        whyBlocksWork: "Creative cannot finalize posts without logo",
      },
    }),
  ];

  envelope.exceptionEvents = envelope.exceptionRecords.map((record) => ({
    id: randomUUID(),
    exceptionId: record.id,
    campaignId: STUDIO_SELF_TEST_CAMPAIGN_ID,
    createdAt: now,
    actorUserId: STAFF_SELF_TEST.qa.id,
    actorDisplayName: STAFF_SELF_TEST.qa.displayName,
    actorRole: "qa",
    action: "raised",
    statusAfter: record.status,
    notes: record.description,
  }));

  envelope.version = Math.max(envelope.version ?? 1, 6);
  await writeFile(tasksPath, JSON.stringify(envelope, null, 2), "utf8");
}

async function seedMaterialsStates() {
  const materialsPath = path.join(PATHS.materials, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`);
  let envelope;
  try {
    envelope = JSON.parse(await readFile(materialsPath, "utf8"));
  } catch {
    await seedOfflineMaterialsEnvelope();
    envelope = JSON.parse(await readFile(materialsPath, "utf8"));
  }

  let markedMissing = false;
  for (const item of envelope.items ?? []) {
    if (item.requirementLevel === "required" && !markedMissing) {
      item.reviewStatus = "missing";
      item.uploadStatus = "none";
      markedMissing = true;
    }
  }

  if (!markedMissing && envelope.items?.length) {
    envelope.items[0].requirementLevel = "required";
    envelope.items[0].reviewStatus = "missing";
    envelope.items[0].uploadStatus = "none";
  }

  envelope.updatedAt = new Date().toISOString();
  await writeFile(materialsPath, JSON.stringify(envelope, null, 2), "utf8");
}

async function seedProductionStore() {
  await mkdir(PATHS.production, { recursive: true });
  const now = new Date().toISOString();
  const productionPath = path.join(PATHS.production, `${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`);
  const envelope = {
    campaignId: STUDIO_SELF_TEST_CAMPAIGN_ID,
    version: 1,
    planFingerprint: "sm-001:one_time",
    workUnits: [
      {
        id: "sm-001:production",
        serviceId: "sm-001",
        deliverableKeys: ["sm-001:social_posts", "sm-001:content_calendar"],
        planFingerprint: "sm-001:one_time",
        status: "active",
        currentStage: "copy",
        currentTaskId: "sm-001:copy",
        stageLineage: [
          {
            stage: "strategy_content_direction",
            taskId: "sm-001:strategy_content_direction",
            currentVersionId: "self-test-strategy-v1",
          },
          {
            stage: "copy",
            taskId: "sm-001:copy",
            currentVersionId: "self-test-copy-v1",
          },
          {
            stage: "creative",
            taskId: "sm-001:creative",
            currentVersionId: null,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    versions: [
      {
        id: "self-test-strategy-v1",
        workUnitId: "sm-001:production",
        taskId: "sm-001:strategy_content_direction",
        stage: "strategy_content_direction",
        reason: "initial",
        contentKind: "plain_text",
        body: "Self-test strategy direction — promote The Studio launch",
        createdAt: now,
        createdByUserId: STAFF_SELF_TEST.strategy.id,
        createdByDisplayName: STAFF_SELF_TEST.strategy.displayName,
        qaPin: {
          workVersionId: "self-test-strategy-v1",
          qaRecordId: "self-test-qa-strategy",
          action: "qa_pass",
          pinnedAt: now,
        },
      },
      {
        id: "self-test-copy-v1",
        workUnitId: "sm-001:production",
        taskId: "sm-001:copy",
        stage: "copy",
        reason: "initial",
        contentKind: "plain_text",
        body: "Self-test copy draft — ready for QA",
        createdAt: now,
        createdByUserId: STAFF_SELF_TEST.producer.id,
        createdByDisplayName: STAFF_SELF_TEST.producer.displayName,
      },
    ],
    updatedAt: now,
    syncedAt: now,
  };
  await writeFile(productionPath, JSON.stringify(envelope, null, 2), "utf8");
}

async function resetResultsFile() {
  const { spawnSync } = await import("node:child_process");
  spawnSync("node", ["scripts/run-studio-self-test.mjs", "--init-only"], {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  try {
    const raw = await readFile(PATHS.results, "utf8");
    const file = JSON.parse(raw);
    file.lastSeededAt = new Date().toISOString();
    await writeFile(PATHS.results, JSON.stringify(file, null, 2), "utf8");
  } catch {
    // results init optional if runner missing
  }
}

async function main() {
  console.log("Studio Self-Test seed — campaign:", STUDIO_SELF_TEST_CAMPAIGN_ID);
  await ensureUsers();
  await ensureAssignments();
  await writeCampaignEnvelopeDirect();

  const serverUp = !OFFLINE && (await isServerAvailable());
  if (serverUp) {
    const jar = new CookieJar();
    await bootstrapViaApi(jar);
    console.log("API bootstrap: tasks + materials initialized");
  } else {
    console.warn(
      OFFLINE
        ? "Offline mode — campaign written; start dev server and re-run without --offline for tasks/materials."
        : "Dev server not reachable — campaign written; re-run seed when server is up.",
    );
  }

  await seedTaskAndExceptionStates();
  await seedMaterialsStates();
  await seedProductionStore();

  await resetResultsFile();

  console.log("\nSeeded:");
  console.log(`  Campaign:  data/campaigns/${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`);
  console.log(`  Tasks:     data/campaign-tasks/${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`);
  console.log(`  Materials: data/campaign-materials/${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`);
  console.log(`  Production:data/campaign-production/${STUDIO_SELF_TEST_CAMPAIGN_ID}.json`);
  console.log(`  Scoreboard: data/studio-self-test-results.json (reset to not_run)`);
  console.log("\nNext: node scripts/run-studio-self-test.mjs");
  console.log(`View: ${BASE}/file-room/studio-self-test (owner login)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
