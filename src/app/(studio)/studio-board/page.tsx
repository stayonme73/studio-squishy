import { Suspense } from "react";

import { studioBuildManrope } from "@/fonts/studio-build-manrope";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import StudioBoardScene from "@/components/studio-board/StudioBoardScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../../studio-board.css";
import "../../studio-visual-system-three-screen-proof.css";
import "../../studio-customer-last-paint.css";

export const dynamic = "force-dynamic";

/** Studio Board — campaign status check-in. */
export default function StudioBoardPage() {
  return (
    <main
      className={`${studioBuildManrope.variable} ${studioBuildManrope.className} ${utilityPageFontClassName} journey-shell flex min-h-[100dvh] min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto`}
      data-mobile-customer-spine=""
      data-visual-proof="board"
    >
      <style>{`
        html:has(.studio-environment-app) .studio-environment-app [data-visual-proof="board"] .sb--v4 .sb-card.bf-material-paper:not(.sb-more__body .sb-card):not(.owner-qa):not(.owner-qa *) {
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
        }
        html:has(.studio-environment-app) .studio-environment-app [data-visual-proof="board"] .sb--v4 .sb-more__body .sb-card.bf-material-paper:not(.owner-qa):not(.owner-qa *) {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        @media (prefers-reduced-motion: reduce) {
          html:has(.studio-environment-app) .studio-environment-app [data-visual-proof="board"] .sb--v4 .sb-card.bf-material-paper:not(.owner-qa):not(.owner-qa *) {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        }
      `}</style>
      <div className="studio-utility-scene studio-utility-scene--studio-board flex min-h-0 flex-1 flex-col overflow-hidden">
        <StudioUtilityBackdrop />
        <div className="studio-utility-scene__content">
          <Suspense>
            <StudioBoardScene />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
