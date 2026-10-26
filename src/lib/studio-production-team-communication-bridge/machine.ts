/**
 * Machine is the bridge. Actors do not wander. Scout is not on this path.
 */

import type {
  StudioTeamProducerRoleId,
  StudioTeamRoleId,
} from "@/config/studio-production-team-communication-bridge-v1";
import { evaluateMaterialsAndSubstituteAsset } from "@/lib/studio-materials-and-substitute-asset";
import { evaluateIncomingOwnerIssue } from "@/lib/studio-owner-resolve-once-teach-forward";
import { roleCard } from "./roles";
import type {
  MachineRouteDecision,
  SharedJobTruth,
  TeamHandoff,
} from "./types";

const PRODUCERS = new Set<StudioTeamRoleId>([
  "design_production",
  "copy_production",
  "video_production",
  "print_file_production",
]);

export function producerForSku(skuId: string): StudioTeamProducerRoleId {
  if (skuId.includes("copy") || skuId.includes("email") || skuId.includes("caption")) {
    return "copy_production";
  }
  if (skuId.includes("video")) return "video_production";
  if (skuId.includes("print-file") || skuId.endsWith("-print")) {
    return "print_file_production";
  }
  return "design_production";
}

export function createSharedJobTruth(input: {
  jobId: string;
  company: string;
  project: string;
  skuId: string;
  authorizedFacts?: Record<string, string>;
  materialsReceived?: boolean;
  materialsMissing?: boolean;
  customerPromisedMaterials?: boolean;
  rightsStatus?: SharedJobTruth["rightsStatus"];
  customerInstructions?: string;
  deadlineStatus?: string;
  revisionIncluded?: number;
}): SharedJobTruth {
  const included = input.revisionIncluded ?? 1;
  return {
    jobId: input.jobId,
    company: input.company,
    project: input.project,
    skuId: input.skuId,
    authorizedFacts: input.authorizedFacts ?? {},
    materialsReceived: input.materialsReceived ?? true,
    materialsMissing: input.materialsMissing ?? false,
    customerPromisedMaterials: input.customerPromisedMaterials ?? false,
    rightsStatus: input.rightsStatus ?? "pass",
    customerInstructions: input.customerInstructions ?? "",
    deadlineStatus: input.deadlineStatus ?? "on_track",
    productionAssignment: producerForSku(input.skuId),
    priorCompletedWork: [],
    revisionState: {
      included,
      used: 0,
      remaining: included,
    },
    applicableRules: [
      "docs/studio-owner-resolve-once-teach-forward-v1-locked.md",
      "docs/studio-materials-and-substitute-asset-v1-locked.md",
    ],
    currentActor: "studio_voice",
    nextExpectedActor: "machine",
    blockers: [],
    ownerDecision: null,
    ownerOnDesk: false,
    expectedToContinue: true,
    intentionalStop: false,
    scoutListening: false,
    qaPassed: null,
    reviewReady: false,
    customerRevisionConsumedOnInternalFix: false,
    handoffs: [],
  };
}

function materialsDecision(truth: SharedJobTruth) {
  return evaluateMaterialsAndSubstituteAsset({
    customerPromisedMaterials: truth.customerPromisedMaterials,
    customerMaterialsReceived: truth.materialsReceived && !truth.materialsMissing,
    rightsPass: truth.rightsStatus === "pass",
    customerAuthorizedStudioCreatedVisuals: false,
    studioCreatedAuthorizationRecorded: false,
    studioCreatedRightsPass: false,
    studioCreatedLabeledAsStudioCreated: false,
    assetKind: "customer_supplied",
    treatedAsCustomerSupplied: truth.materialsReceived && !truth.materialsMissing,
    testOrControlledScenarioAllowsFixture: false,
    authorizedProductionRuleAllowsFixture: false,
    customerRequestsMaterialsException: false,
    pathConflictsWithExistingRule: false,
    rightsOrSourceAmbiguous: truth.rightsStatus === "ambiguous",
    machineCannotResolveUnderExistingRules: false,
  });
}

