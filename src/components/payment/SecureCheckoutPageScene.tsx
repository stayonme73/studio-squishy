"use client";

import Link from "next/link";
import { useMemo } from "react";

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import RouteMapLobbyBackdrop from "@/components/route-map/RouteMapLobbyBackdrop";
import type { ApprovalAcknowledgment } from "@/config/studio-board";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { buildPaymentPlanSummary } from "@/lib/payment-plan-summary";
import { readProjectSummaryPlanDraft } from "@/lib/project-summary-plan-draft";
import { readCurrentCampaignHydrated, saveApprovedStudioPlan } from "@/lib/studio-board-campaign";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

type Props = {
  packageId: StudioGuidePackageId;
  backHref: string;
  backLabel: string;
};

/** Secure Checkout — full-viewport three-column pay sheet (Route Map checkout parity). */
export default function SecureCheckoutPageScene({ packageId, backHref, backLabel }: Props) {
  const planSummary = useMemo(() => buildPaymentPlanSummary(), []);

  function handleBeforePayment(acknowledgment: ApprovalAcknowledgment): boolean {
    const campaign = readCurrentCampaignHydrated();
    const draft = readProjectSummaryPlanDraft(campaign?.campaignId);
    const selectedServiceIds =
      draft?.selectedServiceIds ?? campaign?.approvedStudioPlan?.selectedServiceIds ?? [];
    if (selectedServiceIds.length === 0) return false;
    return saveApprovedStudioPlan(selectedServiceIds, acknowledgment) !== null;
  }

  return (
    <div
      className={`route-map-page route-map-page--immersive payment-secure-checkout-page ${utilityPageFontClassName}`}
    >
      <div className="route-map-scene-body">
        <RouteMapLobbyBackdrop />
        <div className="route-map-world route-map-world--checkout-standalone">
          <div className="route-map-world__sheet route-map-world__sheet--checkout">
            <Link href={backHref} className="route-map-back-link">
              {backLabel}
            </Link>
            <div className="route-map-overlay-workspace route-map-overlay-workspace--checkout">
              <SecureCheckoutGrid
                layout="full"
                packageId={packageId}
                planSummary={planSummary}
                onBeforePayment={handleBeforePayment}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
