import { studioExtrasExplainer } from "@/config/studio-extras-v1";
import {
  formatCanonicalUsd,
  listCanonicalLaunchPackages,
} from "@/lib/studio-canonical-menu-enforcement/enforcement";

import { STUDIO_VOICE_AFTER_PAYMENT, studioVoiceDeskFacts } from "./customer-guidance";

export type StudioVoicePackageFact = {
  packageId: string;
  name: string;
  listCents: number;
  dueCents: number;
  listDisplay: string;
  dueDisplay: string;
  revisionRounds: number;
};

/**
 * Prices and rules Voice is allowed to say.
 * Built from the canonical launch menu. No customer record is included.
 */
export type StudioVoiceFactsCard = {
  source: "canonical_launch_menu";
  thankYouPercent: 20;
  noDeliveryDate: true;
  filesAfterCheckout: true;
  productionRequiresAcceptance: true;
  revisionRounds: 3;
  extrasIncludedAtNoExtraCharge: true;
  noPerformanceGuarantee: true;
  refundDecision: "owner_only";
  packages: StudioVoicePackageFact[];
  extrasSummary: string;
  nextStep: string;
  deskGuidance: ReturnType<typeof studioVoiceDeskFacts>;
};

export function buildStudioVoiceFactsCard(): StudioVoiceFactsCard {
  const packages = listCanonicalLaunchPackages().map((row) => ({
    packageId: row.packageId,
    name: row.customerFacingName,
    listCents: row.listPriceCents,
    dueCents: row.amountDueAfterThankYouCents,
    listDisplay: row.priceDisplay,
    dueDisplay: formatCanonicalUsd(row.amountDueAfterThankYouCents),
    revisionRounds: row.revisionRounds,
  }));

  return {
    source: "canonical_launch_menu",
    thankYouPercent: 20,
    noDeliveryDate: true,
    filesAfterCheckout: true,
    productionRequiresAcceptance: true,
    revisionRounds: 3,
    extrasIncludedAtNoExtraCharge: true,
    noPerformanceGuarantee: true,
    refundDecision: "owner_only",
    packages,
    extrasSummary: studioExtrasExplainer().whatYouCanAdd,
    nextStep: STUDIO_VOICE_AFTER_PAYMENT,
    deskGuidance: studioVoiceDeskFacts(),
  };
}

export function packageFact(
  card: StudioVoiceFactsCard,
  packageId: string,
): StudioVoicePackageFact | undefined {
  return card.packages.find((row) => row.packageId === packageId);
}
