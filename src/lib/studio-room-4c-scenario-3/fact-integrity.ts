/**
 * Scenario 3 fact integrity.
 *
 * Moss & Thread production facts come from the owner-authorized fictional
 * certification record. Phone is not authorized. 214 Clay Street is stale.
 */

import {
  MOSS_THREAD_AUTHORIZED_ADMISSION,
  MOSS_THREAD_AUTHORIZED_BUSINESS_NAME,
  MOSS_THREAD_AUTHORIZED_CLAIM,
  MOSS_THREAD_AUTHORIZED_CTA,
  MOSS_THREAD_AUTHORIZED_DATES,
  MOSS_THREAD_AUTHORIZED_EMAIL,
  MOSS_THREAD_AUTHORIZED_EVENT,
  MOSS_THREAD_AUTHORIZED_EVENT_URL,
  MOSS_THREAD_AUTHORIZED_HOURS_DISPLAY,
  MOSS_THREAD_AUTHORIZED_LOCATION,
  studioRoom4cScenario3MossAndThreadV1 as brief,
} from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";
import {
  assertCustomerFactSourceGate,
  assertProductionRoutingAllowed,
  type ApprovedCustomerFactRecord,
  type CanonicalCustomerFacts,
} from "@/lib/studio-customer-facts";

export const SCENARIO_3_STALE_LOCATION = "214 Clay Street";
export const SCENARIO_3_STALE_PHONE = "(804) 555-0188";
export const SCENARIO_3_STALE_URL = "mossthread.example/visit";

export const SCENARIO_3_APPROVED_CUSTOMER_FACT_RECORD: ApprovedCustomerFactRecord =
  {
    approvalStatus: "OWNER_APPROVED_FOR_CERTIFICATION",
    values: {
      offerName: MOSS_THREAD_AUTHORIZED_EVENT,
      datesDisplay: MOSS_THREAD_AUTHORIZED_DATES,
      priceDisplay: MOSS_THREAD_AUTHORIZED_ADMISSION,
      contentsDisplay: MOSS_THREAD_AUTHORIZED_CLAIM,
      cta: MOSS_THREAD_AUTHORIZED_CTA,
      businessName: MOSS_THREAD_AUTHORIZED_BUSINESS_NAME,
      bookingUrl: MOSS_THREAD_AUTHORIZED_EVENT_URL,
      bookingContact: MOSS_THREAD_AUTHORIZED_EVENT_URL,
      emailDisplay: MOSS_THREAD_AUTHORIZED_EMAIL,
      locationDisplay: MOSS_THREAD_AUTHORIZED_LOCATION,
      hoursDisplay: MOSS_THREAD_AUTHORIZED_HOURS_DISPLAY,
    },
    requiredFactIds: [
      "offerName",
      "datesDisplay",
      "priceDisplay",
      "contentsDisplay",
      "cta",
      "businessName",
      "bookingUrl",
      "emailDisplay",
      "locationDisplay",
      "hoursDisplay",
    ],
    forbiddenExact: [
      SCENARIO_3_STALE_LOCATION,
      SCENARIO_3_STALE_PHONE,
      SCENARIO_3_STALE_URL,
    ],
    unapprovedClaimPatterns: [
      String.raw`\$\d`,
      "discount",
      "percent off",
      "workshop",
      "demonstration",
      "refreshment",
      "giveaway",
      String.raw`\blimited quantities\b`,
      String.raw`\blimited-time\b`,
      "custom.?order",
      "wheelchair",
      "accessible entrance",
      "parking",
      "shipping",
      String.raw`\bnia\b`,
      String.raw`\byoga\b`,
      "wellness studio",
    ],
  };

export function scenario3CanonicalCustomerFacts(): CanonicalCustomerFacts {
  return {
    values: {
      offerName: brief.offer.name,
      datesDisplay: brief.offer.windowDisplay,
      priceDisplay: brief.offer.admissionDisplay,
      contentsDisplay: brief.offer.visitorClaim,
      cta: brief.cta.label,
      businessName: brief.customer.businessName,
      bookingContact: brief.facts.bookingContact,
      bookingUrl: brief.cta.eventUrl,
      phoneDisplay: "",
      emailDisplay: brief.cta.supportEmail,
      locationDisplay: brief.customer.locationDisplay,
      hoursDisplay: brief.offer.hoursDisplay,
    },
    forbiddenExact: SCENARIO_3_APPROVED_CUSTOMER_FACT_RECORD.forbiddenExact,
  };
}

export function scenario3ProductionRoutingInput() {
  return {
    approvedRecord: SCENARIO_3_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario3CanonicalCustomerFacts().values,
  };
}

export function assertScenario3ProductionRoutingAllowed(): void {
  assertProductionRoutingAllowed(scenario3ProductionRoutingInput());
}

export function assertExactCanonicalLaunchFacts(
  label: string,
  text: string,
  requireExact: readonly (
    | "offerName"
    | "datesDisplay"
    | "priceDisplay"
    | "contentsDisplay"
    | "cta"
    | "businessName"
    | "bookingUrl"
    | "emailDisplay"
    | "locationDisplay"
    | "hoursDisplay"
  )[],
): void {
  assertCustomerFactSourceGate({
    approvedRecord: SCENARIO_3_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario3CanonicalCustomerFacts().values,
    sources: [
      {
        sourceId: label,
        text,
        requireExact,
      },
    ],
  });
}
