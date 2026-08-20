/**
 * Room 4C Scenario 1 — pre-acceptance truth (Gate A).
 */

import { studioRoom4cMultiServiceClientGauntletV1 } from "@/config/studio-room-4c-multi-service-client-gauntlet-v1";
import { studioRoom4cScenario1CedarLaneV1 as brief } from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";
import { evaluateCarouselAdmission } from "@/lib/studio-room-4b-launch-toolbox/admission";

export const SCENARIO_1_LAUNCH_NOW_SERVICES = [
  "social-graphics",
  "short-form-video",
  "marketing-copy-email",
  "print-collateral",
  "campaign-creative",
] as const;

export type Scenario1AcceptanceResult = {
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

export function evaluateScenario1Acceptance(input?: {
  askedForCarousel?: boolean;
  askedForAdOps?: boolean;
  askedForUnsupportedSize?: boolean;
}): Scenario1AcceptanceResult {
  const findings: string[] = [];
  const requested = brief.requestedDeliverables.map((d) => d.launchNowService);
  const menuOk = requested.every((s) => serviceOnMenu(s));
  if (!menuOk) findings.push("requested_service_not_on_launch_now_menu");

  const carousel = evaluateCarouselAdmission();
  const unsupportedRefused: string[] = [];
  if (input?.askedForCarousel !== false) {
    unsupportedRefused.push("carousel");
    if (carousel.admit !== false) {
      findings.push("carousel_must_remain_refused");
    }
  }
  if (input?.askedForAdOps) {
    unsupportedRefused.push("ad_account_ops");
  } else {
    unsupportedRefused.push("ad_account_ops");
  }
  if (input?.askedForUnsupportedSize) {
    unsupportedRefused.push("unsupported_sizes_outside_studio_contracts");
  } else {
    unsupportedRefused.push("unsupported_sizes_outside_studio_contracts");
  }

  const disclosedLimits = [
    `Short-form video: ${FROZEN.shortFormVideo}`,
    `Social graphics: ${FROZEN.socialGraphics}`,
    `Print collateral: ${FROZEN.printCollateral}`,
    `Marketing copy / email: ${FROZEN.marketingCopyEmail}`,
    `Campaign creative: ${FROZEN.campaignCreative}`,
    `Carousel: ${FROZEN.carousel}`,
    "No owner production labor. Owner creative review is approval, not production.",
    "No price was supplied; none is shown.",
    "Fictional customer; certification phone and booking URL (OWNER_APPROVED_FOR_CERTIFICATION). Not customer-provided real-world facts.",
    "Studio-produced campaign photography — not customer-supplied photos.",
    "Video narration uses ElevenLabs as a production tool for the short-video SKU; a standalone voice SKU was not sold.",
    "Customer prints and posts; Studio does not run ads, targeting, or social accounts.",
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
