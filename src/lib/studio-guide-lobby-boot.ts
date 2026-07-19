import type { GuideConversationStep } from "@/config/studio-guide-conversation-v1";
import {
  createEmptyGuideCaptureDraft,
  type GuideCaptureDraftV1,
} from "@/lib/studio-guide-capture";
import {
  draftFromCarryParams,
  interpretGuideHardNav,
  searchParamsFromRecord,
  toServerHardNav,
  type GuideServerHardNav,
} from "@/lib/studio-guide-hard-nav";

export type LobbyGuideBoot = {
  guideOpen: boolean;
  serverHardNav: GuideServerHardNav;
  ssrStep: GuideConversationStep;
  ssrFieldError: string | null;
  ssrDraft: GuideCaptureDraftV1;
};

/**
 * Server boot for Lobby Guide — interprets Continue GET so the next question
 * is correct in the first HTML paint (Samsung cannot bounce to Question 1).
 */
export function buildLobbyGuideBoot(
  record: Record<string, string | string[] | undefined>,
  guideEnabled: boolean,
): LobbyGuideBoot {
  const params = searchParamsFromRecord(record);
  const guideOpen = guideEnabled && params.get("guide") === "1";
  if (!guideOpen) {
    return {
      guideOpen: false,
      serverHardNav: { kind: "none" },
      ssrStep: "ask_project_need",
      ssrFieldError: null,
      ssrDraft: createEmptyGuideCaptureDraft(),
    };
  }

  const interpreted = interpretGuideHardNav(params, createEmptyGuideCaptureDraft());
  const serverHardNav = toServerHardNav(interpreted);

  if (serverHardNav.kind === "advanced") {
    return {
      guideOpen: true,
      serverHardNav,
      ssrStep: serverHardNav.step,
      ssrFieldError: null,
      ssrDraft: serverHardNav.draft,
    };
  }

  if (serverHardNav.kind === "error") {
    return {
      guideOpen: true,
      serverHardNav,
      ssrStep: serverHardNav.step,
      ssrFieldError: serverHardNav.message,
      ssrDraft: draftFromCarryParams(params),
    };
  }

  const urlStep = params.get("gstep");
  const ssrStep =
    urlStep === "ask_business_name" ||
    urlStep === "ask_deadline" ||
    urlStep === "ask_materials" ||
    urlStep === "summary" ||
    urlStep === "confirmed"
      ? urlStep
      : "ask_project_need";

  return {
    guideOpen: true,
    serverHardNav: { kind: "none" },
    ssrStep,
    ssrFieldError: null,
    ssrDraft: draftFromCarryParams(params),
  };
}
