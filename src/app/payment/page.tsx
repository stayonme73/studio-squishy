import PaymentCheckoutScene from "@/components/payment/PaymentCheckoutScene";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import { payment, parsePaymentPackageId } from "@/config/payment";
import { studioBoard } from "@/config/studio-board";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Secure Checkout — Studio Plan payment; three-column pinboard layout. */
export default async function PaymentPage({ searchParams }: Props) {
  const params = await searchParams;
  const packageId = parsePaymentPackageId(params) ?? ("spark" as StudioGuidePackageId);
  const fromPrototype = params.from === "prototype";
  const fromStudioPlanReview = params.from === "studio-plan-review";

  const backHref = fromStudioPlanReview
    ? studioBoard.routes.projectSummary
    : fromPrototype
      ? payment.routes.studioGuidePrototype
      : payment.routes.studioGuide;

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden`}
    >
      <div className="studio-utility-scene studio-utility-scene--header-band">
        <div className="studio-utility-header-band payment-header-band">
          <UtilityPageHeader
            backHref={backHref}
            activeNav="payment"
            title={payment.pageTitle}
            leadLines={payment.pageLeadLines}
            helpCenterFrom="payment"
          />
        </div>
        <div className="studio-utility-scene__body">
          <StudioUtilityBackdrop placement="below-header" />
          <div className="studio-utility-scene__content">
            <PaymentCheckoutScene packageId={packageId} fromPrototype={fromPrototype} />
          </div>
        </div>
      </div>
    </main>
  );
}
