/**
 * Pure phase-gate evaluator — no AI, no UI.
 * @see docs/studio-conversation-phase-gates-v1-locked.md
 */

import { CONVERSATION_FLOW_RHYTHM_STAGES } from "@/config/studio-conversation-flow-rhythm-v1";
import type { ConversationFlowRhythmStage } from "@/config/studio-conversation-flow-rhythm-v1";
import {
  CONVERSATION_PHASE_FORWARD_GATES,
  conversationPhaseGateBlockLabels,
  type ConversationPhaseForwardGate,
  type ConversationPhaseGateBlockReason,
} from "@/config/studio-conversation-phase-gates-v1";
import type {
  ConversationPhaseGateDecision,
  ConversationPhaseGateFacts,
  ConversationPhaseGateTransition,
} from "@/lib/studio-conversation-phase-gates/types";

function stageIndex(stage: ConversationFlowRhythmStage): number {
  return CONVERSATION_FLOW_RHYTHM_STAGES.indexOf(stage);
}

function isAdjacentForward(
  from: ConversationFlowRhythmStage,
  to: ConversationFlowRhythmStage,
): boolean {
  return stageIndex(to) === stageIndex(from) + 1;
}

function isBackward(
  from: ConversationFlowRhythmStage,
  to: ConversationFlowRhythmStage,
): boolean {
  return stageIndex(to) < stageIndex(from);
}

function evaluateForwardRequirements(
  gate: ConversationPhaseForwardGate,
  facts: ConversationPhaseGateFacts,
): ConversationPhaseGateBlockReason[] {
  const reasons: ConversationPhaseGateBlockReason[] = [];
  for (const req of gate.required) {
    if (facts[req.fact] !== true) {
      reasons.push(req.whenMissing);
    }
  }
  for (const deny of gate.denyWhen ?? []) {
    if (facts[deny.fact] === deny.equals) {
      reasons.push(deny.reason);
    }
  }
  return [...new Set(reasons)];
}

function voiceMayForReasons(
  reasons: ConversationPhaseGateBlockReason[],
): Array<"clarify" | "stop" | "escalate"> {
  if (reasons.length === 0) return [];
  const escalate = reasons.some((r) =>
    [
      "studio_fit_unclear",
      "route_incompatible",
      "deadline_feasibility_unchecked",
    ].includes(r),
  );
  return escalate ? ["clarify", "stop", "escalate"] : ["clarify", "stop"];
}

/** Labels for Presentation Display when a gate blocks. */
export function presentationLabelsForBlockReasons(
  reasons: ConversationPhaseGateBlockReason[],
): string[] {
  return reasons.map((r) => conversationPhaseGateBlockLabels[r]);
}

/** Evaluate a requested stage change against locked gates. */
export function evaluateConversationPhaseGate(
  from: ConversationFlowRhythmStage,
  to: ConversationFlowRhythmStage,
  facts: ConversationPhaseGateFacts = {},
): ConversationPhaseGateDecision {
  const transition: ConversationPhaseGateTransition = { from, to };

  if (from === to) {
    return {
      ok: false,
      transition,
      direction: "forward",
      blockReasons: ["invalid_transition"],
      voiceMay: ["stop"],
    };
  }

  if (isBackward(from, to)) {
    const purchased = facts.workingDraftStatus === "purchased";
    const retreatingIntoEditable =
      stageIndex(to) <= stageIndex("project-review");
    if (purchased && retreatingIntoEditable) {
      return {
        ok: false,
        transition,
        direction: "backward",
        blockReasons: ["purchase_frozen_blocks_edit_retreat"],
        voiceMay: ["stop", "escalate"],
      };
    }
    return { ok: true, transition, direction: "backward" };
  }

  if (!isAdjacentForward(from, to)) {
    return {
      ok: false,
      transition,
      direction: "forward",
      blockReasons: ["cannot_skip_gate"],
      voiceMay: ["stop"],
    };
  }

  const gate = CONVERSATION_PHASE_FORWARD_GATES.find(
    (g) => g.from === from && g.to === to,
  );
  if (!gate) {
    return {
      ok: false,
      transition,
      direction: "forward",
      blockReasons: ["invalid_transition"],
      voiceMay: ["stop"],
    };
  }

  const blockReasons = evaluateForwardRequirements(gate, facts);
  if (blockReasons.length > 0) {
    return {
      ok: false,
      transition,
      direction: "forward",
      blockReasons,
      voiceMay: voiceMayForReasons(blockReasons),
    };
  }

  return { ok: true, transition, direction: "forward" };
}

export function canAdvanceConversationPhase(
  from: ConversationFlowRhythmStage,
  to: ConversationFlowRhythmStage,
  facts: ConversationPhaseGateFacts = {},
): boolean {
  return evaluateConversationPhaseGate(from, to, facts).ok;
}
