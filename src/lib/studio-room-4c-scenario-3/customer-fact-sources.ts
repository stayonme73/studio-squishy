/**
 * Scenario 3 collectors for the generic customer-fact source gate.
 *
 * Pre-production: the only source is the owner-stamped brief. Deliverable
 * copy is not generated until Tagia verifies this brief.
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
} from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";
import {
  assertCustomerFactSourceGate,
  evaluateCustomerFactSourceGate,
  type CustomerFactSource,
  type CustomerFactSourceGateResult,
} from "@/lib/studio-customer-facts";

import {
  SCENARIO_3_APPROVED_CUSTOMER_FACT_RECORD,
  scenario3CanonicalCustomerFacts,
} from "./fact-integrity";

export const SCENARIO_3_PRE_PRODUCTION_REQUIRED_FACTS = [
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
] as const;

/** Exact owner-stamped values. Not generated campaign copy. */
export function scenario3RequiredFactLockText(): string {
  return [
    MOSS_THREAD_AUTHORIZED_BUSINESS_NAME,
    MOSS_THREAD_AUTHORIZED_EVENT,
    MOSS_THREAD_AUTHORIZED_DATES,
    MOSS_THREAD_AUTHORIZED_LOCATION,
    MOSS_THREAD_AUTHORIZED_HOURS_DISPLAY,
    MOSS_THREAD_AUTHORIZED_CTA,
    MOSS_THREAD_AUTHORIZED_EVENT_URL,
    MOSS_THREAD_AUTHORIZED_EMAIL,
    MOSS_THREAD_AUTHORIZED_ADMISSION,
    MOSS_THREAD_AUTHORIZED_CLAIM,
  ].join("\n");
}

export function collectScenario3CustomerFactSources(): CustomerFactSource[] {
  return [
    {
      sourceId: "required-fact-lock",
      text: scenario3RequiredFactLockText(),
      requireExact: SCENARIO_3_PRE_PRODUCTION_REQUIRED_FACTS,
      forbidExact: ["phoneDisplay"],
    },
  ];
}

export function evaluateScenario3CustomerFactSourceGate(): CustomerFactSourceGateResult {
  return evaluateCustomerFactSourceGate({
    approvedRecord: SCENARIO_3_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario3CanonicalCustomerFacts().values,
    sources: collectScenario3CustomerFactSources(),
  });
}

export function assertScenario3CustomerFactSourceGate(): void {
  assertCustomerFactSourceGate({
    approvedRecord: SCENARIO_3_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario3CanonicalCustomerFacts().values,
    sources: collectScenario3CustomerFactSources(),
  });
}
