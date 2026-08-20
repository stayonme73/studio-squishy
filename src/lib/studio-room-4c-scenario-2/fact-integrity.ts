/**
 * Scenario 2 fact integrity.
 *
 * Harbor Roast production facts come from the locked package brief and this
 * approved record. Do not invent a shop URL, contact email, phone, origin,
 * weight, or tasting notes. Generic-gate Harbor Roast test fixtures are not
 * production facts.
 */

import { studioRoom4cScenario2HarborRoastV1 as brief } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";
import {
  assertCustomerFactSourceGate,
  assertProductionRoutingAllowed,
  type ApprovedCustomerFactRecord,
  type CanonicalCustomerFacts,
} from "@/lib/studio-customer-facts";

/** Generic-gate test doubles — must never appear in Scenario 2 production. */
export const SCENARIO_2_STALE_PHONE = "(804) 555-0100";
export const SCENARIO_2_STALE_BOOKING_URL = "harborroast.example/book";
export const SCENARIO_2_STALE_EMAIL = "hello@harborroast.example";

export const SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD: ApprovedCustomerFactRecord =
  {
    approvalStatus: "OWNER_APPROVED_FOR_CERTIFICATION",
    values: {
      offerName: "Autumn Single-Origin Box",
      datesDisplay: "October 1 – October 31, 2026",
      priceDisplay: "$48",
      contentsDisplay: "Autumn Single-Origin Box",
      cta: "Limited autumn box",
      businessName: "Harbor Roast Coffee Co.",
    },
    requiredFactIds: [
      "offerName",
      "datesDisplay",
      "priceDisplay",
      "contentsDisplay",
      "cta",
      "businessName",
    ],
    forbiddenExact: [
      SCENARIO_2_STALE_PHONE,
      SCENARIO_2_STALE_BOOKING_URL,
      SCENARIO_2_STALE_EMAIL,
    ],
    unapprovedClaimPatterns: [
      "best coffee",
      "award-winning",
      "ethiopian",
      "colombian",
      "tasting notes",
    ],
  };

export function scenario2CanonicalCustomerFacts(): CanonicalCustomerFacts {
  return {
    values: {
      offerName: brief.offer.name,
      datesDisplay: brief.offer.windowDisplay,
      priceDisplay: brief.offer.priceDisplay,
      contentsDisplay: brief.offer.contentsDisplay,
      cta: brief.cta.label,
      businessName: brief.customer.businessName,
      bookingContact: brief.facts.bookingContact,
      bookingUrl: "",
      phoneDisplay: "",
      emailDisplay: "",
    },
    forbiddenExact: SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD.forbiddenExact,
  };
}

export function staleScenario2FactHits(text: string): string[] {
  const hits: string[] = [];
  if (text.includes(SCENARIO_2_STALE_PHONE)) hits.push("stale-phone-0100");
  if (text.includes(SCENARIO_2_STALE_BOOKING_URL)) {
    hits.push("stale-url-book");
  }
  if (text.toLowerCase().includes(SCENARIO_2_STALE_EMAIL)) {
    hits.push("stale-email");
  }
  if (/harborroast\.example/i.test(text)) hits.push("invented-example-host");
  return hits;
}

export function scenario2ProductionRoutingInput() {
  return {
    approvedRecord: SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario2CanonicalCustomerFacts().values,
  };
}

export function assertScenario2ProductionRoutingAllowed(): void {
  assertProductionRoutingAllowed(scenario2ProductionRoutingInput());
}

export function assertExactCanonicalLaunchFacts(
  label: string,
  text: string,
): void {
  assertCustomerFactSourceGate({
    approvedRecord: SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario2CanonicalCustomerFacts().values,
    sources: [
      {
        sourceId: label,
        text,
        requireExact: [
          "offerName",
          "datesDisplay",
          "priceDisplay",
          "contentsDisplay",
          "cta",
          "businessName",
        ],
      },
    ],
  });
}
