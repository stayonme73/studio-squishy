/**
 * Studio-wide Tool Chest — provider-independent capability registry.
 * A provider is not a launch capability merely because an account exists.
 * EVALUATE entries fail closed until certified.
 */

import type { StudioCapabilityStatus } from "@/config/studio-studio-wide-orchestration-v1";
import { DESIGN_TOOL_CHEST } from "@/lib/studio-project-alpha/tool-chest";

export type StudioToolChestEntry = {
  id: string;
  capability: string;
  provider: string;
  supportedMedia: readonly string[];
  apiControl: "strong" | "partial" | "weak" | "unknown";
  commercialLicensing: "studio_owned" | "must_verify_per_job" | "unknown";
  exportFormats: readonly string[];
  lockIn: "low" | "medium" | "high";
  status: StudioCapabilityStatus;
  notes: string;
};

export const STUDIO_TOOL_CHEST: readonly StudioToolChestEntry[] = [
  {
    id: "studio_html_css_renderer",
    capability: "static_composition",
    provider: "studio",
    supportedMedia: ["flyer", "menu", "service_sheet", "card", "social_graphic", "poster"],
    apiControl: "strong",
    commercialLicensing: "studio_owned",
    exportFormats: ["png", "pdf"],
    lockIn: "low",
    status: "active",
    notes: "Owns exact facts. Not the entire Design Department.",
  },
  {
    id: "anthropic_claude",
    capability: "creative_reasoning",
    provider: "anthropic",
    supportedMedia: ["design", "copy", "video", "document"],
    apiControl: "strong",
    commercialLicensing: "must_verify_per_job",
    exportFormats: ["json"],
    lockIn: "medium",
    status: "active",
    notes: "Active for Design/Copy reasoning. Must not invent customer facts.",
  },
  {
    id: "openai_studio_manager",
    capability: "studio_manager_reasoning",
    provider: "openai",
    supportedMedia: ["design", "copy", "video", "document"],
    apiControl: "strong",
    commercialLicensing: "must_verify_per_job",
    exportFormats: ["json"],
    lockIn: "medium",
    status: "evaluate",
    notes: "Dedicated Studio Manager lane. Not Tagia's personal ChatGPT thread.",
  },
  {
    id: "openai_vision_creative_director",
    capability: "artifact_vision_review",
    provider: "openai",
    supportedMedia: ["png", "pdf_page", "video_frame"],
    apiControl: "strong",
    commercialLicensing: "must_verify_per_job",
    exportFormats: ["json"],
    lockIn: "medium",
    status: "evaluate",
    notes: "Inspect actual artifacts. Fail closed until certified.",
  },
  {
    id: "openai_image_generation",
    capability: "visual_generation",
    provider: "openai",
    supportedMedia: ["campaign_art", "atmosphere", "texture", "illustration"],
    apiControl: "strong",
    commercialLicensing: "must_verify_per_job",
    exportFormats: ["png", "webp"],
    lockIn: "medium",
    status: "evaluate",
    notes: "Must not own names, prices, dates, phones, URLs, or legal copy.",
  },
  {
    id: "studio_copy_producer",
    capability: "copy_production",
    provider: "studio",
    supportedMedia: ["email", "sms", "caption", "script"],
    apiControl: "strong",
    commercialLicensing: "studio_owned",
    exportFormats: ["json", "txt"],
    lockIn: "low",
    status: "active",
    notes: "Existing Copy Production lane. Facts stay locked.",
  },
  {
    id: "shotstack",
    capability: "programmatic_video",
    provider: "shotstack",
    supportedMedia: ["short_video"],
    apiControl: "strong",
    commercialLicensing: "must_verify_per_job",
    exportFormats: ["mp4"],
    lockIn: "medium",
    status: "evaluate",
    notes: "Selected among video providers; still EVALUATE for this orchestration package until certified as launch-active.",
  },
  {
    id: "capcut",
    capability: "social_video",
    provider: "capcut",
    supportedMedia: ["short_video"],
    apiControl: "unknown",
    commercialLicensing: "must_verify_per_job",
    exportFormats: ["mp4"],
    lockIn: "high",
    status: "out_of_scope",
    notes: "Kitchen selection already FAIL. Do not treat as launch capability.",
  },
  {
    id: "canva",
    capability: "manual_composition",
    provider: "canva",
    supportedMedia: ["static_design"],
    apiControl: "partial",
    commercialLicensing: "must_verify_per_job",
    exportFormats: ["png", "pdf"],
    lockIn: "high",
    status: "evaluate",
    notes: "Do not reintroduce Owner-operated Canva as the factory.",
  },
  {
    id: "licensed_font_libraries",
    capability: "typography",
    provider: "evaluate",
    supportedMedia: ["static_design", "document"],
    apiControl: "strong",
    commercialLicensing: "must_verify_per_job",
    exportFormats: ["otf", "ttf", "woff2"],
    lockIn: "low",
    status: "evaluate",
    notes: "Renderer still uses three system stacks.",
  },
  {
    id: "structured_document_composer",
    capability: "forms_documents",
    provider: "studio",
    supportedMedia: ["form", "worksheet", "checklist", "pdf"],
    apiControl: "strong",
    commercialLicensing: "studio_owned",
    exportFormats: ["pdf"],
    lockIn: "low",
    status: "evaluate",
    notes: "Lane exists as a contract. Not a launch SKU. Fail closed until a certified document composer ships.",
  },
];

export function toolById(id: string): StudioToolChestEntry | undefined {
  return STUDIO_TOOL_CHEST.find((tool) => tool.id === id);
}

export function isCertifiedActive(id: string): boolean {
  return toolById(id)?.status === "active";
}

export function failClosedIfUnevaluated(id: string): boolean {
  const tool = toolById(id);
  return !tool || tool.status !== "active";
}

/** Preserve Project Alpha design-only chest as a subset view. */
export function designChestStillPresent(): boolean {
  return DESIGN_TOOL_CHEST.some((tool) => tool.id === "studio_html_css_renderer");
}
