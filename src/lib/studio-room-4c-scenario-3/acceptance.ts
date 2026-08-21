/**
 * Room 4C Scenario 3 — pre-acceptance truth (Gate A) before production.
 */

import { studioRoom4cMultiServiceClientGauntletV1 } from "@/config/studio-room-4c-multi-service-client-gauntlet-v1";
import { studioRoom4cScenario3MossAndThreadV1 as brief } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";
import { evaluateCarouselAdmission } from "@/lib/studio-room-4b-launch-toolbox/admission";
import { evaluateProductionRoutingEligibility } from "@/lib/studio-customer-facts";

import { evaluateScenario3CustomerFactSourceGate } from "./customer-fact-sources";
import { scenario3ProductionRoutingInput } from "./fact-integrity";
import { evaluateScenario3PhotoPackIngest } from "./photo-pack-ingest";
import { scenario3ProductionAuthorizedByOwner } from "./production-authorization";

export const SCENARIO_3_LAUNCH_NOW_SERVICES = [
  "campaign-creative",
  "short-form-video",
  "marketing-copy-email",
  "print-collateral",
] as const;

export type Scenario3AcceptanceResult = {
  admit: boolean;
  productionMayStart: boolean;
  menuOk: boolean;
  factsApproved: boolean;
  factSourceGateOk: boolean;
  productionRoutingAllowed: boolean;
  photoRightsOk: boolean;
  ownerVerificationPending: boolean;
  productionAuthorized: boolean;
  unsupportedRefused: readonly string[];
  disclosedLimits: readonly string[];
  carousel: ReturnType<typeof evaluateCarouselAdmission>;
  findings: readonly string[];
};

const FROZEN = studioRoom4cMultiServiceClientGauntletV1.frozenLaunchNowServices;
const CERTIFICATION_NOTE = brief.certificationStatus;

function serviceOnMenu(service: string): boolean {
  if (service === "carousel") return FROZEN.carousel !== "NOT ON LAUNCH MENU";
  if (service === "social-graphics")
    return FROZEN.socialGraphics !== "NOT ON LAUNCH MENU";
  if (service === "short-form-video")
    return FROZEN.shortFormVideo !== "NOT ON LAUNCH MENU";
  if (service === "marketing-copy-email")
    return FROZEN.marketingCopyEmail !== "NOT ON LAUNCH MENU";
  if (service === "print-collateral")
    return FROZEN.printCollateral !== "NOT ON LAUNCH MENU";
  if (service === "campaign-creative")
    return FROZEN.campaignCreative !== "NOT ON LAUNCH MENU";
  return false;
}

export function evaluateScenario3Acceptance(): Scenario3AcceptanceResult {
  const findings: string[] = [];
  const requested = brief.requestedDeliverables.map((d) => d.launchNowService);
  const menuOk = requested.every((s) => serviceOnMenu(s));
  if (!menuOk) findings.push("requested_service_not_on_launch_now_menu");

  const carousel = evaluateCarouselAdmission();
  if (carousel.admit !== false) findings.push("carousel_must_remain_refused");

  const factsApproved =
    brief.factApprovalStatus === "OWNER_APPROVED_FOR_CERTIFICATION";
  if (!factsApproved) findings.push("facts_not_owner_approved");

  const routing = evaluateProductionRoutingEligibility(
    scenario3ProductionRoutingInput(),
  );
  if (!routing.routingAllowed) findings.push("production_routing_blocked");

  const factSource = evaluateScenario3CustomerFactSourceGate();
  if (!factSource.ok) findings.push("customer_fact_source_gate_failed");

  const photoPack = evaluateScenario3PhotoPackIngest();
  if (!photoPack.ok) findings.push("photo_pack_ingest_failed");

  const productionAuthorized = scenario3ProductionAuthorizedByOwner();
  if (!productionAuthorized) {
    findings.push("owner_production_authorization_missing");
  }

  /**
   * ownerVerificationPending on the frozen brief means post-delivery owner
   * review (listen / approve deliverables). It does not block production once
   * Tagia stamps production authorization.
   */
  if (brief.ownerVerificationPending && !productionAuthorized) {
    findings.push("owner_verification_pending");
  }

  const disclosedLimits = [
    `Short-form video: ${FROZEN.shortFormVideo}`,
    `Social graphics: ${FROZEN.socialGraphics}`,
    `Print collateral: ${FROZEN.printCollateral}`,
    `Marketing copy / email: ${FROZEN.marketingCopyEmail}`,
    `Campaign creative: ${FROZEN.campaignCreative}`,
    `Carousel: ${FROZEN.carousel}`,
    "No owner production labor. Owner creative review is approval, not production.",
    "No phone was owner-authorized; none is shown.",
    `Event URL: ${brief.cta.eventUrl}.`,
    `Support email: ${brief.cta.supportEmail}.`,
    CERTIFICATION_NOTE,
    "This certification photo pack is STUDIO_GENERATED_CERTIFICATION_FIXTURE. Do not label it CUSTOMER_PROVIDED or CUSTOMER_OWNS. External customer-photo path is not proven.",
    "Studio-generated certification fixtures must not be presented as a real customer's photographs.",
    "Do not invent product prices, discounts, demonstrations, workshops, refreshments, giveaways, limited quantities, custom-order availability, accessibility claims, parking, shipping, a phone number, or additional event activities.",
    "Print invitation/handout is US Letter 8.5×11 in (2550×3300 px at 300 DPI; PDF 612×792 pt).",
    "Independent AI voice-naturalness judgment is not yet certified. Customer listening approval remains required.",
  ];

  const admit = menuOk && factsApproved && routing.routingAllowed && factSource.ok;
  const productionMayStart =
    admit &&
    photoPack.ok &&
    productionAuthorized &&
    findings.length === 0;

  return {
    admit,
    productionMayStart,
    menuOk,
    factsApproved,
    factSourceGateOk: factSource.ok,
    productionRoutingAllowed: routing.routingAllowed,
    photoRightsOk: photoPack.ok,
    ownerVerificationPending: brief.ownerVerificationPending,
    productionAuthorized,
    unsupportedRefused: [
      "carousel",
      "ad_account_ops",
      "unsupported_sizes_outside_studio_contracts",
    ],
    disclosedLimits,
    carousel,
    findings,
  };
}
