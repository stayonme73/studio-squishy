"use client";

/**
 * @archived Complete Your Order — three-column payment page (journey v1).
 * Active `/payment` re-exports via `src/components/payment/PaymentCheckoutScene.tsx`.
 * Shared grid: `src/components/payment/SecureCheckoutGrid.tsx`
 * @see docs/customer-journey-v1-locked.md
 */

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import { payment } from "@/config/payment";
import type { StudioGuidePackageId } from "@/config/studio-guide";

type Props = {
  packageId: StudioGuidePackageId;
  fromPrototype?: boolean;
};

/** Archived three-panel checkout — Studio Plan approved, payment to begin project. */
export default function CompleteYourOrderCheckoutScene({ packageId }: Props) {
  return (
    <div className="utility-page payment-page" aria-label={payment.pageTitle}>
      <SecureCheckoutGrid packageId={packageId} />
    </div>
  );
}
