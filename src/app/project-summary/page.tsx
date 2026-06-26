import type { Metadata } from "next";

import ProjectSummaryPageClient from "@/components/project-summary/ProjectSummaryPageClient";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import { PROJECT_SUMMARY_LABELS } from "@/project-summary";
import { studioBoard } from "@/config/studio-board";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../discovery-summary.css";
import "../studio-plan-review.css";
import "../mobile-route-fixes.css";

export const metadata: Metadata = {
  title: PROJECT_SUMMARY_LABELS.pageTitle,
};

/** Project Summary — bridge after Project Discovery before Studio Board. */
export default function ProjectSummaryPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <UtilityPageFrame navId="studio-board">
        <div className="utility-page" aria-label={PROJECT_SUMMARY_LABELS.pageTitle}>
          <UtilityPageHeader
            backHref={studioBoard.routes.projectDiscovery}
            activeNav="studio-board"
            title={PROJECT_SUMMARY_LABELS.pageTitle}
            lead={PROJECT_SUMMARY_LABELS.pageLead}
            helpCenterFrom="studio-board"
          />
          <ProjectSummaryPageClient />
        </div>
      </UtilityPageFrame>
    </main>
  );
}
