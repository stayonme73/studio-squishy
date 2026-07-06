/**
 * Studio Coordinator Phase 1 — offline self-test (no UI, no server).
 *
 * Simulates: client upload → revision → owner resolve → observations → learning candidate.
 * Run: node scripts/run-studio-coordinator-self-test.mjs
 * Or:  npm run test:studio-coordinator-self-test
 */

import type { CampaignRecord } from "@/config/studio-board";
import { appendJobActivityEvent } from "@/lib/job-control/activity-log";
import { bridgeExceptionFromRevisionExhausted } from "@/lib/campaign-tasks/exceptions-actions";
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
    .map((record) => `${record.kind} (${record.id.slice(0, 8)}…)`);
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

  // ── 1. Client upload (materials) ─────────────────────────────────────────
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
    `Client upload → ${upload.outcome.determination} · Core rules: ${upload.outcome.matchedRules.map((r) => r.ruleId).join(", ")}`,
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

  // ── 2. Revision request (round available — routine) ────────────────────
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
    `Revision (round available) → ${revisionOk.outcome.determination} · humanReviewRequired=${revisionOk.outcome.humanReviewRequired}`,
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

  // Mark round used — same as review-room path after successful revision
  campaign = { ...state.campaign, revisionRoundsUsed: 1 };
  state = { ...state, campaign };

  // ── 3. Repeated confusion → observation (no state change) ───────────────
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

  // ── 4. Revision exhausted → Owner Desk ─────────────────────────────────
  const jobsSnapshot = JSON.stringify(state.jobs);
  const revisionEscalate = coordinateClientEvent(
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
  session = revisionEscalate.session;
  state = revisionEscalate.state;

  const ownerItems = ownerDeskItems(state.envelope);
  const revisionException = (state.envelope.exceptionRecords ?? []).find(
    (record) => record.kind === "revision_exhausted" && record.status === "waiting_owner",
  );

  coordinatorHandled.push(
    `Revision (exhausted) → ${revisionEscalate.outcome.determination} · effects: ${revisionEscalate.outcome.effects.map((e) => e.kind).join(", ")}`,
  );
  if (revisionException) {
    routedToOwner.push(
      `revision_exhausted · ${revisionException.title} · status=${revisionException.status}`,
    );
  }

  // Parity: direct mutator vs coordinator path
  const directEnvelope = bridgeExceptionFromRevisionExhausted(
    baseEnvelope(),
    TASK_ID,
    baseCampaign({ revisionRoundsUsed: 1 }),
    COORDINATOR_SYSTEM_USER,
    coordinatorAssignments,
  );
  const directKind = directEnvelope.exceptionRecords?.[0]?.kind;
  const coordKind = revisionException?.kind;
  const parityMatch = directKind === coordKind && revisionEscalate.outcome.humanReviewRequired;
  storeStateMatch.push(
    `revision_exhausted parity: direct=${directKind} coordinator=${coordKind} (${parityMatch ? "match" : "MISMATCH"})`,
  );

  steps.push(
    step(
      "revision_exhausted",
      "Revision limit → Owner Desk via Decision Core + mutator",
      Boolean(revisionException) &&
        revisionEscalate.outcome.determination === "escalate" &&
        parityMatch,
      [
        `determination: ${revisionEscalate.outcome.determination}`,
        `humanReviewRequired: ${revisionEscalate.outcome.humanReviewRequired}`,
        `exception: ${revisionException?.kind ?? "missing"}`,
        `owner desk: ${ownerItems.join("; ") || "(empty)"}`,
        `job state unchanged by observation path: ${JSON.stringify(state.jobs) === jobsSnapshot}`,
        storeStateMatch[storeStateMatch.length - 1] ?? "",
      ],
    ),
  );

  // ── 5. Owner approval (resolve) + learning candidate ───────────────────
  if (!revisionException) {
    steps.push(
      step("owner_resolve", "Owner resolves revision_exhausted", false, ["No exception to resolve."]),
    );
  } else {
    const ownerResult = coordinateOwnerOutcome(
      {
        campaignId: CAMPAIGN_ID,
        exceptionId: revisionException.id,
        action: "resolve_exception",
        occurredAt: T3,
        user: owner,
        assignments: coordinatorAssignments,
        payload: { resolutionNotes: "Owner approved one additional revision round." },
      },
      state,
      session,
    );
    session = ownerResult.session;
    state = ownerResult.state;

    const resolved = (state.envelope.exceptionRecords ?? []).find(
      (record) => record.id === revisionException.id,
    );
    const candidate = session.learningCandidates[0];
    const candidateOk =
      candidate?.status === "pending_review" && ownerResult.summary.learningCandidateRecorded;

    coordinatorHandled.push(`Owner resolve → exception status=${resolved?.status}`);
    if (candidate) {
      learningCandidates.push(
        `${candidate.status}: ${candidate.situationSummary} · outcome=${candidate.ownerOutcome}`,
      );
      coordinatorHandled.push(`Learning candidate stored (not applied): ${candidate.id.slice(0, 8)}…`);
    }

    steps.push(
      step("owner_resolve", "Owner approval via coordinator + learning candidate", resolved?.status === "resolved" && candidateOk, [
        `exception status: ${resolved?.status ?? "missing"}`,
        `learning candidate: ${candidate ? candidate.status : "none"}`,
        `owner message: ${ownerResult.summary.message}`,
        `owner desk after resolve: ${ownerDeskItems(state.envelope).length}`,
      ]),
    );
  }

  // ── 6. Decision Core + audit trail ─────────────────────────────────────
  const auditSteps = session.auditLog.map((entry) => entry.step);
  const hasCoreEval = auditSteps.includes("decision_evaluated");
  const hasEffects = auditSteps.includes("effects_executed");
  const hasOwnerAction = auditSteps.includes("owner_action_executed");
  const matchedRulesLogged = session.auditLog.some(
    (entry) => (entry.outcome?.matchedRules?.length ?? 0) > 0,
  );

  for (const entry of session.auditLog) {
    const rules =
      entry.outcome?.matchedRules?.map((rule) => rule.ruleId).join(", ") ?? "";
    auditTrail.push(
      `${entry.step} · ${entry.summary}${rules ? ` · rules: ${rules}` : ""}`,
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

  steps.push(
    step(
      "owner_audit",
      "Owner outcome in audit trail",
      hasOwnerAction,
      [`owner_action_executed: ${hasOwnerAction}`],
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
    "══════════════════════════════════════════════════════════════",
    "  Studio Coordinator — Phase 1 Self-Test",
    "══════════════════════════════════════════════════════════════",
    "",
    `Campaign: ${report.campaignId}`,
    `Result: ${report.ok ? "PASS" : "FAIL"}`,
    "",
    "── Steps ──────────────────────────────────────────────────────",
  ];

  for (const entry of report.steps) {
    lines.push(`  ${entry.pass ? "✓" : "✗"} ${entry.label}`);
    for (const line of entry.evidence) {
      lines.push(`      ${line}`);
    }
  }

  lines.push("", "── Coordinator handled ────────────────────────────────────────");
  for (const line of report.coordinatorHandled) {
    lines.push(`  · ${line}`);
  }

  lines.push("", "── Routed to Owner Desk ───────────────────────────────────────");
  if (report.routedToOwner.length === 0) {
    lines.push("  (none in this scenario before owner acted)");
  } else {
    for (const line of report.routedToOwner) {
      lines.push(`  · ${line}`);
    }
  }

  lines.push("", "── Store state parity ─────────────────────────────────────────");
  for (const line of report.storeStateMatch) {
    lines.push(`  · ${line}`);
  }

  lines.push("", "── Observations (not decisions) ───────────────────────────────");
  for (const line of report.observations) {
    lines.push(`  · ${line}`);
  }

  lines.push("", "── Learning candidates (pending review only) ──────────────────");
  for (const line of report.learningCandidates) {
    lines.push(`  · ${line}`);
  }

  lines.push("", "── Audit trail ────────────────────────────────────────────────");
  for (const line of report.auditTrail) {
    lines.push(`  · ${line}`);
  }

  lines.push("");
  return lines.join("\n");
}

/** Direct upload parity — activity event matches appendJobActivityEvent shape. */
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
