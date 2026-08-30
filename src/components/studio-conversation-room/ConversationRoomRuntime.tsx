"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import ConversationNavPanel from "@/components/studio-conversation-room/ConversationNavPanel";
import ConversationActivityPanel from "@/components/studio-conversation-room/guide/ConversationActivityPanel";
import StudioGuideCommPanel from "@/components/studio-conversation-room/guide/StudioGuideCommPanel";
import StudioGuideTabletView, {
  STUDIO_GUIDE_MIC_PRIVACY_NOTE,
} from "@/components/studio-conversation-room/guide/StudioGuideTabletView";
import StudioConversationRoom from "@/components/studio-conversation-room/StudioConversationRoom";
import { studioVoiceMachineCustomerCommunicationV1 } from "@/config/studio-voice-machine-customer-communication-v1";
import {
  conversationRoomGuideV1,
  getConversationRoomGuideQuestion,
  isGuideRelativeDeadlineChoice,
  routeVoiceBridge,
  servicesAddedConfirmation,
  servicesVoiceIntro,
  studioPlanVoiceNarration,
  voiceNiceToMeet,
} from "@/config/conversation-room-guide-v1";
import { recommendRouteFromProjectNeed } from "@/config/conversation-room-route-recommendation-v1";
import type {
  ActivityPanelId,
  ConversationRoomStage,
} from "@/config/conversation-room-stage-v1";
import {
  isActivitySlidePanel,
  STAGE_DEFAULT_PANEL,
} from "@/config/conversation-room-stage-v1";
import type { GuideConversationStep } from "@/config/studio-guide-conversation-v1";
import {
  getJobsForRoad,
  getRouteMapRoad,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import {
  completeIntakeHandoff,
  navigateIntakeHandoff,
  probeCustomerSessionSignedIn,
  resolveIntakeHandoffPlan,
} from "@/lib/studio-intake-handoff";
import {
  bootConversationProjectDraft,
  bridgeConversationPlanToCampaign,
  clearConversationGuideLocals,
  guideDraftFromOpening,
  openingFromGuideDraft,
  clearRouteRecommendation,
  persistAddService,
  persistConversationStage,
  persistOpeningAnswers,
  persistRemoveService,
  persistRouteRecommendation,
  persistSelectedRoute,
  readActiveRouteRecommendation,
  readConversationStage,
  readMa001PackComposition,
  readRmJ002KitLock,
  readRmJ008KitLock,
  readBf001PackageLock,
  readRmJ007UpdateLock,
  readOpeningAnswers,
  readSelectedRoute,
  readSelectedServices,
  recordIntakeSubmission,
  selectedJobIdSet,
} from "@/lib/conversation-room-draft";
import { evaluateMa001CompositionPaymentGate } from "@/lib/studio-design-renderer/ma-001-composition-payment-gate";
import { evaluateRmJ002KitPaymentGate } from "@/lib/studio-design-renderer/rm-j002-kit-payment-gate";
import { evaluateRmJ008KitPaymentGate } from "@/lib/studio-design-renderer/rm-j008-kit-payment-gate";
import { evaluateBf001PackagePaymentGate } from "@/lib/studio-design-renderer/bf-001-kit-payment-gate";
import { evaluateRmJ007UpdatePaymentGate } from "@/lib/studio-design-renderer/rm-j007-kit-payment-gate";
import type { ServiceId } from "@/catalog/types";
import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import { buildProjectBuilderStudioPlanSummary } from "@/lib/project-builder-studio-plan-summary";
import { buildProjectIntakePlan } from "@/lib/project-intake-plan";
import {
  buildProjectIntakeTabletStatus,
} from "@/lib/project-intake-tablet-status";
import { saveRouteMapJourneyStep } from "@/lib/route-map-campaign";
import { readUsableIntakeDraftAnswers } from "@/lib/route-map-intake-continuity";
import {
  applyServerPaymentTruthToLocalCampaign,
  readCurrentCampaignHydrated,
} from "@/lib/studio-board-campaign";
import {
  confirmSandboxCheckoutClient,
  reconcileCheckoutClient,
  startHostedCheckout,
} from "@/lib/studio-payment/client";
import { revealConversationTablet } from "@/lib/studio-conversation-tablet-anchor";
import { withStudioPaymentSandboxQuery } from "@/lib/studio-payment/sandbox-query";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import {
  assertPreAcceptanceAllowsPayment,
  isClearToAccept,
  projectFactsFromWorkingDraft,
  runPreAcceptanceForCheckout,
} from "@/lib/studio-pre-acceptance";
import {
  bootConversationRoomState,
  createConversationRoomState,
  reduceConversationRoomState,
  resolveVoiceController,
  returnToLobby,
  setFlowStep,
  type ConversationRoomState,
  type VoiceIntent,
} from "@/lib/studio-conversation-framework";
import {
  confirmGuideCaptureDraft,
  createEmptyGuideCaptureDraft,
  guideHasReviewableAnswers,
  isAcceptableGuideDeadlineInput,
  startNewGuideCaptureConversation,
  type GuideCaptureDraftV1,
} from "@/lib/studio-guide-capture";
import {
  resolveGuideAnswerFromUi,
  visibleBubblesForStoredAnswer,
} from "@/lib/studio-guide-answer-resolve";
import {
  applyGuideAnswerToDraft,
  clearGuideUiStep,
  loadGuideDraft,
  nextGuideStep,
  persistGuideDraft,
  resolveGuideOpenStep,
  writeGuideUiStep,
} from "@/lib/studio-guide-hard-nav";
import {
  cancelConversationSpeech,
  getConversationSpeechAvailability,
  speakConversationLine,
  startConversationDictation,
  stopConversationDictation,
} from "@/lib/studio-conversation-speech";
import { clearWorkingDraft, type WorkingDraftRecord } from "@/lib/studio-working-draft";
import {
  consumeStudioVoiceInvite,
  type StudioVoiceInviteReason,
} from "@/lib/studio-voice-invite";
import type { StudioVoiceNarrationPreference } from "@/config/studio-voice-preference-v1";
import {
  clearVoiceFirstEntryChoiceRequired,
  isVoiceFirstEntryChoiceRequired,
  isVoiceNarrationEnabled,
  resolveBootVoiceNarrationPreference,
  shouldHoldVoiceFirstEntryGate,
  writeVoiceNarrationPreference,
} from "@/lib/studio-voice-preference";
import { suppressSameGestureFollowUp } from "@/lib/studio-samsung-activate";
import VoiceChoiceFilm from "@/components/studio-conversation-room/VoiceChoiceFilm";
import VoicePreferenceControls from "@/components/studio-conversation-room/VoicePreferenceControls";

function spokenLineForGuideStep(
  step: GuideConversationStep,
  correcting: boolean,
): string | null {
  if (correcting) return conversationRoomGuideV1.correctionPrompt;
  const question = getConversationRoomGuideQuestion(step);
  if (question) return question.question;
  if (step === "summary") return conversationRoomGuideV1.summaryIntro;
  if (step === "confirmed") {
    return `${conversationRoomGuideV1.confirmedTitle}. ${conversationRoomGuideV1.confirmedBody}`;
  }
  return null;
}

/** Resume invite after Lobby return — match the restored stage (never assume route). */
function spokenLineForResumeStage(
  stage: ConversationRoomStage,
): string | null {
  const v = conversationRoomGuideV1;
  switch (stage) {
    case "route":
      return v.routeVoiceIntro;
    case "services":
      return v.servicesPanelLead;
    case "plan":
      return v.studioPlanVoiceOrient;
    case "checkout":
      return v.checkoutVoiceBridge;
    case "intake":
      return v.intakeTabletLead;
    case "complete":
      return null;
    default:
      return null;
  }
}

export type ConversationRoomRuntimeProps = {
  initialState?: Partial<ConversationRoomState>;
  /** Sealed deep links: `?stage=checkout|intake` (and legacy step/view). */
  initialStage?: ConversationRoomStage;
  voiceIntent?: VoiceIntent;
  capturedTranscript?: string | null;
  inspectHardware?: boolean;
  className?: string;
};

function resolveBootStage(
  project: WorkingDraftRecord,
  requestedStage: ConversationRoomStage | undefined,
): ConversationRoomStage {
  const savedStage = readConversationStage(project);
  if (!requestedStage) return savedStage;
  if (requestedStage === "checkout" || requestedStage === "intake") {
    const hasSelectedRoute = readSelectedRoute(project) !== null;
    const hasSelectedServices = readSelectedServices(project).length > 0;
    if (!hasSelectedRoute || !hasSelectedServices) return savedStage;
    // Pre-acceptance gate: deep-link checkout requires CLEAR_TO_ACCEPT.
    if (requestedStage === "checkout") {
      const decision = runPreAcceptanceForCheckout(
        projectFactsFromWorkingDraft(project),
      );
      if (!isClearToAccept(decision)) return savedStage;
    }
    return requestedStage;
  }
  return requestedStage;
}

function createGuideRoomState(
  initialState?: Partial<ConversationRoomState>,
): ConversationRoomState {
  const booted = createConversationRoomState(initialState);
  if (booted.journeyPhase !== "conversation") return booted;
  return setFlowStep(booted, "understanding");
}

function fieldValueForStep(
  draft: GuideCaptureDraftV1,
  step: GuideConversationStep,
): string {
  switch (step) {
    case "ask_preferred_name":
      return draft.preferredName;
    case "ask_project_need":
      return draft.projectNeed;
    case "ask_business_name":
      return draft.businessName;
    case "ask_deadline":
      return draft.requestedDeadline;
    case "ask_materials":
      return draft.existingMaterialsNote;
    default:
      return "";
  }
}

/**
 * Conversation Room — proven Studio Guide sequence on one tablet.
 * Studio Voice is conversational, not ambient — only after customer triggers.
 */
export default function ConversationRoomRuntime({
  initialState,
  initialStage,
  voiceIntent = "idle",
  capturedTranscript = null,
  inspectHardware = false,
  className,
}: ConversationRoomRuntimeProps) {
  const [state, dispatch] = useReducer(
    reduceConversationRoomState,
    initialState,
    createGuideRoomState,
  );

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<GuideConversationStep>("ask_preferred_name");
  const [draft, setDraft] = useState<GuideCaptureDraftV1>(() =>
    createEmptyGuideCaptureDraft(),
  );
  const [textDraft, setTextDraft] = useState("");
  /** Always the latest typed value — Continue must not read a stale render. */
  const textDraftRef = useRef("");
  /** Bumps the type-field reset key even when step stays the same (Start New). */
  const [fieldEpoch, setFieldEpoch] = useState(0);
  const [selectedBubbles, setSelectedBubbles] = useState<string[]>([]);
  const [showDateField, setShowDateField] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Single Activity Panel controller — not parallel open booleans. */
  const [activePanel, setActivePanel] = useState<ActivityPanelId>("none");
  const [stage, setStage] = useState<ConversationRoomStage>("opening");
  const [projectDraft, setProjectDraft] = useState<WorkingDraftRecord | null>(
    null,
  );
  /** Learn More target only — which detail card is open in the panel. */
  const [detailJobId, setDetailJobId] = useState<RouteMapJobId | null>(null);
  /** Route lane highlighted on the tablet while the service chooser is open. */
  const [previewRoadId, setPreviewRoadId] = useState<RouteMapRoadId | null>(
    null,
  );
  const [studioSpeaking, setStudioSpeaking] = useState(false);
  const [askMode, setAskMode] = useState(false);
  const [studioVoiceReply, setStudioVoiceReply] = useState<string | null>(null);
  const [planBridgeError, setPlanBridgeError] = useState<string | null>(null);
  /** Live Intake answers for tablet status + post-refresh restore mirror. */
  const [intakeLiveAnswers, setIntakeLiveAnswers] =
    useState<RouteMapIntakeAnswers | null>(null);
  /** Fail-closed signed-out until session probe succeeds — CTA/tablet stay truthful. */
  const [intakeHandoffSignedIn, setIntakeHandoffSignedIn] = useState(false);
  /** Conversation Room narration only — Lobby Voice is never gated here. */
  const [voiceNarration, setVoiceNarration] =
    useState<StudioVoiceNarrationPreference | null>(null);
  const voiceNarrationRef = useRef<StudioVoiceNarrationPreference | null>(null);
  const listenArmedRef = useRef(true);
  const [listenArmed, setListenArmed] = useState(true);
  /** MJ-D18: leftover Continue click must not gold a chip on the next question. */
  const bubbleArmedRef = useRef(true);
  const activityReturnFocusRef = useRef<HTMLElement | null>(null);
  /** Suppress stacked “added” lines when the customer taps services quickly. */
  const lastServiceAddSpokenAtRef = useRef(0);
  /** Prevent duplicate payment-success handling on rapid Complete Checkout. */
  const paymentCompleteGuardRef = useRef(false);
  /**
   * Lobby/mobile may set an invite before CR preference is chosen.
   * Hold it until Voice is On — never speak while unset or Off.
   */
  const pendingVoiceInviteRef = useRef<{
    reason: StudioVoiceInviteReason;
    line: string;
  } | null>(null);
  const inviteCleanupRef = useRef<(() => void) | null>(null);

  function speakStudioLine(text: string | null | undefined) {
    const line = text?.trim();
    if (!line) return;
    /* CR narration preference — does not affect Lobby Voice. */
    if (!isVoiceNarrationEnabled()) return;
    cancelConversationSpeech();
    const started = speakConversationLine(line, {
      onStart: () => setStudioSpeaking(true),
      onEnd: () => setStudioSpeaking(false),
    });
    if (!started) setStudioSpeaking(false);
  }

  function playConversationInviteLine(line: string) {
    if (!isVoiceNarrationEnabled()) return;
    let heard = false;
    speakConversationLine(line, {
      onStart: () => {
        heard = true;
        setStudioSpeaking(true);
      },
      onEnd: () => setStudioSpeaking(false),
    });
    const autoplayArm = window.setTimeout(() => {
      if (heard || !isVoiceNarrationEnabled()) return;
      const onGesture = () => {
        if (!isVoiceNarrationEnabled()) return;
        speakConversationLine(line, {
          onStart: () => setStudioSpeaking(true),
          onEnd: () => setStudioSpeaking(false),
        });
      };
      window.addEventListener("pointerdown", onGesture, {
        once: true,
        capture: true,
      });
      const previous = inviteCleanupRef.current;
      inviteCleanupRef.current = () => {
        previous?.();
        window.removeEventListener("pointerdown", onGesture, true);
      };
    }, 900);
    const previous = inviteCleanupRef.current;
    inviteCleanupRef.current = () => {
      previous?.();
      window.clearTimeout(autoplayArm);
    };
  }

  function speakGuideStep(
    nextStep: GuideConversationStep,
    options?: { correcting?: boolean; thanks?: boolean },
  ) {
    const line = spokenLineForGuideStep(
      nextStep,
      options?.correcting ?? false,
    );
    if (!line) return;
    if (options?.thanks) {
      speakStudioLine(`${conversationRoomGuideV1.voiceBriefThanks} ${line}`);
      return;
    }
    speakStudioLine(line);
  }

  useEffect(() => {
    const restored = bootConversationRoomState(undefined, initialState);
    dispatch({ type: "set-journey", phase: restored.journeyPhase });
    dispatch({
      type: "set-flow-step",
      step:
        restored.journeyPhase === "conversation"
          ? "understanding"
          : restored.flowStep,
    });

    const loadedGuide = loadGuideDraft() ?? createEmptyGuideCaptureDraft();
    const project = bootConversationProjectDraft(loadedGuide);
    const openingSlice = readOpeningAnswers(project);
    const guideFromProject = guideDraftFromOpening(openingSlice);
    const hydratedGuide = guideFromProject.projectNeed.trim()
      ? guideFromProject
      : loadedGuide;
    const restoredStage = resolveBootStage(project, initialStage);
    const bootProject =
      restoredStage === readConversationStage(project)
        ? project
        : persistConversationStage(project, restoredStage);
    const openStep =
      restoredStage === "opening"
        ? resolveGuideOpenStep(
            new URLSearchParams(
              typeof window !== "undefined" ? window.location.search : "",
            ),
            hydratedGuide,
          )
        : ("confirmed" as GuideConversationStep);

    setProjectDraft(bootProject);
    setStage(restoredStage);
    setDraft(hydratedGuide);
    setStep(openStep);
    const openField = fieldValueForStep(hydratedGuide, openStep);
    writeTextDraft(openField);
    const bootQuestion = getConversationRoomGuideQuestion(openStep);
    setSelectedBubbles(
      bootQuestion
        ? visibleBubblesForStoredAnswer({
            stored: openField,
            bubbles: bootQuestion.bubbles,
            bubbleMode: bootQuestion.bubbleMode,
          })
        : [],
    );
    setActivePanel(
      restoredStage === "opening" ? "none" : STAGE_DEFAULT_PANEL[restoredStage],
    );
    if (restoredStage === "route") {
      const savedRec = readActiveRouteRecommendation(
        project,
        hydratedGuide.projectNeed,
      )?.roadId;
      const fromNeed = recommendRouteFromProjectNeed(
        hydratedGuide.projectNeed,
      );
      const selected = readSelectedRoute(project)?.roadId;
      setPreviewRoadId(selected ?? savedRec ?? fromNeed ?? null);
    } else if (restoredStage === "services" || restoredStage === "plan") {
      setPreviewRoadId(readSelectedRoute(project)?.roadId ?? null);
    }
    setSpeechSupported(getConversationSpeechAvailability().canListen);
    setReady(true);

    const holdVoiceGate = shouldHoldVoiceFirstEntryGate({
      firstEntryRequired: isVoiceFirstEntryChoiceRequired(),
      hasConversationProgress: Boolean(
        hydratedGuide.preferredName.trim() ||
          hydratedGuide.projectNeed.trim() ||
          hydratedGuide.confirmedAt,
      ),
    });
    const savedPreference = resolveBootVoiceNarrationPreference({
      requireFirstEntryChoice: holdVoiceGate,
    });
    setVoiceNarration(savedPreference);
    voiceNarrationRef.current = savedPreference;

    /* Kill any Lobby TTS that continued across navigation — CR is silent until Voice On. */
    if (savedPreference !== "on") {
      cancelConversationSpeech();
    }

    /*
     * Lobby may already have set an invite (untouched). CR only plays it after
     * Voice is On — never before the preference choice, never when Off.
     */
    let invite = consumeStudioVoiceInvite();
    let inviteLine: string | null = null;
    if (invite === "start" && restoredStage === "opening") {
      inviteLine = spokenLineForGuideStep(openStep, false);
    } else if (invite === "resume") {
      const line =
        restoredStage === "opening"
          ? spokenLineForGuideStep(openStep, false)
          : spokenLineForResumeStage(restoredStage);
      const welcome = conversationRoomGuideV1.voiceWelcomeBack;
      inviteLine = line ? `${welcome} ${line}` : welcome;
    }

    if (invite && inviteLine) {
      if (savedPreference === "on") {
        const timer = window.setTimeout(() => {
          playConversationInviteLine(inviteLine!);
        }, 220);
        return () => {
          window.clearTimeout(timer);
          inviteCleanupRef.current?.();
          inviteCleanupRef.current = null;
          stopConversationDictation();
          cancelConversationSpeech();
        };
      }
      if (savedPreference === null) {
        pendingVoiceInviteRef.current = { reason: invite, line: inviteLine };
      }
      /* savedPreference === "off": discard invite silently */
    }

    return () => {
      inviteCleanupRef.current?.();
      inviteCleanupRef.current = null;
      stopConversationDictation();
      cancelConversationSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount boot only
  }, []);

  const typing = textDraft.trim().length > 0;
  const effectiveIntent: VoiceIntent =
    voiceIntent !== "idle"
      ? voiceIntent
      : studioSpeaking
        ? "speaking"
        : listening
          ? "listening"
          : typing
            ? "awaiting"
            : step === "summary" || step === "confirmed"
              ? "idle"
              : "awaiting";

  const voice = useMemo(
    () =>
      resolveVoiceController(
        state,
        effectiveIntent,
        (capturedTranscript ?? interimTranscript) || null,
        "studio-voice",
      ),
    [capturedTranscript, effectiveIntent, interimTranscript, state],
  );

  function pulseSaved() {
    setSavedPulse(true);
    window.setTimeout(() => setSavedPulse(false), 1600);
  }

  const BUBBLE_REARM_MS = 400;

  function disarmBubblesForSameGesture() {
    bubbleArmedRef.current = false;
    suppressSameGestureFollowUp(() => {
      window.setTimeout(() => {
        bubbleArmedRef.current = true;
      }, BUBBLE_REARM_MS);
    });
  }

  function goToStep(
    next: GuideConversationStep,
    nextDraft = draft,
    options?: { correcting?: boolean; restoreSelection?: boolean },
  ) {
    const question = getConversationRoomGuideQuestion(next);
    const restore = options?.restoreSelection === true;
    setStep(next);
    writeGuideUiStep(next);
    setCorrecting(options?.correcting ?? false);
    setAskMode(false);
    setShowDateField(false);
    setSelectedBubbles(
      restore && question
        ? visibleBubblesForStoredAnswer({
            stored: fieldValueForStep(nextDraft, next),
            bubbles: question.bubbles,
            bubbleMode: question.bubbleMode,
          })
        : [],
    );
    writeTextDraft(restore ? fieldValueForStep(nextDraft, next) : "");
    setError(null);
    setInterimTranscript("");
    stopConversationDictation();
    setListening(false);
  }

  function commitDraft(nextDraft: GuideCaptureDraftV1) {
    persistGuideDraft(nextDraft);
    setDraft(nextDraft);
    const base = projectDraft ?? bootConversationProjectDraft(nextDraft);
    let nextProject = persistOpeningAnswers(
      base,
      openingFromGuideDraft(nextDraft),
    );
    const priorNeed = readOpeningAnswers(base).projectNeed.trim().toLowerCase();
    const nextNeed = nextDraft.projectNeed.trim().toLowerCase();
    if (priorNeed && nextNeed && priorNeed !== nextNeed) {
      nextProject = clearRouteRecommendation(nextProject);
    }
    setProjectDraft(nextProject);
    pulseSaved();
  }

  function setStageAndPersist(
    nextStage: ConversationRoomStage,
    guide = draft,
  ) {
    const base = projectDraft ?? bootConversationProjectDraft(guide);
    const nextProject = persistConversationStage(base, nextStage);
    setProjectDraft(nextProject);
    setStage(nextStage);
  }

  function openPanel(
    panel: ActivityPanelId,
    returnFocusId?: string,
  ) {
    if (returnFocusId && typeof document !== "undefined") {
      activityReturnFocusRef.current = document.getElementById(returnFocusId);
    }
    setActivePanel(panel);
    if (panel === "help") {
      dispatch({ type: "open-help" });
    } else {
      dispatch({ type: "close-help" });
    }
  }

  function closeActivityPanel() {
    setActivePanel("none");
    setDetailJobId(null);
    dispatch({ type: "close-help" });
  }

  function handlePreviewRoad(roadId: RouteMapRoadId) {
    /* Highlight on the tablet and open Route details in the Activity Panel. */
    setPreviewRoadId(roadId);
    openPanel("route");
  }

  function handleConfirmRoad(roadId: RouteMapRoadId) {
    handleSelectRoad(roadId);
  }

  function handleContinue() {
    const question = getConversationRoomGuideQuestion(step);
    if (!question) return;

    const { answer, skipped } = resolveGuideAnswerFromUi({
      step,
      typed: textDraftRef.current,
      selectedBubbles,
    });

    if (step === "ask_preferred_name" && !answer.trim()) {
      setError("Please tell me what name you’d like me to use.");
      return;
    }

    if (step === "ask_project_need" && !answer.trim()) {
      setError("Please tell me what you’re working on, or pick a bubble.");
      return;
    }

    if (
      step === "ask_deadline" &&
      !skipped &&
      answer.trim() &&
      !isGuideRelativeDeadlineChoice(answer) &&
      !isAcceptableGuideDeadlineInput(answer)
    ) {
      setError(conversationRoomGuideV1.deadlineFormatError);
      return;
    }

    if (
      step === "ask_deadline" &&
      question.opensDateFieldBubble &&
      selectedBubbles.includes(question.opensDateFieldBubble) &&
      !answer.trim()
    ) {
      setShowDateField(true);
      setError("Please enter a clear date, or pick another option.");
      return;
    }

    const nextDraft = applyGuideAnswerToDraft(draft, step, answer, skipped);
    const nextStep = nextGuideStep(step);
    commitDraft(nextDraft);
    disarmBubblesForSameGesture();
    goToStep(nextStep, nextDraft);

    /* Preferred name: warm one-time ack, then next question — do not spam the name. */
    if (step === "ask_preferred_name") {
      const meet = voiceNiceToMeet(nextDraft.preferredName);
      const nextLine = spokenLineForGuideStep(nextStep, false);
      speakStudioLine(nextLine ? `${meet} ${nextLine}` : meet);
      return;
    }

    speakGuideStep(nextStep, { thanks: true });
  }

  function handleSkip() {
    const question = getConversationRoomGuideQuestion(step);
    if (!question?.canSkip) return;
    const nextDraft = applyGuideAnswerToDraft(draft, step, "", true);
    const nextStep = nextGuideStep(step);
    commitDraft(nextDraft);
    disarmBubblesForSameGesture();
    goToStep(nextStep, nextDraft);
    speakGuideStep(nextStep, { thanks: true });
  }

  function handleToggleBubble(bubble: string) {
    if (!bubbleArmedRef.current) return;
    const question = getConversationRoomGuideQuestion(step);
    if (!question) return;
    setError(null);

    if (bubble === "Skip for now") {
      handleSkip();
      return;
    }

    if (question.opensDateFieldBubble && bubble === question.opensDateFieldBubble) {
      setSelectedBubbles([bubble]);
      setShowDateField(true);
      writeTextDraft("");
      return;
    }

    if (question.bubbleMode === "multi") {
      setSelectedBubbles((prev) => {
        const exclusive = ["Nothing yet", "Something else"];
        if (bubble === "Nothing yet") return ["Nothing yet"];
        const withoutSkip = prev.filter((item) => item !== "Skip for now");
        if (withoutSkip.includes(bubble)) {
          return withoutSkip.filter((item) => item !== bubble);
        }
        const cleared = withoutSkip.filter((item) => !exclusive.includes(item));
        return [...cleared, bubble];
      });
      return;
    }

    setSelectedBubbles([bubble]);
    if (!isGuideRelativeDeadlineChoice(bubble) || step !== "ask_deadline") {
      /* single-select places wording into the field — customer may edit */
    }
    writeTextDraft(bubble);
    setShowDateField(false);
  }

  function handleSelectRoad(roadId: RouteMapRoadId) {
    const base = projectDraft ?? bootConversationProjectDraft(draft);
    const withRoute = persistSelectedRoute(base, roadId);
    const withStage = persistConversationStage(withRoute, "services");
    setProjectDraft(withStage);
    setStage("services");
    setDetailJobId(null);
    setPreviewRoadId(roadId);
    openPanel("builder");
    const road = getRouteMapRoad(roadId);
    speakStudioLine(
      servicesVoiceIntro(road?.customerLabel ?? "your route"),
    );
  }

  const previousStageRef = useRef<ConversationRoomStage | null>(null);

  useEffect(() => {
    const previous = previousStageRef.current;
    previousStageRef.current = stage;
    if (stage !== "services") return;
    if (previous === "services") return;
    openPanel("builder");
  }, [stage]);

  function handleOpenLearnMore(jobId: RouteMapJobId) {
    setDetailJobId(jobId);
    openPanel("learnMore");
  }

  function handleAddJob(jobId: RouteMapJobId) {
    const road = readSelectedRoute(
      projectDraft ?? bootConversationProjectDraft(draft),
    );
    if (!road) return;
    const base = projectDraft ?? bootConversationProjectDraft(draft);
    const next = persistAddService(base, jobId, road.roadId);
    setProjectDraft(next);
    const job = getJobsForRoad(road.roadId).find((item) => item.id === jobId);
    const alreadyHad = readSelectedServices(base).some((s) => s.jobId === jobId);
    if (alreadyHad || !job) return;

    /* First add (or after a pause): brief spoken confirm. Rapid adds: visual only. */
    const now = Date.now();
    const cooldown = conversationRoomGuideV1.servicesAddSpeakCooldownMs;
    if (now - lastServiceAddSpokenAtRef.current < cooldown) return;
    lastServiceAddSpokenAtRef.current = now;
    speakStudioLine(servicesAddedConfirmation(job.name));
  }

  function handleRemoveJob(jobId: RouteMapJobId) {
    const base = projectDraft ?? bootConversationProjectDraft(draft);
    setProjectDraft(persistRemoveService(base, jobId));
  }

  function handleReviewStudioPlan() {
    const route = readSelectedRoute(
      projectDraft ?? bootConversationProjectDraft(draft),
    );
    const services = readSelectedServices(
      projectDraft ?? bootConversationProjectDraft(draft),
    );
    if (!route || services.length === 0) return;
    setPlanBridgeError(null);
    setDetailJobId(null);
    setStageAndPersist("plan");
    /* Studio Plan reviews on the tablet — keep the Activity Panel closed. */
    closeActivityPanel();

    const model = buildProjectBuilderStudioPlanSummary(
      services.map((s) => s.jobId as ServiceId),
      route.roadId,
    );
    const road = getRouteMapRoad(route.roadId);
    speakStudioLine(
      studioPlanVoiceNarration(draft.preferredName, {
        routeCustomerLabel:
          road?.customerLabel ?? model.routeLabel.replace(/^[^·]+·\s*/, ""),
        services: model.deliverables.map((item) => ({
          title: item.title,
          priceDisplay: item.priceDisplay,
        })),
        totalDisplay: model.totalDisplay,
        overallTimelineDisplay: model.overallTimelineDisplay,
      }),
    );
  }

  function handleEditPlan() {
    setPlanBridgeError(null);
    setDetailJobId(null);
    setStageAndPersist("services");
    openPanel("builder");
  }

  function handleChangeRoute() {
    setPlanBridgeError(null);
    setDetailJobId(null);
    const base = projectDraft ?? bootConversationProjectDraft(draft);
    const recommended =
      readActiveRouteRecommendation(base, draft.projectNeed)?.roadId ??
      recommendRouteFromProjectNeed(draft.projectNeed);
    setStageAndPersist("route");
    closeActivityPanel();
    setPreviewRoadId(recommended);
  }

  function handleLooksGoodPlan() {
    const project = projectDraft ?? bootConversationProjectDraft(draft);
    const route = readSelectedRoute(project);
    const services = readSelectedServices(project);
    if (!route || services.length === 0) return;

    const serviceIds = services.map((s) => s.jobId as ServiceId);
    const ma001Gate = evaluateMa001CompositionPaymentGate({
      selectedServiceIds: serviceIds.map(String),
      composition: readMa001PackComposition(project),
    });
    if (!ma001Gate.ok) {
      setPlanBridgeError(ma001Gate.message);
      speakStudioLine(
        "Your Promotion Pack still needs its exact pieces locked before checkout. Please finish choosing what is in the pack.",
      );
      return;
    }
    const rmj002Gate = evaluateRmJ002KitPaymentGate({
      selectedServiceIds: serviceIds.map(String),
      kitLock: readRmJ002KitLock(project),
    });
    if (!rmj002Gate.ok) {
      setPlanBridgeError(rmj002Gate.message);
      speakStudioLine(
        "Your Social Profile Setup Kit still needs one platform and the approved profile facts locked before checkout.",
      );
      return;
    }
    const rmj008Gate = evaluateRmJ008KitPaymentGate({
      selectedServiceIds: serviceIds.map(String),
      kitLock: readRmJ008KitLock(project),
    });
    if (!rmj008Gate.ok) {
      setPlanBridgeError(rmj008Gate.message);
      speakStudioLine(
        "Your Social Profile Update Kit still needs one platform, your current profile details, and the update plan locked before checkout.",
      );
      return;
    }
    const bf001Gate = evaluateBf001PackagePaymentGate({
      selectedServiceIds: serviceIds.map(String),
      packageLock: readBf001PackageLock(project),
    });
    if (!bf001Gate.ok) {
      setPlanBridgeError(bf001Gate.message);
      speakStudioLine(
        "Your Brand Identity Refresh still needs one graphic choice — profile image or cover graphic — plus your current logo and colors before checkout.",
      );
      return;
    }
    const rmj007Gate = evaluateRmJ007UpdatePaymentGate({
      selectedServiceIds: serviceIds.map(String),
      updateLock: readRmJ007UpdateLock(project),
    });
    if (!rmj007Gate.ok) {
      setPlanBridgeError(rmj007Gate.message);
      speakStudioLine(
        "Your promotion update still needs the named existing item, a reference note, the exact changes, where it lives, and acceptance that Studio recreates an updated final.",
      );
      return;
    }

    const decision = runPreAcceptanceForCheckout(
      projectFactsFromWorkingDraft(project),
    );
    if (!isClearToAccept(decision)) {
      setPlanBridgeError(
        decision.customerMessage ??
          conversationRoomGuideV1.studioPlanBridgeError,
      );
      const voice =
        decision.voiceLine ??
        (decision.outcome === "CLARIFICATION_REQUIRED"
          ? conversationRoomGuideV1.preAcceptanceClarificationVoice
          : decision.outcome === "OWNER_POLICY_REVIEW"
            ? conversationRoomGuideV1.preAcceptanceOwnerPolicyVoice
            : conversationRoomGuideV1.preAcceptanceDeclineVoice);
      speakStudioLine(voice);
      return;
    }

    const ok = bridgeConversationPlanToCampaign(route.roadId, serviceIds);
    if (!ok) {
      setPlanBridgeError(conversationRoomGuideV1.studioPlanBridgeError);
      return;
    }

    setPlanBridgeError(null);
    setDetailJobId(null);
    paymentCompleteGuardRef.current = false;
    setStageAndPersist("checkout");
    openPanel("checkout");
    speakStudioLine(conversationRoomGuideV1.checkoutVoiceBridge);
  }

  function authorizeCheckoutPayment(): boolean {
    const project = projectDraft ?? bootConversationProjectDraft(draft);
    const ma001Gate = evaluateMa001CompositionPaymentGate({
      selectedServiceIds: readSelectedServices(project).map((s) =>
        String(s.jobId),
      ),
      composition: readMa001PackComposition(project),
    });
    if (!ma001Gate.ok) {
      setPlanBridgeError(ma001Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your Promotion Pack still needs its exact pieces locked before payment.",
      );
      return false;
    }
    const rmj002Gate = evaluateRmJ002KitPaymentGate({
      selectedServiceIds: readSelectedServices(project).map((s) =>
        String(s.jobId),
      ),
      kitLock: readRmJ002KitLock(project),
    });
    if (!rmj002Gate.ok) {
      setPlanBridgeError(rmj002Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your Social Profile Setup Kit still needs one platform locked before payment.",
      );
      return false;
    }
    const rmj008Gate = evaluateRmJ008KitPaymentGate({
      selectedServiceIds: readSelectedServices(project).map((s) =>
        String(s.jobId),
      ),
      kitLock: readRmJ008KitLock(project),
    });
    if (!rmj008Gate.ok) {
      setPlanBridgeError(rmj008Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your Social Profile Update Kit still needs one platform and your current profile details locked before payment.",
      );
      return false;
    }
    const bf001Gate = evaluateBf001PackagePaymentGate({
      selectedServiceIds: readSelectedServices(project).map((s) =>
        String(s.jobId),
      ),
      packageLock: readBf001PackageLock(project),
    });
    if (!bf001Gate.ok) {
      setPlanBridgeError(bf001Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your Brand Identity Refresh still needs one graphic choice and your current logo and colors locked before payment.",
      );
      return false;
    }
    const rmj007Gate = evaluateRmJ007UpdatePaymentGate({
      selectedServiceIds: readSelectedServices(project).map((s) =>
        String(s.jobId),
      ),
      updateLock: readRmJ007UpdateLock(project),
    });
    if (!rmj007Gate.ok) {
      setPlanBridgeError(rmj007Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your promotion update still needs the named existing item, a reference note, the exact changes, where it lives, and acceptance that Studio recreates an updated final.",
      );
      return false;
    }
    const gate = assertPreAcceptanceAllowsPayment(
      projectFactsFromWorkingDraft(project),
    );
    if (!gate.allowed) {
      setPlanBridgeError(gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        gate.decision?.voiceLine ??
          conversationRoomGuideV1.preAcceptanceClarificationVoice,
      );
      return false;
    }
    return true;
  }

  function handleBackToStudioPlanFromCheckout() {
    setPlanBridgeError(null);
    setDetailJobId(null);
    setStageAndPersist("plan");
    closeActivityPanel();
  }

  function advanceToIntakeAfterPaid() {
    if (paymentCompleteGuardRef.current) return;
    paymentCompleteGuardRef.current = true;
    saveRouteMapJourneyStep("intake");
    setDetailJobId(null);
    setIntakeLiveAnswers(null);
    setPlanBridgeError(null);
    setStageAndPersist("intake");
    openPanel("intake");
    speakStudioLine(conversationRoomGuideV1.checkoutPaymentSuccessVoice);
  }

  /**
   * Complete Checkout → Stripe-hosted Checkout only.
   * Browser return alone never marks paid — webhook/reconcile does.
   */
  async function handleCheckoutPaymentComplete() {
    if (paymentCompleteGuardRef.current) return;
    const project = projectDraft ?? bootConversationProjectDraft(draft);
    const facts = projectFactsFromWorkingDraft(project);
    const ma001Composition = readMa001PackComposition(project);
    const ma001Gate = evaluateMa001CompositionPaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      composition: ma001Composition,
    });
    if (!ma001Gate.ok) {
      setPlanBridgeError(ma001Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your Promotion Pack still needs its exact pieces locked before payment.",
      );
      throw new Error(ma001Gate.message);
    }
    const rmj002KitLock = readRmJ002KitLock(project);
    const rmj002Gate = evaluateRmJ002KitPaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      kitLock: rmj002KitLock,
    });
    if (!rmj002Gate.ok) {
      setPlanBridgeError(rmj002Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your Social Profile Setup Kit still needs one platform locked before payment.",
      );
      throw new Error(rmj002Gate.message);
    }
    const rmj008KitLock = readRmJ008KitLock(project);
    const rmj008Gate = evaluateRmJ008KitPaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      kitLock: rmj008KitLock,
    });
    if (!rmj008Gate.ok) {
      setPlanBridgeError(rmj008Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your Social Profile Update Kit still needs one platform and your current profile details locked before payment.",
      );
      throw new Error(rmj008Gate.message);
    }
    const bf001PackageLock = readBf001PackageLock(project);
    const bf001Gate = evaluateBf001PackagePaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      packageLock: bf001PackageLock,
    });
    if (!bf001Gate.ok) {
      setPlanBridgeError(bf001Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your Brand Identity Refresh still needs one graphic choice and your current logo and colors locked before payment.",
      );
      throw new Error(bf001Gate.message);
    }
    const rmj007UpdateLock = readRmJ007UpdateLock(project);
    const rmj007Gate = evaluateRmJ007UpdatePaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      updateLock: rmj007UpdateLock,
    });
    if (!rmj007Gate.ok) {
      setPlanBridgeError(rmj007Gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        "Your promotion update still needs the named existing item, a reference note, the exact changes, where it lives, and acceptance that Studio recreates an updated final.",
      );
      throw new Error(rmj007Gate.message);
    }
    const gate = assertPreAcceptanceAllowsPayment(facts);
    if (!gate.allowed) {
      setPlanBridgeError(gate.message);
      setStageAndPersist("plan");
      closeActivityPanel();
      speakStudioLine(
        gate.decision?.voiceLine ??
          conversationRoomGuideV1.preAcceptanceClarificationVoice,
      );
      throw new Error(gate.message);
    }

    const campaign = readCurrentCampaignHydrated();
    if (!campaign?.campaignId) {
      setPlanBridgeError(studioPaymentV1.customerCopy.amountInvalid);
      throw new Error(studioPaymentV1.customerCopy.amountInvalid);
    }

    setPlanBridgeError(null);
    const started = await startHostedCheckout({
      campaignId: campaign.campaignId,
      facts,
      ma001PackComposition: ma001Composition,
      rmj002KitLock,
      rmj008KitLock,
      bf001PackageLock,
      rmj007UpdateLock,
    });
    if (!started.ok) {
      setPlanBridgeError(started.message);
      throw new Error(started.message);
    }

    if (started.mode !== "stripe" || !started.url) {
      const message = studioPaymentV1.customerCopy.processorNotConfigured;
      setPlanBridgeError(message);
      throw new Error(message);
    }

    window.location.assign(started.url);
  }

  /**
   * Developer fixture only — synthetic session + sandbox-confirm.
   * Never proof of Stripe hosted Checkout integration.
   */
  async function handleSandboxCheckoutConfirm() {
    if (paymentCompleteGuardRef.current) return;
    const project = projectDraft ?? bootConversationProjectDraft(draft);
    const facts = projectFactsFromWorkingDraft(project);
    const ma001Composition = readMa001PackComposition(project);
    const ma001Gate = evaluateMa001CompositionPaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      composition: ma001Composition,
    });
    if (!ma001Gate.ok) {
      setPlanBridgeError(ma001Gate.message);
      throw new Error(ma001Gate.message);
    }
    const rmj002KitLock = readRmJ002KitLock(project);
    const rmj002Gate = evaluateRmJ002KitPaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      kitLock: rmj002KitLock,
    });
    if (!rmj002Gate.ok) {
      setPlanBridgeError(rmj002Gate.message);
      throw new Error(rmj002Gate.message);
    }
    const rmj008KitLock = readRmJ008KitLock(project);
    const rmj008Gate = evaluateRmJ008KitPaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      kitLock: rmj008KitLock,
    });
    if (!rmj008Gate.ok) {
      setPlanBridgeError(rmj008Gate.message);
      throw new Error(rmj008Gate.message);
    }
    const bf001PackageLock = readBf001PackageLock(project);
    const bf001Gate = evaluateBf001PackagePaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      packageLock: bf001PackageLock,
    });
    if (!bf001Gate.ok) {
      setPlanBridgeError(bf001Gate.message);
      throw new Error(bf001Gate.message);
    }
    const rmj007UpdateLock = readRmJ007UpdateLock(project);
    const rmj007Gate = evaluateRmJ007UpdatePaymentGate({
      selectedServiceIds: facts.selectedServiceIds.map(String),
      updateLock: rmj007UpdateLock,
    });
    if (!rmj007Gate.ok) {
      setPlanBridgeError(rmj007Gate.message);
      throw new Error(rmj007Gate.message);
    }
    const gate = assertPreAcceptanceAllowsPayment(facts);
    if (!gate.allowed) {
      setPlanBridgeError(gate.message);
      throw new Error(gate.message);
    }

    const campaign = readCurrentCampaignHydrated();
    if (!campaign?.campaignId) {
      setPlanBridgeError(studioPaymentV1.customerCopy.amountInvalid);
      throw new Error(studioPaymentV1.customerCopy.amountInvalid);
    }

    setPlanBridgeError(null);
    const started = await startHostedCheckout({
      campaignId: campaign.campaignId,
      facts,
      preferSandbox: true,
      ma001PackComposition: ma001Composition,
      rmj002KitLock,
      rmj008KitLock,
      bf001PackageLock,
      rmj007UpdateLock,
    });
    if (!started.ok) {
      setPlanBridgeError(started.message);
      throw new Error(started.message);
    }
    if (started.mode !== "sandbox") {
      const message = studioPaymentV1.customerCopy.sandboxFixtureOnly;
      setPlanBridgeError(message);
      throw new Error(message);
    }

    const confirmed = await confirmSandboxCheckoutClient(
      started.checkoutSessionId,
    );
    if (!confirmed.ok) {
      setPlanBridgeError(confirmed.message);
      throw new Error(confirmed.message);
    }
    const local = applyServerPaymentTruthToLocalCampaign(confirmed.campaign);
    if (!local?.paymentReceivedAt) {
      setPlanBridgeError(studioPaymentV1.customerCopy.paymentPending);
      throw new Error(studioPaymentV1.customerCopy.paymentPending);
    }
    advanceToIntakeAfterPaid();
  }

  /** Return from Stripe Checkout — reconcile; do not treat URL as payment authority. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");
    if (payment === "cancel") {
      setPlanBridgeError(studioPaymentV1.customerCopy.paymentCancelled);
      setStageAndPersist("checkout");
      openPanel("checkout");
      return;
    }
    if (payment !== "return" || !sessionId) return;
    if (paymentCompleteGuardRef.current) return;

    let cancelled = false;
    void (async () => {
      setPlanBridgeError(studioPaymentV1.customerCopy.paymentPending);
      setStageAndPersist("checkout");
      openPanel("checkout");
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const result = await reconcileCheckoutClient(sessionId);
        if (cancelled) return;
        if (result.paid && result.campaign) {
          const local = applyServerPaymentTruthToLocalCampaign(result.campaign);
          if (local?.paymentReceivedAt) {
            const url = new URL(window.location.href);
            url.searchParams.delete("payment");
            url.searchParams.delete("session_id");
            window.history.replaceState({}, "", url.toString());
            advanceToIntakeAfterPaid();
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 750));
      }
      if (!cancelled) {
        setPlanBridgeError(studioPaymentV1.customerCopy.paymentPending);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally once on mount for return deep-link handling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleIntakeSubmitSuccess() {
    setStageAndPersist("complete");
    closeActivityPanel();
    void (async () => {
      const plan = await completeIntakeHandoff();
      setIntakeHandoffSignedIn(plan.auth === "signed-in");
      const campaign = readCurrentCampaignHydrated();
      const submittedAt =
        campaign?.routeMapIntakeSubmittedAt ??
        campaign?.routeMapIntake?.submittedAt ??
        new Date().toISOString();
      const submittedAnswers = campaign?.routeMapIntake?.answers ?? {};
      /* Distinct submission event — only after campaign submit already succeeded in the panel. */
      recordIntakeSubmission({
        campaignId: campaign?.campaignId,
        auth: plan.auth,
        destination: plan.destination,
        requiredSatisfied: true,
        answers: submittedAnswers,
        submittedAt,
      });
      /* Keep attributed working-draft history; clear Guide locals only so Board handoff is clean. */
      clearConversationGuideLocals();
      speakStudioLine(plan.voiceLine);
      navigateIntakeHandoff(plan.destination);
    })();
  }

  function handleConfirm() {
    if (!draft.projectNeed.trim()) {
      setError("Please tell me what you’re working on before saving.");
      goToStep("ask_project_need", draft);
      return;
    }
    const confirmed = confirmGuideCaptureDraft(draft);
    persistGuideDraft(confirmed);
    setDraft(confirmed);
    const base = projectDraft ?? bootConversationProjectDraft(confirmed);
    const withOpening = persistOpeningAnswers(
      base,
      openingFromGuideDraft(confirmed),
    );
    const recommendedRoadId = recommendRouteFromProjectNeed(
      confirmed.projectNeed,
    );
    let withRouteStage = persistConversationStage(withOpening, "route");
    if (recommendedRoadId) {
      withRouteStage = persistRouteRecommendation(
        withRouteStage,
        recommendedRoadId,
        confirmed.projectNeed,
      );
    } else {
      withRouteStage = clearRouteRecommendation(withRouteStage);
    }
    setProjectDraft(withRouteStage);
    setStage("route");
    goToStep("confirmed", confirmed);
    dispatch({ type: "set-flow-step", step: "confirmation" });
    closeActivityPanel();
    setPreviewRoadId(recommendedRoadId);
    pulseSaved();
    const recommendedLabel = recommendedRoadId
      ? getRouteMapRoad(recommendedRoadId)?.customerLabel
      : null;
    /* Tablet owns route chooser — Voice recommends; customer confirms. */
    speakStudioLine(
      routeVoiceBridge(confirmed.preferredName, recommendedLabel),
    );
  }

  function handleSaveForNow() {
    if (!draft.projectNeed.trim()) {
      persistGuideDraft(draft);
      const base = projectDraft ?? bootConversationProjectDraft(draft);
      setProjectDraft(
        persistOpeningAnswers(base, openingFromGuideDraft(draft)),
      );
      pulseSaved();
      return;
    }
    handleConfirm();
  }

  function handleCorrect() {
    closeActivityPanel();
    setStageAndPersist("opening");
    goToStep("summary", draft, { correcting: true });
    speakStudioLine(conversationRoomGuideV1.correctionPrompt);
  }

  function handleCorrectTarget(target: GuideConversationStep) {
    goToStep(target, draft, { restoreSelection: true });
    speakGuideStep(target);
  }

  function latestGuideDraft(): GuideCaptureDraftV1 {
    const stored = loadGuideDraft();
    if (guideHasReviewableAnswers(stored)) return stored;
    return draft;
  }

  function handleChangeAnswer() {
    const latest = latestGuideDraft();
    if (!guideHasReviewableAnswers(latest)) {
      setError("I don’t have a saved answer to change yet.");
      return;
    }
    closeActivityPanel();
    persistGuideDraft(latest);
    setDraft(latest);
    setStageAndPersist("opening", latest);
    goToStep("summary", latest, { correcting: true });
    speakStudioLine(conversationRoomGuideV1.correctionPrompt);
    revealConversationTablet();
  }

  /** Control strip — show the tablet summary from stored answers, not a second panel. */
  function handleReviewAnswers() {
    const latest = latestGuideDraft();
    if (!guideHasReviewableAnswers(latest)) {
      setError("I don’t have saved answers to review yet.");
      return;
    }
    closeActivityPanel();
    persistGuideDraft(latest);
    setDraft(latest);
    setStageAndPersist("opening", latest);
    goToStep("summary", latest);
    revealConversationTablet();
  }

  function handleStartNew() {
    /* New conversation content — keep the already-chosen Voice On/Off. */
    stopStudioSpeech();
    clearGuideUiStep();
    clearWorkingDraft();
    const empty = startNewGuideCaptureConversation();
    const project = bootConversationProjectDraft(empty);
    setProjectDraft(persistConversationStage(project, "opening"));
    setDraft(empty);
    setStage("opening");
    closeActivityPanel();
    setDetailJobId(null);
    setPreviewRoadId(null);
    goToStep("ask_preferred_name", empty);
    speakGuideStep("ask_preferred_name");
  }

  function handleReturnToLobby() {
    const result = returnToLobby(state);
    dispatch({ type: "return-to-lobby" });
    /* Full navigation — router.push races on Samsung and leaves Close conversation dead. */
    window.location.assign(
      withStudioPaymentSandboxQuery(result.lobbyRoute, window.location.search),
    );
  }

  function stopStudioSpeech() {
    cancelConversationSpeech();
    setStudioSpeaking(false);
  }

  function handleVoiceNarrationPreference(
    value: StudioVoiceNarrationPreference,
  ) {
    const fromGate = voiceNarrationRef.current === null;
    clearVoiceFirstEntryChoiceRequired();
    writeVoiceNarrationPreference(value);
    voiceNarrationRef.current = value;
    setVoiceNarration(value);
    if (fromGate) {
      listenArmedRef.current = false;
      setListenArmed(false);
      suppressSameGestureFollowUp(() => {
        listenArmedRef.current = true;
        setListenArmed(true);
      });
    }
    if (value === "off") {
      pendingVoiceInviteRef.current = null;
      inviteCleanupRef.current?.();
      inviteCleanupRef.current = null;
      stopStudioSpeech();
      stopConversationDictation();
      setListening(false);
      setInterimTranscript("");
      return;
    }
    /* Voice On — always speak something from this click (gesture unlocks TTS). */
    const pending = pendingVoiceInviteRef.current;
    pendingVoiceInviteRef.current = null;
    const currentLine = spokenLineForGuideStep(step, correcting);
    const line = pending?.line?.trim() || currentLine?.trim() || null;
    if (!line) return;
    window.setTimeout(() => {
      playConversationInviteLine(line);
    }, 80);
  }

  function handleTextDraftLive(value: string) {
    /* Ref only — no speech cancel, no setState (both were stealing the caret). */
    textDraftRef.current = value;
  }

  function handleTextDraftFlush(value: string) {
    textDraftRef.current = value;
    if (error) setError(null);
    setTextDraft(value);
  }

  function writeTextDraft(value: string) {
    textDraftRef.current = value;
    setTextDraft(value);
    setFieldEpoch((n) => n + 1);
  }

  function handleStartListening() {
    if (!listenArmedRef.current) {
      stopConversationDictation();
      setListening(false);
      return;
    }
    stopStudioSpeech();
    setError(null);
    setInterimTranscript("");
    setListening(true);
    startConversationDictation({
      onListeningStarted: () => setListening(true),
      onInterim: (text) => setInterimTranscript(text),
      onFinal: (text) => {
        setListening(false);
        setInterimTranscript("");
        const trimmed = text.trim();
        if (!trimmed) {
          setError("I did not catch that. Try again, or type your answer.");
          return;
        }
        writeTextDraft(trimmed);
      },
      onPermissionDenied: () => {
        setListening(false);
        setError(
          "Microphone permission is needed to speak. You can type your answer instead.",
        );
      },
      onError: () => {
        setListening(false);
        setError("Listening ran into a problem. Please try again, or type.");
      },
      onEnded: () => {
        setListening(false);
        setInterimTranscript("");
      },
    });
  }

  function handleStopListening() {
    stopConversationDictation();
    setListening(false);
  }

  /** Free-form customer question — Voice answers from the Machine record. */
  function handleSendMessage() {
    const trimmed = textDraftRef.current.trim();
    if (!trimmed) return;
    setError(null);
    stopConversationDictation();
    setListening(false);
    writeTextDraft("");
    setInterimTranscript("");
    const campaign = readCurrentCampaignHydrated();
    const lookupFailed = studioVoiceMachineCustomerCommunicationV1.customerCopy.lookupFailed;
    void (async () => {
      try {
        const response = await fetch("/api/studio-customer-life/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: campaign?.campaignId ?? null,
            question: trimmed,
          }),
        });
        if (!response.ok) {
          setStudioVoiceReply(lookupFailed);
          speakStudioLine(lookupFailed);
          return;
        }
        const payload = (await response.json()) as { answer?: { text?: string } };
        const text = payload.answer?.text?.trim() || lookupFailed;
        setStudioVoiceReply(text);
        speakStudioLine(text);
      } catch {
        setStudioVoiceReply(lookupFailed);
        speakStudioLine(lookupFailed);
      }
    })();
  }

  const serviceIdsForIntake = useMemo(() => {
    if (!projectDraft) return [] as ServiceId[];
    return Array.from(
      selectedJobIdSet(readSelectedServices(projectDraft)),
    ) as ServiceId[];
  }, [projectDraft]);

  useEffect(() => {
    if (stage !== "intake") {
      setIntakeLiveAnswers(null);
      return;
    }
    setIntakeLiveAnswers((prev) => {
      if (prev) return prev;
      return readUsableIntakeDraftAnswers(readCurrentCampaignHydrated()) ?? {};
    });
    let cancelled = false;
    void probeCustomerSessionSignedIn().then((signedIn) => {
      if (!cancelled) setIntakeHandoffSignedIn(signedIn);
    });
    return () => {
      cancelled = true;
    };
  }, [stage]);

  const intakeHandoffPlan = useMemo(
    () => resolveIntakeHandoffPlan(intakeHandoffSignedIn),
    [intakeHandoffSignedIn],
  );

  const intakeTabletStatus = useMemo(() => {
    if (stage !== "intake" || intakeLiveAnswers === null) return null;
    const plan = buildProjectIntakePlan(serviceIdsForIntake);
    const v = conversationRoomGuideV1;
    return buildProjectIntakeTabletStatus({
      plan,
      answers: intakeLiveAnswers,
      // Intake stage is only reachable after payment; services come from the draft.
      paymentReceived: true,
      servicesConfirmed: serviceIdsForIntake.length > 0,
      copy: {
        paymentReceivedLabel: v.intakeTabletPaymentReceivedLabel,
        servicesConfirmedLabel: v.intakeTabletServicesConfirmedLabel,
        stillNeededNoneLabel: v.intakeTabletStillNeededNoneLabel,
        nextRequiredRemaining: v.intakeTabletNextRequiredRemaining,
        nextReady: intakeHandoffPlan.tabletNextReady,
        nextReadyMaterialsLater: intakeHandoffPlan.tabletNextReadyMaterialsLater,
      },
    });
  }, [stage, intakeLiveAnswers, serviceIdsForIntake, intakeHandoffPlan]);

  if (!ready || !projectDraft || voiceNarration === null) {
    /*
     * OWNER ACCEPTED 2026-08-29 — Voice Choice film lock.
     * First-entry Voice Choice is its own Welcome-master film.
     * Do not mount Studio Workspace / Conversation Room tablet chrome here —
     * that shell contaminated the glass. Logic stays in this runtime.
     * Never return a blank page: boot and Voice Choice must stay reachable.
     * Do not alter the film, or remount CR chrome onto this gate, in later
     * Mobile work.
     */
    return (
      <VoiceChoiceFilm
        onChoose={handleVoiceNarrationPreference}
        privacyNote={STUDIO_GUIDE_MIC_PRIVACY_NOTE}
      />
    );
  }

  const selectedRoute = readSelectedRoute(projectDraft);
  const selectedServices = readSelectedServices(projectDraft);
  const selectedJobIds = selectedJobIdSet(selectedServices);
  const planModel =
    selectedRoute && selectedJobIds.size > 0
      ? buildProjectBuilderStudioPlanSummary(
          Array.from(selectedJobIds) as ServiceId[],
          selectedRoute.roadId,
        )
      : null;
  const ma001PlanComposition = evaluateMa001CompositionPaymentGate({
    selectedServiceIds: Array.from(selectedJobIds).map(String),
    composition: readMa001PackComposition(projectDraft),
  });
  const ma001CompositionMemberLabels =
    ma001PlanComposition.ok && ma001PlanComposition.applicable
      ? ma001PlanComposition.seal.customerKindLabels
      : null;
  const slidePanel = isActivitySlidePanel(activePanel) ? activePanel : null;

  const question = getConversationRoomGuideQuestion(step);
  const isAnsweringQuestion =
    stage === "opening" && Boolean(question) && !correcting && !askMode;
  /* Preferred name + project need are locked required; business name gets the same highlight while typing. */
  const answerRequired =
    isAnsweringQuestion &&
    question != null &&
    (question.canSkip === false || question.step === "ask_business_name");
  const hasAcceptedAnswer =
    selectedBubbles.length > 0 || textDraft.trim().length > 0;
  const openingAsk = isAnsweringQuestion;
  const voiceUnset = voiceNarration === null;
  const questionGlass =
    stage === "opening" &&
    (step === "ask_preferred_name" ||
      step === "ask_project_need" ||
      step === "ask_business_name");

  const canChangeAnswer =
    guideHasReviewableAnswers(draft) ||
    step === "summary" ||
    step === "confirmed" ||
    stage !== "opening";

  return (
    <StudioConversationRoom
      className={className}
      presence={voice.presence}
      loungeLight
      nameQuestion={questionGlass}
      activePanel={activePanel}
      onCloseActivityPanel={closeActivityPanel}
      activityPanelReturnFocusRef={activityReturnFocusRef}
      slideOut={
        slidePanel ? (
          <ConversationActivityPanel
            panel={slidePanel}
            selectedRoadId={
              selectedRoute?.roadId ?? previewRoadId
            }
            detailJobId={detailJobId}
            selectedJobIds={selectedJobIds}
            onClose={closeActivityPanel}
            onConfirmRoute={handleConfirmRoad}
            onBackToRoutes={() => {
              handleChangeRoute();
            }}
            onOpenLearnMore={handleOpenLearnMore}
            onBackToServices={() => {
              setDetailJobId(null);
              if (stage === "route") {
                openPanel("route");
                return;
              }
              if (stage === "plan") {
                openPanel("plan");
                return;
              }
              openPanel("builder");
            }}
            onAddJob={handleAddJob}
            onRemoveJob={handleRemoveJob}
            onReviewStudioPlan={handleReviewStudioPlan}
            onBackToStudioPlan={handleBackToStudioPlanFromCheckout}
            onCheckoutPaymentComplete={handleCheckoutPaymentComplete}
            onSandboxCheckoutConfirm={handleSandboxCheckoutConfirm}
            onAuthorizeCheckoutPayment={authorizeCheckoutPayment}
            paymentHonestyMessage={planBridgeError}
            onIntakeSubmitSuccess={handleIntakeSubmitSuccess}
            onRecoverIntakePayment={() => {
              setDetailJobId(null);
              setStageAndPersist("checkout");
              openPanel("checkout");
            }}
            intakePrefillBusinessName={draft.businessName}
            onIntakeAnswersChange={setIntakeLiveAnswers}
            intakeSubmitCtaLabel={intakeHandoffPlan.submitCtaLabel}
            intakeNextStepBlurb={intakeHandoffPlan.nextStepBlurb}
            learnMoreBackLabel={
              stage === "plan"
                ? conversationRoomGuideV1.studioPlanBackLabel
                : conversationRoomGuideV1.learnMoreBackLabel
            }
          />
        ) : null
      }
      navigation={
        <ConversationNavPanel
          canChangeAnswer={canChangeAnswer}
          summaryOpen={
            stage === "opening" && step === "summary" && !correcting
          }
          onAskQuestion={() => {
            setAskMode(true);
            stopStudioSpeech();
            writeTextDraft("");
          }}
          onReturnToLobby={handleReturnToLobby}
          onCloseConversation={handleReturnToLobby}
          onChangeAnswer={handleChangeAnswer}
          onStartNew={handleStartNew}
          onSaveForNow={handleSaveForNow}
          onOpenHelp={() => {
            openPanel("help", "studio-control-help");
            speakStudioLine(conversationRoomGuideV1.voiceHelpOpen);
          }}
          onToggleSummary={handleReviewAnswers}
        />
      }
      workspace={
          <StudioGuideTabletView
          step={step}
          stage={stage}
          draft={draft}
          selectedBubbles={selectedBubbles}
          correcting={correcting}
          error={error}
          onToggleBubble={handleToggleBubble}
          onContinue={handleContinue}
          onSkip={handleSkip}
          onConfirm={handleConfirm}
          onCorrect={handleCorrect}
          onCorrectTarget={handleCorrectTarget}
          answerAccepted={hasAcceptedAnswer}
          answerDock={
            openingAsk ? (
                <StudioGuideCommPanel
                  textDraft={textDraft}
                  fieldResetKey={`${stage}:${step}:${askMode ? "ask" : "guide"}:${fieldEpoch}`}
                  typePlaceholder={
                    isAnsweringQuestion && question
                      ? question.placeholder
                      : conversationRoomGuideV1.askAnythingPlaceholder
                  }
                  listening={listening}
                  speechSupported={speechSupported}
                  interimTranscript={interimTranscript}
                  savedPulse={savedPulse}
                  isAnsweringQuestion={isAnsweringQuestion}
                  answerRequired={answerRequired}
                  hasAcceptedAnswer={hasAcceptedAnswer}
                  showValidationError={Boolean(error)}
                  onTextDraftLive={handleTextDraftLive}
                  onTextDraftFlush={handleTextDraftFlush}
                  onStartListening={handleStartListening}
                  onStopListening={handleStopListening}
                  onSubmitGuideAnswer={handleContinue}
                  onSendMessage={handleSendMessage}
                  studioVoiceReply={studioVoiceReply}
                  allowMicrophone={listenArmed}
                  embedded
                  nameQuestion={questionGlass}
                />
            ) : null
          }
          modeControls={
            openingAsk ? (
              <VoicePreferenceControls
                preference={voiceNarration ?? "off"}
                onChoose={handleVoiceNarrationPreference}
                filmFamily={questionGlass}
              />
            ) : null
          }
          onOpenStagePanel={() => {
            if (stage === "route" || stage === "plan") return;
            if (stage === "services") {
              openPanel("builder");
              return;
            }
            const panel = STAGE_DEFAULT_PANEL[stage];
            if (panel !== "none") openPanel(panel);
          }}
          onChangeRoute={handleChangeRoute}
          onPreviewRoad={handlePreviewRoad}
          onConfirmRoad={handleConfirmRoad}
          previewRoadId={previewRoadId}
          recommendedRoadId={
            (projectDraft
              ? readActiveRouteRecommendation(projectDraft, draft.projectNeed)
                  ?.roadId
              : null) ?? recommendRouteFromProjectNeed(draft.projectNeed)
          }
          selectedServiceCount={selectedJobIds.size}
          selectedRouteLabel={
            selectedRoute
              ? getRouteMapRoad(selectedRoute.roadId)?.customerLabel ?? null
              : null
          }
          planModel={planModel}
          ma001CompositionMemberLabels={ma001CompositionMemberLabels}
          onEditPlan={handleEditPlan}
          onLooksGoodPlan={handleLooksGoodPlan}
          onOpenPlanExtraDetails={() => {
            setDetailJobId(null);
            openPanel("plan");
          }}
          planBridgeError={planBridgeError}
          intakeTabletStatus={intakeTabletStatus}
        />
      }
      communication={
        voiceUnset || openingAsk ? null : (
          <>
          <VoicePreferenceControls
            preference={voiceNarration}
            onChoose={handleVoiceNarrationPreference}
          />
          <StudioGuideCommPanel
          textDraft={textDraft}
          fieldResetKey={`${stage}:${step}:${askMode ? "ask" : "guide"}:${fieldEpoch}`}
          typePlaceholder={
            isAnsweringQuestion && question
              ? question.placeholder
              : conversationRoomGuideV1.askAnythingPlaceholder
          }
          listening={listening}
          speechSupported={speechSupported}
          interimTranscript={interimTranscript}
          savedPulse={savedPulse}
          isAnsweringQuestion={isAnsweringQuestion}
          answerRequired={answerRequired}
          hasAcceptedAnswer={hasAcceptedAnswer}
          showValidationError={Boolean(error)}
          onTextDraftLive={handleTextDraftLive}
          onTextDraftFlush={handleTextDraftFlush}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onSubmitGuideAnswer={handleContinue}
          onSendMessage={handleSendMessage}
          studioVoiceReply={studioVoiceReply}
          allowMicrophone={listenArmed}
        />
          </>
        )
      }
    />
  );
}
