/**
 * Scenario 1 fact integrity — exact canonical contact must reach render sources.
 * Presence of "a phone" or "a URL" is not enough.
 */

import { studioRoom4cScenario1CedarLaneV1 as brief } from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";

/** Known invented values from the first Scout brief — must not reappear. */
export const SCENARIO_1_STALE_PHONE = "(804) 555-0172";
export const SCENARIO_1_STALE_BOOKING_URL =
  "cedarlaneorganizing.example/fall-reset";
export const SCENARIO_1_STALE_PHONE_SPOKEN = "zero one seven two";

export function scenario1CanonicalPhone(): string {
  return brief.cta.phoneDisplay;
}

export function scenario1CanonicalBookingUrl(): string {
  return brief.cta.bookingUrl;
}

export function scenario1CanonicalBookingContact(): string {
  return brief.facts.bookingContact;
}

export function staleScenario1FactHits(text: string): string[] {
  const hits: string[] = [];
  if (text.includes(SCENARIO_1_STALE_PHONE)) hits.push("stale-phone-0172");
  if (text.includes(SCENARIO_1_STALE_BOOKING_URL)) {
    hits.push("stale-url-fall-reset");
  }
  if (text.toLowerCase().includes(SCENARIO_1_STALE_PHONE_SPOKEN)) {
    hits.push("stale-spoken-phone");
  }
  return hits;
}

export function assertExactCanonicalContactFacts(
  label: string,
  text: string,
): void {
  const phone = scenario1CanonicalPhone();
  const url = scenario1CanonicalBookingUrl();
  if (phone !== "(804) 555-0147") {
    throw new Error(`CANONICAL_PHONE_DRIFT:${phone}`);
  }
  if (url !== "cedarlaneorganizing.example/book") {
    throw new Error(`CANONICAL_URL_DRIFT:${url}`);
  }
  if (!text.includes(phone)) {
    throw new Error(`MISSING_CANONICAL_PHONE:${label}`);
  }
  if (!text.includes(url)) {
    throw new Error(`MISSING_CANONICAL_URL:${label}`);
  }
  const stale = staleScenario1FactHits(text);
  if (stale.length > 0) {
    throw new Error(`STALE_FACTS:${label}:${stale.join(",")}`);
  }
}
