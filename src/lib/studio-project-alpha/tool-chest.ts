/**
 * Provider-independent Design Tool Chest — evaluate capabilities, do not
 * let one brand monopolize production. Findings are research, not a lock-in.
 */

import type { StudioProductionMethod } from "@/config/studio-project-alpha-v1";
import type { DesignCreativeBrief } from "@/lib/studio-design-intelligence/types";

export type ToolChestEntry = {
  id: string;
  category: string;
  role: string;
  apiControl: "strong" | "partial" | "weak" | "unknown";
  textFidelity: "exact" | "partial" | "unsafe_for_facts" | "n_a";
  licensing: "must_verify_per_job" | "studio_owned" | "unknown";
  lockIn: "low" | "medium" | "high";
  status: "active" | "evaluate" | "not_for_customer_text";
  notes: string;
};

export const DESIGN_TOOL_CHEST: readonly ToolChestEntry[] = [
  {
    id: "studio_html_css_renderer",
    category: "composition_renderer",
    role: "Exact typography, facts, menus, cards, text-heavy structure",
    apiControl: "strong",
    textFidelity: "exact",
    licensing: "studio_owned",
    lockIn: "low",
    status: "active",
    notes: "Deterministic facts. Not the entire Design Department.",
  },
  {
    id: "anthropic_claude",
    category: "creative_reasoning",
    role: "Route selection, Creative Director rationale, Studio Manager guidance",
    apiControl: "strong",
    textFidelity: "n_a",
    licensing: "must_verify_per_job",
    lockIn: "medium",
    status: "active",
    notes: "Already active for Design reasoning. Must not invent customer facts.",
  },
  {
    id: "openai_image_generation",
    category: "visual_generation",
    role: "Atmosphere, texture, illustration, campaign art without critical text",
    apiControl: "strong",
    textFidelity: "unsafe_for_facts",
    licensing: "must_verify_per_job",
    lockIn: "medium",
    status: "evaluate",
    notes: "Use as visual components. Overlay names, prices, dates, URLs, phones, legal copy in the renderer.",
  },
  {
    id: "openai_responses_vision",
    category: "creative_director",
    role: "Inspect rendered PNG + brief and return structured pass/reject",
    apiControl: "strong",
    textFidelity: "n_a",
    licensing: "must_verify_per_job",
    lockIn: "medium",
    status: "evaluate",
    notes: "Dedicated Studio Manager lane. Not Tagia's personal ChatGPT thread.",
  },
  {
    id: "shotstack",
    category: "video",
    role: "Programmatic video when the SKU is motion",
    apiControl: "strong",
    textFidelity: "partial",
    licensing: "must_verify_per_job",
    lockIn: "medium",
    status: "evaluate",
    notes: "Do not force flyer tooling into motion work.",
  },
  {
    id: "capcut",
    category: "video",
    role: "Social/video workflows where certified",
    apiControl: "unknown",
    textFidelity: "unsafe_for_facts",
    licensing: "must_verify_per_job",
    lockIn: "high",
    status: "evaluate",
    notes: "Only if automation quality and rights are proven. Not a flyer renderer substitute.",
  },
  {
    id: "canva",
    category: "composition",
    role: "Only if API can produce production-quality composition without Owner labor",
    apiControl: "partial",
    textFidelity: "partial",
    licensing: "must_verify_per_job",
    lockIn: "high",
    status: "evaluate",
    notes: "Do not reintroduce Owner-operated Canva as the factory.",
  },
  {
    id: "licensed_font_libraries",
    category: "typography",
    role: "Display pairings beyond Georgia/Arial system stacks",
    apiControl: "strong",
    textFidelity: "exact",
    licensing: "must_verify_per_job",
    lockIn: "low",
    status: "evaluate",
    notes: "Current renderer bottleneck: three system stacks.",
  },
  {
    id: "commercial_image_libraries",
    category: "imagery",
    role: "Stock only with commercial license and provenance",
    apiControl: "partial",
    textFidelity: "n_a",
    licensing: "must_verify_per_job",
    lockIn: "medium",
    status: "evaluate",
    notes: "Customer-certified assets take precedence. No copyrighted templates.",
  },
];

export function routeProductionMethod(brief: DesignCreativeBrief): {
  method: StudioProductionMethod;
  why: string;
  criticalTextMustStayInRenderer: true;
} {
  if (brief.suppliedImagery) {
    return {
      method: "customer_assets_plus_renderer",
      why: "Customer supplied licensed imagery; compose facts in the renderer.",
      criticalTextMustStayInRenderer: true,
    };
  }
  if (
    brief.industryFamily === "beauty_wellness" ||
    brief.industryFamily === "retail_fashion" ||
    brief.industryFamily === "food_hospitality" ||
    brief.moodId === "creative_edgy" ||
    brief.moodId === "elegant_premium"
  ) {
    return {
      method: "image_plus_renderer",
      why: "Atmosphere and visual storytelling would strengthen this brief. Generated art may not carry names, prices, dates, phones, URLs, or legal copy.",
      criticalTextMustStayInRenderer: true,
    };
  }
  return {
    method: "renderer_first",
    why: "Information structure, typography, and factual fidelity dominate.",
    criticalTextMustStayInRenderer: true,
  };
}

export function openaiImageConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function openaiStudioManagerConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
