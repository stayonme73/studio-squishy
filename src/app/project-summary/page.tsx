import type { Metadata } from "next";

import ProjectSummaryPageClient from "@/components/project-summary/ProjectSummaryPageClient";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import { PROJECT_SUMMARY_LABELS } from "@/project-summary";
import { studioBoard } from "@/config/studio-board";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../discovery-summary.css";
import "../project-summary.css";
import "../studio-plan-review.css";
import "../mobile-route-fixes.css";

export const metadata: Metadata = {
  title: PROJECT_SUMMARY_LABELS.pageTitle,
};

/** Project Summary — bridge after Project Discovery before Studio Board. */
export default function ProjectSummaryPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden`}
    >
      <div className="studio-utility-scene studio-utility-scene--header-band">
        <div className="studio-utility-header-band project-summary-header-band">
          <UtilityPageHeader
            backHref={studioBoard.routes.projectDiscovery}
            activeNav="studio-board"
            title={PROJECT_SUMMARY_LABELS.pageTitle}
            leadLines={PROJECT_SUMMARY_LABELS.pageLeadLines}
            helpCenterFrom="studio-board"
          />
        </div>
        <div className="studio-utility-scene__body">
          <StudioUtilityBackdrop placement="below-header" />
          <div className="studio-utility-scene__content">
            <UtilityPageFrame navId="studio-board">
              <div
                className="utility-page project-summary-page"
                aria-label={PROJECT_SUMMARY_LABELS.pageTitle}
              >
                <ProjectSummaryPageClient />
              </div>
            </UtilityPageFrame>
          </div>
        </div>
      </div>
    </main>
  );
}
