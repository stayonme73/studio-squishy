import { Suspense } from "react";



import ReviewRoomScene from "@/components/review-room/ReviewRoomScene";

import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";



/** Review Room — campaign concept selection (Phase 1). */

export default function ReviewRoomPage() {

  return (

    <main

      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--board-family-cream)]`}

    >

      <Suspense fallback={<div className="utility-page utility-shell utility-shell--loading" aria-busy="true" />}>

        <ReviewRoomScene />

      </Suspense>

    </main>

  );

}

