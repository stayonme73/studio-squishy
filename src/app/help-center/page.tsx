import { Suspense } from "react";

import HelpCenterScene from "@/components/help-center/HelpCenterScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

/** Studio Help Center — philosophy, FAQ, and policies. */
export default function HelpCenterPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <Suspense fallback={<div className="utility-page utility-shell utility-shell--loading" aria-busy="true" />}>
        <HelpCenterScene />
      </Suspense>
    </main>
  );
}
