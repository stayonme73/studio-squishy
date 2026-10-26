import { LOCAL_VISIBILITY_V1_CAMPAIGN_ID } from "@/config/studio-ai-local-visibility-offer-definition-and-cert-v1";
import type { LocalVisibilityIntake } from "./facts";

export function northsideBikeIntake(
  extra?: Partial<LocalVisibilityIntake>,
): LocalVisibilityIntake {
  return {
    campaignId: LOCAL_VISIBILITY_V1_CAMPAIGN_ID,
    businessName: "Northside Bike Repair",
    city: "Richmond",
    address: "1840 Chamberlayne",
    phone: "555-0199",
    websiteUrl: "northsidebike.example",
    hours: "Tue-Sat 10-6",
    services: ["flat repair", "tune-up", "wheel true"],
    requiredDisclosure: "Walk-ins welcome.",
    ...extra,
  };
}
