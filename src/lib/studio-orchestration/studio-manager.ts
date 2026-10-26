/**
 * Embedded AI Studio Manager — dedicated Studio runtime lane.
 * Not Tagia's personal ChatGPT thread.
 * Returns structured action Machine can execute without Owner as messenger.
 */

import type { StudioManagerAction } from "@/config/studio-studio-wide-orchestration-v1";
import { libraryFor } from "./intelligence-library";
import { routeStudioProduction } from "./route";
import { classifyEscalation } from "./escalation";
import { researchForJob } from "./research";
import type { StudioJobContract } from "./job-contract";
import { directorForJobType } from "./domain-directors";

export type StudioManagerRequest = {
  job: StudioJobContract;
  question: string;
};

export type StudioManagerResponse = {
  action: StudioManagerAction;
  why: string;
  route: ReturnType<typeof routeStudioProduction>;
  research: ReturnType<typeof researchForJob>;
  intelligenceIds: readonly string[];
  creativeDomain: ReturnType<typeof directorForJobType>;
  preserveCustomerFacts: true;
  doNotInventCustomerFacts: true;
  ownerOnly: boolean;
  executeWithoutOwnerMessenger: true;
};

const ALLOWED_ACTIONS = new Set<StudioManagerAction>([
  "continue_production",
  "route_design",
  "route_copy",
  "route_video",
  "route_document",
  "route_print_file",
  "use_image_generation",
  "use_customer_assets",
  "research_references",
  "studio_correction_required",
  "request_customer_information",
  "engineering_recovery_required",
  "owner_judgment_required",
]);

export function consultStudioManager(request: StudioManagerRequest): StudioManagerResponse {
  const job = request.job;
  const routed = routeStudioProduction(job);
  const research = researchForJob({
    jobType: job.jobType,
    useful: /research|current|aesthetic|platform/i.test(request.question),
    industryFamily: job.creativeBrief.industry || "unknown",
  });
  const intelligence = libraryFor(job.jobType === "unknown" ? "static_design" : job.jobType);
  const escalation = classifyEscalation({
    question: request.question,
    internalAttemptCount: job.internalAttemptCount,
  });

  let action = routed.action;
  let why = routed.why;
  let ownerOnly = false;

  if (job.requiredFacts.length === 0 && job.jobType !== "print_file") {
    action = "request_customer_information";
    why = "Locked customer facts are missing. Do not invent them.";
  } else if (escalation.action === "engineering_recovery_required") {
    action = escalation.action;
    why = escalation.why;
  } else if (escalation.action === "studio_correction_required") {
    action = "studio_correction_required";
    why = escalation.why;
  } else if (escalation.action === "owner_judgment_required") {
    action = "owner_judgment_required";
    ownerOnly = true;
    why = escalation.why;
  } else if (research && /research/i.test(request.question)) {
    action = "research_references";
    why = research.summary;
  } else if ((job.qaFindings?.length ?? 0) > 0 && job.internalAttemptCount < 3) {
    action = "studio_correction_required";
    why = "Creative Director findings require a material Studio correction, not a customer revision.";
  }

  if (!ALLOWED_ACTIONS.has(action)) {
    action = "continue_production";
  }

  return {
    action,
    why,
    route: routed,
    research,
    intelligenceIds: intelligence.map((record) => record.id),
    creativeDomain: directorForJobType(job.jobType),
    preserveCustomerFacts: true,
    doNotInventCustomerFacts: true,
    ownerOnly,
    executeWithoutOwnerMessenger: true,
  };
}

export async function consultStudioManagerMaybeRemote(
  request: StudioManagerRequest,
): Promise<StudioManagerResponse> {
  const local = consultStudioManager(request);
  if (!process.env.OPENAI_API_KEY?.trim()) return local;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: `You are The Studio's embedded AI Studio Manager. Not a personal ChatGPT thread.
Return ONLY JSON {"action":"<one of ${[...ALLOWED_ACTIONS].join("|")}>","why":"one sentence"}
Do not invent customer facts. Do not make Owner-only business decisions.
Escalate owner_judgment_required only for genuine brand/business exceptions.
Ugly composition, tiny text, boring video, and broken exports are not Owner tickets.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              campaignId: request.job.campaignId,
              sku: request.job.sku,
              jobType: request.job.jobType,
              brief: request.job.creativeBrief,
              requiredFacts: request.job.requiredFacts,
              qaFindings: request.job.qaFindings,
              attempts: request.job.internalAttemptCount,
              question: request.question,
              localAction: local.action,
            }),
          },
        ],
      }),
    });
    if (!response.ok) return local;
    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const text = payload.output_text || payload.output?.[0]?.content?.[0]?.text || "";
    const parsed = JSON.parse(text) as { action?: StudioManagerAction; why?: string };
    if (!parsed.action || !ALLOWED_ACTIONS.has(parsed.action)) return local;
    if (parsed.action === "owner_judgment_required" && !local.ownerOnly) {
      return local;
    }
    return { ...local, action: parsed.action, why: parsed.why || local.why };
  } catch {
    return local;
  }
}
