import { Suspense } from "react";

import CampaignDetailsScene from "@/components/campaign-details/CampaignDetailsScene";

/** Project Record — the customer's post-purchase home for managing a paid project. */
export default function CampaignDetailsPage() {
  return (
    <div data-mobile-customer-spine="" className="flex min-h-[100dvh] flex-1 flex-col">
      <Suspense>
        <CampaignDetailsScene />
      </Suspense>
    </div>
  );
}

