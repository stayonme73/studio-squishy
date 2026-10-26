/**
 * Production routing — Machine/Studio Manager select tools by job, not by habit.
 * EVALUATE providers fail closed.
 */

import type {
  StudioManagerAction,
  StudioProductionRoute,
} from "@/config/studio-studio-wide-orchestration-v1";
import type { StudioJobContract } from "./job-contract";
import { failClosedIfUnevaluated } from "./tool-chest";
import { openaiImageConfigured } from "@/lib/studio-project-alpha/tool-chest";

export type RoutedProduction = {
  action: StudioManagerAction;
  route: StudioProductionRoute;
  capabilities: readonly string[];
  failClosed: boolean;
  why: string;
};

export function routeStudioProduction(job: StudioJobContract): RoutedProduction {
  if (job.jobType === "copy") {
    return certify({
      action: "route_copy",
      route: "copy_path",
      capabilities: ["studio_copy_producer", "anthropic_claude"],
      why: "Email/SMS/captions/scripts use Copy Production. Facts stay locked.",
    });
  }
  if (job.jobType === "form_document") {
    return certify({
      action: "route_document",
      route: "structured_document",
      capabilities: ["structured_document_composer"],
      why: "Forms and structured PDFs need information architecture, not flyer composition.",
    });
  }
  if (job.jobType === "motion_video" || job.jobType === "voice_audio") {
    return certify({
      action: "route_video",
      route: "video_orchestration",
      capabilities: ["shotstack"],
      why: "Motion uses certified video orchestration, not static-design tooling.",
    });
  }
  if (job.jobType === "print_file") {
    return certify({
      action: "route_print_file",
      route: "print_file_packaging",
      capabilities: ["studio_html_css_renderer"],
      why: "Print/File validates dimensions, resolution, and export integrity. It does not judge creative excellence.",
    });
  }

  if (job.creativeBrief.suppliedImagery && job.rightsState === "certified") {
    return certify({
      action: "use_customer_assets",
      route: "customer_assets_plus_renderer",
      capabilities: ["studio_html_css_renderer"],
      why: "Customer-certified assets drive composition. Renderer owns exact facts.",
    });
  }

  const visuallyRich =
    /beauty|fashion|food|cinematic|editorial|edgy|premium/i.test(
      `${job.creativeBrief.industry} ${job.creativeBrief.mood} ${job.creativeBrief.objective}`,
    );
  if (visuallyRich && !isInformationHeavy(job)) {
    return certify({
      action: "use_image_generation",
      route: "image_plus_renderer",
      capabilities: ["openai_image_generation", "studio_html_css_renderer"],
      why: "Visually rich campaign creative wants generated atmosphere plus deterministic fact overlay.",
    });
  }

  return certify({
    action: "route_design",
    route: "renderer_first",
    capabilities: ["studio_html_css_renderer"],
    why: "Information-heavy static work: exact typography and structure in the renderer.",
  });
}

function isInformationHeavy(job: StudioJobContract): boolean {
  return (
    job.sku === "v2-rtu-menu" ||
    job.sku === "v2-rtu-service-sheet" ||
    job.sku === "v2-rtu-business-card" ||
    job.requiredFacts.length >= 8
  );
}

function certify(
  routed: Omit<RoutedProduction, "failClosed">,
): RoutedProduction {
  const blocked = routed.capabilities.filter((id) => failClosedIfUnevaluated(id));
  if (blocked.length === 0) {
    return { ...routed, failClosed: false };
  }
  if (routed.route === "image_plus_renderer") {
    if (openaiImageConfigured()) {
      return { ...routed, failClosed: false };
    }
    return {
      action: "route_design",
      route: "fail_closed_evaluate_provider",
      capabilities: ["studio_html_css_renderer"],
      failClosed: true,
      why: `${routed.why} OpenAI image generation is EVALUATE and no callable key is present — fail closed rather than pretend it is active.`,
    };
  }
  if (routed.route === "video_orchestration" || routed.route === "structured_document") {
    return {
      ...routed,
      route: "fail_closed_evaluate_provider",
      failClosed: true,
      why: `${routed.why} Required capability is EVALUATE — fail closed. Do not fake a finished artifact.`,
    };
  }
  return { ...routed, failClosed: false };
}
