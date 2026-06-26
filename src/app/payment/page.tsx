import PaymentCheckoutScene from "@/components/payment/PaymentCheckoutScene";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import { parsePaymentPackageId } from "@/config/payment";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Studio checkout — cream paper cards, continuation of the proposal screen. */
export default async function PaymentPage({ searchParams }: Props) {
  const params = await searchParams;
  const packageId = parsePaymentPackageId(params) ?? ("spark" as StudioGuidePackageId);
  const fromPrototype = params.from === "prototype";

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden`}
    >
      <div className="studio-utility-scene">
        <StudioUtilityBackdrop />
        <div className="studio-utility-scene__content">
          <PaymentCheckoutScene packageId={packageId} fromPrototype={fromPrototype} />
        </div>
      </div>
    </main>
  );
}
