import {
  discoveryTileConfig,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";
import type { StudioNeedId } from "@/config/studio-services";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import { parseMultiselect } from "@/lib/business-discovery-completion";
import type { DiscoveryBrief, DiscoveryBriefAnswers } from "@/recommendation/types";

const SUCCESS_NEED_MAP: Readonly<Record<string, readonly StudioNeedId[]>> = {
  "More leads or customers": ["get-more-customers"],
  "Stronger brand recognition": ["better-branding"],
  "Better engagement online": ["create-content", "better-customer-experience"],
  "Streamlined operations": ["better-business-systems", "workflow-improvements"],
  "Increased revenue": ["get-more-customers"],
  "Launching something new": ["get-more-customers", "better-branding"],
  "Saving time on marketing": ["workflow-improvements", "create-content"],
};

const SLOWING_NEED_MAP: Readonly<Record<string, readonly StudioNeedId[]>> = {
  "Lack of clarity or direction": ["better-branding"],
  "Limited time or resources": ["workflow-improvements"],
  "Outdated tools or technology": ["better-business-systems"],
  "Inconsistent messaging": ["better-branding", "improve-communication"],
  "Low visibility or reach": ["get-more-customers", "create-content"],
  "Team capacity gaps": ["workflow-improvements", "better-business-systems"],
  "Budget constraints": [],
};

const FOCUS_NEED_MAP: Readonly<Record<string, readonly StudioNeedId[]>> = {
  "Brand & identity": ["better-branding"],
  "Marketing & growth": ["get-more-customers"],
  "Operations & systems": ["better-business-systems", "workflow-improvements"],
  "Customer experience": ["better-customer-experience", "improve-communication"],
  "Content & creative": ["create-content"],
  "Sales & conversion": ["get-more-customers", "improve-communication"],
};

const TOOLS_NEED_MAP: Readonly<Record<string, readonly StudioNeedId[]>> = {
  "Email marketing": ["improve-communication"],
  "CRM (HubSpot, Salesforce, etc.)": ["better-customer-experience"],
};

const RECURRING_SUCCESS_OPTIONS = new Set(["Saving time on marketing"]);
const RECURRING_SLOWING_OPTIONS = new Set(["Limited time or resources"]);

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
