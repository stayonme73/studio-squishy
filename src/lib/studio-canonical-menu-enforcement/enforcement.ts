/**
 * Canonical menu enforcement — runtime gates that make customer behavior obey
 * `studio-canonical-launch-truth-v1.ts`.
 *
 * The three-package door is the only current launch menu. The older Launch Now
 * shelf (11 services, historical $349 Short-Form and $549 Clip) stays as
 * history and internal reference; it cannot start a new customer purchase.
 */

import { studioCanonicalLaunchTruthV1 as truth } from "@/config/studio-canonical-launch-truth-v1";

export type CanonicalLaunchPackage = (typeof truth.packages)[number];

/** The only purchase kind a customer may start a new checkout with. */
export const CANONICAL_CHECKOUT_PURCHASE_KIND = "condensed_offer" as const;

/** Where a customer goes when they reach a superseded commerce surface. */
export const CANONICAL_LAUNCH_DOOR_HREF = "/" as const;

/** Conversation Room steps that belong to the older shelf flow. */
export const SUPERSEDED_ROOM_STAGES = ["route", "services", "plan", "checkout"] as const;

export function listCanonicalLaunchPackages(): readonly CanonicalLaunchPackage[] {
  return truth.packages;
}

export function formatCanonicalUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

/** One customer sentence naming the current menu from canonical truth. */
export function canonicalLaunchMenuSentence(): string {
  const items = truth.packages.map(
    (pkg) => `${pkg.customerFacingName} at ${pkg.priceDisplay}`,
  );
  const list =
    items.length > 1
      ? `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
      : items.join("");
  return `The Studio currently offers ${truth.packages.length} packages: ${list}.`;
}

export function isCanonicalCheckoutPurchaseKind(kind: unknown): boolean {
  return kind === CANONICAL_CHECKOUT_PURCHASE_KIND;
}

export const SUPERSEDED_OFFER_CHECKOUT_RESPONSE = {
  ok: false as const,
  error: "superseded_offer" as const,
  message: `This older Studio offer is no longer available to buy. ${canonicalLaunchMenuSentence()} Your saved project is not changed.`,
};

/**
 * True when the Conversation Room is on an older-shelf commerce step and must
 * hand the customer to the three-package door. A Stripe return for a session
 * that already exists is left alone so it can finish confirming.
 */
export function shouldLeaveSupersededRoomStage(stage: string, search: string): boolean {
  if (!(SUPERSEDED_ROOM_STAGES as readonly string[]).includes(stage)) return false;
  const params = new URLSearchParams(search);
  if (params.get("payment") === "return" && params.get("session_id")) return false;
  return true;
}
