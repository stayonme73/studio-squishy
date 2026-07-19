import { describe, expect, it } from "vitest";

import { CONVERSATION_FLOW_RHYTHM_STAGES } from "@/config/studio-conversation-flow-rhythm-v1";
import {
  CONVERSATION_PHASE_FORWARD_GATES,
  conversationPhaseGateBlockLabels,
  studioConversationPhaseGatesV1,
} from "@/config/studio-conversation-phase-gates-v1";
import {
  evaluateConversationPhaseGate,
  presentationLabelsForBlockReasons,
} from "@/lib/studio-conversation-phase-gates";
import type { ConversationPhaseGateFacts } from "@/lib/studio-conversation-phase-gates";

const readyWelcome: ConversationPhaseGateFacts = {
  customerReadyToBegin: true,
  inputModeAvailable: true,
  workingDraftReady: true,
};

const readyDiscovery: ConversationPhaseGateFacts = {
  ...readyWelcome,
  customerGoalKnown: true,
  needCharacterKnown: true,
  deadlineKnown: true,
  studioOffersRelevantWork: true,
  clarificationStillRequired: false,
};

const readyRoute: ConversationPhaseGateFacts = {
  ...readyDiscovery,
  routeRecommended: true,
  routeAcceptedOrChosen: true,
  routeCompatibleWithNeed: true,
};

const readyServices: ConversationPhaseGateFacts = {
  ...readyRoute,
  servicesResolved: true,
  requiredServiceQuestionsAnswered: true,
  inclusionsExclusionsSurfaced: true,
  pricingDeterminable: true,
  deadlineFeasibilityChecked: true,
  noUnconfirmedRecommendationAsSelected: true,
};

const readyReview: ConversationPhaseGateFacts = {
  ...readyServices,
  customerConfirmedSelectedServices: true,
  customerConfirmedDeclinedServices: true,
  customerConfirmedScope: true,
  customerConfirmedPrice: true,
  customerConfirmedDeadline: true,
  customerConfirmedExclusions: true,
  customerConfirmedMaterialsOrResponsibilities: true,
};

const readyPayment: ConversationPhaseGateFacts = {
  ...readyReview,
  paymentSucceeded: true,
  purchasedSnapshotFrozen: true,
  attributionAndConsentPreserved: true,
  workingDraftStatus: "purchased",
};

const readyIntake: ConversationPhaseGateFacts = {
  ...readyPayment,
  productionInfoComplete: true,
  missingProductionItemsMarked: true,
  projectRecordCreated: true,
  servicesAvailableOnStudioBoard: true,
};

describe("conversation phase gates", () => {
  it("defines a forward gate for every adjacent rhythm step", () => {
    expect(CONVERSATION_PHASE_FORWARD_GATES).toHaveLength(
      CONVERSATION_FLOW_RHYTHM_STAGES.length - 1,
    );
    for (let i = 0; i < CONVERSATION_FLOW_RHYTHM_STAGES.length - 1; i++) {
      const from = CONVERSATION_FLOW_RHYTHM_STAGES[i];
      const to = CONVERSATION_FLOW_RHYTHM_STAGES[i + 1];
      expect(
        CONVERSATION_PHASE_FORWARD_GATES.some(
          (g) => g.from === from && g.to === to,
        ),
      ).toBe(true);
    }
  });

  it("locks the no-skip-for-speed rule", () => {
    expect(studioConversationPhaseGatesV1.importantLock).toContain(
      "may not skip a required gate",
    );
  });

  it("blocks Welcome → Discovery until draft and input are ready", () => {
    const blocked = evaluateConversationPhaseGate("welcome", "discovery", {});
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.blockReasons).toEqual(
        expect.arrayContaining([
          "customer_not_ready",
          "input_mode_unavailable",
          "working_draft_not_ready",
        ]),
      );
      expect(blocked.voiceMay).toEqual(
        expect.arrayContaining(["clarify", "stop"]),
      );
    }
    expect(
      evaluateConversationPhaseGate("welcome", "discovery", readyWelcome).ok,
    ).toBe(true);
  });

  it("blocks Discovery → Route when clarification is still required", () => {
    const decision = evaluateConversationPhaseGate(
      "discovery",
      "route-recommendation",
      { ...readyDiscovery, clarificationStillRequired: true },
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.blockReasons).toContain("clarification_required");
    }
  });

  it("allows each forward transition when requirements are met", () => {
    const cases: Array<{
      from: (typeof CONVERSATION_FLOW_RHYTHM_STAGES)[number];
      to: (typeof CONVERSATION_FLOW_RHYTHM_STAGES)[number];
      facts: ConversationPhaseGateFacts;
    }> = [
      { from: "welcome", to: "discovery", facts: readyWelcome },
      {
        from: "discovery",
        to: "route-recommendation",
        facts: readyDiscovery,
      },
      {
        from: "route-recommendation",
        to: "service-building",
        facts: readyRoute,
      },
      {
        from: "service-building",
        to: "project-review",
        facts: readyServices,
      },
      { from: "project-review", to: "payment", facts: readyReview },
      { from: "payment", to: "production-intake", facts: readyPayment },
      { from: "production-intake", to: "studio-board", facts: readyIntake },
    ];
    for (const c of cases) {
      const decision = evaluateConversationPhaseGate(c.from, c.to, c.facts);
      expect(decision, `${c.from} → ${c.to}`).toMatchObject({
        ok: true,
        direction: "forward",
      });
    }
  });

  it("forbids skipping a gate to go faster", () => {
    const decision = evaluateConversationPhaseGate(
      "welcome",
      "service-building",
      readyServices,
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.blockReasons).toContain("cannot_skip_gate");
    }
  });

  it("allows free backward movement before payment", () => {
    const decision = evaluateConversationPhaseGate(
      "project-review",
      "discovery",
      { ...readyReview, workingDraftStatus: "working_draft" },
    );
    expect(decision).toMatchObject({ ok: true, direction: "backward" });
  });

  it("blocks retreat into editable phases after purchase freeze", () => {
    const decision = evaluateConversationPhaseGate(
      "production-intake",
      "service-building",
      { workingDraftStatus: "purchased" },
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.blockReasons).toContain(
        "purchase_frozen_blocks_edit_retreat",
      );
    }
  });

  it("exposes Presentation Display labels for every block reason", () => {
    for (const reason of Object.keys(conversationPhaseGateBlockLabels)) {
      const labels = presentationLabelsForBlockReasons([
        reason as keyof typeof conversationPhaseGateBlockLabels,
      ]);
      expect(labels[0]?.length).toBeGreaterThan(0);
    }
  });
});
