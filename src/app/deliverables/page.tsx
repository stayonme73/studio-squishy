import { Suspense } from "react";



import DeliverablesScene from "@/components/deliverables/DeliverablesScene";

import { utilityPageFontClassName } from "@/lib/utility-page-fonts";



/** Final Delivery — campaign deliverables handoff (Phase 1). */

export default function DeliverablesPage() {

  return (

    <main

      className={`${utilityPageFontClassName} journey-shell flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-[var(--board-family-cream)]`}

    >

      <Suspense fallback={<div className="utility-page utility-shell utility-shell--loading" aria-busy="true" />}>

        <DeliverablesScene />

      </Suspense>

    </main>

  );

}

