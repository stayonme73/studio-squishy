/**
 * Conversation Phase Gates — what must be true to advance (or go back).
 * @see docs/studio-conversation-phase-gates-v1-locked.md
 * Evaluation: `src/lib/studio-conversation-phase-gates/evaluate.ts`
 */

import {
  CONVERSATION_FLOW_RHYTHM_STAGES,
  type ConversationFlowRhythmStage,
} from "@/config/studio-conversation-flow-rhythm-v1";

export const CONVERSATION_PHASE_GATE_BLOCK_REASONS = [
  "customer_not_ready",
  "input_mode_unavailable",
  "working_draft_not_ready",
  "goal_unknown",
  "need_character_unknown",
  "deadline_unknown",
  "studio_fit_unclear",
  "clarification_required",
  "route_not_recommended",
  "route_not_accepted",
  "route_incompatible",
  "services_unresolved",
  "service_questions_incomplete",
  "inclusions_exclusions_missing",
  "pricing_undetermined",
  "deadline_feasibility_unchecked",
  "unconfirmed_recommendation_selected",
  "project_not_confirmed",
  "payment_incomplete",
  "purchase_not_frozen",
  "consent_or_attribution_missing",
  "production_incomplete",
  "missing_items_unmarked",
  "project_record_missing",
  "board_services_unavailable",
  "cannot_skip_gate",
  "purchase_frozen_blocks_edit_retreat",
  "invalid_transition",
] as const;

export type ConversationPhaseGateBlockReason =
  (typeof CONVERSATION_PHASE_GATE_BLOCK_REASONS)[number];

/** Presentation-ready labels for blocked states (not full Voice dialogue). */
export const conversationPhaseGateBlockLabels = {
  customer_not_ready: "When you are ready to begin, we can continue.",
  input_mode_unavailable:
    "A way to respond is needed before we can continue.",
  working_draft_not_ready:
    "Your project draft is still being prepared. Please wait a moment.",
  goal_unknown: "We still need to understand what you are trying to accomplish.",
  need_character_unknown:
    "We still need to understand the kind of need you have.",
  deadline_unknown: "We still need your requested date or deadline.",
  studio_fit_unclear:
    "We still need to confirm whether The Studio can help with this work.",
  clarification_required:
    "A little more clarification is needed before we continue.",
  route_not_recommended: "A route recommendation is needed before building services.",
  route_not_accepted: "Please accept a recommended route or choose another.",
  route_incompatible:
    "The selected route does not appear to match what you described.",
  services_unresolved:
    "Relevant services still need to be added, declined, or deferred.",
  service_questions_incomplete: "Required service questions still need answers.",
  inclusions_exclusions_missing:
    "Important inclusions and exclusions still need to be clear.",
  pricing_undetermined: "Pricing still needs to be determined.",
  deadline_feasibility_unchecked:
    "Deadline feasibility still needs to be checked.",
  unconfirmed_recommendation_selected:
    "A recommendation must be confirmed before it is treated as selected.",
  project_not_confirmed:
    "Please confirm services, scope, price, deadline, and responsibilities before payment.",
  payment_incomplete: "Payment must succeed before production intake.",
  purchase_not_frozen: "The purchased project snapshot still needs to be saved.",
  consent_or_attribution_missing:
    "Consent and attribution records still need to be preserved.",
  production_incomplete: "Required production information is still incomplete.",
  missing_items_unmarked: "Missing items must be explicitly marked.",
  project_record_missing: "The project record still needs to be created.",
  board_services_unavailable:
    "Accepted service information is not yet available on the Studio Board.",
  cannot_skip_gate: "This step cannot be skipped.",
  purchase_frozen_blocks_edit_retreat:
    "After payment, purchased scope cannot be quietly reopened for editing.",
  invalid_transition: "That step change is not available.",
} as const satisfies Record<ConversationPhaseGateBlockReason, string>;

export type ConversationPhaseGateFactKey =
  | "customerReadyToBegin"
  | "inputModeAvailable"
  | "workingDraftReady"
  | "customerGoalKnown"
  | "needCharacterKnown"
  | "deadlineKnown"
  | "studioOffersRelevantWork"
  | "clarificationStillRequired"
  | "routeRecommended"
  | "routeAcceptedOrChosen"
  | "routeCompatibleWithNeed"
  | "servicesResolved"
  | "requiredServiceQuestionsAnswered"
  | "inclusionsExclusionsSurfaced"
  | "pricingDeterminable"
  | "deadlineFeasibilityChecked"
  | "noUnconfirmedRecommendationAsSelected"
  | "customerConfirmedSelectedServices"
  | "customerConfirmedDeclinedServices"
  | "customerConfirmedScope"
  | "customerConfirmedPrice"
  | "customerConfirmedDeadline"
  | "customerConfirmedExclusions"
  | "customerConfirmedMaterialsOrResponsibilities"
  | "paymentSucceeded"
  | "purchasedSnapshotFrozen"
  | "attributionAndConsentPreserved"
  | "productionInfoComplete"
  | "missingProductionItemsMarked"
  | "projectRecordCreated"
  | "servicesAvailableOnStudioBoard"
  | "workingDraftStatus";

