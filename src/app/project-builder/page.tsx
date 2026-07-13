import { Suspense } from "react";

import ProjectBuilderScene from "@/components/project-builder/ProjectBuilderScene";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";
import "../studio-utility-backdrop.css";
import "./project-builder.css";

/** Build Your Project — deliverable selection and running project summary. */
export default function ProjectBuilderPage() {
  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}
    >
      <Suspense fallback={<div className="pb-scene pb-scene--loading" aria-busy="true" />}>
        <ProjectBuilderScene />
      </Suspense>
    </main>
  );
}
