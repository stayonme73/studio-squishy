import { Suspense } from "react";

import FeedbackStudioScene from "@/components/feedback-studio/FeedbackStudioScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

/** Feedback Studio — concept review workspace. */
export default function FeedbackStudioPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex h-[100dvh] max-h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <Suspense
        fallback={
          <div className="fs-page utility-page" aria-busy="true">
            <div className="utility-shell utility-shell--loading" />
          </div>
        }
      >
        <FeedbackStudioScene />
      </Suspense>
    </main>
  );
}
