"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import ConversationNavPanel from "@/components/studio-conversation-room/ConversationNavPanel";
import ConversationActivityPanel from "@/components/studio-conversation-room/guide/ConversationActivityPanel";
import StudioGuideCommPanel from "@/components/studio-conversation-room/guide/StudioGuideCommPanel";
import StudioGuideTabletView, {
  STUDIO_GUIDE_MIC_PRIVACY_NOTE,
} from "@/components/studio-conversation-room/guide/StudioGuideTabletView";
import StudioConversationRoom from "@/components/studio-conversation-room/StudioConversationRoom";
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
import { studioBoard } from "@/config/studio-board";
import {
  markStudioVoiceBoardHandoffAwaitingSignIn,
} from "@/lib/studio-voice-board-handoff";
import {
  bootConversationProjectDraft,
  bridgeConversationPlanToCampaign,
  guideDraftFromOpening,
  openingFromGuideDraft,
  persistAddService,
  persistConversationStage,
  persistOpeningAnswers,
  persistRemoveService,
  persistRouteRecommendation,
  persistSelectedRoute,
  readConversationStage,
  readOpeningAnswers,
  readRouteRecommendation,
  readSelectedRoute,
  readSelectedServices,
  selectedJobIdSet,
} from "@/lib/conversation-room-draft";
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
  markPaymentReceived,
  readCurrentCampaignHydrated,
} from "@/lib/studio-board-campaign";
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
  isAcceptableGuideDeadlineInput,
  startNewGuideCaptureConversation,
  type GuideCaptureDraftV1,
} from "@/lib/studio-guide-capture";
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
import { clearWorkingDraft } from "@/lib/studio-working-draft";
import type { WorkingDraftRecord } from "@/lib/studio-working-draft";
import { consumeStudioVoiceInvite } from "@/lib/studio-voice-invite";

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

