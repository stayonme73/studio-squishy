/**
 * Shared customer-facing copy for Route Map job cards — Revision + Timing.
 * One source of truth so active job cards never duplicate identical paragraphs.
 * @see docs/route-map-main-screen-v1-locked.md
 */

/** Compact revision summary — used where a single line is required (cards, catalog seeds). */
export const ROUTE_MAP_REVISION_TEMPLATE =
  "One revision round included. Studio corrections for our own mistakes do not use your revision allowance. Work beyond purchased scope follows the Project Change process.";

/** Scannable revision bullets for Learn More / detail panels. */
export const ROUTE_MAP_REVISION_DRAWER_ITEMS: readonly string[] = [
  "One revision round is included with this service.",
  "A revision is a customer-requested change to work that correctly followed the approved brief — for example, changing a color, replacing customer-supplied wording, moving or resizing content, requesting a different image, or changing the approved design direction.",
  "One included revision round may contain a reasonable grouped list of changes submitted together. Individual comments within the same round are not separate paid revisions.",
  "The Studio corrects its own mistakes at no charge. Spelling or typing errors, incorrect placement of your supplied information, missing content you provided on time, wrong file dimensions, broken exports, failure to follow the approved brief, layout mistakes, internal handoff errors, and choppy or robotic Studio narration do not count against your revision allowance.",
  "Work beyond the purchased scope — such as an additional page, size, or version; more posts or graphics; substantial new wording after approval; or a new design direction — follows the existing Project Change process.",
];

/**
 * Builds the customer-facing timing label for a Route Map job card.
 * `range` is the job-specific delivery window, e.g. "within 2 business days".
 * Avoids the internal word "intake" in customer-facing copy.
 */
export function buildRouteMapTimingLabel(range: string): string {
  return `Initial delivery: ${range} after you submit your Project Details and we receive all required materials. Delays in providing materials, information, approvals, or feedback may extend the estimated completion date. Before payment, we'll confirm whether your required completion date can be met.`;
}
