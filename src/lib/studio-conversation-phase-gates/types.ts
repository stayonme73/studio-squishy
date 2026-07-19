/**
 * Phase gate contracts — typed results for Voice / Presentation Display.
 * @see docs/studio-conversation-phase-gates-v1-locked.md
 */

import type { ConversationFlowRhythmStage } from "@/config/studio-conversation-flow-rhythm-v1";
import type {
  ConversationPhaseGateBlockReason,
  ConversationPhaseGateFactKey,
} from "@/config/studio-conversation-phase-gates-v1";

export type ConversationPhaseGateTransition = {
  from: ConversationFlowRhythmStage;
  to: ConversationFlowRhythmStage;
};

/** Snapshot of facts Voice / system believe are known — sparse until Package 4+. */
export type ConversationPhaseGateFacts = Partial<
  Record<Exclude<ConversationPhaseGateFactKey, "workingDraftStatus">, boolean>
> & {
  workingDraftStatus?: "working_draft" | "purchased";
};

export type ConversationPhaseGateDecision =
  | {
      ok: true;
      transition: ConversationPhaseGateTransition;
      direction: "forward" | "backward";
    }
  | {
      ok: false;
      transition: ConversationPhaseGateTransition;
      direction: "forward" | "backward";
      blockReasons: ConversationPhaseGateBlockReason[];
      /** Presentation Display / Voice guidance — not full dialogue. */
      voiceMay: Array<"clarify" | "stop" | "escalate">;
    };
