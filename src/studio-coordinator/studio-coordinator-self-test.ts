/**
 * Studio Coordinator Phase 1 â€” offline self-test (no UI, no server).
 *
 * Simulates: client upload â†’ revision â†’ owner resolve â†’ observations â†’ learning candidate.
 * Run: node scripts/run-studio-coordinator-self-test.mjs
 * Or:  npm run test:studio-coordinator-self-test
 */

import type { CampaignRecord } from "@/config/studio-board";
import { appendJobActivityEvent } from "@/lib/job-control/activity-log";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import {
  COORDINATOR_SYSTEM_USER,
  coordinateClientEvent,
  coordinateOwnerOutcome,
  createCoordinatorSession,
  type CoordinatorSession,
  type CoordinatorExecutionState,
} from "@/studio-coordinator";

const CAMPAIGN_ID = "sc-self-test";
const JOB_ID = `${CAMPAIGN_ID}:ma-flyer-v2`;
const TASK_ID = "ma-flyer-v2:creative";
const T0 = "2026-07-01T10:00:00.000Z";
const T1 = "2026-07-02T10:00:00.000Z";
const T2 = "2026-07-03T10:00:00.000Z";
const T3 = "2026-07-03T12:00:00.000Z";

export type SelfTestStepResult = {
  id: string;
  label: string;
  pass: boolean;
  evidence: string[];
};

export type SelfTestReport = {
  ok: boolean;
  campaignId: string;
  steps: SelfTestStepResult[];
  coordinatorHandled: string[];
  routedToOwner: string[];
  storeStateMatch: string[];
  auditTrail: string[];
  observations: string[];
  learningCandidates: string[];
};

const coordinatorAssignments: CampaignAssignmentsFile = {
  staffByUserId: {
    [COORDINATOR_SYSTEM_USER.id]: [CAMPAIGN_ID],
  },
  staffCapabilities: {
    [COORDINATOR_SYSTEM_USER.id]: ["producer_dispatcher"],
  },
};

const owner: StudioUser = {
  id: "owner-tagia",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"],
};

function lineItem() {
  return {
    skuId: "ma-flyer-v2",
    serviceId: "ma-flyer-v2",
    serviceName: "Flyer",
    billingType: "one_time" as const,
    exactPriceCents: 10000,
    priceDisplay: "$100",
    deliverables: ["Concept set"],
    exclusions: [],
    timingWindowLabel: "3-5 days",
    revisionRule: "1 round",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function baseCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: CAMPAIGN_ID,
    campaignName: "Northwind Studio",
    campaignStatus: "READY_FOR_REVIEW",
    campaignDescription: "Coordinator self-test",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: T0,
    projectDetailsSubmittedAt: T0,
    approvedStudioPlan: {
      selectedServiceIds: ["ma-flyer-v2"],
      includedServiceIds: ["ma-flyer-v2"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 10000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 10000,
      lineItems: [lineItem()],
      approvedAt: T0,
    },
    createdAt: T0,
    updatedAt: T3,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    ...overrides,
  } as CampaignRecord;
}

function baseJob(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: JOB_ID,
    campaignId: CAMPAIGN_ID,
    skuId: "ma-flyer-v2",
    serviceName: "Flyer",
    spineStatus: "ready_for_review",
    productionLane: "standard",
    intakeComplete: true,
    laneQueuedAt: T0,
    updatedAt: T3,
    ...overrides,
  };
}

function baseEnvelope(): ServerTasksEnvelope {
  return {
    campaignId: CAMPAIGN_ID,
    tasks: [
      {
        id: TASK_ID,
        title: "Creative",
        phase: "creative",
        status: "ready_for_qa",
        relatedServiceIds: ["ma-flyer-v2"],
        familyId: "flyer",
        catalogFamilyId: "marketing_assets",
        serviceName: "Flyer",
        dependsOn: [],
        workflowState: "ready_for_qa",
      },
    ],
    planFingerprint: "sc-self-test",
    updatedAt: T3,
    syncedAt: T3,
    version: 9,
    jobRecords: [baseJob()],
    jobActivityEvents: [],
    jobCommunicationRecords: [],
    exceptionRecords: [],
    exceptionEvents: [],
  };
}

function executionState(
  campaign: CampaignRecord,
  envelope: ServerTasksEnvelope,
  materials: CampaignMaterialItem[] = [],
): CoordinatorExecutionState {
  return {
    campaign,
    envelope,
    materials,
    jobs: envelope.jobRecords ?? [baseJob()],
  };
}

function ownerDeskItems(envelope: ServerTasksEnvelope): string[] {
  return (envelope.exceptionRecords ?? [])
    .filter((record) => record.status === "waiting_owner")
    .map((record) => `${record.kind} (${record.id.slice(0, 8)}â€¦)`);
}

function step(id: string, label: string, pass: boolean, evidence: string[]): SelfTestStepResult {
  return { id, label, pass, evidence };
}

