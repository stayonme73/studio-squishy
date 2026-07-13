import { Suspense } from "react";

import CheckoutScene from "@/components/checkout/CheckoutScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";
import "../payment.css";
import "../studio-utility-backdrop.css";
import "./checkout.css";

/** Secure Checkout — certified customer-facing payment room. */
export default function CheckoutPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <Suspense fallback={<div className="co-scene co-scene--loading" aria-busy="true" />}>
        <CheckoutScene />
      </Suspense>
    </main>
  );
}
