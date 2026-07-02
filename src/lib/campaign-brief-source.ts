import type { CampaignRecord } from "@/config/studio-board";
import {
  resolveApprovedPlanServiceNames,
  campaignHasApprovedStudioPlan,
} from "@/lib/approved-plan-display";
import { resolveVisionData } from "@/lib/campaign-record";
import { businessNameFromAnswer, parseBusinessTileAnswer } from "@/lib/business-discovery-completion";
import { draftRoom, type DraftIntakeFormValues } from "@/config/draft-room";

const { sections } = draftRoom.intakeForm;

export type CampaignCreativeBrief = {
  projectName: string;
  business: string;
  audience: string;
  goals: string;
  personality: string;
  colors: string;
  coreMessage: string;
  toneGuidance: string;
  desiredOutcome: string;
  successMetric: string;
  avoidNotes: string;
  inspiration: string;
  timing: string;
  approvedServiceNames: readonly string[];
  scopeDeliverables: readonly string[];
};

function labelFor<T extends { id: string; label: string }>(options: readonly T[], id: string) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function joinLabels<T extends { id: string; label: string }>(
  options: readonly T[],
  ids: readonly string[],
) {
  return ids.map((id) => labelFor(options, id)).join(", ");
}

function joinParts(parts: readonly string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join(" · ");
}

