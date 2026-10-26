/**
 * Machine orchestration entry — Machine owns workflow, not creative labor.
 * Consults AI Studio Manager, selects a production lane, applies the
 * matching Creative Director, and escalates only true Owner/Scout cases.
 */

import { studioStudioWideOrchestrationV1 } from "@/config/studio-studio-wide-orchestration-v1";
import {
  domainForJobType,
  jobTypeForSku,
  technicalGateForJobType,
  type StudioJobContract,
} from "./job-contract";
import { consultStudioManager, consultStudioManagerMaybeRemote } from "./studio-manager";
import {
  critiqueCopy,
  critiqueDesign,
  critiqueDocument,
  critiqueVideo,
} from "./domain-directors";
import { classifyEscalation } from "./escalation";

export type OrchestrationResult = {
  packageId: typeof studioStudioWideOrchestrationV1.packageId;
  intelligenceVersion: typeof studioStudioWideOrchestrationV1.intelligenceVersion;
  jobType: StudioJobContract["jobType"];
  manager: ReturnType<typeof consultStudioManager>;
  nextActor:
    | "production"
    | "creative_director"
    | "technical_qa"
    | "scout"
    | "owner"
    | "customer";
  failClosed: boolean;
  customerRevisionUntouched: true;
};

export function buildStudioJob(input: {
  campaignId: string;
  customerId: string;
  sku: string;
  businessName: string;
  industry?: string;
  audience?: string;
  objective?: string;
  mood?: string;
  whatIsPromoted?: string;
  chooseForMe?: boolean;
  suppliedImagery?: boolean;
  requiredFacts: readonly string[];
  rightsState?: StudioJobContract["rightsState"];
  intendedUse?: string;
  format?: string;
  internalAttemptCount?: number;
  revisionRoundsUsed?: number;
  qaFindings?: readonly string[];
  question?: string;
}): StudioJobContract {
  const jobType = jobTypeForSku(input.sku);
  return {
    jobType,
    campaignId: input.campaignId,
    customerId: input.customerId,
    sku: input.sku,
    creativeBrief: {
      businessName: input.businessName,
      industry: input.industry ?? "",
      audience: input.audience ?? "",
      objective: input.objective ?? "",
      mood: input.mood ?? "",
      whatIsPromoted: input.whatIsPromoted ?? "",
      chooseForMe: input.chooseForMe ?? true,
      suppliedImagery: Boolean(input.suppliedImagery),
    },
    requiredFacts: input.requiredFacts,
    brandRecord: null,
    customerAssets: [],
    rightsState: input.rightsState ?? "not_required",
    intendedUse: input.intendedUse ?? "",
    format: input.format ?? "",
    deadline: null,
    availableCapabilities: [],
    selectedProductionRoute: null,
    creativeQualityGate: domainForJobType(jobType),
    technicalQualityGate: technicalGateForJobType(jobType),
    customerRevisionState: {
      roundsUsed: input.revisionRoundsUsed ?? 0,
      unused: (input.revisionRoundsUsed ?? 0) === 0,
    },
    internalAttemptCount: input.internalAttemptCount ?? 0,
    ownerEscalationRequired: false,
    qaFindings: input.qaFindings,
    question: input.question,
  };
}

export function orchestrateStudioJob(job: StudioJobContract): OrchestrationResult {
  const manager = consultStudioManager({
    job,
    question: job.question ?? "Select the production lane and next action.",
  });
  let nextActor: OrchestrationResult["nextActor"] = "production";
  if (manager.action === "owner_judgment_required") nextActor = "owner";
  else if (manager.action === "engineering_recovery_required") nextActor = "scout";
  else if (manager.action === "request_customer_information") nextActor = "customer";
  else if (manager.action === "studio_correction_required") nextActor = "production";
  else if (manager.route.failClosed && manager.action !== "route_design") {
    nextActor = "scout";
  }

  return {
    packageId: studioStudioWideOrchestrationV1.packageId,
    intelligenceVersion: studioStudioWideOrchestrationV1.intelligenceVersion,
    jobType: job.jobType,
    manager,
    nextActor,
    failClosed: manager.route.failClosed,
    customerRevisionUntouched: true,
  };
}

export async function orchestrateStudioJobAsync(
  job: StudioJobContract,
): Promise<OrchestrationResult> {
  const result = orchestrateStudioJob(job);
  if (!process.env.OPENAI_API_KEY?.trim()) return result;
  const remote = await consultStudioManagerMaybeRemote({
    job,
    question: job.question ?? "Select the production lane and next action.",
  });
  return { ...result, manager: remote };
}

export {
  consultStudioManager,
  consultStudioManagerMaybeRemote,
  critiqueCopy,
  critiqueDesign,
  critiqueDocument,
  critiqueVideo,
  classifyEscalation,
};

export { jobTypeForSku, domainForJobType } from "./job-contract";
export type { StudioJobContract } from "./job-contract";
export { STUDIO_TOOL_CHEST, isCertifiedActive } from "./tool-chest";
export { CREATIVE_INTELLIGENCE_LIBRARY, libraryFor } from "./intelligence-library";
export { routeStudioProduction } from "./route";
export { researchForJob } from "./research";
export { studioStudioWideOrchestrationV1 } from "@/config/studio-studio-wide-orchestration-v1";
