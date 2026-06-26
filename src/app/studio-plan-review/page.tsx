import type { Metadata } from "next";

import StudioPlanReviewPageClient from "@/components/studio-plan-review/StudioPlanReviewPageClient";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import { STUDIO_PLAN_REVIEW_LABELS } from "@/studio-plan-review";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../discovery-summary.css";
import "../studio-plan-review.css";
import "../mobile-route-fixes.css";

export const metadata: Metadata = {
  title: "Studio Plan Review",
};

const PAGE_COPY = {
  title: STUDIO_PLAN_REVIEW_LABELS.recommendedPlan,
  lead: "Review and adjust your recommended Studio Services before payment.",
  backHref: "/business-discovery-studio",
} as const;

/** Studio Plan Review — customer adjusts services before checkout. */
export default function StudioPlanReviewPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <UtilityPageFrame navId="studio-board">
        <div className="utility-page" aria-label="Studio Plan Review">
          <UtilityPageHeader
            backHref={PAGE_COPY.backHref}
            activeNav="studio-board"
            title={PAGE_COPY.title}
            lead={PAGE_COPY.lead}
            helpCenterFrom="studio-board"
          />
          <StudioPlanReviewPageClient />
        </div>
      </UtilityPageFrame>
    </main>
  );
}
