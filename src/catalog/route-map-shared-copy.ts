/**
 * Shared customer-facing copy for Route Map job cards — Revision + Timing.
 * One source of truth so the 14 active job cards never duplicate identical paragraphs.
 * @see docs/route-map-main-screen-v1-locked.md
 */

/** Universal revision policy — identical across every active Route Map job. */
export const ROUTE_MAP_REVISION_TEMPLATE =
  "1 revision round included. One revision round means one complete list of requested changes after you review the draft. Fixing a Studio error does not use your revision round. Additional revisions may require a new order or additional fee.";

/**
 * Builds the customer-facing timing label for a Route Map job card.
 * `range` is the job-specific delivery window, e.g. "within 2 business days".
 * Avoids the internal word "intake" in customer-facing copy.
 */
export function buildRouteMapTimingLabel(range: string): string {
  return `Initial delivery: ${range} after you submit your Project Details and we receive all required materials. Delays in providing materials, information, approvals, or feedback may extend the estimated completion date. Before payment, we'll confirm whether your required completion date can be met.`;
}
