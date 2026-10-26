/**
 * Canonical menu enforcement — runtime gates for the current customer menu.
 *
 * Canonical launch truth (`studio-canonical-launch-truth-v1.ts`) lists four
 * homepage packages. Creative QA remains an internal id for an existing job.
 * The older Launch Now shelf stays history and cannot start a new customer purchase.
 */

import { PUBLIC_LAUNCH_PACKAGE_IDS } from "@/config/studio-customer-journey-condense-v1";
import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 } from "@/config/studio-three-package-revision-truth-v1";
import { studioThankYouAmount } from "@/config/studio-thank-you-discount-v1";

const LIVE_LAUNCH_PACKAGE_ORDER = PUBLIC_LAUNCH_PACKAGE_IDS;

export type CanonicalLaunchPackage = {
  packageId: (typeof LIVE_LAUNCH_PACKAGE_ORDER)[number];
  customerFacingName: string;
  priceDisplay: string;
  listPriceCents: number;
  amountDueAfterThankYouCents: number;
  revisionRounds: 3;
};

/** The only purchase kind a customer may start a new checkout with. */
export const CANONICAL_CHECKOUT_PURCHASE_KIND = "condensed_offer" as const;

/** Where a customer goes when they reach a superseded commerce surface. */
export const CANONICAL_LAUNCH_DOOR_HREF = "/" as const;

/** Conversation Room steps that belong to the older shelf flow. */
export const SUPERSEDED_ROOM_STAGES = ["route", "services", "plan", "checkout"] as const;

export function listCanonicalLaunchPackages(): readonly CanonicalLaunchPackage[] {
  const rows = STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packages;
  return LIVE_LAUNCH_PACKAGE_ORDER.map((packageId) => {
    const row = rows[packageId];
    const thankYou = studioThankYouAmount(row.priceCents);
    return {
      packageId,
      customerFacingName: row.name,
      priceDisplay: row.priceDisplay,
      listPriceCents: row.priceCents,
      amountDueAfterThankYouCents: thankYou.amountDueCents,
      revisionRounds: row.revisionRounds,
    };
  });
}

export function formatCanonicalUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

/** One customer sentence naming the current five-package menu. */
export function canonicalLaunchMenuSentence(): string {
  const packages = listCanonicalLaunchPackages();
  const items = packages.map((pkg) => `${pkg.customerFacingName} at ${pkg.priceDisplay}`);
  const list =
    items.length > 1
      ? `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
      : items.join("");
  return `The Studio currently offers ${packages.length} packages: ${list}.`;
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
