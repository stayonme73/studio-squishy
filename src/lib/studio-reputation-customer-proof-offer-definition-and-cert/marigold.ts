import { REPUTATION_PROOF_V1_CAMPAIGN_ID } from "@/config/studio-reputation-customer-proof-offer-definition-and-cert-v1";
import type { ReputationProofIntake } from "./rights";

const BASE_TESTIMONIAL = {
  reviewerDisplayName: "Dana P.",
  exactQuote: "They were gentle with my anxious rescue and she looked great after.",
  permissionConfirmed: true,
} as const;

export function marigoldGroomingIntake(
  extra?: Partial<ReputationProofIntake>,
): ReputationProofIntake {
  return {
    campaignId: REPUTATION_PROOF_V1_CAMPAIGN_ID,
    businessName: "Marigold Grooming",
    reviewDestinationUrl: "https://reviews.example/marigold",
    cta: "Leave a review",
    rightsConfirmed: true,
    requiredDisclaimer: "Reviews are voluntary.",
    ...extra,
    testimonial: {
      ...BASE_TESTIMONIAL,
      ...extra?.testimonial,
    },
  };
}