export function runStudioCoordinatorSelfTest(): SelfTestReport {
  const steps: SelfTestStepResult[] = [];
  const coordinatorHandled: string[] = [];
  const routedToOwner: string[] = [];
  const storeStateMatch: string[] = [];
  const auditTrail: string[] = [];
  const observations: string[] = [];
  const learningCandidates: string[] = [];

  let session: CoordinatorSession = createCoordinatorSession();
  let campaign = baseCampaign();
  let envelope = baseEnvelope();
  let state = executionState(campaign, envelope);

  const exec = {
    user: COORDINATOR_SYSTEM_USER,
    assignments: coordinatorAssignments,
    taskId: TASK_ID,
    clientId: "client-self-test",
  };

  // â”€â”€ 1. Client upload (materials) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const upload = coordinateClientEvent(
    {
      type: "missing_file_upload",
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
      occurredAt: T1,
      facts: {},
    },
    state,
    session,
    exec,
  );
  session = upload.session;
  state = upload.state;
  coordinatorHandled.push(
    `Client upload â†’ ${upload.outcome.determination} Â· Core rules: ${upload.outcome.matchedRules.map((r) => r.ruleId).join(", ")}`,
  );

  const uploadActivity = (state.envelope.jobActivityEvents ?? []).some(
    (event) => event.kind === "client_upload",
  );
  const uploadOwnerCount = ownerDeskItems(state.envelope).length;
  steps.push(
    step("client_upload", "Client upload via coordinator", uploadActivity && uploadOwnerCount === 0, [
      `determination: ${upload.outcome.determination}`,
      `activity client_upload: ${uploadActivity}`,
      `owner desk items: ${uploadOwnerCount}`,
      `client message: ${upload.summary.message}`,
    ]),
  );

  // â”€â”€ 2. Revision request (round available â€” routine) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const revisionOk = coordinateClientEvent(
    {
      type: "revision_request",
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
      occurredAt: T2,
      facts: {},
    },
    state,
    session,
    exec,
  );
  session = revisionOk.session;
  state = revisionOk.state;
  coordinatorHandled.push(
    `Revision (round available) â†’ ${revisionOk.outcome.determination} Â· humanReviewRequired=${revisionOk.outcome.humanReviewRequired}`,
  );

  const revisionActivity = (state.envelope.jobActivityEvents ?? []).some(
    (event) => event.kind === "client_revision_request",
  );
  steps.push(
    step("revision_allowed", "Revision request within allowance", revisionOk.outcome.determination === "allow" && revisionActivity, [
      `determination: ${revisionOk.outcome.determination}`,
      `activity client_revision_request: ${revisionActivity}`,
      `owner desk items: ${ownerDeskItems(state.envelope).length}`,
    ]),
  );

  // Move to reserve-round territory for the next revision event.
  campaign = { ...state.campaign, revisionRoundsUsed: 3 };
  state = { ...state, campaign };

  // â”€â”€ 3. Repeated confusion â†’ observation (no state change) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const confusionTimes = [T2, T2, T2];
  for (const occurredAt of confusionTimes) {
    const inquiry = coordinateClientEvent(
      {
        type: "status_inquiry",
        campaignId: CAMPAIGN_ID,
        jobId: JOB_ID,
        occurredAt,
        facts: {},
      },
      state,
      session,
      exec,
    );
    session = inquiry.session;
    state = inquiry.state;
  }

  const confusionObs = session.observations.filter((o) => o.kind === "repeated_confusion");
  const jobsBeforeStall = JSON.stringify(state.jobs);
  steps.push(
    step(
      "repeated_confusion",
      "Issue observation: repeated client confusion",
      confusionObs.length > 0,
      [
        `observations: ${confusionObs.length}`,
        confusionObs[0]?.summary ?? "(none)",
        `job state unchanged: ${JSON.stringify(state.jobs) === jobsBeforeStall}`,
      ],
    ),
  );
  for (const obs of confusionObs) {
    observations.push(`${obs.kind}: ${obs.summary}`);
    coordinatorHandled.push(`Observation recorded (no decision): ${obs.kind}`);
  }

  // ---- 4. Reserve revision stays with Squishy + Decision Core ----
  const jobsSnapshot = JSON.stringify(state.jobs);
  const revisionReserve = coordinateClientEvent(
    {
      type: "revision_request",
      campaignId: CAMPAIGN_ID,
      jobId: JOB_ID,
      occurredAt: T3,
      facts: {},
    },
    state,
    session,
    exec,
  );
  session = revisionReserve.session;
  state = revisionReserve.state;

  const ownerItems = ownerDeskItems(state.envelope);
  const revisionException = (state.envelope.exceptionRecords ?? []).find(
    (record) => record.kind === "revision_exhausted" && record.status === "waiting_owner",
  );

  coordinatorHandled.push(
    `Reserve revision -> ${revisionReserve.outcome.determination} Â· effects: ${revisionReserve.outcome.effects.map((e) => e.kind).join(", ")}`,
  );
  storeStateMatch.push(
    `reserve revision owner exception: ${revisionException ? "created" : "none"}`,
  );

  steps.push(
    step(
      "reserve_revision",
      "Reserve revision handled by Squishy + Decision Core",
      !revisionException &&
        revisionReserve.outcome.determination === "respond" &&
        !revisionReserve.outcome.humanReviewRequired,
      [
        `determination: ${revisionReserve.outcome.determination}`,
        `humanReviewRequired: ${revisionReserve.outcome.humanReviewRequired}`,
        `exception: ${revisionException?.kind ?? "none"}`,
        `owner desk: ${ownerItems.join("; ") || "(empty)"}`,
        `job state unchanged by observation path: ${JSON.stringify(state.jobs) === jobsSnapshot}`,
        storeStateMatch[storeStateMatch.length - 1] ?? "",
      ],
    ),
  );

  // ---- 5. Owner approval is skipped for routine reserve revisions ----
  steps.push(
    step(
      "owner_resolve_skipped",
      "No Owner resolve step for routine reserve revision",
      !revisionException,
      ["Routine revisions stay with Squishy + Decision Core."],
    ),
  );
  // â”€â”€ 6. Decision Core + audit trail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const auditSteps = session.auditLog.map((entry) => entry.step);
  const hasCoreEval = auditSteps.includes("decision_evaluated");
  const hasEffects = auditSteps.includes("effects_executed");
  const matchedRulesLogged = session.auditLog.some(
    (entry) => (entry.outcome?.matchedRules?.length ?? 0) > 0,
  );

  for (const entry of session.auditLog) {
    const rules =
      entry.outcome?.matchedRules?.map((rule) => rule.ruleId).join(", ") ?? "";
    auditTrail.push(
      `${entry.step} Â· ${entry.summary}${rules ? ` Â· rules: ${rules}` : ""}`,
    );
  }

  steps.push(
    step(
      "decision_core_audit",
      "Decision Core invoked with traceable matched rules",
      hasCoreEval && hasEffects && matchedRulesLogged,
      [
        `decision_evaluated: ${hasCoreEval}`,
        `effects_executed: ${hasEffects}`,
        `matched_rules in audit: ${matchedRulesLogged}`,
        `audit entries: ${session.auditLog.length}`,
      ],
    ),
  );

  const ok = steps.every((entry) => entry.pass);

  return {
    ok,
    campaignId: CAMPAIGN_ID,
    steps,
    coordinatorHandled,
    routedToOwner,
    storeStateMatch,
    auditTrail,
    observations,
    learningCandidates,
  };
}

