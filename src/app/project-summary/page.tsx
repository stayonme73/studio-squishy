import type { Metadata } from "next";
import { Suspense } from "react";

import ProjectSummaryWorkspace from "@/components/project-summary/ProjectSummaryWorkspace";
import { PROJECT_SUMMARY_LABELS } from "@/project-summary";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../discovery-summary.css";
import "../project-summary.css";
import "../studio-plan-review.css";
import "../payment.css";
import "../mobile-route-fixes.css";

export const metadata: Metadata = {
  title: PROJECT_SUMMARY_LABELS.pageTitle,
};

/** Project Summary — bridge after Project Discovery; inline Secure Checkout after approve. */
export default function ProjectSummaryPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden`}
    >
      <Suspense fallback={null}>
        <ProjectSummaryWorkspace />
      </Suspense>
    </main>
  );
}