function ownerNeeded(handoff: TeamHandoff): boolean {
  if (handoff.result !== "needs_owner") return false;
  const classId = /refund/i.test(`${handoff.received} ${handoff.did}`)
    ? "refund_exception"
    : /revision/i.test(`${handoff.received} ${handoff.did}`)
      ? "revisions_exhausted"
      : "other_exception";
  return evaluateIncomingOwnerIssue({
    classId,
    taughtRuleExists: false,
    factsMateriallyDifferentFromTaughtRule: false,
    taughtRuleConflicts: false,
    ownerJudgmentStillRequired: true,
  }).ownerEscalation;
}

function mentionsRevision(handoff: TeamHandoff): boolean {
  return /revision/i.test(`${handoff.received} ${handoff.did}`);
}

function classifyBlockedReason(handoff: TeamHandoff, truth: SharedJobTruth) {
  const reason = `${handoff.blocking ?? ""} ${handoff.received} ${handoff.did}`.toLowerCase();
  if (
    /production_slot|lane_cap|waiting_for_production_slot|waiting for a production slot/.test(
      reason,
    )
  ) {
    return "lane_wait" as const;
  }
  if (
    /clarif|customer_choice|need_customer|tagline|color choice|which option/.test(reason)
  ) {
    return "clarification" as const;
  }
  if (
    truth.materialsMissing ||
    /photo|material|file|upload|promised/.test(reason)
  ) {
    return "materials" as const;
  }
  return "other_block" as const;
}

function nextAfterOk(truth: SharedJobTruth, from: TeamHandoff["from"]): StudioTeamRoleId | "customer" | null {
  if (from === "customer" || from === "studio_voice") return "machine";
  if (from === "machine") return truth.productionAssignment;
  if (from && PRODUCERS.has(from as StudioTeamRoleId)) return "quality_team";
  if (from === "quality_team") return "studio_voice";
  if (from === "owner") {
    return truth.productionAssignment ?? "studio_voice";
  }
  if (from === "supervisor") return truth.productionAssignment ?? "machine";
  if (from === "studio_manager") return truth.productionAssignment ?? "machine";
  return "machine";
}

