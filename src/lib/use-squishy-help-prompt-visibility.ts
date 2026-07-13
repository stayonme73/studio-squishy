"use client";

import { useMemo } from "react";

export type SquishyHelpPromptVisibilityMode = "always" | "hesitation";

export type SquishyHelpPromptVisibilityOptions = {
  /**
   * Phase 1 (current): `"always"` — Help Prompt is visible as soon as the Route Map loads.
   * Phase 2 (planned): `"hesitation"` — show only after a brief pause with no route selection.
   */
  mode?: SquishyHelpPromptVisibilityMode;
  /** Reserved for Phase 2 hesitation timing (milliseconds). Ignored while mode is `"always"`. */
  hesitationMs?: number;
};

/** Pure resolver — testable without React; hook delegates here. */
export function resolveSquishyHelpPromptVisibility(
  options: SquishyHelpPromptVisibilityOptions = {},
): boolean {
  const mode = options.mode ?? "always";
  if (mode === "always") return true;
  // Phase 2: return true once options.hesitationMs elapses with no route interaction.
  return false;
}

/**
 * Gates whether the Squishy Help Prompt renders on the Route Map main screen.
 *
 * Kept as a hook so Phase 2 can swap in idle/hesitation detection without touching
 * `SquishyHelpPrompt`, `RouteMapChoosePanel`, or Route Map layout.
 */
export function useSquishyHelpPromptVisibility(
  options: SquishyHelpPromptVisibilityOptions = {},
): boolean {
  return useMemo(() => resolveSquishyHelpPromptVisibility(options), [options.mode, options.hesitationMs]);
}
