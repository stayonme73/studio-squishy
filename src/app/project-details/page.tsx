import type { Metadata } from "next";
import { Suspense } from "react";

import ProjectDetailsWorkspace from "@/components/project-details/ProjectDetailsWorkspace";
import { projectDetails } from "@/config/project-details";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../project-summary.css";
import "../payment.css";
import "../mobile-route-fixes.css";
import "./project-details.css";

export const metadata: Metadata = {
  title: projectDetails.pageTitle,
};

/** Post-payment Project Details — green services intake after Secure Checkout. */
export default function ProjectDetailsPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden`}
    >
      <Suspense fallback={null}>
        <ProjectDetailsWorkspace />
      </Suspense>
    </main>
  );
}
