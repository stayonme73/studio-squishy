import { Suspense } from "react";

import CampaignDetailsScene from "@/components/campaign-details/CampaignDetailsScene";

/** Project Record — the customer's post-purchase home for managing a paid project. */
export default function CampaignDetailsPage() {
  return (
    <Suspense>
      <CampaignDetailsScene />
    </Suspense>
  );
}