export function machineReceiveHandoff(
  truth: SharedJobTruth,
  handoff: TeamHandoff,
  now = new Date().toISOString(),
): MachineRouteDecision {
  if (handoff.from === "scout") {
    const recorded = {
      ...handoff,
      nextActor: truth.currentActor,
      recordedBy: "machine" as const,
      at: now,
    };
    return {
      truth: { ...truth, handoffs: [...truth.handoffs, recorded] },
      nextActor: truth.currentActor,
      ownerEscalation: false,
      scoutOnRoutinePath: false,
    };
  }

  let nextActor: StudioTeamRoleId | "customer" | null = "machine";
  let ownerEscalation = false;
  let blockers = [...truth.blockers];
  let current = truth.currentActor;
  let expectedToContinue = true;
  let intentionalStop = false;
  let scoutListening = false;
  let ownerOnDesk = truth.ownerOnDesk;
  let ownerDecision = truth.ownerDecision;
  let qaPassed = truth.qaPassed;
  let reviewReady = truth.reviewReady;
  let prior = [...truth.priorCompletedWork];
  let customerRevisionConsumedOnInternalFix = truth.customerRevisionConsumedOnInternalFix;

  if (handoff.result === "intentional_stop") {
    nextActor = null;
    expectedToContinue = false;
    intentionalStop = true;
    scoutListening = true;
    current = "machine";
  } else if (handoff.result === "stalled") {
    const quietIsListening =
      truth.scoutListening ||
      truth.intentionalStop ||
      truth.expectedToContinue === false;
    if (quietIsListening) {
      nextActor = null;
      expectedToContinue = false;
      intentionalStop = true;
      scoutListening = true;
      current = "machine";
    } else {
      nextActor = "supervisor";
      current = "supervisor";
      expectedToContinue = true;
    }
  } else if (handoff.result === "needs_owner" && ownerNeeded(handoff)) {
    nextActor = "owner";
    current = "owner";
    ownerOnDesk = true;
    ownerEscalation = true;
    expectedToContinue = false;
  } else if (
    (handoff.from === "studio_voice" || handoff.from === "customer") &&
    handoff.result === "ok" &&
    mentionsRevision(handoff) &&
    truth.revisionState.remaining <= 0
  ) {
    nextActor = "owner";
    current = "owner";
    ownerOnDesk = true;
    ownerEscalation = true;
    expectedToContinue = false;
    blockers = ["revision_allowance_exhausted"];
  } else if (handoff.from === "owner" && handoff.result === "ok") {
    ownerDecision = handoff.did;
    ownerOnDesk = false;
    ownerEscalation = false;
    nextActor = truth.productionAssignment ?? "studio_voice";
    current = "machine";
    blockers = blockers.filter((item) => item !== "owner_decision_pending");
  } else if (handoff.result === "blocked") {
    const blockedKind = classifyBlockedReason(handoff, truth);
    if (blockedKind === "lane_wait") {
      nextActor = "studio_voice";
      current = "machine";
      blockers = ["waiting_for_production_slot"];
      expectedToContinue = false;
    } else if (blockedKind === "clarification") {
      nextActor = "studio_voice";
      current = "machine";
      blockers = [handoff.blocking || "production_clarification"];
      expectedToContinue = false;
    } else if (blockedKind === "materials") {
      const materials = materialsDecision({
        ...truth,
        materialsMissing: true,
        customerPromisedMaterials: truth.customerPromisedMaterials || true,
      });
      if (materials.ownerEscalation) {
        nextActor = "owner";
        current = "owner";
        ownerOnDesk = true;
        ownerEscalation = true;
      } else {
        nextActor = "studio_voice";
        current = "machine";
        blockers = ["waiting_on_customer_materials"];
        expectedToContinue = false;
      }
    } else {
      nextActor = "studio_voice";
      current = "machine";
      blockers = [handoff.blocking || "blocked"];
      expectedToContinue = false;
    }
  } else if (handoff.from === "quality_team" && handoff.result === "rejected") {
    qaPassed = false;
    customerRevisionConsumedOnInternalFix = false;
    nextActor = truth.productionAssignment;
    current = "machine";
    blockers = ["qa_rejected"];
  } else if (handoff.from === "quality_team" && handoff.result === "ok") {
    qaPassed = true;
    reviewReady = true;
    blockers = [];
    prior = [...prior, "qa_passed"];
    nextActor = "studio_voice";
    current = "machine";
  } else if (handoff.result === "ok") {
    blockers = [];
    if (handoff.from && PRODUCERS.has(handoff.from as StudioTeamRoleId)) {
      prior = [...prior, `${handoff.from}:produced`];
    }
    nextActor = nextAfterOk(truth, handoff.from);
    current = "machine";
    if (nextActor === "machine") {
      nextActor = truth.productionAssignment;
    }
  }

  if (nextActor === "scout") nextActor = "machine";

  const recorded = {
    ...handoff,
    nextActor,
    recordedBy: "machine" as const,
    at: now,
  };

  const nextTruth: SharedJobTruth = {
    ...truth,
    currentActor: nextActor === null ? current : nextActor,
    nextExpectedActor: nextActor,
    blockers,
    ownerDecision,
    ownerOnDesk,
    expectedToContinue,
    intentionalStop,
    scoutListening,
    qaPassed,
    reviewReady,
    priorCompletedWork: prior,
    revisionState: truth.revisionState,
    customerRevisionConsumedOnInternalFix,
    handoffs: [...truth.handoffs, recorded],
  };

  return {
    truth: nextTruth,
    nextActor,
    ownerEscalation,
    scoutOnRoutinePath: false,
  };
}

export function voiceStatusFromTruth(truth: SharedJobTruth): string {
  if (truth.blockers.includes("waiting_on_customer_materials")) {
    return "The Studio is waiting on the photos or files you said you would send. Final production has not started.";
  }
  if (truth.blockers.includes("waiting_for_production_slot")) {
    return "The Studio is waiting for a production slot. Nothing is needed from you. I will not invent a start date.";
  }
  if (
    truth.blockers.some((item) =>
      /clarif|customer_choice|need_customer|tagline/i.test(item),
    )
  ) {
    return "Production needs one clarification from you before it can continue. Owner is not needed for this.";
  }
  if (truth.ownerOnDesk) {
    return "The Studio has a decision pending with Owner. Your project is held on that point. Nothing else is being invented.";
  }
  if (truth.reviewReady) {
    return "The work is ready for your review.";
  }
  if (truth.currentActor && truth.currentActor !== "studio_voice") {
    const card = roleCard(
      truth.currentActor === "customer" ? "studio_voice" : truth.currentActor,
    );
    return `Machine has the job with ${card.role.replaceAll("_", " ")}. Voice will not invent a second status.`;
  }
  return "Machine has the current job truth.";
}
