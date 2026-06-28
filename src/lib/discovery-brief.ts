import {
  discoveryTileConfig,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";
import type { StudioNeedId } from "@/config/studio-services";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import { parseMultiselect } from "@/lib/business-discovery-completion";
import type { DiscoveryBrief, DiscoveryBriefAnswers } from "@/recommendation/types";

const SUCCESS_NEED_MAP: Readonly<Record<string, readonly StudioNeedId[]>> = {
  "A stronger, more polished brand presence": ["better-branding"],
  "More consistent social media visibility": ["create-content", "better-customer-experience"],
  "A successful launch, event, sale, or promotion": ["get-more-customers", "better-branding"],
  "Better-looking promotional materials": ["create-content", "better-branding"],
  "Reaching customers by email": ["improve-communication"],
  "Spending less time creating and posting marketing": ["workflow-improvements", "create-content"],
};

const SLOWING_NEED_MAP: Readonly<Record<string, readonly StudioNeedId[]>> = {
  "I do not have time to create or post content": ["workflow-improvements"],
  "My branding looks inconsistent": ["better-branding", "improve-communication"],
  "I am unclear on what to promote or say": ["better-branding"],
  "I do not have enough marketing materials": ["create-content"],
  "I am not visible enough online": ["get-more-customers", "create-content"],
  "I have a limited marketing budget": [],
};

const FOCUS_NEED_MAP: Readonly<Record<string, readonly StudioNeedId[]>> = {
  "Refresh my brand look": ["better-branding"],
  "Create social media content": ["create-content"],
  "Promote an offer, event, or launch": ["get-more-customers"],
  "Reach customers by email": ["improve-communication"],
  "Get polished promotional graphics": ["create-content", "better-branding"],
  "Save time on marketing": ["workflow-improvements", "create-content"],
};

const TOOLS_NEED_MAP: Readonly<Record<string, readonly StudioNeedId[]>> = {
  "Email list or email platform": ["improve-communication"],
};

const RECURRING_SUCCESS_OPTIONS = new Set([
  "Spending less time creating and posting marketing",
]);
const RECURRING_SLOWING_OPTIONS = new Set([
  "I do not have time to create or post content",
]);

function toBriefAnswers(answers: DiscoveryAnswers): DiscoveryBriefAnswers {
  const briefAnswers: DiscoveryBriefAnswers = {};
  for (const [tileId, value] of Object.entries(answers)) {
    if (tileId === "submit-project") continue;
    if (typeof value !== "string" || !value.trim()) continue;
    briefAnswers[tileId as Exclude<DiscoveryTileId, "submit-project">] = value;
  }
  return briefAnswers;
}

function parseMultiselectTile(
  tileId: "success-looks-like" | "whats-slowing-you-down",
  answers: DiscoveryBriefAnswers,
): string[] {
  const config = discoveryTileConfig[tileId];
  const raw = answers[tileId];
  if (!raw?.trim() || !config.options) return [];
  return parseMultiselect(raw, config.options);
}

/** Parsed selections from the your-current-tools multiselect tile. */
export function parseToolsSelections(answers: DiscoveryBriefAnswers): string[] {
  return parseDiscoveryMultiselectSelections("your-current-tools", answers);
}

/** Parsed selections from any discovery multiselect tile. */
export function parseDiscoveryMultiselectSelections(
  tileId: keyof typeof discoveryTileConfig,
  answers: DiscoveryBriefAnswers,
): string[] {
  const config = discoveryTileConfig[tileId];
  if (config.fieldType !== "multiselect" || !config.options) return [];
  const raw = answers[tileId as keyof DiscoveryBriefAnswers];
  if (!raw?.trim()) return [];
  return parseMultiselect(raw, config.options);
}

function collectNeedsFromMap(
  selections: readonly string[],
  map: Readonly<Record<string, readonly StudioNeedId[]>>,
  target: Set<StudioNeedId>,
): void {
  for (const selection of selections) {
    for (const needId of map[selection] ?? []) {
      target.add(needId);
    }
  }
}

/** Derive explicit outcome needs from multiselect tiles and focus selection. */
export function deriveSelectedNeeds(answers: DiscoveryBriefAnswers): StudioNeedId[] {
  const needs = new Set<StudioNeedId>();

  collectNeedsFromMap(
    parseMultiselectTile("success-looks-like", answers),
    SUCCESS_NEED_MAP,
    needs,
  );
  collectNeedsFromMap(
    parseMultiselectTile("whats-slowing-you-down", answers),
    SLOWING_NEED_MAP,
    needs,
  );
  collectNeedsFromMap(parseToolsSelections(answers), TOOLS_NEED_MAP, needs);

  const focus = answers["your-focus"];
  if (focus) {
    for (const needId of FOCUS_NEED_MAP[focus] ?? []) {
      needs.add(needId);
    }
  }

  return [...needs];
}

/** True when Discovery also signals recurring marketing workload (monthly eligibility). */
export function briefIndicatesRecurringWorkload(brief: DiscoveryBrief): boolean {
  const answers = brief.answers;
  const success = parseMultiselectTile("success-looks-like", answers);
  const slowing = parseMultiselectTile("whats-slowing-you-down", answers);

  if (success.some((option) => RECURRING_SUCCESS_OPTIONS.has(option))) return true;
  if (slowing.some((option) => RECURRING_SLOWING_OPTIONS.has(option))) return true;

  return false;
}

export function briefIndicatesStartingFresh(brief: DiscoveryBrief): boolean {
  return brief.answers["your-situation"] === "Starting fresh";
}

/** Map persisted discovery tile answers to a Recommendation Engine brief. */
export function discoveryBriefFromAnswers(answers: DiscoveryAnswers): DiscoveryBrief {
  return buildDiscoveryBrief(answers);
}

/** Unified brief builder — tile answers plus derived selectedNeeds. */
export function buildDiscoveryBrief(answers: DiscoveryAnswers): DiscoveryBrief {
  const briefAnswers = toBriefAnswers(answers);
  return {
    answers: briefAnswers,
    selectedNeeds: deriveSelectedNeeds(briefAnswers),
  };
}

/** Read brief answers from a campaign record or local discovery session. */
export function resolveDiscoveryBriefAnswers(
  campaignAnswers?: DiscoveryBriefAnswers,
  sessionAnswers?: DiscoveryAnswers,
): DiscoveryBriefAnswers {
  if (campaignAnswers && Object.keys(campaignAnswers).length > 0) {
    return campaignAnswers;
  }
  return toBriefAnswers(sessionAnswers ?? {});
}

/** Resolve a full brief from campaign storage or session — includes derived needs. */
export function resolveDiscoveryBrief(
  campaignAnswers?: DiscoveryBriefAnswers,
  sessionAnswers?: DiscoveryAnswers,
): DiscoveryBrief {
  const answers = resolveDiscoveryBriefAnswers(campaignAnswers, sessionAnswers);
  return {
    answers,
    selectedNeeds: deriveSelectedNeeds(answers),
  };
}
