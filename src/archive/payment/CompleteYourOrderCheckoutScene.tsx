"use client";

/**
 * @archived Complete Your Order — three-column payment page (journey v1).
 * Active `/payment` re-exports via `src/components/payment/PaymentCheckoutScene.tsx`.
 * Shared grid: `src/components/payment/SecureCheckoutGrid.tsx`
 * @see docs/customer-journey-v1-locked.md
 */

import { useMemo } from "react";

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import { payment } from "@/config/payment";
import type { ApprovalAcknowledgment } from "@/config/studio-board";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { buildPaymentPlanSummary } from "@/lib/payment-plan-summary";
import { readProjectSummaryPlanDraft } from "@/lib/project-summary-plan-draft";
import { readCurrentCampaignHydrated, saveApprovedStudioPlan } from "@/lib/studio-board-campaign";

type Props = {
  packageId: StudioGuidePackageId;
  fromPrototype?: boolean;
};

/** Archived three-panel checkout — reads the same pre-payment plan draft as Project Summary. */
export default function CompleteYourOrderCheckoutScene({ packageId }: Props) {
  const planSummary = useMemo(() => buildPaymentPlanSummary(), []);

  function handleBeforePayment(acknowledgment: ApprovalAcknowledgment): boolean {
    const campaign = readCurrentCampaignHydrated();
    const draft = readProjectSummaryPlanDraft(campaign?.campaignId);
    const selectedServiceIds =
      draft?.selectedServiceIds ??
      campaign?.approvedStudioPlan?.selectedServiceIds ??
      [];
    if (selectedServiceIds.length === 0) return false;
    return saveApprovedStudioPlan(selectedServiceIds, acknowledgment) !== null;
  }

  return (
    <div className="utility-page payment-page" aria-label={payment.pageTitle}>
      <SecureCheckoutGrid packageId={packageId} planSummary={planSummary} onBeforePayment={handleBeforePayment} />
    </div>
  );
}
