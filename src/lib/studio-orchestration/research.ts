/**
 * Reference research — principles and patterns, not copied artwork.
 * Optional. Invoked only when current context materially improves the work.
 */

import {
  CATEGORY_VISUAL_PRINCIPLES,
} from "@/lib/studio-project-alpha/reference-research";
import type { DesignIndustryFamily } from "@/lib/studio-design-intelligence/types";
import type { StudioJobType } from "@/config/studio-studio-wide-orchestration-v1";

export type ResearchNote = {
  jobType: StudioJobType;
  summary: string;
  principles: readonly string[];
  provenance: string;
  copiedArtwork: false;
};

export function researchForJob(input: {
  jobType: StudioJobType;
  industryFamily?: string;
  useful: boolean;
}): ResearchNote | null {
  if (!input.useful) return null;
  if (input.jobType === "motion_video") {
    return {
      jobType: "motion_video",
      summary:
        "Short promotional video commonly uses a fast hook, short shot duration, readable captions, and a decisive end-card CTA.",
      principles: ["Hook in opening seconds", "Shot duration", "Caption density", "End-card CTA"],
      provenance: "studio_reference_library",
      copiedArtwork: false,
    };
  }
  if (input.jobType === "form_document") {
    return {
      jobType: "form_document",
      summary:
        "Usable documents group related fields, keep a logical sequence, and remain readable in print and on a phone.",
      principles: ["Field grouping", "Logical sequence", "Readability", "Print/mobile usability"],
      provenance: "studio_reference_library",
      copiedArtwork: false,
    };
  }
  if (input.jobType === "copy") {
    return {
      jobType: "copy",
      summary: "Channel copy leads with the offer, stays fact-locked, and ends on one CTA.",
      principles: ["Offer first", "Fact lock", "One CTA", "Channel length"],
      provenance: "studio_copy_quality",
      copiedArtwork: false,
    };
  }
  const family = (input.industryFamily ?? "unknown") as DesignIndustryFamily;
  const visual =
    CATEGORY_VISUAL_PRINCIPLES[family] ?? CATEGORY_VISUAL_PRINCIPLES.unknown;
  return {
    jobType: "static_design",
    summary: visual.summary,
    principles: visual.principles,
    provenance: visual.source,
    copiedArtwork: false,
  };
}
