/**
 * Scenario 1 fact integrity.
 *
 * Cedar Lane phone and booking URL are OWNER_APPROVED_FOR_CERTIFICATION
 * fictional certification facts. They are not customer-provided real-world facts.
 * Do not derive these values from the hashed brief — that closed loop is what
 * let invented contact reach artwork.
 */

import { studioRoom4cScenario1CedarLaneV1 as brief } from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";
import {
  assertCustomerFactSourceGate,
  assertProductionRoutingAllowed,
  type ApprovedCustomerFactRecord,
  type CanonicalCustomerFacts,
} from "@/lib/studio-customer-facts";

/** Known invented values from the first Scout brief — must not reappear. */
export const SCENARIO_1_STALE_PHONE = "(804) 555-0172";
export const SCENARIO_1_STALE_BOOKING_URL =
  "cedarlaneorganizing.example/fall-reset";
export const SCENARIO_1_STALE_PHONE_SPOKEN = "zero one seven two";

const CERTIFICATION_PHONE = "(804) 555-0147";
const CERTIFICATION_BOOKING_URL = "cedarlaneorganizing.example/book";

export const SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD: ApprovedCustomerFactRecord =
  {
    approvalStatus: "OWNER_APPROVED_FOR_CERTIFICATION",
    values: {
      phoneDisplay: CERTIFICATION_PHONE,
      bookingUrl: CERTIFICATION_BOOKING_URL,
      bookingContact: `${CERTIFICATION_PHONE} · ${CERTIFICATION_BOOKING_URL}`,
    },
    requiredFactIds: ["phoneDisplay", "bookingUrl"],
    forbiddenExact: [
      SCENARIO_1_STALE_PHONE,
      SCENARIO_1_STALE_BOOKING_URL,
      SCENARIO_1_STALE_PHONE_SPOKEN,
    ],
  };

/** Certification contact values from the approved record. Not brief-derived. */
export const SCENARIO_1_OWNER_LOCKED_FACTS = {
  phoneDisplay: CERTIFICATION_PHONE,
  bookingUrl: CERTIFICATION_BOOKING_URL,
} as const;

export function scenario1CanonicalPhone(): string {
  return brief.cta.phoneDisplay;
}

export function scenario1CanonicalBookingUrl(): string {
  return brief.cta.bookingUrl;
}

export function scenario1CanonicalBookingContact(): string {
  return brief.facts.bookingContact;
}

export function scenario1CanonicalCustomerFacts(): CanonicalCustomerFacts {
  return {
    values: {
      phoneDisplay: brief.cta.phoneDisplay,
      bookingUrl: brief.cta.bookingUrl,
      bookingContact: brief.facts.bookingContact,
      offerName: brief.offer.name,
      datesDisplay: brief.offer.windowDisplay,
      cta: brief.cta.label,
      businessName: brief.customer.businessName,
    },
    forbiddenExact: SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD.forbiddenExact,
  };
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

export function scenario1ProductionRoutingInput() {
  return {
    approvedRecord: SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario1CanonicalCustomerFacts().values,
  };
}

export function assertScenario1ProductionRoutingAllowed(): void {
  assertProductionRoutingAllowed(scenario1ProductionRoutingInput());
}

export function assertExactCanonicalContactFacts(
  label: string,
  text: string,
): void {
  assertCustomerFactSourceGate({
    approvedRecord: SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario1CanonicalCustomerFacts().values,
    sources: [
      {
        sourceId: label,
        text,
        requireExact: ["phoneDisplay", "bookingUrl"],
      },
    ],
  });
}
