/**
 * Room 4C Scenario 2 — pre-acceptance truth (Gate A).
 */

import { studioRoom4cMultiServiceClientGauntletV1 } from "@/config/studio-room-4c-multi-service-client-gauntlet-v1";
import { studioRoom4cScenario2HarborRoastV1 as brief } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";
import { evaluateCarouselAdmission } from "@/lib/studio-room-4b-launch-toolbox/admission";

export const SCENARIO_2_LAUNCH_NOW_SERVICES = [
  "social-graphics",
  "short-form-video",
  "marketing-copy-email",
  "print-collateral",
  "campaign-creative",
] as const;

export type Scenario2AcceptanceResult = {
  admit: boolean;
  menuOk: boolean;
  unsupportedRefused: readonly string[];
  disclosedLimits: readonly string[];
  carousel: ReturnType<typeof evaluateCarouselAdmission>;
  findings: readonly string[];
};

const FROZEN = studioRoom4cMultiServiceClientGauntletV1.frozenLaunchNowServices;

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

export function evaluateScenario2Acceptance(input?: {
  askedForCarousel?: boolean;
  askedForAdOps?: boolean;
  askedForUnsupportedSize?: boolean;
}): Scenario2AcceptanceResult {
  const findings: string[] = [];
  const requested = brief.requestedDeliverables.map((d) => d.launchNowService);
  const menuOk = requested.every((s) => serviceOnMenu(s));
  if (!menuOk) findings.push("requested_service_not_on_launch_now_menu");

  const carousel = evaluateCarouselAdmission();
  const unsupportedRefused: string[] = [];
  unsupportedRefused.push("carousel");
  if (carousel.admit !== false) {
    findings.push("carousel_must_remain_refused");
  }
  unsupportedRefused.push("ad_account_ops");
  unsupportedRefused.push("unsupported_sizes_outside_studio_contracts");
  if (input?.askedForCarousel === false) {
    /* still refuse carousel — it is not on the Launch Now menu */
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
    `Product URL: ${brief.cta.bookingUrl}.`,
    `Support email: ${brief.cta.supportEmail}.`,
    `Box contents: ${brief.offer.contentsDisplay}. Product name does not substitute for contents.`,
    "Fictional customer. Production facts are OWNER_APPROVED_FOR_CERTIFICATION from the locked package brief.",
    "Studio-produced campaign photography — not customer-supplied photos.",
    "Video narration uses ElevenLabs as a production tool for the short-video SKU; a standalone voice SKU was not sold.",
    "Customer prints and posts; Studio does not run ads, targeting, or social accounts.",
    "Counter card is 5×7 in (1500×2100 px at 300 DPI; PDF 360×504 pt). Not a US Letter rewrite.",
    "Independent AI voice-naturalness judgment is not yet certified. Customer listening approval remains required.",
    "Choppy or robotic Studio narration is a Studio defect. It is corrected at no charge and does not consume revision allowance.",
  ];

  return {
    admit: menuOk && findings.length === 0,
    menuOk,
    unsupportedRefused,
    disclosedLimits,
    carousel,
    findings,
  };
}
