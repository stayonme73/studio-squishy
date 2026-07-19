import { beforeEach, describe, expect, it } from "vitest";

import { DISCOVERY_FORM_TILE_IDS } from "@/config/business-discovery-studio";
import {
  bootDiscoveryWorkingDraft,
  buildDiscoveryPresentationPayload,
  DISCOVERY_TABLET_STEP_ORDER,
  discoveryFactsFromDraft,
  discoveryTabletCoversAllFormTiles,
  isDiscoveryReadyForRouteRecommendation,
  isDiscoveryTabletComplete,
  readDeadlineFromDraft,
  readDiscoveryAnswersFromDraft,
  recordDiscoveryStepAnswer,
  resolveDiscoveryResumeStepIndex,
} from "@/lib/studio-conversation-discovery";
import { evaluateConversationPhaseGate } from "@/lib/studio-conversation-phase-gates";
import {
  clearWorkingDraft,
  type WorkingDraftStorage,
} from "@/lib/studio-working-draft";
import { resolvePresentationSurface } from "@/lib/studio-conversation-framework";
import { createConversationRoomState } from "@/lib/studio-conversation-framework";

function memoryStorage(): WorkingDraftStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe("studio conversation discovery", () => {
  let storage: WorkingDraftStorage;

  beforeEach(() => {
    storage = memoryStorage();
    clearWorkingDraft(storage);
  });

  it("covers every Discovery Room form tile plus deadline", () => {
    expect(discoveryTabletCoversAllFormTiles()).toBe(true);
    for (const tileId of DISCOVERY_FORM_TILE_IDS) {
      expect(DISCOVERY_TABLET_STEP_ORDER).toContain(tileId);
    }
    expect(DISCOVERY_TABLET_STEP_ORDER).toContain("project-deadline");
  });

  it("persists answers with Voice vs customer attribution", () => {
    let draft = bootDiscoveryWorkingDraft(storage);

    const voice = recordDiscoveryStepAnswer({
      draft,
      stepId: "your-situation",
      value: "Starting fresh",
      actor: "voice",
      storage,
    });
    expect(voice.ok).toBe(true);
    if (!voice.ok) return;
    draft = voice.draft;

    const customer = recordDiscoveryStepAnswer({
      draft,
      stepId: "your-focus",
      value: "Save time on marketing",
      actor: "customer",
      storage,
    });
    expect(customer.ok).toBe(true);
    if (!customer.ok) return;

    expect(readDiscoveryAnswersFromDraft(customer.draft)).toMatchObject({
      "your-situation": "Starting fresh",
      "your-focus": "Save time on marketing",
    });
    expect(customer.draft.attribution.map((event) => event.actor)).toEqual([
      "voice",
      "customer",
    ]);
  });

  it("stores deadline and materials from Discovery steps", () => {
    let draft = bootDiscoveryWorkingDraft(storage);

    const tools = recordDiscoveryStepAnswer({
      draft,
      stepId: "your-current-tools",
      value: "Website, Social media accounts",
      actor: "voice",
      storage,
    });
    expect(tools.ok).toBe(true);
    if (!tools.ok) return;
    draft = tools.draft;

    const deadline = recordDiscoveryStepAnswer({
      draft,
      stepId: "project-deadline",
      value: "Within 2 weeks",
      actor: "customer",
      storage,
    });
    expect(deadline.ok).toBe(true);
    if (!deadline.ok) return;

    expect(readDeadlineFromDraft(deadline.draft)).toEqual({
      answer: "Within 2 weeks",
    });
    expect(deadline.draft.slices.materialsStatus).toMatchObject({
      channelAnswers: expect.arrayContaining([
        "Website",
        "Social media accounts",
      ]),
    });
  });

  it("resumes at the first incomplete required step", () => {
    let draft = bootDiscoveryWorkingDraft(storage);
    const first = recordDiscoveryStepAnswer({
      draft,
      stepId: "your-situation",
      value: "Starting fresh",
      actor: "voice",
      storage,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const index = resolveDiscoveryResumeStepIndex(
      readDiscoveryAnswersFromDraft(first.draft),
      readDeadlineFromDraft(first.draft),
    );
    expect(DISCOVERY_TABLET_STEP_ORDER[index]).toBe("your-focus");
  });

  it("opens the Discovery → Route gate when required facts are known", () => {
    let draft = bootDiscoveryWorkingDraft(storage);
    const answers: Array<[Parameters<typeof recordDiscoveryStepAnswer>[0]["stepId"], string]> = [
      ["your-situation", "Starting fresh"],
      ["your-focus", "Save time on marketing"],
      ["your-challenge", "I do not have time to create marketing content"],
      [
        "your-business",
        "Acme Studio\n---\nBrand and content for small businesses",
      ],
      ["your-current-tools", "Website"],
      ["project-deadline", "Within a month"],
      ["success-looks-like", "Spending less time creating and posting marketing"],
      ["whats-slowing-you-down", "I do not have time to create or post content"],
    ];

    for (const [stepId, value] of answers) {
      const result = recordDiscoveryStepAnswer({
        draft,
        stepId,
        value,
        actor: "voice",
        storage,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      draft = result.draft;
    }

    expect(isDiscoveryTabletComplete(readDiscoveryAnswersFromDraft(draft), readDeadlineFromDraft(draft))).toBe(
      true,
    );
    expect(isDiscoveryReadyForRouteRecommendation(draft)).toBe(true);

    const facts = discoveryFactsFromDraft(draft);
    const gate = evaluateConversationPhaseGate(
      "discovery",
      "route-recommendation",
      facts,
    );
    expect(gate.ok).toBe(true);
  });

  it("builds a customer Presentation payload and surface", () => {
    const payload = buildDiscoveryPresentationPayload({
      stepId: "your-focus",
      answers: {
        "your-situation": "Starting fresh",
        "your-focus": "Save time on marketing",
      },
      deadline: null,
    });
    expect(payload.stageLabel).toBe("Discovery");
    expect(payload.captured).toHaveLength(2);
    expect(payload.currentSummary).toBe("Save time on marketing");

    const surface = resolvePresentationSurface(
      createConversationRoomState({ flowStep: "understanding" }),
      { text: "Hello." },
      payload,
    );
    expect(surface.kind).toBe("discovery");
    expect(surface.discovery?.currentTitle).toBe("Your Focus");
  });
});