function trimField(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function discoveryContext(campaign: CampaignRecord) {
  const answers = campaign.discoveryAnswers ?? {};
  const businessRaw = answers["your-business"] ?? "";
  const { name, offer } = parseBusinessTileAnswer(businessRaw);

  return {
    businessName: name || businessNameFromAnswer(businessRaw) || "",
    businessOffer: offer,
    audience: answers["your-focus"]?.trim() ?? answers["success-looks-like"]?.trim() ?? "",
    goals: answers["success-looks-like"]?.trim() ?? answers["your-focus"]?.trim() ?? "",
  };
}

function approvedScopeContext(campaign: CampaignRecord) {
  const approved = campaign.approvedStudioPlan;
  if (!approved) {
    return { approvedServiceNames: [] as string[], scopeDeliverables: [] as string[] };
  }

  const approvedServiceNames = resolveApprovedPlanServiceNames(approved);
  const scopeDeliverables = approved.lineItems.flatMap((line) => line.deliverables);
  return { approvedServiceNames, scopeDeliverables };
}

function extractDiscoveryFirstBrief(campaign: CampaignRecord): CampaignCreativeBrief | null {
  const discovery = discoveryContext(campaign);
  const form = campaign.projectDetails?.form;
  const { approvedServiceNames, scopeDeliverables } = approvedScopeContext(campaign);

  const projectName =
    trimField(form?.workingOn) ||
    campaign.campaignName.trim() ||
    discovery.businessName;

  const business =
    trimField(form?.mainOffer) ||
    discovery.businessOffer ||
    discovery.businessName;

  if (!projectName && !business) return null;

  const audience =
    trimField(form?.conceptAudience) ||
    discovery.audience ||
    campaign.intake?.audience ||
    "your audience";

  const goals =
    discovery.goals ||
    trimField(form?.marketingPieceUsage) ||
    campaign.intake?.action ||
    "your campaign goals";

  const personality = joinParts([
    trimField(form?.brandPartsToKeep),
    trimField(form?.brandDoNotUse) ? `Avoid: ${trimField(form?.brandDoNotUse)}` : "",
  ]);

  const colors = joinParts([
    trimField(form?.brandColorsFonts),
    trimField(form?.brandOutdatedParts) ? `Refresh: ${trimField(form?.brandOutdatedParts)}` : "",
  ]);

  const coreMessage =
    trimField(form?.conceptRequiredWording) ||
    trimField(form?.mustIncludeExactly) ||
    trimField(form?.callToAction) ||
    business;

  const toneGuidance = joinParts([
    trimField(form?.adVoiceStyle),
    trimField(form?.conceptIntendedUse),
    trimField(form?.marketingPieces),
  ]);

  const desiredOutcome =
    trimField(form?.marketingPieceUsage) ||
    trimField(form?.callToAction) ||
    goals;

  const avoidNotes = joinParts([
    trimField(form?.brandDoNotUse),
    trimField(form?.mustIncludeExactly)
      ? `Must include exactly: ${trimField(form?.mustIncludeExactly)}`
      : "",
  ]);

  const inspiration = joinParts([
    trimField(form?.inspirationLinks),
    trimField(form?.brandPartsToKeep),
  ]);

  const timing =
    trimField(form?.importantDates) ||
    trimField(form?.socialPostingWindow) ||
    trimField(form?.emailSendTiming) ||
    campaign.intake?.deadline ||
    "";

  return {
    projectName: projectName || "Your campaign",
    business,
    audience,
    goals,
    personality: personality || "your brand personality",
    colors: colors || "your brand palette",
    coreMessage,
    toneGuidance: toneGuidance || "the direction you shared in Project Details",
    desiredOutcome,
    successMetric: trimField(form?.adIntendedUse),
    avoidNotes,
    inspiration,
    timing,
    approvedServiceNames,
    scopeDeliverables,
  };
}

function extractLegacyVisionBrief(vision: DraftIntakeFormValues, campaign: CampaignRecord): CampaignCreativeBrief | null {
  const projectName =
    campaign.campaignName.trim() ||
    vision.project.trim() ||
    (vision.projectStarter
      ? joinParts([
          labelFor(sections.project.starterChips, vision.projectStarter),
          vision.projectDetail.trim(),
        ])
      : "");

  if (!projectName && !vision.business.trim()) return null;

  const audience = joinParts([
    vision.audienceFit ? labelFor(sections.audience.options, vision.audienceFit) : "",
    vision.audienceNotes.trim(),
  ]);

  const goals = joinParts([
    vision.goalSelections.length > 0
      ? joinLabels(sections.goal.options, vision.goalSelections)
      : "",
    vision.goalNotes.trim(),
  ]);

  const personality = joinParts([
    vision.brandPersonalitySelections.length > 0
      ? joinLabels(sections.brandPersonality.options, vision.brandPersonalitySelections)
      : "",
    vision.brandPersonalityNotes.trim(),
  ]);

  const colors = joinParts([
    vision.brandHasColors === "yes" && vision.brandColorList.trim()
      ? vision.brandColorList.trim()
      : "",
    vision.brandColorSelections.length > 0
      ? joinLabels(sections.brandColors.directionOptions, vision.brandColorSelections)
      : "",
    vision.brandColorNotes.trim(),
  ]);

  const toneGuidance = joinParts([
    vision.visionFeel.trim(),
    vision.visionRemember.trim(),
    vision.message.trim(),
  ]);

  const { approvedServiceNames, scopeDeliverables } = approvedScopeContext(campaign);

  return {
    projectName: projectName || "Your campaign",
    business: vision.business.trim(),
    audience: audience || campaign.intake?.audience || "your audience",
    goals: goals || campaign.intake?.action || "your campaign goals",
    personality: personality || "your brand personality",
    colors: colors || "your brand palette",
    coreMessage: vision.message.trim() || vision.visionRemember.trim() || vision.business.trim(),
    toneGuidance: toneGuidance || "the tone you described in intake",
    desiredOutcome: vision.visionDesired.trim() || vision.goalNotes.trim() || goals,
    successMetric: vision.visionSuccess.trim(),
    avoidNotes: joinParts([vision.visionAvoid.trim(), vision.inspirationDislike.trim()]),
    inspiration: joinParts([vision.inspirationLike.trim(), vision.inspirationDislike.trim()]),
    timing: vision.anythingElse.trim() || campaign.intake?.deadline || "",
    approvedServiceNames,
    scopeDeliverables,
  };
}

function extractRouteMapBrief(campaign: CampaignRecord): CampaignCreativeBrief | null {
  const answers = campaign.routeMapIntake?.answers;
  if (!answers || !campaign.routeMapIntakeSubmittedAt) return null;

  const businessName = trimField(answers.businessName);
  const promoting = trimField(answers.promoting ?? answers.pageFor ?? answers.announcing);
  const whatYouDo = trimField(answers.whatYouDo ?? answers.businessDescription ?? answers.offerDetails);
  const projectName = businessName || promoting || campaign.campaignName.trim();
  const business = whatYouDo || promoting || businessName;

  if (!projectName && !business) return null;

  const { approvedServiceNames, scopeDeliverables } = approvedScopeContext(campaign);

  return {
    projectName: projectName || "Your campaign",
    business,
    audience: trimField(answers.targetAudience ?? answers.audience ?? answers.platform) || "your audience",
    goals:
      trimField(answers.successLooksLike ?? answers.goal ?? answers.promotionGoal ?? answers.callToAction) ||
      promoting ||
      "your campaign goals",
    personality: trimField(answers.brandVoice ?? answers.voiceTone ?? answers.tone) || "your brand personality",
    colors: trimField(answers.brandColors ?? answers.colors ?? answers.brandNotes) || "your brand palette",
    coreMessage:
      trimField(answers.keyMessage ?? answers.mustInclude ?? answers.mustSay ?? answers.callToAction) ||
      business,
    toneGuidance:
      trimField(answers.voiceStyle ?? answers.styleNotes ?? answers.voiceTone) ||
      "the direction you shared in Route Map intake",
    desiredOutcome:
      trimField(answers.successLooksLike ?? answers.desiredOutcome ?? answers.afterReading) ||
      trimField(answers.promotionGoal ?? answers.callToAction),
    successMetric: trimField(answers.successMetric),
    avoidNotes: trimField(answers.avoid ?? answers.doNotUse ?? answers.remove),
    inspiration: trimField(answers.inspiration ?? answers.referenceLinks ?? answers.materials),
    timing: trimField(answers.deadline ?? answers.timing ?? answers.importantDates ?? answers.mustInclude),
    approvedServiceNames,
    scopeDeliverables,
  };
}

/** Unified creative brief — discovery-first uses Project Details + Discovery; legacy uses vision intake. */
export function resolveCampaignCreativeBrief(campaign: CampaignRecord): CampaignCreativeBrief | null {
  if (campaign.routeMapContext) {
    return extractRouteMapBrief(campaign);
  }

  if (campaignHasApprovedStudioPlan(campaign)) {
    return extractDiscoveryFirstBrief(campaign);
  }

  const vision = resolveVisionData(campaign);
  if (!vision) return null;
  return extractLegacyVisionBrief(vision, campaign);
}

export function hasCampaignCreativeBrief(campaign: CampaignRecord | null): boolean {
  if (!campaign) return false;
  return resolveCampaignCreativeBrief(campaign) !== null;
}

/** Stamp concepts should match — Project Details submit wins for discovery-first campaigns. */
export function resolveConceptGenerationStamp(campaign: CampaignRecord): string | null {
  if (campaign.projectDetailsSubmittedAt) return campaign.projectDetailsSubmittedAt;
  if (campaign.routeMapIntakeSubmittedAt) return campaign.routeMapIntakeSubmittedAt;
  if (campaign.visionSubmittedAt) return campaign.visionSubmittedAt;
  if (campaign.discoverySubmittedAt) return campaign.discoverySubmittedAt;
  return null;
}