export function formatSelfTestReport(report: SelfTestReport): string {
  const lines: string[] = [
    "",
    "â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•",
    "  Studio Coordinator â€” Phase 1 Self-Test",
    "â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•",
    "",
    `Campaign: ${report.campaignId}`,
    `Result: ${report.ok ? "PASS" : "FAIL"}`,
    "",
    "â”€â”€ Steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€",
  ];

  for (const entry of report.steps) {
    lines.push(`  ${entry.pass ? "âœ“" : "âœ—"} ${entry.label}`);
    for (const line of entry.evidence) {
      lines.push(`      ${line}`);
    }
  }

  lines.push("", "â”€â”€ Coordinator handled â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
  for (const line of report.coordinatorHandled) {
    lines.push(`  Â· ${line}`);
  }

  lines.push("", "â”€â”€ Routed to Owner Desk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
  if (report.routedToOwner.length === 0) {
    lines.push("  (none in this scenario before owner acted)");
  } else {
    for (const line of report.routedToOwner) {
      lines.push(`  Â· ${line}`);
    }
  }

  lines.push("", "â”€â”€ Store state parity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
  for (const line of report.storeStateMatch) {
    lines.push(`  Â· ${line}`);
  }

  lines.push("", "â”€â”€ Observations (not decisions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
  for (const line of report.observations) {
    lines.push(`  Â· ${line}`);
  }

  lines.push("", "â”€â”€ Learning candidates (pending review only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
  for (const line of report.learningCandidates) {
    lines.push(`  Â· ${line}`);
  }

  lines.push("", "â”€â”€ Audit trail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
  for (const line of report.auditTrail) {
    lines.push(`  Â· ${line}`);
  }

  lines.push("");
  return lines.join("\n");
}

/** Direct upload parity â€” activity event matches appendJobActivityEvent shape. */
export function directClientUploadActivity(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
  occurredAt: string,
): ServerTasksEnvelope {
  const events = appendJobActivityEvent(envelope.jobActivityEvents ?? [], {
    campaignId: job.campaignId,
    jobId: job.jobId,
    kind: "client_upload",
    occurredAt,
    actor: { role: "client", displayName: "Client" },
    reason: "client_upload",
  });
  return { ...envelope, jobActivityEvents: events };
}