export type ConversationRoomRuntimeProps = {
  initialState?: Partial<ConversationRoomState>;
  voiceIntent?: VoiceIntent;
  capturedTranscript?: string | null;
  inspectHardware?: boolean;
  className?: string;
};

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
  voiceIntent = "idle",
  capturedTranscript = null,
  inspectHardware = false,
  className,
}: ConversationRoomRuntimeProps) {
  const router = useRouter();
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
  /** Route lane highlighted on the tablet while Build Your Project is open. */
  const [previewRoadId, setPreviewRoadId] = useState<RouteMapRoadId | null>(
    null,
  );
  const [studioSpeaking, setStudioSpeaking] = useState(false);
  const [askMode, setAskMode] = useState(false);
  const [planBridgeError, setPlanBridgeError] = useState<string | null>(null);
  /** Live Intake answers for tablet status + post-refresh restore mirror. */
  const [intakeLiveAnswers, setIntakeLiveAnswers] =
    useState<RouteMapIntakeAnswers | null>(null);
  const activityReturnFocusRef = useRef<HTMLElement | null>(null);
  /** Suppress stacked “added” lines when the customer taps services quickly. */
  const lastServiceAddSpokenAtRef = useRef(0);
  /** Prevent duplicate payment-success handling on rapid Complete Checkout. */
  const paymentCompleteGuardRef = useRef(false);

  function speakStudioLine(text: string | null | undefined) {
    const line = text?.trim();
    if (!line) return;
    cancelConversationSpeech();
    const started = speakConversationLine(line, {
      onStart: () => setStudioSpeaking(true),
      onEnd: () => setStudioSpeaking(false),
    });
    if (!started) setStudioSpeaking(false);
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
    const restoredStage = readConversationStage(project);
    const openStep =
      restoredStage === "opening"
        ? resolveGuideOpenStep(
            new URLSearchParams(
              typeof window !== "undefined" ? window.location.search : "",
            ),
            hydratedGuide,
          )
        : ("confirmed" as GuideConversationStep);

    setProjectDraft(project);
    setStage(restoredStage);
    setDraft(hydratedGuide);
    setStep(openStep);
    setTextDraft(fieldValueForStep(hydratedGuide, openStep));
    setActivePanel(
      restoredStage === "opening" ? "none" : STAGE_DEFAULT_PANEL[restoredStage],
    );
    if (restoredStage === "route") {
      const savedRec = readRouteRecommendation(project)?.roadId;
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

    /* Speak only if Lobby (or another surface) invited Voice — never on bare load. */
    const invite = consumeStudioVoiceInvite();
    let inviteTimer = 0;
    if (invite === "start" && restoredStage === "opening") {
      inviteTimer = window.setTimeout(() => {
        const line = spokenLineForGuideStep(openStep, false);
        if (!line) return;
        speakConversationLine(line, {
          onStart: () => setStudioSpeaking(true),
          onEnd: () => setStudioSpeaking(false),
        });
      }, 220);
    } else if (invite === "resume") {
      inviteTimer = window.setTimeout(() => {
        const line =
          restoredStage === "opening"
            ? spokenLineForGuideStep(openStep, false)
            : conversationRoomGuideV1.routeVoiceIntro;
        const welcome = conversationRoomGuideV1.voiceWelcomeBack;
        speakConversationLine(line ? `${welcome} ${line}` : welcome, {
          onStart: () => setStudioSpeaking(true),
          onEnd: () => setStudioSpeaking(false),
        });
      }, 220);
    }

    return () => {
      if (inviteTimer) window.clearTimeout(inviteTimer);
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

  function goToStep(next: GuideConversationStep, nextDraft = draft) {
    setStep(next);
    writeGuideUiStep(next);
    setCorrecting(false);
    setAskMode(false);
    setShowDateField(false);
    setSelectedBubbles([]);
    setTextDraft(fieldValueForStep(nextDraft, next));
    setError(null);
    setInterimTranscript("");
    stopConversationDictation();
    setListening(false);
  }

  function commitDraft(nextDraft: GuideCaptureDraftV1) {
    persistGuideDraft(nextDraft);
    setDraft(nextDraft);
    const base = projectDraft ?? bootConversationProjectDraft(nextDraft);
    const nextProject = persistOpeningAnswers(
      base,
      openingFromGuideDraft(nextDraft),
    );
    setProjectDraft(nextProject);
    pulseSaved();
  }

  function setStageAndPersist(nextStage: ConversationRoomStage) {
    const base = projectDraft ?? bootConversationProjectDraft(draft);
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
    setPreviewRoadId(null);
    dispatch({ type: "close-help" });
  }

  function handlePreviewRoad(roadId: RouteMapRoadId) {
    /* Lane tap only highlights — customer must confirm before the route commits. */
    setPreviewRoadId(roadId);
  }

  function handleConfirmRoad(roadId: RouteMapRoadId) {
    handleSelectRoad(roadId);
  }

  function resolveAnswerFromUi(questionStep: GuideConversationStep): {
    answer: string;
    skipped: boolean;
  } {
    const question = getConversationRoomGuideQuestion(questionStep);
    const typed = textDraft.trim();
    if (
      question?.bubbleMode === "multi" &&
      selectedBubbles.length > 0 &&
      !selectedBubbles.includes("Skip for now")
    ) {
      const fromBubbles = selectedBubbles.join(", ");
      const answer = typed
        ? `${fromBubbles}${typed ? ` — ${typed}` : ""}`
        : fromBubbles;
      return { answer, skipped: false };
    }
    if (selectedBubbles.includes("Skip for now") && !typed) {
      return { answer: "", skipped: true };
    }
    if (selectedBubbles.includes("No deadline yet") && !typed) {
      return { answer: "", skipped: true };
    }
    if (
      question?.opensDateFieldBubble &&
      selectedBubbles.includes(question.opensDateFieldBubble) &&
      !typed
    ) {
      return { answer: "", skipped: false };
    }
    if (typed) return { answer: typed, skipped: false };
    if (selectedBubbles.length === 1) {
      const bubble = selectedBubbles[0];
      if (bubble === "Skip for now") return { answer: "", skipped: true };
      return { answer: bubble, skipped: false };
    }
    return { answer: "", skipped: false };
  }

  function handleContinue() {
    const question = getConversationRoomGuideQuestion(step);
    if (!question) return;

    const { answer, skipped } = resolveAnswerFromUi(step);

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
    goToStep(nextStep, nextDraft);
    speakGuideStep(nextStep, { thanks: true });
  }

  function handleToggleBubble(bubble: string) {
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
      setTextDraft("");
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
    setTextDraft(bubble);
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

  function handleLooksGoodPlan() {
    const route = readSelectedRoute(
      projectDraft ?? bootConversationProjectDraft(draft),
    );
    const services = readSelectedServices(
      projectDraft ?? bootConversationProjectDraft(draft),
    );
    if (!route || services.length === 0) return;

    const serviceIds = services.map((s) => s.jobId as ServiceId);
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

  function handleBackToStudioPlanFromCheckout() {
    setPlanBridgeError(null);
    setDetailJobId(null);
    setStageAndPersist("plan");
    closeActivityPanel();
  }

  /**
   * Payment success must be explicit (markPaymentReceived) before Intake.
   * Stay in the Conversation Room — Host `/route-map?step=intake` remains available.
   */
  function handleCheckoutPaymentComplete() {
    if (paymentCompleteGuardRef.current) return;
    paymentCompleteGuardRef.current = true;
    markPaymentReceived();
    saveRouteMapJourneyStep("intake");
    setDetailJobId(null);
    setIntakeLiveAnswers(null);
    setStageAndPersist("intake");
    openPanel("intake");
    speakStudioLine(conversationRoomGuideV1.checkoutPaymentSuccessVoice);
  }

  function handleIntakeSubmitSuccess() {
    setStageAndPersist("complete");
    closeActivityPanel();
    markStudioVoiceBoardHandoffAwaitingSignIn();
    speakStudioLine(conversationRoomGuideV1.intakeSubmitSuccessVoice);
    router.push(studioBoard.routes.studioBoard);
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
    goToStep("summary", draft);
    setCorrecting(true);
    speakStudioLine(conversationRoomGuideV1.correctionPrompt);
  }

  function handleCorrectTarget(target: GuideConversationStep) {
    goToStep(target, draft);
    speakGuideStep(target);
  }

  function handleChangeAnswer() {
    closeActivityPanel();
    setStageAndPersist("opening");
    goToStep("summary", draft);
    setCorrecting(true);
    speakStudioLine(conversationRoomGuideV1.correctionPrompt);
  }

  /** Control strip — show the tablet summary (not a second Activity Panel). */
  function handleReviewAnswers() {
    closeActivityPanel();
    setStageAndPersist("opening");
    goToStep("summary", draft);
    setCorrecting(false);
  }

  function handleStartNew() {
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
    router.push(result.lobbyRoute);
  }

  function stopStudioSpeech() {
    cancelConversationSpeech();
    setStudioSpeaking(false);
  }

  function handleTextDraftChange(value: string) {
    if (studioSpeaking) stopStudioSpeech();
    setTextDraft(value);
  }

  function handleStartListening() {
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
        setTextDraft(trimmed);
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

  /** Free-form customer message — available on every screen, including after save. */
  function handleSendMessage() {
    const trimmed = textDraft.trim();
    if (!trimmed) return;
    setError(null);
    stopConversationDictation();
    setListening(false);
    /* Affordance first — Voice Host reply comes in a later package. */
    pulseSaved();
    setTextDraft("");
    setInterimTranscript("");
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
  }, [stage]);

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
        nextReady: v.intakeTabletNextReady,
        nextReadyMaterialsLater: v.intakeTabletNextReadyMaterialsLater,
      },
    });
  }, [stage, intakeLiveAnswers, serviceIdsForIntake]);

  if (!ready || !projectDraft) {
    return (
      <StudioConversationRoom
        className={className}
        presence={voice.presence}
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
  const slidePanel = isActivitySlidePanel(activePanel) ? activePanel : null;

  const question = getConversationRoomGuideQuestion(step);
  const isAnsweringQuestion =
    stage === "opening" && Boolean(question) && !correcting && !askMode;

  const canChangeAnswer =
    Boolean(draft.projectNeed.trim()) ||
    step === "summary" ||
    step === "confirmed" ||
    stage !== "opening";

  return (
    <StudioConversationRoom
      className={className}
      presence={voice.presence}
      activePanel={activePanel}
      onCloseActivityPanel={closeActivityPanel}
      activityPanelReturnFocusRef={activityReturnFocusRef}
      micPrivacyNote={STUDIO_GUIDE_MIC_PRIVACY_NOTE}
      slideOut={
        slidePanel ? (
          <ConversationActivityPanel
            panel={slidePanel}
            selectedRoadId={selectedRoute?.roadId ?? null}
            detailJobId={detailJobId}
            selectedJobIds={selectedJobIds}
            onClose={closeActivityPanel}
            onBackToRoutes={() => {
              setDetailJobId(null);
              const recommended =
                readRouteRecommendation(projectDraft)?.roadId ??
                recommendRouteFromProjectNeed(draft.projectNeed);
              setStageAndPersist("route");
              closeActivityPanel();
              setPreviewRoadId(recommended);
            }}
            onOpenLearnMore={handleOpenLearnMore}
            onBackToServices={() => {
              setDetailJobId(null);
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
            onIntakeSubmitSuccess={handleIntakeSubmitSuccess}
            onRecoverIntakePayment={() => {
              setDetailJobId(null);
              setStageAndPersist("checkout");
              openPanel("checkout");
            }}
            intakePrefillBusinessName={draft.businessName}
            onIntakeAnswersChange={setIntakeLiveAnswers}
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
            stage === "opening" &&
            (step === "summary" || step === "confirmed") &&
            !correcting
          }
          listening={listening}
          onSpeak={() => {
            if (listening) handleStopListening();
            else handleStartListening();
          }}
          onType={() => {
            setAskMode(false);
            stopStudioSpeech();
          }}
          onAskQuestion={() => {
            setAskMode(true);
            stopStudioSpeech();
            setTextDraft("");
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
          onOpenStagePanel={() => {
            if (stage === "route" || stage === "plan") return;
            const panel = STAGE_DEFAULT_PANEL[stage];
            if (panel !== "none") openPanel(panel);
          }}
          onPreviewRoad={handlePreviewRoad}
          onConfirmRoad={handleConfirmRoad}
          previewRoadId={previewRoadId}
          recommendedRoadId={
            readRouteRecommendation(projectDraft)?.roadId ??
            recommendRouteFromProjectNeed(draft.projectNeed)
          }
          selectedServiceCount={selectedJobIds.size}
          selectedRouteLabel={
            selectedRoute
              ? getRouteMapRoad(selectedRoute.roadId)?.customerLabel ?? null
              : null
          }
          planModel={planModel}
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
        <StudioGuideCommPanel
          textDraft={textDraft}
          listening={listening}
          speechSupported={speechSupported}
          interimTranscript={interimTranscript}
          savedPulse={savedPulse}
          isAnsweringQuestion={isAnsweringQuestion}
          onTextDraftChange={handleTextDraftChange}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onContinue={handleContinue}
          onSendMessage={handleSendMessage}
        />
      }
    />
  );
}
