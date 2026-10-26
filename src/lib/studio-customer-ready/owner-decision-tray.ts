/**
 * Owner Decision Tray / File System.
 * Front door stays separate. Tile color follows the matter, not the tray.
 */

import {
  ownerMatterTileAttention,
  ownerMatterTileScanLine,
  type OwnerMatterTileAttention,
} from "@/lib/studio-customer-ready/owner-console";
import { ownerDeskEscalationV1 } from "@/config/studio-owner-desk-escalation-v1";
import {
  ownerDeskRecord,
  type OwnerDeskRecord,
} from "@/lib/studio-customer-ready/owner-desk-records";

export const OWNER_TRAY_IDS = [
  "ACTION_REQUIRED",
  "WAITING_ON_MY_DECISION",
  "SENT_IN_PROGRESS",
  "COMPLETED_FILED",
  "REFERENCE",
] as const;

export type OwnerTrayId = (typeof OWNER_TRAY_IDS)[number];

export const OWNER_TRAY_LABELS: Record<OwnerTrayId, string> = {
  ACTION_REQUIRED: "ACTION REQUIRED",
  WAITING_ON_MY_DECISION: "WAITING ON MY DECISION",
  SENT_IN_PROGRESS: "SENT / IN PROGRESS",
  COMPLETED_FILED: "COMPLETED / FILED",
  REFERENCE: "REFERENCE",
};

export type OwnerTrayAction =
  | "open"
  | "collapse"
  | "hold"
  | "send"
  | "file"
  | "reopen"
  | "open_related_work"
  | "ask"
  | "approve"
  | "reject"
  | "send_back";

export type OwnerMatter = {
  id: string;
  recordId: string;
  matter: string;
  tray: OwnerTrayId;
  ownerActionRequiredNow: boolean;
  blocksScoutOrSystem: boolean;
  movingNormally: boolean;
  status: string;
  stateChangedAt: string;
  whyOnDesk: string;
  decisionRequired: string;
  ownerSteps: string[];
  whatHappensAfterSend: string;
  assignedRecipient: string;
  nextHandoff: string;
  ruleRecordId: string | null;
  ownerQuestions: string[];
  ownerDecision?: string;
  customerAskingOwner?: string;
  whyTeamCouldNotResolve?: string;
  decisionNeededFromOwner?: string;
  testFile?: boolean;
  relatedTo?: string;
  filedOriginalLocked?: boolean;
  judgmentKind?: "studio_demo_owner_acceptance";
  playableAssetUrl?: string;
  runtime?: string;
  qaResult?: string;
  explicitLimits?: string[];
  audioStatus?: string;
  qualityClassification?: "A" | "B";
  sourceConcept?: string;
  presenterConsistency?: string;
  packageTruth?: string;
  integrationAuthorized?: boolean;
};

export type OwnerTrayState = {
  openMatterId: string | null;
  matters: OwnerMatter[];
};

export type OwnerMatterFileView = {
  id: string;
  tray: OwnerTrayId;
  attention: OwnerMatterTileAttention;
  scanLine: string;
  company: string;
  matter: string;
  whatTheyWant: string;
  why: string;
  studioAlreadyDid: string;
  projectState: string;
  facts: string;
  relevantRule: string | null;
  whyYouAreGettingThis: string;
  whatINeedFromYou: string;
  decisionRequired: string;
  ownerSteps: string[];
  assignedRecipient: string;
  nextHandoff: string;
  ownerQuestions: string[];
  customerAskingOwner?: string;
  whyTeamCouldNotResolve?: string;
  decisionNeededFromOwner?: string;
  testFile?: boolean;
  record: OwnerDeskRecord;
  judgmentKind?: "studio_demo_owner_acceptance";
  playableAssetUrl?: string;
  runtime?: string;
  qaResult?: string;
  explicitLimits?: string[];
  audioStatus?: string;
  qualityClassification?: "A" | "B";
  sourceConcept?: string;
  presenterConsistency?: string;
  packageTruth?: string;
  integrationAuthorized?: boolean;
};

export function ownerTrayOf(matter: OwnerMatter): OwnerTrayId {
  return matter.tray;
}

export function ownerMatterAttention(matter: OwnerMatter): OwnerMatterTileAttention {
  return ownerMatterTileAttention({
    ownerActionRequiredNow: matter.ownerActionRequiredNow,
    blocksScoutOrSystem: matter.blocksScoutOrSystem,
    movingNormally: matter.movingNormally,
  });
}

