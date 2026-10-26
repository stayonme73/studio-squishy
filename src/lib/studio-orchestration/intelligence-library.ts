/**
 * Persistent Studio-wide Creative Intelligence Library.
 * Supplies intelligence, not templates to copy.
 */

import { OWNER_QUALITY_DOCTRINE } from "@/lib/studio-project-alpha/calibration";
import { CATEGORY_VISUAL_PRINCIPLES } from "@/lib/studio-project-alpha/reference-research";
import { LAYOUT_ARCHETYPES, DESIGN_PALETTE_FAMILIES } from "@/lib/studio-design-intelligence/library";
import type { StudioJobType } from "@/config/studio-studio-wide-orchestration-v1";

export type IntelligenceRecord = {
  id: string;
  kind:
    | "owner_doctrine"
    | "accepted_work"
    | "rejected_work"
    | "industry_language"
    | "motion_principle"
    | "copy_principle"
    | "document_principle"
    | "anti_repetition"
    | "tool_routing"
    | "research_summary";
  media: readonly StudioJobType[] | readonly ["all"];
  summary: string;
  provenance: string;
};

export const CREATIVE_INTELLIGENCE_LIBRARY: readonly IntelligenceRecord[] = [
  ...OWNER_QUALITY_DOCTRINE.map((lesson) => ({
    id: `doctrine:${lesson.id}`,
    kind: "owner_doctrine" as const,
    media: ["all"] as const,
    summary: lesson.rule,
    provenance: "owner_calibration",
  })),
  {
    id: "doctrine:choose-for-me",
    kind: "owner_doctrine",
    media: ["all"],
    summary: "Customer should not need professional design terminology. Choose for me is valid.",
    provenance: "owner_calibration",
  },
  {
    id: "doctrine:strongest-tool",
    kind: "owner_doctrine",
    media: ["all"],
    summary: "Use the strongest appropriate production tool for the job, not the first tool wired.",
    provenance: "owner_calibration",
  },
  ...Object.values(CATEGORY_VISUAL_PRINCIPLES).map((entry) => ({
    id: `industry:${entry.industryFamily}`,
    kind: "industry_language" as const,
    media: ["static_design"] as const,
    summary: entry.summary,
    provenance: entry.source,
  })),
  {
    id: "motion:hook-first",
    kind: "motion_principle",
    media: ["motion_video"],
    summary:
      "Short promotional video must earn attention in the opening seconds. A technically valid but boring cut is a QA failure.",
    provenance: "studio_reference_library",
  },
  {
    id: "motion:caption-density",
    kind: "motion_principle",
    media: ["motion_video"],
    summary: "On-screen captions must stay readable at phone size. Dead time and awkward cuts fail.",
    provenance: "studio_reference_library",
  },
  {
    id: "copy:not-generic-ai",
    kind: "copy_principle",
    media: ["copy"],
    summary:
      "Copy must be fact-locked, channel-fit, and not sound like generic AI. Persuasion without invented claims.",
    provenance: "studio_copy_quality",
  },
  {
    id: "document:usable-over-pretty",
    kind: "document_principle",
    media: ["form_document"],
    summary:
      "A beautiful form that is confusing to complete fails. A plain but highly usable document may pass a different creative standard than advertising.",
    provenance: "studio_reference_library",
  },
  {
    id: "anti-copy:signatures",
    kind: "anti_repetition",
    media: ["static_design", "motion_video"],
    summary: "A new customer must not inherit a prior customer's visual signature unless the new brief independently calls for it.",
    provenance: "owner_calibration",
  },
  {
    id: "evidence:customer-one-v4",
    kind: "rejected_work",
    media: ["static_design"],
    summary: "Customer-One V4: Maya-like navy/gold centered plate. Studio correction evidence, not a customer revision.",
    provenance: "customer-one:v4",
  },
  {
    id: "evidence:customer-one-v7",
    kind: "rejected_work",
    media: ["static_design"],
    summary: "Customer-One V7: top-heavy copy huddle on a dark field. Phase-1 sparse/text-field failure.",
    provenance: "customer-one:v7",
  },
  {
    id: "evidence:customer-one-v12",
    kind: "accepted_work",
    media: ["static_design"],
    summary:
      "Customer-One V12: renderer-only correction with identity field, editorial sheet, CTA dock. Still not cinematic hybrid art. Revision unused.",
    provenance: "customer-one:v12",
  },
];

function recordMediaMatches(
  media: IntelligenceRecord["media"],
  jobType: StudioJobType,
): boolean {
  if (media[0] === "all") return true;
  for (const kind of media) {
    if (kind === jobType) return true;
  }
  return false;
}

export function libraryFor(jobType: StudioJobType): readonly IntelligenceRecord[] {
  return CREATIVE_INTELLIGENCE_LIBRARY.filter((record) =>
    recordMediaMatches(record.media, jobType),
  );
}

export function paletteFamiliesPresent(): number {
  return Object.keys(DESIGN_PALETTE_FAMILIES).length;
}

export function layoutGrammarsPresent(): number {
  return Object.keys(LAYOUT_ARCHETYPES).length;
}
