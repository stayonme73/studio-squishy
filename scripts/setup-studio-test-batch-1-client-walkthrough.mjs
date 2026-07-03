/**
 * Client-led Social Posts walkthrough fixture for The Studio Test Batch 1.
 *
 * Creates/resets a separate paid campaign that is intentionally waiting on
 * client-provided Social Posts materials. Does not alter studio-test-batch-1.
 *
 * Usage:
 *   node scripts/setup-studio-test-batch-1-client-walkthrough.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CAMPAIGN_ID = "studio-test-batch-1-client-walkthrough";
export const SOURCE_BATCH_ID = "studio-test-batch-1";
export const CLIENT_USER_ID = "tagia-client-walkthrough";
export const CLIENT_EMAIL = "tagia-client-walkthrough@local.dev";
export const CLIENT_PASSWORD = "dev-only";
export const CLIENT_DISPLAY_NAME = "Tagia";
export const SEED_AT = "2026-07-03T22:45:00.000Z";
export const OUT_DIR = path.join(process.cwd(), "tmp", CAMPAIGN_ID);

export const SOCIAL_SKU_ID = "v2-rtu-social-posts";
export const SOCIAL_JOB_ID = `${CAMPAIGN_ID}:${SOCIAL_SKU_ID}`;

const PATHS = {
  campaigns: path.join(process.cwd(), "data", "campaigns"),
  tasks: path.join(process.cwd(), "data", "campaign-tasks"),
  materials: path.join(process.cwd(), "data", "campaign-materials"),
  production: path.join(process.cwd(), "data", "campaign-production"),
  users: path.join(process.cwd(), "data", "studio-users.json"),
};

const SOCIAL_JOB = {
  skuId: SOCIAL_SKU_ID,
  serviceName: "Make My Social Media Posts",
  priceCents: 45000,
  lane: "standard",
  familyId: "social",
  catalogFamilyId: "social_media",
  deadline: "July 10, 2026",
  timing: "Usually within 3-5 business days after intake is complete.",
  deliverables: [
    "4 static social media post graphics for one campaign/theme",
    "4 PNG or JPG post files in one agreed platform size",
    "Simple recommended posting order",
    "Caption document/plain-text file for all posts",
  ],
  exclusions: [
    "Posting, scheduling, publishing, or account access",
    "Video, Reels, motion graphics, Stories, carousels, or animation",
    "More than one platform size/version",
  ],
  clientResponsibilities: [
    "Choose one target platform and post size",
    "Confirm the campaign goal/message",
    "Provide CTA/link/phone or destination",
    "Provide required wording/disclosures",
    "Provide brand, logo, and visual references",
  ],
};

export const REQUIRED_SOCIAL_MATERIALS = [
  material(
    "social-platform-size",
    "factual-confirmation",
    "confirmation",
    "Target platform and post size",
    "Confirm the one social platform and post size these graphics should use.",
  ),
  material(
    "social-campaign-message",
    "document-reference",
    "text",
    "Campaign goal/message",
    "Describe the campaign goal, audience, offer, and message for these posts.",
  ),
  material(
    "social-cta-destination",
    "url-link",
    "url",
    "CTA/destination",
    "Share the link, phone number, booking page, or destination these posts should use.",
  ),
  material(
    "social-required-wording",
    "other",
    "text",
    "Required wording/disclosures",
    "Provide any exact wording, disclaimers, dates, eligibility language, or phrases that must appear.",
  ),
  material(
    "social-brand-visual-references",
    "logo-brand",
    "file-metadata",
    "Brand/logo/visual references",
    "Describe or reference the logo, brand direction, and visual materials The Studio should use. Do not send passwords or public account access.",
  ),
];

function material(id, category, contentKind, label, prompt) {
  return {
    id: `mat-${SOCIAL_SKU_ID}-${id}`,
    category,
    requirementLevel: "required",
    reviewStatus: "requested",
    contentKind,
    label,
    reason: `Needed for ${SOCIAL_JOB.serviceName}`,
    relatedServiceIds: [SOCIAL_SKU_ID],
    promotionApprovedAt: SEED_AT,
    clientFacingLabel: label,
    clientFacingPrompt: prompt,
    whyNeeded: prompt,
    uploadStatus: "none",
  };
}

function priceDisplay(cents) {
  return `$${(cents / 100).toLocaleString("en-US")}`;
}

function lineItem() {
  return {
    skuId: SOCIAL_JOB.skuId,
    serviceId: SOCIAL_JOB.skuId,
    serviceName: SOCIAL_JOB.serviceName,
    billingType: "one_time",
    exactPriceCents: SOCIAL_JOB.priceCents,
    priceCents: SOCIAL_JOB.priceCents,
    priceDisplay: priceDisplay(SOCIAL_JOB.priceCents),
    deliverables: SOCIAL_JOB.deliverables,
    exclusions: SOCIAL_JOB.exclusions,
    timingWindowLabel: SOCIAL_JOB.timing,
    revisionRule: "1 revision round",
    clientResponsibilities: SOCIAL_JOB.clientResponsibilities,
    executionResponsibility:
      "The Studio creates finished ready-to-use files; client distributes through their own tools/accounts.",
  };
}

function campaignEnvelope() {
  return {
    campaignId: CAMPAIGN_ID,
    clientUserId: CLIENT_USER_ID,
    syncVersion: 1,
    syncedAt: SEED_AT,
    record: {
      campaignId: CAMPAIGN_ID,
      campaignName: "Test Batch 1 Social Posts Client Walkthrough",
      campaignStatus: "PAYMENT_RECEIVED",
      campaignDescription:
        "Client-led walkthrough fixture for Social Posts materials intake. Paid, but waiting on client materials before production can enter the queue.",
      estimatedCompletion: "After required Social Posts materials are submitted",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      discoveryAnswers: {
        "your-business": "The Studio\n---\nClient walkthrough test for Tagia",
        "your-situation": "Validate the client-led Social Posts materials intake.",
        "your-challenge":
          "The campaign is paid, but production cannot enter the queue until Tagia supplies the Social Posts details.",
      },
      discoverySubmittedAt: SEED_AT,
      approvedStudioPlan: {
        selectedServiceIds: [SOCIAL_JOB.skuId],
        includedServiceIds: [SOCIAL_JOB.skuId],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: SOCIAL_JOB.priceCents,
        monthlyTotalCents: 0,
        amountDueTodayCents: SOCIAL_JOB.priceCents,
        lineItems: [lineItem()],
        approvedAt: SEED_AT,
        acknowledgmentVersion: "studio-test-batch-1-client-walkthrough",
        acknowledgmentText:
          "Local fixture only. No live payment, public account, external storage, or fake final asset is connected.",
        acknowledgedAt: SEED_AT,
      },
      paymentReceivedAt: SEED_AT,
      projectDetailsSubmittedAt: SEED_AT,
      projectDetails: {
        form: {
          workingOn: "Client-led Social Posts walkthrough",
          mainOffer: "To be supplied by Tagia in the Social Posts materials intake",
          importantDates: "July 2026 internal walkthrough window",
          callToAction: "To be supplied by Tagia in the Social Posts materials intake",
          destinationLink: "To be supplied by Tagia in the Social Posts materials intake",
          mustIncludeExactly: "",
          brandColorsFonts: "",
          inspirationLinks: "",
          brandDoNotUse: "",
          brandOutdatedParts: "",
          brandPartsToKeep: "",
          socialPlatforms: "",
          socialAccountLinks: "",
          socialPostingWindow: "",
          emailPlatform: "",
          emailSender: "",
          emailSendTiming: "",
          emailListReady: "",
          conceptIntendedUse: "",
          conceptAudience: "",
          conceptRequiredWording: "",
          marketingPieces: SOCIAL_JOB.serviceName,
          marketingPieceUsage: "Client walkthrough only; no fake final assets.",
          marketingFormats: "",
          adScript: "",
          adIntendedUse: "",
          adVoiceStyle: "",
          adPronunciation: "",
          primaryApproverName: "Tagia",
          primaryApproverEmail: CLIENT_EMAIL,
          hasSecondaryApprover: "no",
          secondaryApproverName: "",
          secondaryApproverEmail: "",
        },
        files: [],
        submittedAt: SEED_AT,
      },
      materialsSummary: {
        blockingRequiredCount: REQUIRED_SOCIAL_MATERIALS.length,
        updatedAt: SEED_AT,
      },
      targetCompletionDate: "2026-07-10T21:00:00.000Z",
      revisionRoundsIncluded: 1,
      revisionRoundsUsed: 0,
      deliverablesDelivered: {},
      studioNotes: [
        {
          date: "Jul 3",
          message:
            "Payment is recorded. Social Posts production is waiting for Tagia to submit the required client materials.",
        },
      ],
      createdAt: SEED_AT,
      updatedAt: SEED_AT,
    },
  };
}

function tasksEnvelope() {
  return {
    campaignId: CAMPAIGN_ID,
    planFingerprint: `${SOCIAL_JOB.skuId}:one_time`,
    planVersion: 1,
    frozenPlanSnapshots: [],
    tasks: [
      {
        id: `${SOCIAL_JOB.skuId}:strategy_content_direction`,
        title: `${SOCIAL_JOB.serviceName} - Content direction`,
        phase: "strategy_content_direction",
        status: "blocked",
        relatedServiceIds: [SOCIAL_JOB.skuId],
        familyId: SOCIAL_JOB.familyId,
        catalogFamilyId: SOCIAL_JOB.catalogFamilyId,
        serviceName: SOCIAL_JOB.serviceName,
        dependsOn: [],
        workflowState: "blocked",
        workflowBlockedReason:
          "Waiting for client Social Posts materials before the job can enter the production queue.",
        responsibleRole: "strategy",
      },
      {
        id: `${SOCIAL_JOB.skuId}:copy`,
        title: `${SOCIAL_JOB.serviceName} - Copy`,
        phase: "copy",
        status: "not_ready",
        relatedServiceIds: [SOCIAL_JOB.skuId],
        familyId: SOCIAL_JOB.familyId,
        catalogFamilyId: SOCIAL_JOB.catalogFamilyId,
        serviceName: SOCIAL_JOB.serviceName,
        dependsOn: [`${SOCIAL_JOB.skuId}:strategy_content_direction`],
        workflowState: "unstarted",
        responsibleRole: "copy",
      },
      {
        id: `${SOCIAL_JOB.skuId}:creative`,
        title: `${SOCIAL_JOB.serviceName} - Creative`,
        phase: "creative",
        status: "not_ready",
        relatedServiceIds: [SOCIAL_JOB.skuId],
        familyId: SOCIAL_JOB.familyId,
        catalogFamilyId: SOCIAL_JOB.catalogFamilyId,
        serviceName: SOCIAL_JOB.serviceName,
        dependsOn: [`${SOCIAL_JOB.skuId}:copy`],
        workflowState: "unstarted",
        responsibleRole: "creative_production",
      },
      {
        id: `${SOCIAL_JOB.skuId}:qa`,
        title: `${SOCIAL_JOB.serviceName} - QA review`,
        phase: "qa",
        status: "not_ready",
        relatedServiceIds: [SOCIAL_JOB.skuId],
        familyId: SOCIAL_JOB.familyId,
        catalogFamilyId: SOCIAL_JOB.catalogFamilyId,
        serviceName: SOCIAL_JOB.serviceName,
        dependsOn: [`${SOCIAL_JOB.skuId}:creative`],
        workflowState: "unstarted",
        responsibleRole: "qa",
      },
      {
        id: `${SOCIAL_JOB.skuId}:delivery_prep`,
        title: `${SOCIAL_JOB.serviceName} - Delivery prep`,
        phase: "delivery_prep",
        status: "not_ready",
        relatedServiceIds: [SOCIAL_JOB.skuId],
        familyId: SOCIAL_JOB.familyId,
        catalogFamilyId: SOCIAL_JOB.catalogFamilyId,
        serviceName: SOCIAL_JOB.serviceName,
        dependsOn: [`${SOCIAL_JOB.skuId}:qa`],
        workflowState: "unstarted",
        responsibleRole: "producer_dispatcher",
      },
    ],
    handoffs: [],
    qaRecords: [],
    exceptionRecords: [],
    exceptionEvents: [],
    jobRecords: [
      {
        jobId: SOCIAL_JOB_ID,
        campaignId: CAMPAIGN_ID,
        skuId: SOCIAL_JOB.skuId,
        serviceName: SOCIAL_JOB.serviceName,
        spineStatus: "waiting_on_client",
        productionLane: SOCIAL_JOB.lane,
        returnLane: SOCIAL_JOB.lane,
        intakeComplete: true,
        productionStartedAt: null,
        waitingOnClientSince: SEED_AT,
        lastClientResponseAt: null,
        ownerApprovalPending: null,
        nonRefundable: false,
        laneQueuedAt: SEED_AT,
        clientDeadline: SOCIAL_JOB.deadline,
        deliverablePrep: SOCIAL_JOB.deliverables.map((label, index) => ({
          deliverableKey: `deliverable-${index}`,
          label,
        })),
        internalNotes: [
          {
            id: `note:${SOCIAL_JOB.skuId}:client-walkthrough`,
            content:
              "Client walkthrough fixture. Do not start production until the required Social Posts client materials are submitted.",
            createdAt: SEED_AT,
            author: { role: "system", displayName: "Local setup script" },
          },
        ],
        workingFileRefs: [],
        workPackets: [],
        clientDeliveryFiles: [],
        deliveredAt: null,
        updatedAt: SEED_AT,
      },
    ],
    jobActivityEvents: [
      {
        id: `payment:${CAMPAIGN_ID}:${SEED_AT}`,
        campaignId: CAMPAIGN_ID,
        jobId: SOCIAL_JOB_ID,
        kind: "payment",
        occurredAt: SEED_AT,
        actor: { role: "system", displayName: "Local setup script" },
        reason: "Local paid Social Posts walkthrough fixture. No live payment processor connected.",
      },
      {
        id: `missing_material_request:${SOCIAL_JOB_ID}:${SEED_AT}`,
        campaignId: CAMPAIGN_ID,
        jobId: SOCIAL_JOB_ID,
        kind: "missing_material_request",
        occurredAt: SEED_AT,
        actor: { role: "system", displayName: "Local setup script" },
        spineStatus: "waiting_on_client",
        reason:
          "Client must submit target platform/post size, campaign goal/message, CTA/destination, required wording/disclosures, and brand/logo/visual references.",
      },
    ],
    jobReviewFeedback: [],
    jobCommunicationRecords: [],
    updatedAt: SEED_AT,
    version: 10,
    syncedAt: SEED_AT,
  };
}

function materialsEnvelope() {
  return {
    campaignId: CAMPAIGN_ID,
    items: REQUIRED_SOCIAL_MATERIALS,
    updatedAt: SEED_AT,
    version: 1,
    syncedAt: SEED_AT,
  };
}

function productionEnvelope() {
  return {
    campaignId: CAMPAIGN_ID,
    version: 1,
    planFingerprint: `${SOCIAL_JOB.skuId}:one_time`,
    workUnits: [],
    versions: [],
    updatedAt: SEED_AT,
    syncedAt: SEED_AT,
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function ensureUsers() {
  await mkdir(path.dirname(PATHS.users), { recursive: true });
  const users = await readJson(PATHS.users, []);
  const byId = new Map(users.map((user) => [user.id, user]));
  byId.set(CLIENT_USER_ID, {
    id: CLIENT_USER_ID,
    email: CLIENT_EMAIL,
    password: CLIENT_PASSWORD,
    displayName: CLIENT_DISPLAY_NAME,
    roles: ["client"],
    currentCampaignId: CAMPAIGN_ID,
    clientCampaignIds: [CAMPAIGN_ID],
  });
  await writeFile(PATHS.users, JSON.stringify([...byId.values()], null, 2), "utf8");
}

function setupReport() {
  const lines = [
    "# Test Batch 1 Social Posts Client Walkthrough",
    "",
    `Campaign ID: \`${CAMPAIGN_ID}\``,
    `Client login: \`${CLIENT_EMAIL}\` / \`${CLIENT_PASSWORD}\``,
    "Exact URL: `http://localhost:3000/studio-board?campaignId=studio-test-batch-1-client-walkthrough`",
    "",
    "## Starting State",
    "",
    "- Campaign status: `PAYMENT_RECEIVED`",
    "- Social Posts job status: `waiting_on_client`",
    "- Board should show `Materials we still need`, not `Materials caught up`.",
    "- No production has started, no Work Packets are assigned, and no fake final assets exist.",
    "",
    "## Required Client Fields",
    "",
    ...REQUIRED_SOCIAL_MATERIALS.map((item) => `- ${item.label}`),
    "",
    "## Expected After Submission",
    "",
    "- Required material rows move to `submitted` / client-visible `Received — under review`.",
    "- Blocking required count becomes `0`.",
    "- Social Posts job status moves from `waiting_on_client` to `ready_for_queue`.",
    "- Existing `studio-test-batch-1` campaign/task/material/production files are not modified by this setup.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export async function setupStudioTestBatch1ClientWalkthrough() {
  await Promise.all([
    mkdir(PATHS.campaigns, { recursive: true }),
    mkdir(PATHS.tasks, { recursive: true }),
    mkdir(PATHS.materials, { recursive: true }),
    mkdir(PATHS.production, { recursive: true }),
    mkdir(OUT_DIR, { recursive: true }),
  ]);
  await ensureUsers();
  await writeFile(path.join(PATHS.campaigns, `${CAMPAIGN_ID}.json`), JSON.stringify(campaignEnvelope(), null, 2), "utf8");
  await writeFile(path.join(PATHS.tasks, `${CAMPAIGN_ID}.json`), JSON.stringify(tasksEnvelope(), null, 2), "utf8");
  await writeFile(path.join(PATHS.materials, `${CAMPAIGN_ID}.json`), JSON.stringify(materialsEnvelope(), null, 2), "utf8");
  await writeFile(path.join(PATHS.production, `${CAMPAIGN_ID}.json`), JSON.stringify(productionEnvelope(), null, 2), "utf8");
  await writeFile(path.join(OUT_DIR, "report.md"), setupReport(), "utf8");
  return {
    campaignId: CAMPAIGN_ID,
    reportPath: path.join("tmp", CAMPAIGN_ID, "report.md"),
    login: {
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
    },
    url: `/studio-board?campaignId=${CAMPAIGN_ID}`,
    job: {
      skuId: SOCIAL_JOB.skuId,
      serviceName: SOCIAL_JOB.serviceName,
      beforeStatus: "waiting_on_client",
      afterStatus: "ready_for_queue",
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  setupStudioTestBatch1ClientWalkthrough()
    .then((result) => {
      console.log(`Set up ${result.campaignId}`);
      console.log(`Login: ${result.login.email} / ${result.login.password}`);
      console.log(`URL: ${result.url}`);
      console.log(`Report: ${result.reportPath}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