export function ownerMatterHowLong(
  matter: Pick<OwnerMatter, "stateChangedAt">,
  nowMs = Date.now(),
): string {
  const start = Date.parse(matter.stateChangedAt);
  if (!Number.isFinite(start)) return "unknown";
  const minutes = Math.max(0, Math.floor((nowMs - start) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr`;
}

export function ownerMatterScanLine(
  matter: OwnerMatter,
  nowMs = Date.now(),
): string {
  const record = ownerDeskRecord(matter.recordId);
  return ownerMatterTileScanLine({
    company: record.company,
    matter: matter.matter,
    attention: ownerMatterAttention(matter),
    status: matter.status,
    howLong: ownerMatterHowLong(matter, nowMs),
  });
}

export function composeOwnerMatterFile(
  matter: OwnerMatter,
  nowMs = Date.now(),
): OwnerMatterFileView {
  const record = ownerDeskRecord(matter.recordId);
  const rule = matter.ruleRecordId ? ownerDeskRecord(matter.ruleRecordId) : null;
  return {
    id: matter.id,
    tray: matter.tray,
    attention: ownerMatterAttention(matter),
    scanLine: ownerMatterScanLine(matter, nowMs),
    company: record.company,
    matter: matter.matter,
    whatTheyWant: record.whatTheyWant,
    why: matter.whyOnDesk,
    studioAlreadyDid: record.studioAlreadyDid,
    projectState: record.projectState,
    facts: record.facts,
    relevantRule: rule ? `${rule.projectName} — ${rule.facts}` : null,
    whyYouAreGettingThis: matter.whyOnDesk,
    whatINeedFromYou: matter.decisionRequired,
    decisionRequired: matter.decisionRequired,
    ownerSteps: matter.ownerSteps,
    assignedRecipient: matter.assignedRecipient,
    nextHandoff: matter.nextHandoff,
    ownerQuestions: matter.ownerQuestions,
    customerAskingOwner: matter.customerAskingOwner,
    whyTeamCouldNotResolve: matter.whyTeamCouldNotResolve,
    decisionNeededFromOwner: matter.decisionNeededFromOwner,
    testFile: matter.testFile,
    record,
    judgmentKind: matter.judgmentKind,
    playableAssetUrl: matter.playableAssetUrl,
    runtime: matter.runtime,
    qaResult: matter.qaResult,
    explicitLimits: matter.explicitLimits,
    audioStatus: matter.audioStatus,
    qualityClassification: matter.qualityClassification,
    sourceConcept: matter.sourceConcept,
    presenterConsistency: matter.presenterConsistency,
    packageTruth: matter.packageTruth,
    integrationAuthorized: matter.integrationAuthorized,
  };
}

export function ownerTrayCounts(state: OwnerTrayState): Record<OwnerTrayId, number> {
  return OWNER_TRAY_IDS.reduce(
    (counts, tray) => {
      counts[tray] = state.matters.filter((matter) => matter.tray === tray).length;
      return counts;
    },
    {
      ACTION_REQUIRED: 0,
      WAITING_ON_MY_DECISION: 0,
      SENT_IN_PROGRESS: 0,
      COMPLETED_FILED: 0,
      REFERENCE: 0,
    } as Record<OwnerTrayId, number>,
  );
}

export function ownerHeldBlockingMatters(state: OwnerTrayState): OwnerMatter[] {
  return state.matters.filter(
    (matter) =>
      matter.tray === "WAITING_ON_MY_DECISION" &&
      matter.blocksScoutOrSystem &&
      ownerMatterAttention(matter) === "RED",
  );
}

export function ownerFrontDoorStaysRedFromTrays(state: OwnerTrayState): boolean {
  return state.matters.some((matter) => {
    if (matter.tray === "REFERENCE" || matter.tray === "COMPLETED_FILED") {
      return false;
    }
    return ownerMatterAttention(matter) === "RED";
  });
}

export function composeOwnerFrontDoorFromTrays(state: OwnerTrayState): {
  attention: OwnerMatterTileAttention;
  message: string;
  steps: string[];
  currentTask: string;
  showAck: boolean;
  tagiaMustAct: boolean;
} {
  const active = state.matters.filter(
    (matter) =>
      matter.tray !== "REFERENCE" && matter.tray !== "COMPLETED_FILED",
  );
  const reds = active.filter((matter) => ownerMatterAttention(matter) === "RED");
  const yellows = active.filter(
    (matter) => ownerMatterAttention(matter) === "YELLOW",
  );
  if (reds[0]) {
    return {
      attention: "RED",
      message: "Owner input is needed.",
      steps: [],
      currentTask: "",
      showAck: true,
      tagiaMustAct: true,
    };
  }
  if (yellows[0]) {
    return {
      attention: "YELLOW",
      message: "Watch. Work continues.",
      steps: [],
      currentTask: "",
      showAck: false,
      tagiaMustAct: false,
    };
  }
  return {
    attention: "GREEN",
    message: "No Owner action is required.",
    steps: [],
    currentTask: "",
    showAck: false,
    tagiaMustAct: false,
  };
}

export function seedOwnerConsole001003State(
  nowIso = new Date().toISOString(),
): OwnerTrayState {
  return {
    openMatterId: null,
    matters: [
      {
        id: "001-harbor-roast-refund-exception",
        recordId: "room-4c-s2-harbor-roast-coffee",
        matter: "Refund exception",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: nowIso,
        whyOnDesk:
          "Harbor Roast asked for a refund after production already started. The locked refund rule does not let Scout decide this.",
        decisionRequired:
          "Approve a refund exception, or keep the locked rule: a refund may be approved only before production starts on that service.",
        ownerSteps: [
          "Read the Harbor Roast authorized facts.",
          "Read the locked refund rule.",
          "Send the exception or the refusal to Scout.",
        ],
        whatHappensAfterSend:
          "Scout follows the refund decision. The file leaves Action.",
        assignedRecipient: "Scout",
        nextHandoff:
          "Scout applies the refund decision to the Harbor Roast record.",
        ruleRecordId: "help-center-refund-policy",
        ownerQuestions: [],
      },
      {
        id: "002-cedar-lane-revisions-exhausted",
        recordId: "room-4c-s1-cedar-lane-home-organizing",
        matter: "Revisions exhausted",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: nowIso,
        whyOnDesk:
          "Cedar Lane used every included revision and asked for another change. Scout cannot grant more revisions under the locked rule.",
        decisionRequired:
          "Allow one extra revision as an Owner exception, or keep the purchased revision limit.",
        ownerSteps: [
          "Read the Cedar Lane authorized facts.",
          "Read the locked revision rule.",
          "Send the exception or the limit to Scout.",
        ],
        whatHappensAfterSend:
          "Scout follows the revision decision. The file leaves Action.",
        assignedRecipient: "Scout",
        nextHandoff:
          "Scout applies the revision decision to the Cedar Lane record.",
        ruleRecordId: "help-center-revision-policy",
        ownerQuestions: [],
      },
      {
        id: "003-moss-thread-asked-for-owner",
        recordId: "room-4c-s3-moss-and-thread-studio",
        matter: "Customer asked for Owner",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: nowIso,
        whyOnDesk:
          "Moss & Thread asked for Owner after the team could not resolve the issue through the normal path.",
        testFile: true,
        customerAskingOwner:
          "Produce the Studio Open Weekend campaign using the photographs already bound on this file. Do not keep the job waiting.",
        whyTeamCouldNotResolve:
          "The photos on this file are Studio-generated test fixtures, not customer-supplied photos. Production cannot treat them as customer-approved assets without your exception.",
        decisionNeededFromOwner:
          "Choose one: Allow this test file to proceed using the certification-fixture photos, or keep it on hold until real customer photos and rights approval are available.",
        decisionRequired:
          "Choose one: Allow this test file to proceed using the certification-fixture photos, or keep it on hold until real customer photos and rights approval are available.",
        ownerSteps: [
          "Read the Moss & Thread authorized facts.",
          "Decide whether this file may proceed on the bound fixture photographs.",
          "Send your decision.",
        ],
        whatHappensAfterSend:
          "Scout follows what you sent. The file leaves Action.",
        assignedRecipient: "Scout",
        nextHandoff:
          "Scout applies your direction to the Moss & Thread record.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
    ],
  };
}

export function seedOwnerConsoleE2eState(
  nowIso = "2026-09-21T22:40:00.000Z",
): OwnerTrayState {
  return {
    openMatterId: null,
    matters: [
      {
        id: "e2e-harbor-roast-print-add",
        recordId: "room-4c-s2-harbor-roast-coffee",
        matter: "Related print add-on",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: nowIso,
        whyOnDesk:
          "Harbor Roast already has an authorized campaign record. A related print add-on needs an Owner yes or no before Scout continues.",
        decisionRequired:
          "Approve the related print add-on, or keep the certified package as filed.",
        ownerSteps: [
          "Read the Harbor Roast authorized facts.",
          "Decide on the related print add-on.",
          "Send the decision to Scout.",
        ],
        whatHappensAfterSend:
          "Scout resumes from the sent decision. The file moves to Sent / In Progress.",
        assignedRecipient: "Scout",
        nextHandoff:
          "Scout applies the add-on decision to the Harbor Roast record.",
        ruleRecordId: "help-center-refund-policy",
        ownerQuestions: [],
      },
      {
        id: "ref-refund",
        recordId: "help-center-refund-policy",
        matter: "Refund policy",
        tray: "REFERENCE",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Reference",
        stateChangedAt: nowIso,
        whyOnDesk: "Rules and facts, not work to do.",
        decisionRequired: "None. Reference never raises RED by itself.",
        ownerSteps: [
          "Read the locked refund rule.",
          "Link it from a decision file when needed.",
        ],
        whatHappensAfterSend: "Reference is not sent.",
        assignedRecipient: "Owner",
        nextHandoff: "Stay on the locked Help Center rule.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
    ],
  };
}

function matterById(state: OwnerTrayState, id: string): OwnerMatter {
  const matter = state.matters.find((entry) => entry.id === id);
  if (!matter) throw new Error(`Matter not on desk: ${id}`);
  return matter;
}

function replaceMatter(state: OwnerTrayState, next: OwnerMatter): OwnerTrayState {
  return {
    ...state,
    matters: state.matters.map((entry) => (entry.id === next.id ? next : entry)),
  };
}

function assertExclusiveTray(matter: OwnerMatter): void {
  if (matter.tray === "ACTION_REQUIRED" && matter.filedOriginalLocked) {
    throw new Error("Filed original cannot return to Action.");
  }
}

export function applyOwnerTrayAction(
  state: OwnerTrayState,
  input: {
    action: OwnerTrayAction;
    matterId: string;
    question?: string;
    decision?: string;
    nowIso?: string;
  },
): OwnerTrayState {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const current = matterById(state, input.matterId);

  if (input.action === "open") {
    return { ...state, openMatterId: current.id };
  }

  if (input.action === "collapse") {
    return {
      ...state,
      openMatterId: state.openMatterId === current.id ? null : state.openMatterId,
    };
  }

  if (input.action === "ask") {
    const question = String(input.question ?? "").trim();
    if (!question) return state;
    return replaceMatter(state, {
      ...current,
      ownerQuestions: [...current.ownerQuestions, question],
    });
  }

  if (input.action === "reopen") {
    if (current.tray !== "COMPLETED_FILED" && current.tray !== "REFERENCE") {
      return { ...state, openMatterId: current.id };
    }
    return { ...state, openMatterId: current.id };
  }

  if (input.action === "open_related_work") {
    if (current.tray !== "COMPLETED_FILED") {
      throw new Error("Related work opens only from a filed item.");
    }
    const relatedId = `${current.id}-related-${nowIso}`;
    const related: OwnerMatter = {
      ...current,
      id: relatedId,
      matter: "New work",
      tray: "ACTION_REQUIRED",
      ownerActionRequiredNow: true,
      blocksScoutOrSystem: true,
      movingNormally: false,
      status: "Owner decision needed",
      stateChangedAt: nowIso,
      whyOnDesk: ownerDeskEscalationV1.newWorkOpenedByMistake.whyYouAreGettingThis,
      decisionRequired: ownerDeskEscalationV1.newWorkOpenedByMistake.whatINeedFromYou,
      ownerSteps: [
        "Tell Scout what the new work is.",
        "Or put the matter away if it was opened by mistake.",
        "Send it to Scout when you know.",
      ],
      assignedRecipient: "Scout",
      nextHandoff: "Scout follows what you sent.",
      relatedTo: current.id,
      filedOriginalLocked: false,
      ownerQuestions: [],
    };
    return {
      openMatterId: relatedId,
      matters: [
        ...state.matters.map((entry) =>
          entry.id === current.id ? { ...entry, filedOriginalLocked: true } : entry,
        ),
        related,
      ],
    };
  }

  if (current.tray === "REFERENCE") {
    throw new Error("Reference is linked, not moved.");
  }
  if (current.filedOriginalLocked) {
    throw new Error("Do not silently mutate a filed original.");
  }

  if (input.action === "hold") {
    if (current.tray !== "ACTION_REQUIRED") {
      throw new Error("Hold moves an Action file to Waiting.");
    }
    const next: OwnerMatter = {
      ...current,
      tray: "WAITING_ON_MY_DECISION",
      status: current.blocksScoutOrSystem
        ? "Held · Scout still blocked"
        : "Held · not blocking",
      ownerActionRequiredNow: current.blocksScoutOrSystem,
      movingNormally: false,
      stateChangedAt: nowIso,
    };
    assertExclusiveTray(next);
    return {
      openMatterId: next.id,
      matters: replaceMatter(state, next).matters,
    };
  }

  if (
    input.action === "approve" ||
    input.action === "reject" ||
    input.action === "send_back"
  ) {
    if (current.judgmentKind !== "studio_demo_owner_acceptance") {
      throw new Error("Structured judgment actions are only for Owner acceptance items.");
    }
    const note = String(input.decision ?? input.question ?? "").trim();
    const judged: OwnerMatter =
      input.action === "approve"
        ? {
            ...current,
            tray: "SENT_IN_PROGRESS",
            ownerActionRequiredNow: false,
            blocksScoutOrSystem: false,
            movingNormally: true,
            status: "Approved · Scout integrates",
            ownerDecision: note ? `APPROVE — ${note}` : "APPROVE",
            assignedRecipient: "Scout",
            nextHandoff:
              "Scout replaces the existing Page 1 demo asset only. No homepage redesign. No publish / no merge / no push.",
            integrationAuthorized: true,
            stateChangedAt: nowIso,
          }
        : input.action === "reject"
          ? {
              ...current,
              tray: "COMPLETED_FILED",
              ownerActionRequiredNow: false,
              blocksScoutOrSystem: false,
              movingNormally: true,
              status: "Rejected · off Page 1",
              ownerDecision: note ? `REJECT — ${note}` : "REJECT",
              assignedRecipient: "Filed",
              nextHandoff: "The cut stays off Page 1. Scout does not integrate it.",
              filedOriginalLocked: true,
              integrationAuthorized: false,
              stateChangedAt: nowIso,
            }
          : {
              ...current,
              tray: "SENT_IN_PROGRESS",
              ownerActionRequiredNow: false,
              blocksScoutOrSystem: false,
              movingNormally: true,
              status: "Sent back to Production",
              ownerDecision: note ? `SEND BACK — ${note}` : "SEND BACK",
              assignedRecipient: "Production Team",
              nextHandoff: "Production Team corrects the cut. The homepage slot stays unapproved.",
              integrationAuthorized: false,
              stateChangedAt: nowIso,
            };
    return {
      openMatterId: judged.id,
      matters: replaceMatter(state, judged).matters,
    };
  }

  if (input.action === "send") {
    if (
      current.tray !== "ACTION_REQUIRED" &&
      current.tray !== "WAITING_ON_MY_DECISION"
    ) {
      throw new Error("Send leaves Action or Waiting only.");
    }
    const decision = String(input.decision ?? input.question ?? "").trim();
    if (!decision) {
      throw new Error("Write your decision before you send this file.");
    }
    const next: OwnerMatter = {
      ...current,
      tray: "SENT_IN_PROGRESS",
      ownerActionRequiredNow: false,
      blocksScoutOrSystem: false,
      movingNormally: true,
      status: "Team executing",
      ownerDecision: decision,
      stateChangedAt: nowIso,
    };
    return {
      openMatterId: next.id,
      matters: replaceMatter(state, next).matters,
    };
  }

  if (input.action === "file") {
    const openedByMistake = Boolean(current.relatedTo) && current.tray === "ACTION_REQUIRED";
    if (current.tray !== "SENT_IN_PROGRESS" && !openedByMistake) {
      throw new Error("File only after the work is actually sent.");
    }
    const next: OwnerMatter = {
      ...current,
      tray: "COMPLETED_FILED",
      ownerActionRequiredNow: false,
      blocksScoutOrSystem: false,
      movingNormally: true,
      status: "Filed",
      filedOriginalLocked: true,
      stateChangedAt: nowIso,
    };
    return {
      openMatterId: next.id,
      matters: replaceMatter(state, next).matters,
    };
  }

  throw new Error(`Unknown tray action: ${input.action}`);
}

export function seedOwnerTrayState(nowIso = "2026-09-21T22:00:00.000Z"): OwnerTrayState {
  return {
    openMatterId: null,
    matters: [
      {
        id: "cedar-lane-unsupported-size",
        recordId: "room-4c-s1-cedar-lane-home-organizing",
        matter: "Unsupported print size",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: "2026-09-21T21:46:00.000Z",
        whyOnDesk:
          "The existing Cedar Lane record refuses unsupported sizes. Scout cannot continue this add-on without an Owner exception.",
        decisionRequired: "Allow the out-of-contract print size, or keep the refusal.",
        ownerSteps: [
          "Open the Cedar Lane record facts.",
          "Decide whether this size stays refused.",
          "Send the decision back to Scout.",
        ],
        whatHappensAfterSend: "Scout follows the exception or keeps the refusal. The file leaves Action.",
        assignedRecipient: "Scout",
        nextHandoff: "Scout executes the print-size decision on the Cedar Lane record.",
        ruleRecordId: "help-center-revision-policy",
        ownerQuestions: [],
      },
      {
        id: "harbor-roast-scope-add",
        recordId: "room-4c-s2-harbor-roast-coffee",
        matter: "Related print add-on",
        tray: "ACTION_REQUIRED",
        ownerActionRequiredNow: true,
        blocksScoutOrSystem: true,
        movingNormally: false,
        status: "Owner decision needed",
        stateChangedAt: "2026-09-21T21:38:00.000Z",
        whyOnDesk:
          "Harbor Roast already has an authorized campaign record. A related print add-on needs an Owner yes or no before Scout continues.",
        decisionRequired: "Approve the related print add-on, or keep the certified package as filed.",
        ownerSteps: [
          "Read the Harbor Roast authorized facts.",
          "Decide on the related print add-on.",
          "Send the decision to Scout.",
        ],
        whatHappensAfterSend: "Scout resumes from the sent decision. The file moves to Sent / In Progress.",
        assignedRecipient: "Scout",
        nextHandoff: "Scout applies the add-on decision to the Harbor Roast record.",
        ruleRecordId: "help-center-refund-policy",
        ownerQuestions: [],
      },
      {
        id: "cedar-lane-caption-filed",
        recordId: "room-4c-s1-cedar-lane-home-organizing",
        matter: "Promo caption filed",
        tray: "COMPLETED_FILED",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Filed",
        stateChangedAt: "2026-09-21T18:00:00.000Z",
        whyOnDesk: "Historical Cedar Lane caption. Retrievable. Not on the front door.",
        decisionRequired: "None unless you open related work.",
        ownerSteps: ["Read the filed file.", "Do not edit this original.", "Open related work only if new Owner work is required."],
        whatHappensAfterSend: "Already filed.",
        assignedRecipient: "Filed",
        nextHandoff: "None. History only.",
        ruleRecordId: "help-center-revision-policy",
        ownerQuestions: [],
        filedOriginalLocked: true,
      },
      {
        id: "ref-refund",
        recordId: "help-center-refund-policy",
        matter: "Refund policy",
        tray: "REFERENCE",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Reference",
        stateChangedAt: nowIso,
        whyOnDesk: "Rules and facts, not work to do.",
        decisionRequired: "None. Reference never raises RED by itself.",
        ownerSteps: ["Read the locked refund rule.", "Link it from a decision file when needed."],
        whatHappensAfterSend: "Reference is not sent.",
        assignedRecipient: "Owner",
        nextHandoff: "Stay on the locked Help Center rule.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
      {
        id: "ref-revision",
        recordId: "help-center-revision-policy",
        matter: "Revision policy",
        tray: "REFERENCE",
        ownerActionRequiredNow: false,
        blocksScoutOrSystem: false,
        movingNormally: true,
        status: "Reference",
        stateChangedAt: nowIso,
        whyOnDesk: "Rules and facts, not work to do.",
        decisionRequired: "None. Reference never raises RED by itself.",
        ownerSteps: ["Read the locked revision rule.", "Link it from a decision file when needed."],
        whatHappensAfterSend: "Reference is not sent.",
        assignedRecipient: "Owner",
        nextHandoff: "Stay on the locked Help Center rule.",
        ruleRecordId: null,
        ownerQuestions: [],
      },
    ],
  };
}
