/**
 * Internal Team Operations Audit + Work Packet Wiring V1 screenshots.
 *
 * Requires a local app server at VERIFY_BASE_URL (defaults to http://localhost:3000).
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "tmp", "team-work-packet-v1");
const CAMPAIGN_ID = "team-work-packet-v1";
const JOB_ID = `${CAMPAIGN_ID}:sm-001`;
const NOW = "2026-07-03T17:15:00.000Z";

const PATHS = {
  campaigns: path.join(process.cwd(), "data", "campaigns"),
  tasks: path.join(process.cwd(), "data", "campaign-tasks"),
  materials: path.join(process.cwd(), "data", "campaign-materials"),
};

const screenshots = {
  productionHandoff: path.join(OUT_DIR, "01-production-workspace-handoff.png"),
  teamOfficePacket: path.join(OUT_DIR, "02-team-office-packet-view.png"),
  activityTimeline: path.join(OUT_DIR, "03-assignment-activity-timeline.png"),
  returnedFile: path.join(OUT_DIR, "04-returned-draft-final-reference.png"),
  ownerApprovalQueue: path.join(OUT_DIR, "05-owner-approval-queue.png"),
};

function lineItem() {
  return {
    skuId: "sm-001",
    serviceId: "sm-001",
    serviceName: "Social Media Launch Set",
    billingType: "one_time",
    exactPriceCents: 30000,
    priceDisplay: "$300",
    deliverables: ["Six branded static social posts"],
    exclusions: [],
    timingWindowLabel: "3-5 business days",
    revisionRule: "1 revision round",
    clientResponsibilities: ["Provide brand assets"],
    executionResponsibility: "The Studio creates and delivers",
  };
}

function task(id, title, phase, status, workflowState, responsibleRole, dependsOn = []) {
  return {
    id,
    title,
    phase,
    status,
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social Media Launch Set",
    dependsOn,
    workflowState,
    responsibleRole,
    ...(workflowState === "in_progress"
      ? {
          claimedByUserId: "staff-dev",
          claimedByDisplayName: "Staff",
          claimedAt: NOW,
        }
      : {}),
  };
}

async function seed() {
  await mkdir(PATHS.campaigns, { recursive: true });
  await mkdir(PATHS.tasks, { recursive: true });
  await mkdir(PATHS.materials, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const campaignEnvelope = {
    campaignId: CAMPAIGN_ID,
    clientUserId: "tagia",
    syncVersion: 1,
    syncedAt: NOW,
    record: {
      campaignId: CAMPAIGN_ID,
      campaignName: "Team Work Packet V1",
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: "Internal Work Packet handoff screenshot campaign.",
      estimatedCompletion: "July 18, 2026",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      paymentReceivedAt: "2026-07-02T10:00:00.000Z",
      projectDetailsSubmittedAt: "2026-07-02T11:00:00.000Z",
      selectedCampaignOption: "Option A",
      approvedStudioPlan: {
        selectedServiceIds: ["sm-001"],
        includedServiceIds: ["sm-001"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 30000,
        monthlyTotalCents: 0,
        amountDueTodayCents: 30000,
        lineItems: [lineItem()],
        approvedAt: "2026-07-02T09:30:00.000Z",
      },
      createdAt: "2026-07-02T08:00:00.000Z",
      updatedAt: NOW,
    },
  };

  const packetId = `packet:${JOB_ID}:strategy`;
  const tasksEnvelope = {
    campaignId: CAMPAIGN_ID,
    planFingerprint: "sm-001:one_time",
    tasks: [
      task(
        "sm-001:strategy_content_direction",
        "Social Media Launch Set - Content direction",
        "strategy_content_direction",
        "in_progress",
        "in_progress",
        "strategy",
      ),
      task("sm-001:copy", "Social Media Launch Set - Copy", "copy", "not_ready", "unstarted", "copy", [
        "sm-001:strategy_content_direction",
      ]),
      task(
        "sm-001:creative",
        "Social Media Launch Set - Creative",
        "creative",
        "not_ready",
        "unstarted",
        "creative_production",
        ["sm-001:copy"],
      ),
      task("sm-001:qa", "Social Media Launch Set - QA review", "qa", "not_ready", "unstarted", "qa", [
        "sm-001:creative",
      ]),
      task(
        "sm-001:delivery_prep",
        "Social Media Launch Set - Delivery prep",
        "delivery_prep",
        "not_ready",
        "unstarted",
        "producer_dispatcher",
        ["sm-001:qa"],
      ),
    ],
    handoffs: [],
    qaRecords: [],
    exceptionRecords: [],
    exceptionEvents: [],
    jobRecords: [
      {
        jobId: JOB_ID,
        campaignId: CAMPAIGN_ID,
        skuId: "sm-001",
        serviceName: "Social Media Launch Set",
        spineStatus: "building_concepts",
        productionLane: "quick",
        intakeComplete: true,
        productionStartedAt: "2026-07-03T10:00:00.000Z",
        ownerApprovalPending: "before_review",
        clientDeadline: "July 18, 2026",
        deliverablePrep: [
          {
            deliverableKey: "deliverable-0",
            label: "Six branded static social posts",
            preparedAt: "2026-07-03T17:20:00.000Z",
            preparedBy: { role: "staff", userId: "staff-dev", displayName: "Staff" },
          },
        ],
        internalNotes: [
          {
            id: `note:${JOB_ID}:1`,
            content: "Use client-provided product photos and keep CTA soft.",
            createdAt: "2026-07-03T16:50:00.000Z",
            author: { role: "staff", displayName: "Producer" },
          },
        ],
        workingFileRefs: [
          {
            id: `ref:${JOB_ID}:1`,
            label: "Source photo folder",
            url: "https://files.example/team-work-packet/source-photos",
            addedAt: "2026-07-03T16:40:00.000Z",
            author: { role: "staff", displayName: "Producer" },
          },
          {
            id: `ref:${JOB_ID}:2`,
            label: "Final return: Social posts final",
            url: "https://files.example/team-work-packet/social-posts-final.zip",
            addedAt: "2026-07-03T17:20:00.000Z",
            author: { role: "staff", userId: "staff-dev", displayName: "Staff" },
          },
        ],
        workPackets: [
          {
            id: packetId,
            jobId: JOB_ID,
            campaignId: CAMPAIGN_ID,
            role: "strategy",
            taskIds: ["sm-001:strategy_content_direction"],
            status: "returned",
            createdAt: "2026-07-03T17:00:00.000Z",
            updatedAt: "2026-07-03T17:20:00.000Z",
            assignmentEvents: [
              {
                id: `assign:${packetId}:2026-07-03T17:00:00.000Z`,
                assignedAt: "2026-07-03T17:00:00.000Z",
                assignedBy: { role: "staff", displayName: "Producer" },
                role: "strategy",
                note: "Route social posts direction into Strategy Office.",
              },
            ],
            returnedFileRefs: [
              {
                id: `wpr:${packetId}:2026-07-03T17:20:00.000Z`,
                kind: "final",
                label: "Social posts final",
                url: "https://files.example/team-work-packet/social-posts-final.zip",
                returnedAt: "2026-07-03T17:20:00.000Z",
                returnedBy: { role: "staff", userId: "staff-dev", displayName: "Staff" },
                deliverableKey: "deliverable-0",
                deliverableLabel: "Six branded static social posts",
                note: "Returned from Strategy Office for Owner review.",
              },
            ],
            returnLocation: "production_workspace",
            ownerApprovalRequired: true,
          },
        ],
        laneQueuedAt: "2026-07-03T10:00:00.000Z",
        updatedAt: NOW,
      },
    ],
    jobActivityEvents: [
      {
        id: `work_packet_assigned:${packetId}`,
        campaignId: CAMPAIGN_ID,
        jobId: JOB_ID,
        kind: "work_packet_assigned",
        occurredAt: "2026-07-03T17:00:00.000Z",
        actor: { role: "staff", displayName: "Producer" },
        reason: "Assigned Work Packet to strategy",
        messageRef: packetId,
      },
      {
        id: `work_packet_returned:${packetId}:final`,
        campaignId: CAMPAIGN_ID,
        jobId: JOB_ID,
        kind: "work_packet_returned",
        occurredAt: "2026-07-03T17:20:00.000Z",
        actor: { role: "staff", userId: "staff-dev", displayName: "Staff" },
        reason: "Returned final file: Social posts final",
        messageRef: `wpr:${packetId}:2026-07-03T17:20:00.000Z`,
      },
      {
        id: `approval:${JOB_ID}:2026-07-03T17:25:00.000Z`,
        campaignId: CAMPAIGN_ID,
        jobId: JOB_ID,
        kind: "approval",
        occurredAt: "2026-07-03T17:25:00.000Z",
        actor: { role: "staff", displayName: "Producer" },
        reason: "Submitted to client Review Room by production",
      },
    ],
    jobCommunicationRecords: [],
    updatedAt: NOW,
    version: 10,
    syncedAt: NOW,
  };

  const materialsEnvelope = {
    campaignId: CAMPAIGN_ID,
    items: [
      {
        id: "mat-brand-photos",
        category: "photo-video",
        requirementLevel: "required",
        reviewStatus: "submitted",
        contentKind: "file-metadata",
        label: "Brand photos",
        reason: "Needed for social post creative direction",
        relatedServiceIds: ["sm-001"],
        submittedAt: "2026-07-02T14:00:00.000Z",
        submittedBy: { role: "client", userId: "tagia", displayName: "Client" },
        uploadStatus: "metadata_only",
      },
    ],
    updatedAt: NOW,
    version: 1,
    syncedAt: NOW,
  };

  await writeFile(
    path.join(PATHS.campaigns, `${CAMPAIGN_ID}.json`),
    JSON.stringify(campaignEnvelope, null, 2),
  );
  await writeFile(
    path.join(PATHS.tasks, `${CAMPAIGN_ID}.json`),
    JSON.stringify(tasksEnvelope, null, 2),
  );
  await writeFile(
    path.join(PATHS.materials, `${CAMPAIGN_ID}.json`),
    JSON.stringify(materialsEnvelope, null, 2),
  );
}

async function ownerSessionCookie() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tagia@local.dev", password: "dev-only" }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error("No studio_session cookie returned.");
  return match[1];
}

async function main() {
  await seed();
  const session = await ownerSessionCookie();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    {
      name: "studio_session",
      value: session,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();

  try {
    const productionUrl = `${BASE}/file-room/${CAMPAIGN_ID}/production/${encodeURIComponent(JOB_ID)}`;
    await page.goto(productionUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".fr-production-workspace", { timeout: 30000 });
    await page.screenshot({ path: screenshots.productionHandoff, fullPage: true });

    await page.locator("text=Activity timeline").scrollIntoViewIfNeeded();
    await page.screenshot({ path: screenshots.activityTimeline, fullPage: false });

    await page.locator("text=Returned draft/final file refs").scrollIntoViewIfNeeded();
    await page.screenshot({ path: screenshots.returnedFile, fullPage: false });

    await page.goto(
      `${BASE}/file-room/${CAMPAIGN_ID}/office/strategy?task=sm-001%3Astrategy_content_direction`,
      { waitUntil: "networkidle" },
    );
    await page.waitForSelector("text=Work Packet", { timeout: 30000 });
    await page.screenshot({ path: screenshots.teamOfficePacket, fullPage: true });

    await page.goto(`${BASE}/file-room/owner-console`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Owner", { timeout: 30000 });
    await page.screenshot({ path: screenshots.ownerApprovalQueue, fullPage: true });

    await writeFile(
      path.join(OUT_DIR, "README.txt"),
      [
        "Internal Team Operations Audit + Work Packet Wiring V1",
        `Campaign ID: ${CAMPAIGN_ID}`,
        `Job ID: ${JOB_ID}`,
        `Captured: ${new Date().toISOString()}`,
        "",
        ...Object.entries(screenshots).map(([name, file]) => `${name}: ${file}`),
      ].join("\n"),
      "utf8",
    );
  } finally {
    await browser.close();
  }

  console.log(`Screenshots saved to ${OUT_DIR}`);
  for (const file of Object.values(screenshots)) console.log(file);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
