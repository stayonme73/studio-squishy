/**
 * Mobile Materials presentation only. Does not change Gate X, routing, or
 * production clearance. Ceremonial routing copy already lives in the status
 * chip / glance; repeating it as a paragraph is phone-only noise.
 */
export function isCeremonialMaterialsRoutingState(state: string | undefined): boolean {
  return state === "CLEARED_FOR_PRODUCTION" || state === "RECEIVED";
}
