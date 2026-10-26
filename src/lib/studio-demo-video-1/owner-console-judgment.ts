import { ownerMatterMayBeCreated } from "@/config/studio-owner-desk-escalation-v1";
import {
  studioDemoVideo1OwnerConsoleV1 as cfg,
} from "@/config/studio-demo-video-1-owner-console-v1";
import type {
  OwnerMatter,
  OwnerTrayState,
} from "@/lib/studio-customer-ready/owner-decision-tray";

export type Video1QualityClassification = "A" | "B" | "C";

export type Video1QualityReturn = {
  classification: Video1QualityClassification;
  runtime: string;
  qaResult: string;
  explicitLimits?: readonly string[];
  audioStatus: string;
  sourceConcept: string;
  presenterConsistency: string;
  packageTruth: string;
  playableAssetUrl?: string;
};

export type Video1OwnerDecisionId = "APPROVE" | "REJECT" | "SEND_BACK";

export type Video1OwnerDecision = {
  packageId: string;
  matterId: string;
  decision: Video1OwnerDecisionId;
  integrationAuthorized: boolean;
  homepageDesignMayChange: false;
  noPublishNoMergeNoPush: true;
  decidedAt: string;
  note: string;
  nextActor: "scout" | "production_team" | "none";
};

export function video1QualityMayRaiseOwnerJudgment(
  input: Pick<Video1QualityReturn, "classification" | "runtime" | "qaResult">,
): { ok: true } | { ok: false; error: string } {
  if (input.classification === cfg.blockedClassification) {
    return {
      ok: false,
      error: "Quality is blocked. Do not raise an Owner Console item.",
    };
  }
  if (!cfg.qualityClassificationsThatRaise.includes(input.classification)) {
    return { ok: false, error: "Quality has not passed this cut." };
  }
  if (!String(input.runtime ?? "").trim() || !String(input.qaResult ?? "").trim()) {
    return { ok: false, error: "Quality return is incomplete." };
  }
  if (
    !ownerMatterMayBeCreated({
      whyYouAreGettingThis: cfg.whyYouAreGettingThis,
      whatINeedFromYou: cfg.whatINeedFromYou,
    })
  ) {
    return { ok: false, error: "Owner arrival lines are missing." };
  }
  return { ok: true };
}

export function findVideo1OwnerMatter(
  state: OwnerTrayState,
): OwnerMatter | undefined {
  return state.matters.find((matter) => matter.id === cfg.matterId);
}

export function raiseVideo1OwnerJudgment(
  state: OwnerTrayState,
  input: Video1QualityReturn,
  nowIso = new Date().toISOString(),
): OwnerTrayState {
  const allowed = video1QualityMayRaiseOwnerJudgment(input);
  if (!allowed.ok) {
    throw new Error(allowed.error);
  }
  if (input.classification !== "A" && input.classification !== "B") {
    throw new Error("Quality has not passed this cut.");
  }

  const existing = findVideo1OwnerMatter(state);
  if (
    existing &&
    (existing.tray === "ACTION_REQUIRED" || existing.tray === "WAITING_ON_MY_DECISION")
  ) {
    return state;
  }

  const matter: OwnerMatter = {
    id: cfg.matterId,
    recordId: cfg.recordId,
    matter: cfg.matter,
    tray: "ACTION_REQUIRED",
    ownerActionRequiredNow: true,
    blocksScoutOrSystem: true,
    movingNormally: false,
    status: "WAITING ON OWNER",
    stateChangedAt: nowIso,
    whyOnDesk: cfg.whyYouAreGettingThis,
    decisionRequired: cfg.whatINeedFromYou,
    ownerSteps: [...cfg.ownerSteps],
    whatHappensAfterSend: cfg.afterApprove,
    assignedRecipient: "Owner",
    nextHandoff: "Owner accepts, rejects, or sends back. Scout does not bring files.",
    ruleRecordId: null,
    ownerQuestions: [],
    judgmentKind: cfg.judgmentKind,
    playableAssetUrl: input.playableAssetUrl ?? cfg.playableAssetUrl,
    runtime: input.runtime,
    qaResult: input.qaResult,
    explicitLimits: [...(input.explicitLimits ?? [])],
    audioStatus: input.audioStatus,
    qualityClassification: input.classification,
    sourceConcept: input.sourceConcept,
    presenterConsistency: input.presenterConsistency,
    packageTruth: input.packageTruth,
    integrationAuthorized: false,
  };

  return {
    openMatterId: cfg.matterId,
    matters: [
      ...state.matters.filter((entry) => entry.id !== cfg.matterId),
      matter,
    ],
  };
}

