import PaymentCheckoutScene from "@/components/payment/PaymentCheckoutScene";
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
      <PaymentCheckoutScene packageId={packageId} fromPrototype={fromPrototype} />
    </main>
  );
}