export type ConversationPhaseForwardGate = {
  from: ConversationFlowRhythmStage;
  to: ConversationFlowRhythmStage;
  required: Array<{
    fact: Exclude<ConversationPhaseGateFactKey, "workingDraftStatus" | "clarificationStillRequired">;
    whenMissing: ConversationPhaseGateBlockReason;
  }>;
  denyWhen?: Array<{
    fact: "clarificationStillRequired";
    equals: boolean;
    reason: ConversationPhaseGateBlockReason;
  }>;
};

export const CONVERSATION_PHASE_FORWARD_GATES: readonly ConversationPhaseForwardGate[] =
  [
    {
      from: "welcome",
      to: "discovery",
      required: [
        { fact: "customerReadyToBegin", whenMissing: "customer_not_ready" },
        { fact: "inputModeAvailable", whenMissing: "input_mode_unavailable" },
        { fact: "workingDraftReady", whenMissing: "working_draft_not_ready" },
      ],
    },
    {
      from: "discovery",
      to: "route-recommendation",
      required: [
        { fact: "customerGoalKnown", whenMissing: "goal_unknown" },
        { fact: "needCharacterKnown", whenMissing: "need_character_unknown" },
        { fact: "deadlineKnown", whenMissing: "deadline_unknown" },
        { fact: "studioOffersRelevantWork", whenMissing: "studio_fit_unclear" },
      ],
      denyWhen: [
        {
          fact: "clarificationStillRequired",
          equals: true,
          reason: "clarification_required",
        },
      ],
    },
    {
      from: "route-recommendation",
      to: "service-building",
      required: [
        { fact: "routeRecommended", whenMissing: "route_not_recommended" },
        { fact: "routeAcceptedOrChosen", whenMissing: "route_not_accepted" },
        { fact: "routeCompatibleWithNeed", whenMissing: "route_incompatible" },
      ],
    },
    {
      from: "service-building",
      to: "project-review",
      required: [
        { fact: "servicesResolved", whenMissing: "services_unresolved" },
        {
          fact: "requiredServiceQuestionsAnswered",
          whenMissing: "service_questions_incomplete",
        },
        {
          fact: "inclusionsExclusionsSurfaced",
          whenMissing: "inclusions_exclusions_missing",
        },
        { fact: "pricingDeterminable", whenMissing: "pricing_undetermined" },
        {
          fact: "deadlineFeasibilityChecked",
          whenMissing: "deadline_feasibility_unchecked",
        },
        {
          fact: "noUnconfirmedRecommendationAsSelected",
          whenMissing: "unconfirmed_recommendation_selected",
        },
      ],
    },
    {
      from: "project-review",
      to: "payment",
      required: [
        {
          fact: "customerConfirmedSelectedServices",
          whenMissing: "project_not_confirmed",
        },
        {
          fact: "customerConfirmedDeclinedServices",
          whenMissing: "project_not_confirmed",
        },
        { fact: "customerConfirmedScope", whenMissing: "project_not_confirmed" },
        { fact: "customerConfirmedPrice", whenMissing: "project_not_confirmed" },
        {
          fact: "customerConfirmedDeadline",
          whenMissing: "project_not_confirmed",
        },
        {
          fact: "customerConfirmedExclusions",
          whenMissing: "project_not_confirmed",
        },
        {
          fact: "customerConfirmedMaterialsOrResponsibilities",
          whenMissing: "project_not_confirmed",
        },
      ],
    },
    {
      from: "payment",
      to: "production-intake",
      required: [
        { fact: "paymentSucceeded", whenMissing: "payment_incomplete" },
        { fact: "purchasedSnapshotFrozen", whenMissing: "purchase_not_frozen" },
        {
          fact: "attributionAndConsentPreserved",
          whenMissing: "consent_or_attribution_missing",
        },
      ],
    },
    {
      from: "production-intake",
      to: "studio-board",
      required: [
        { fact: "productionInfoComplete", whenMissing: "production_incomplete" },
        {
          fact: "missingProductionItemsMarked",
          whenMissing: "missing_items_unmarked",
        },
        { fact: "projectRecordCreated", whenMissing: "project_record_missing" },
        {
          fact: "servicesAvailableOnStudioBoard",
          whenMissing: "board_services_unavailable",
        },
      ],
    },
  ];

export const studioConversationPhaseGatesV1 = {
  version: 1,
  importantLock:
    "Voice may move backward freely before payment, but it may not skip a required gate merely to make the conversation feel faster.",
  stages: CONVERSATION_FLOW_RHYTHM_STAGES,
  forwardGates: CONVERSATION_PHASE_FORWARD_GATES,
} as const;
