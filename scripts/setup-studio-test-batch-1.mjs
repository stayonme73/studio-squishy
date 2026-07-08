/**
 * The Studio Test Batch 1 setup.
 *
 * Creates/updates one durable internal campaign for The Studio as the client,
 * using the existing campaign/tasks/materials/job-control JSON shapes.
 *
 * Usage:
 *   node scripts/setup-studio-test-batch-1.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CAMPAIGN_ID = "studio-test-batch-1";
export const CLIENT_USER_ID = "tagia";
export const CLIENT_DISPLAY_NAME = "The Studio / Tagia";
export const SEED_AT = "2026-07-03T18:14:00.000Z";
export const OUT_DIR = path.join(process.cwd(), "tmp", "studio-test-batch-1");

const PATHS = {
  campaigns: path.join(process.cwd(), "data", "campaigns"),
  tasks: path.join(process.cwd(), "data", "campaign-tasks"),
  materials: path.join(process.cwd(), "data", "campaign-materials"),
  production: path.join(process.cwd(), "data", "campaign-production"),
  users: path.join(process.cwd(), "data", "studio-users.json"),
  assignments: path.join(process.cwd(), "data", "campaign-assignments.json"),
};

const STAFF = {
  producer: {
    id: "staff-producer-studio-test-batch-1",
    email: "producer-studio-test-batch-1@local.dev",
    displayName: "Producer Test Batch 1",
    capabilities: ["producer_dispatcher"],
  },
  strategy: {
    id: "staff-strategy-studio-test-batch-1",
    email: "strategy-studio-test-batch-1@local.dev",
    displayName: "Strategy Test Batch 1",
    capabilities: ["strategy"],
  },
  copy: {
    id: "staff-copy-studio-test-batch-1",
    email: "copy-studio-test-batch-1@local.dev",
    displayName: "Copy Test Batch 1",
    capabilities: ["copy"],
  },
  creative: {
    id: "staff-creative-studio-test-batch-1",
    email: "creative-studio-test-batch-1@local.dev",
    displayName: "Creative Test Batch 1",
    capabilities: ["creative_production"],
  },
  qa: {
    id: "staff-qa-studio-test-batch-1",
    email: "qa-studio-test-batch-1@local.dev",
    displayName: "QA Test Batch 1",
    capabilities: ["qa"],
  },
};

const JOBS = [
  {
    skuId: "v2-rtu-social-posts",
    serviceName: "Make My Social Media Posts",
    priceCents: 45000,
    lane: "standard",
    familyId: "social",
    catalogFamilyId: "social_media",
    status: "building_concepts",
    productionStartedAt: "2026-07-03T18:20:00.000Z",
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
      "Choose one target platform and size",
      "Provide CTA/link/phone and any required wording",
      "Provide logo/brand references and usable photos if specific visuals are required",
      "Post or schedule the finished files through The Studio's own account",
    ],
    teamCanStart: [
      "Draft content direction from the internal launch goal",
      "Create caption angles and recommended posting order",
      "Prepare layout concepts once the manual design tool and folder are chosen",
    ],
    blockedByTools: [
      "Final graphic creation/export cannot begin until the design tool is selected",
      "Finished files cannot be stored/delivered until a controlled storage folder is selected",
      "Posting is out of scope unless a separate post/publish service and account access are selected",
    ],
    taskPipeline: [
      ["strategy_content_direction", "Content direction", "in_progress", "strategy"],
      ["copy", "Copy", "unstarted", "copy"],
      ["creative", "Creative", "blocked", "creative_production"],
      ["qa", "QA review", "unstarted", "qa"],
      ["delivery_prep", "Delivery prep", "unstarted", "producer_dispatcher"],
    ],
    assignedPacketRoles: ["strategy"],
    materials: [
      material("social-platform", "factual-confirmation", "confirmation", "Target social platform", "Confirm the one platform and preferred post size.", "required", "requested"),
      material("social-cta", "url-link", "url", "CTA destination", "Share the link, phone number, or destination these posts should use.", "required", "requested"),
      material("social-photos", "photo-video", "file-metadata", "Usable Studio photos or visual references", "Send photos or describe approved visual references for the post graphics.", "optional", "missing"),
    ],
  },
  {
    skuId: "v2-rtu-promotion-graphics",
    serviceName: "Make My Campaign Graphics",
    priceCents: 35000,
    lane: "standard",
    familyId: "marketing_assets",
    catalogFamilyId: "marketing_assets",
    status: "ready_for_queue",
    productionStartedAt: null,
    deadline: "July 10, 2026",
    timing: "Usually within 3-5 business days after intake is complete.",
    deliverables: [
      "2 branded campaign graphics for one campaign, event, offer, or launch",
      "1 finished file per campaign graphic in the agreed format/use",
    ],
    exclusions: [
      "More than 2 campaign graphics",
      "Multiple campaigns, offers, or themes",
      "Printing, shipping, posting, publishing, or scheduling",
    ],
    clientResponsibilities: [
      "Provide exact copy that must appear",
      "Confirm intended use and required size/format",
      "Provide logo, colors, and required wording/disclosures",
    ],
    teamCanStart: [
      "Build a production brief from the internal launch goal",
      "Outline graphic concepts and hierarchy",
      "Prepare QA checklist for copy/size/disclosure verification",
    ],
    blockedByTools: [
      "Design production cannot begin until Canva/Figma/equivalent is chosen",
      "Final export cannot be attached until controlled storage is chosen",
    ],
    taskPipeline: [
      ["creative", "Creative", "unstarted", "creative_production"],
      ["qa", "QA review", "unstarted", "qa"],
      ["delivery_prep", "Delivery prep", "unstarted", "producer_dispatcher"],
    ],
    assignedPacketRoles: [],
    materials: [
      material("graphics-copy", "document-reference", "text", "Exact campaign graphic copy", "Paste the exact headline, offer, dates, CTA, and required wording.", "required", "requested"),
      material("graphics-format", "factual-confirmation", "confirmation", "Graphic format/use", "Confirm where each graphic will be used and any required size.", "required", "requested"),
    ],
  },
  {
    skuId: "v2-rtu-flyer",
    serviceName: "Make Me a Flyer",
    priceCents: 30000,
    lane: "quick",
    familyId: "marketing_assets",
    catalogFamilyId: "marketing_assets",
    status: "waiting_on_client",
    productionStartedAt: null,
    waitingOnClientSince: "2026-07-03T18:25:00.000Z",
    deadline: "July 8, 2026",
    timing: "Usually within 2-3 business days after intake is complete.",
    deliverables: [
      "1 finished single-sided flyer design in one agreed size",
      "Print-ready PDF",
      "Digital PNG or JPG version for sharing online",
    ],
    exclusions: [
      "Printing, shipping, or printer coordination",
      "Double-sided flyer",
      "Multiple sizes or platform versions",
      "Editable source files",
    ],
    clientResponsibilities: [
      "Provide exact flyer text and required details",
      "Confirm print/digital use and flyer size",
      "Provide logo/photos/colors if specific assets must be used",
    ],
    teamCanStart: [
      "Prepare flyer intake checklist",
      "Draft layout approach once exact flyer text arrives",
    ],
    blockedByTools: [
      "Cannot start production until exact flyer copy/details are provided",
      "Design/export still needs a manual design tool and storage folder selection",
    ],
    taskPipeline: [
      ["creative", "Creative", "blocked", "creative_production"],
      ["qa", "QA review", "unstarted", "qa"],
      ["delivery_prep", "Delivery prep", "unstarted", "producer_dispatcher"],
    ],
    assignedPacketRoles: [],
    materials: [
      material("flyer-copy", "document-reference", "text", "Exact flyer text and details", "Paste the exact flyer text, offer, dates, location, phone, website, QR destination, and required wording.", "required", "requested"),
      material("flyer-size", "factual-confirmation", "confirmation", "Flyer size and use", "Confirm print, digital, or both, plus the required flyer size if known.", "required", "requested"),
    ],
  },
  {
    skuId: "v2-rtu-email-kit",
    serviceName: "Make My Email Campaign Kit",
    priceCents: 35000,
    lane: "standard",
    familyId: "copy_channels",
    catalogFamilyId: "email_marketing",
    status: "building_concepts",
    productionStartedAt: "2026-07-03T18:30:00.000Z",
    deadline: "July 10, 2026",
    timing: "Usually within 3-5 business days after intake is complete.",
    deliverables: [
      "Up to 2 finished marketing emails for one campaign",
      "Subject lines, preview text, body copy, CTA, and simple layout direction",
      "Plain-text and simple HTML-ready content files for the client's email platform",
    ],
    exclusions: [
      "Email sending, scheduling, or platform access",
      "List building, consent collection, segmentation, or subscriber management",
      "Automation, CRM integration, or custom HTML coding",
    ],
    clientResponsibilities: [
      "Provide one campaign goal and exact offer details",
      "Provide CTA links and any required compliance wording",
      "Use The Studio's own email platform/list to send; The Studio app is not connected to email",
    ],
    teamCanStart: [
      "Draft email structure and subject-line directions from the internal launch goal",
      "Create copy options that avoid platform-specific automation assumptions",
      "Prepare paste-ready plain text once CTA details are confirmed",
    ],
    blockedByTools: [
      "Sending/scheduling cannot happen in-app; a real email platform choice is required outside this job",
      "Final content files need a controlled storage/delivery location",
    ],
    taskPipeline: [
      ["copy", "Copy", "in_progress", "copy"],
      ["qa", "QA review", "unstarted", "qa"],
      ["delivery_prep", "Delivery prep", "unstarted", "producer_dispatcher"],
    ],
    assignedPacketRoles: ["copy"],
    materials: [
      material("email-offer", "factual-confirmation", "confirmation", "Email offer details", "Confirm the campaign goal, offer, dates, CTA, and anything that must not be said.", "required", "requested"),
      material("email-cta", "url-link", "url", "Email CTA link", "Share the destination link for the email CTA.", "required", "requested"),
      material("email-compliance", "document-reference", "text", "Required email wording", "Provide any required disclaimers, compliance language, or brand wording.", "optional", "missing"),
    ],
  },
];

function material(id, category, contentKind, label, prompt, requirementLevel, reviewStatus) {
  return {
    id,
    category,
    requirementLevel,
    reviewStatus,
    contentKind,
    label,
    reason: label,
    relatedServiceIds: [],
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

function lineItem(job) {
  return {
    skuId: job.skuId,
    serviceId: job.skuId,
    serviceName: job.serviceName,
    billingType: "one_time",
    exactPriceCents: job.priceCents,
    priceCents: job.priceCents,
    priceDisplay: priceDisplay(job.priceCents),
    deliverables: job.deliverables,
    exclusions: job.exclusions,
    timingWindowLabel: job.timing,
    revisionRule: "1 revision round",
    clientResponsibilities: job.clientResponsibilities,
    executionResponsibility:
      "The Studio creates finished ready-to-use files; client distributes through their own tools/accounts.",
  };
}

function planFingerprint() {
  return JOBS.map((job) => `${job.skuId}:one_time`).sort().join("|");
}

function taskFor(job, [phase, suffix, workflowState, role], index) {
  const previous = index > 0 ? `${job.skuId}:${job.taskPipeline[index - 1][0]}` : null;
  const status =
    workflowState === "in_progress"
      ? "in_progress"
      : workflowState === "blocked"
        ? "blocked"
        : workflowState === "complete"
          ? "complete"
          : "not_ready";
  return {
    id: `${job.skuId}:${phase}`,
    title: `${job.serviceName} - ${suffix}`,
    phase,
    status,
    relatedServiceIds: [job.skuId],
    familyId: job.familyId,
    catalogFamilyId: job.catalogFamilyId,
    serviceName: job.serviceName,
    dependsOn: previous ? [previous] : [],
    workflowState,
    responsibleRole: role,
    ...(workflowState === "blocked"
      ? { workflowBlockedReason: "Internal test readiness: waiting on client materials or tool/storage choice." }
      : {}),
    ...(workflowState === "in_progress"
      ? {
          claimedByUserId: role === "copy" ? STAFF.copy.id : STAFF.strategy.id,
          claimedByDisplayName: role === "copy" ? STAFF.copy.displayName : STAFF.strategy.displayName,
          claimedAt: SEED_AT,
        }
      : {}),
  };
}

function packetFor(job, role) {
  const taskIds = job.taskPipeline
    .map(([phase]) => `${job.skuId}:${phase}`)
    .filter((taskId) => {
      if (role === "strategy") return taskId.endsWith(":strategy_content_direction");
      if (role === "copy") return taskId.endsWith(":copy");
      if (role === "creative_production") return taskId.endsWith(":creative") || taskId.endsWith(":creative_production");
      if (role === "qa") return taskId.endsWith(":qa");
      if (role === "producer_dispatcher") return taskId.endsWith(":delivery_prep");
      return false;
    });
  const packetId = `packet:${CAMPAIGN_ID}:${job.skuId}:${role}`;
  return {
    id: packetId,
    jobId: `${CAMPAIGN_ID}:${job.skuId}`,
    campaignId: CAMPAIGN_ID,
    role,
    taskIds,
    status: "assigned",
    createdAt: SEED_AT,
    updatedAt: SEED_AT,
    assignmentEvents: [
      {
        id: `assign:${packetId}:${SEED_AT}`,
        assignedAt: SEED_AT,
        assignedBy: { role: "staff", userId: STAFF.producer.id, displayName: STAFF.producer.displayName },
        role,
        note: "Internal Test Batch 1 routing packet. Manual URLs only; no external tool integration.",
      },
    ],
    returnedFileRefs: [],
    returnLocation: "production_workspace",
    ownerApprovalRequired: true,
  };
}

function jobRecord(job) {
  const deliverablePrep = job.deliverables.map((label, index) => ({
    deliverableKey: `deliverable-${index}`,
    label,
  }));
  return {
    jobId: `${CAMPAIGN_ID}:${job.skuId}`,
    campaignId: CAMPAIGN_ID,
    skuId: job.skuId,
    serviceName: job.serviceName,
    spineStatus: job.status,
    productionLane: job.lane,
    returnLane: job.lane,
    intakeComplete: true,
    productionStartedAt: job.productionStartedAt,
    waitingOnClientSince: job.waitingOnClientSince ?? null,
    lastClientResponseAt: null,
    ownerApprovalPending: null,
    nonRefundable: Boolean(job.productionStartedAt),
    laneQueuedAt: SEED_AT,
    clientDeadline: job.deadline,
    deliverablePrep,
    internalNotes: [
      {
        id: `note:${job.skuId}:readiness`,
        content: [
          "Internal Test Batch 1 readiness.",
          `Tagia must provide: ${job.clientResponsibilities.join("; ")}.`,
          `Team can start/create: ${job.teamCanStart.join("; ")}.`,
          `Blocked by tool/storage: ${job.blockedByTools.join("; ")}.`,
        ].join(" "),
        createdAt: SEED_AT,
        author: { role: "staff", userId: STAFF.producer.id, displayName: STAFF.producer.displayName },
      },
    ],
    workingFileRefs: [],
    workPackets: job.assignedPacketRoles.map((role) => packetFor(job, role)),
    clientDeliveryFiles: [],
    deliveredAt: null,
    updatedAt: SEED_AT,
  };
}

function campaignEnvelope() {
  const total = JOBS.reduce((sum, job) => sum + job.priceCents, 0);
  const lineItems = JOBS.map(lineItem);
  return {
    campaignId: CAMPAIGN_ID,
    clientUserId: CLIENT_USER_ID,
    syncVersion: 1,
    syncedAt: SEED_AT,
    record: {
      campaignId: CAMPAIGN_ID,
      campaignName: "The Studio Test Batch 1",
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription:
        "Internal real-client test campaign: The Studio/Tagia purchased multiple V2 ready-to-use jobs under one campaign.",
      estimatedCompletion: "July 10, 2026",
      selectedCampaignOption: "Internal launch readiness direction",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      discoveryAnswers: {
        "your-business": "The Studio\n---\nInternal test client: Tagia / The Studio",
        "your-situation": "Preparing the first real internal launch jobs",
        "your-challenge": "We need to see exactly what the client must provide versus what the team can handle.",
      },
      discoverySubmittedAt: SEED_AT,
      approvedStudioPlan: {
        selectedServiceIds: JOBS.map((job) => job.skuId),
        includedServiceIds: JOBS.map((job) => job.skuId),
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: total,
        monthlyTotalCents: 0,
        amountDueTodayCents: total,
        lineItems,
        approvedAt: SEED_AT,
        acknowledgmentVersion: "internal-test-batch-1",
        acknowledgmentText: "Internal setup fixture only. No live payment, account, storage, or tool integration.",
        acknowledgedAt: SEED_AT,
      },
      paymentReceivedAt: SEED_AT,
      projectDetailsSubmittedAt: SEED_AT,
      projectDetails: {
        form: {
          workingOn: "The Studio Test Batch 1 internal launch jobs",
          mainOffer: "The Studio ready-to-use launch services",
          importantDates: "Use July 2026 as the internal test window",
          callToAction: "Open The Studio and validate the internal production workflow",
          destinationLink: "Manual TBD - no external storage or publishing destination selected",
          primaryApproverName: "Tagia",
          primaryApproverEmail: "tagia@local.dev",
          marketingPieces: JOBS.map((job) => job.serviceName).join(", "),
          marketingPieceUsage: "Internal proof run only; no fake final assets.",
        },
        files: [],
        submittedAt: SEED_AT,
      },
      materialsSummary: {
        blockingRequiredCount: JOBS.flatMap((job) => job.materials).filter((item) => item.requirementLevel === "required" && ["missing", "requested", "needs_clarification"].includes(item.reviewStatus)).length,
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
            "Internal Test Batch 1 is set up. Some jobs can begin as routing/work packets; external production remains manual until tools and storage are selected.",
        },
      ],
      createdAt: SEED_AT,
      updatedAt: SEED_AT,
    },
  };
}

function tasksEnvelope() {
  const tasks = [
    {
      id: "campaign:producer-kickoff",
      title: "Producer kickoff",
      phase: "strategy",
      status: "in_progress",
      relatedServiceIds: JOBS.map((job) => job.skuId),
      familyId: "campaign_launch_monthly",
      catalogFamilyId: "campaign",
      serviceName: "Campaign",
      dependsOn: [],
      workflowState: "in_progress",
      responsibleRole: "producer_dispatcher",
      claimedByUserId: STAFF.producer.id,
      claimedByDisplayName: STAFF.producer.displayName,
      claimedAt: SEED_AT,
    },
    ...JOBS.flatMap((job) => job.taskPipeline.map((entry, index) => taskFor(job, entry, index))),
    {
      id: "campaign:final-package-assembly",
      title: "Final package assembly",
      phase: "delivery_prep",
      status: "not_ready",
      relatedServiceIds: JOBS.map((job) => job.skuId),
      familyId: "campaign_launch_monthly",
      catalogFamilyId: "campaign",
      serviceName: "Campaign",
      dependsOn: JOBS.map((job) => `${job.skuId}:delivery_prep`),
      workflowState: "unstarted",
      responsibleRole: "producer_dispatcher",
    },
  ];
  const jobRecords = JOBS.map(jobRecord);
  return {
    campaignId: CAMPAIGN_ID,
    planFingerprint: planFingerprint(),
    planVersion: 1,
    frozenPlanSnapshots: [],
    tasks,
    handoffs: [],
    qaRecords: [],
    exceptionRecords: [
      {
        id: "exc-studio-test-batch-1-flyer-copy",
        campaignId: CAMPAIGN_ID,
        kind: "missing_client_fact",
        status: "waiting_client",
        title: "Flyer cannot begin until exact copy/details are supplied",
        description:
          "The flyer job needs final text, offer/date/location/CTA details, and required wording from Tagia before creative production starts.",
        createdAt: SEED_AT,
        updatedAt: SEED_AT,
        raisedByUserId: STAFF.producer.id,
        raisedByDisplayName: STAFF.producer.displayName,
        raisedByRole: "producer_dispatcher",
        taskId: "v2-rtu-flyer:creative",
        clientRequestDraft: {
          whyTeamCannotSolveInternally:
            "The team can design the flyer, but only Tagia can confirm the exact offer details and wording.",
          exactClientOnlyItem: "Final flyer copy, offer/date/location details, CTA, and required wording",
          whyBlocksWork: "Creative layout cannot start without confirmed content.",
        },
      },
      {
        id: "exc-studio-test-batch-1-storage",
        campaignId: CAMPAIGN_ID,
        kind: "client_request",
        status: "open",
        title: "Tool/storage selection needed before final files exist",
        description:
          "No Canva/Figma/email/storage account is connected. Production may route internally, but final creation/export/delivery stays manual until a real tool and storage location are selected.",
        createdAt: SEED_AT,
        updatedAt: SEED_AT,
        raisedByUserId: STAFF.producer.id,
        raisedByDisplayName: STAFF.producer.displayName,
        raisedByRole: "producer_dispatcher",
        taskId: "campaign:producer-kickoff",
      },
    ],
    exceptionEvents: [],
    jobRecords,
    jobActivityEvents: [
      {
        id: `payment:${CAMPAIGN_ID}:${SEED_AT}`,
        campaignId: CAMPAIGN_ID,
        jobId: `${CAMPAIGN_ID}:v2-rtu-social-posts`,
        kind: "payment",
        occurredAt: SEED_AT,
        actor: { role: "system", displayName: "Internal setup script" },
        reason: "Internal test purchase recorded for multi-job campaign. No live payment processor connected.",
      },
      ...jobRecords.flatMap((job) =>
        (job.workPackets ?? []).map((packet) => ({
          id: `work_packet_assigned:${packet.id}`,
          campaignId: CAMPAIGN_ID,
          jobId: job.jobId,
          kind: "work_packet_assigned",
          occurredAt: SEED_AT,
          actor: { role: "staff", userId: STAFF.producer.id, displayName: STAFF.producer.displayName },
          reason: `Assigned ${packet.role} Work Packet for internal Test Batch 1 routing.`,
          messageRef: packet.id,
        })),
      ),
      ...jobRecords
        .filter((job) => job.productionStartedAt)
        .map((job) => ({
          id: `status_change:${job.jobId}:building:${job.productionStartedAt}`,
          campaignId: CAMPAIGN_ID,
          jobId: job.jobId,
          kind: "status_change",
          occurredAt: job.productionStartedAt,
          actor: { role: "staff", userId: STAFF.producer.id, displayName: STAFF.producer.displayName },
          spineStatus: "building_concepts",
          reason: "Internal test job can begin with manual routing; external asset production remains manual.",
        })),
    ],
    jobReviewFeedback: [],
    jobCommunicationRecords: [],
    updatedAt: SEED_AT,
    version: 10,
    syncedAt: SEED_AT,
  };
}

function materialsEnvelope() {
  const items = JOBS.flatMap((job) =>
    job.materials.map((item) => ({
      ...item,
      id: `mat-${job.skuId}-${item.id}`,
      relatedServiceIds: [job.skuId],
      reason: `Needed for ${job.serviceName}`,
    })),
  );
  return {
    campaignId: CAMPAIGN_ID,
    items,
    updatedAt: SEED_AT,
    version: 1,
    syncedAt: SEED_AT,
  };
}

function productionEnvelope() {
  return {
    campaignId: CAMPAIGN_ID,
    version: 1,
    planFingerprint: planFingerprint(),
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
  const tagia = byId.get(CLIENT_USER_ID) ?? {
    id: CLIENT_USER_ID,
    email: "tagia@local.dev",
    password: "dev-only",
    displayName: "Tagia",
    roles: ["owner", "client"],
  };
  byId.set(CLIENT_USER_ID, {
    ...tagia,
    currentCampaignId: CAMPAIGN_ID,
    clientCampaignIds: [...new Set([...(tagia.clientCampaignIds ?? []), CAMPAIGN_ID])],
  });
  for (const staff of Object.values(STAFF)) {
    const existing = byId.get(staff.id) ?? {};
    byId.set(staff.id, {
      password: "dev-only",
      roles: ["staff"],
      ...existing,
      ...staff,
    });
  }
  await writeFile(PATHS.users, JSON.stringify([...byId.values()], null, 2), "utf8");
}

async function ensureAssignments() {
  await mkdir(path.dirname(PATHS.assignments), { recursive: true });
  const assignments = await readJson(PATHS.assignments, { staffByUserId: {}, staffCapabilities: {} });
  assignments.staffByUserId = assignments.staffByUserId ?? {};
  assignments.staffCapabilities = assignments.staffCapabilities ?? {};
  for (const staff of Object.values(STAFF)) {
    assignments.staffByUserId[staff.id] = [
      ...new Set([...(assignments.staffByUserId[staff.id] ?? []), CAMPAIGN_ID]),
    ];
    assignments.staffCapabilities[staff.id] = [
      ...new Set([...(assignments.staffCapabilities[staff.id] ?? []), ...staff.capabilities]),
    ];
  }
  await writeFile(PATHS.assignments, JSON.stringify(assignments, null, 2), "utf8");
}

function setupReport() {
  const screenshotDir = "tmp/studio-test-batch-1";
  const lines = [
    "# The Studio Test Batch 1 Setup Report",
    "",
    `Campaign ID: \`${CAMPAIGN_ID}\``,
    "Client identity: The Studio as client (`tagia`, `tagia@local.dev`)",
    "Setup type: internal real-client test fixture; no external accounts, API keys, fake final assets, or live tool/storage connections.",
    "",
    "## Jobs",
    "",
    "| Job/SKU | Price | Lane | Status | Approval checkpoint |",
    "|---|---:|---|---|---|",
    ...JOBS.map((job) => {
      const checkpoint =
        job.status === "waiting_on_client"
          ? "Client materials before production"
          : "Production submits to Review Room";
      return `| ${job.serviceName} (\`${job.skuId}\`) | ${priceDisplay(job.priceCents)} | ${job.lane} | ${job.status} | ${checkpoint} |`;
    }),
    "",
    "## Readiness By Job",
    "",
    ...JOBS.flatMap((job) => [
      `### ${job.serviceName} (\`${job.skuId}\`)`,
      "",
      `Required deliverables: ${job.deliverables.join("; ")}.`,
      "",
      `Tagia must provide: ${job.clientResponsibilities.join("; ")}.`,
      "",
      `Internal team can start/create: ${job.teamCanStart.join("; ")}.`,
      "",
      `Blocked by tool/storage choices: ${job.blockedByTools.join("; ")}.`,
      "",
    ]),
    "## Rerun",
    "",
    "Run `node scripts/setup-studio-test-batch-1.mjs`. The script overwrites the same campaign/task/material/production envelopes and upserts users/assignments.",
    "",
    "Run `node scripts/verify-studio-test-batch-1.mjs` for focused data-shape verification.",
    "",
    "## Screenshots",
    "",
    `- \`${screenshotDir}/01-studio-board-project-record.png\``,
    `- \`${screenshotDir}/02-owner-console-multi-job.png\``,
    `- \`${screenshotDir}/03-production-workspace-social-posts.png\``,
    `- \`${screenshotDir}/04-work-packet-team-office.png\``,
    `- \`${screenshotDir}/05-materials-requirements.png\``,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export async function setupStudioTestBatch1() {
  await Promise.all([
    mkdir(PATHS.campaigns, { recursive: true }),
    mkdir(PATHS.tasks, { recursive: true }),
    mkdir(PATHS.materials, { recursive: true }),
    mkdir(PATHS.production, { recursive: true }),
    mkdir(OUT_DIR, { recursive: true }),
  ]);
  await ensureUsers();
  await ensureAssignments();
  await writeFile(path.join(PATHS.campaigns, `${CAMPAIGN_ID}.json`), JSON.stringify(campaignEnvelope(), null, 2), "utf8");
  await writeFile(path.join(PATHS.tasks, `${CAMPAIGN_ID}.json`), JSON.stringify(tasksEnvelope(), null, 2), "utf8");
  await writeFile(path.join(PATHS.materials, `${CAMPAIGN_ID}.json`), JSON.stringify(materialsEnvelope(), null, 2), "utf8");
  await writeFile(path.join(PATHS.production, `${CAMPAIGN_ID}.json`), JSON.stringify(productionEnvelope(), null, 2), "utf8");
  await writeFile(path.join(OUT_DIR, "setup-report.md"), setupReport(), "utf8");
  return {
    campaignId: CAMPAIGN_ID,
    reportPath: path.join("tmp", "studio-test-batch-1", "setup-report.md"),
    jobs: JOBS.map((job) => ({
      skuId: job.skuId,
      serviceName: job.serviceName,
      priceCents: job.priceCents,
      lane: job.lane,
      status: job.status,
    })),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  setupStudioTestBatch1()
    .then((result) => {
      console.log(`Set up ${result.campaignId}`);
      for (const job of result.jobs) {
        console.log(`- ${job.serviceName} (${job.skuId}) ${priceDisplay(job.priceCents)} ${job.lane} ${job.status}`);
      }
      console.log(`Report: ${result.reportPath}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