export function applyVideo1OwnerJudgment(
  state: OwnerTrayState,
  input: {
    action: "approve" | "reject" | "send_back";
    note?: string;
    nowIso?: string;
  },
): { state: OwnerTrayState; decision: Video1OwnerDecision } {
  const current = findVideo1OwnerMatter(state);
  if (!current || current.judgmentKind !== cfg.judgmentKind) {
    throw new Error("Video 1 Owner judgment is not on the desk.");
  }
  if (
    current.tray !== "ACTION_REQUIRED" &&
    current.tray !== "WAITING_ON_MY_DECISION"
  ) {
    throw new Error("This Video 1 file is no longer waiting on Owner.");
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const note = String(input.note ?? "").trim();

  if (input.action === "approve") {
    const next: OwnerMatter = {
      ...current,
      tray: "SENT_IN_PROGRESS",
      ownerActionRequiredNow: false,
      blocksScoutOrSystem: false,
      movingNormally: true,
      status: "Approved · Scout integrates",
      ownerDecision: note ? `APPROVE — ${note}` : "APPROVE",
      assignedRecipient: "Scout",
      nextHandoff: cfg.afterApprove,
      integrationAuthorized: true,
      stateChangedAt: nowIso,
    };
    return {
      state: {
        openMatterId: next.id,
        matters: state.matters.map((entry) => (entry.id === next.id ? next : entry)),
      },
      decision: {
        packageId: cfg.packageId,
        matterId: cfg.matterId,
        decision: "APPROVE",
        integrationAuthorized: true,
        homepageDesignMayChange: false,
        noPublishNoMergeNoPush: true,
        decidedAt: nowIso,
        note,
        nextActor: "scout",
      },
    };
  }

  if (input.action === "reject") {
    const next: OwnerMatter = {
      ...current,
      tray: "COMPLETED_FILED",
      ownerActionRequiredNow: false,
      blocksScoutOrSystem: false,
      movingNormally: true,
      status: "Rejected · off Page 1",
      ownerDecision: note ? `REJECT — ${note}` : "REJECT",
      assignedRecipient: "Filed",
      nextHandoff: cfg.afterReject,
      filedOriginalLocked: true,
      integrationAuthorized: false,
      stateChangedAt: nowIso,
    };
    return {
      state: {
        openMatterId: next.id,
        matters: state.matters.map((entry) => (entry.id === next.id ? next : entry)),
      },
      decision: {
        packageId: cfg.packageId,
        matterId: cfg.matterId,
        decision: "REJECT",
        integrationAuthorized: false,
        homepageDesignMayChange: false,
        noPublishNoMergeNoPush: true,
        decidedAt: nowIso,
        note,
        nextActor: "none",
      },
    };
  }

  const next: OwnerMatter = {
    ...current,
    tray: "SENT_IN_PROGRESS",
    ownerActionRequiredNow: false,
    blocksScoutOrSystem: false,
    movingNormally: true,
    status: "Sent back to Production",
    ownerDecision: note ? `SEND BACK — ${note}` : "SEND BACK",
    assignedRecipient: "Production Team",
    nextHandoff: cfg.afterSendBack,
    integrationAuthorized: false,
    stateChangedAt: nowIso,
  };
  return {
    state: {
      openMatterId: next.id,
      matters: state.matters.map((entry) => (entry.id === next.id ? next : entry)),
    },
    decision: {
      packageId: cfg.packageId,
      matterId: cfg.matterId,
      decision: "SEND_BACK",
      integrationAuthorized: false,
      homepageDesignMayChange: false,
      noPublishNoMergeNoPush: true,
      decidedAt: nowIso,
      note,
      nextActor: "production_team",
    },
  };
}

export function video1ScoutMayIntegrate(decision: Video1OwnerDecision | null): boolean {
  return Boolean(decision?.integrationAuthorized && decision.decision === "APPROVE");
}
