import PaymentCheckoutScene from "@/components/payment/PaymentCheckoutScene";
import { payment, parsePaymentPackageId } from "@/config/payment";
import { studioBoard } from "@/config/studio-board";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";
import "../route-map/route-map.css";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Secure Checkout — full-viewport pay sheet; `/payment` direct links. */
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

  const backLabel = fromStudioPlanReview
    ? "← Back to Project Summary"
    : fromPrototype
      ? "← Back to Studio Guide"
      : "← Back to Studio Guide";

  return (
    <main
      className={`route-map-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden ${utilityPageFontClassName}`}
    >
      <PaymentCheckoutScene packageId={packageId} backHref={backHref} backLabel={backLabel} />
    </main>
  );
}
