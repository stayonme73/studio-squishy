import { draftRoom, type DraftIntakeFormValues } from "@/config/draft-room";
import type { FeedbackConceptPreview } from "@/config/feedback-studio";
import type { CampaignRecord } from "@/config/studio-board";
import { resolveVisionData } from "@/lib/campaign-record";
import { readCurrentCampaign, saveCurrentCampaign } from "@/lib/studio-board-campaign";

const { sections } = draftRoom.intakeForm;

type CampaignBrief = {
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

function truncate(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function firstPhrase(text: string, max = 72) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const phrase = trimmed.split(/[.!?\n]/)[0]?.trim() ?? trimmed;
  return truncate(phrase, max);
}

function extractBrief(campaign: CampaignRecord): CampaignBrief | null {
  const vision = resolveVisionData(campaign);
  if (!vision) return null;

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
  };
}

function shouldRegenerateConcepts(campaign: CampaignRecord) {
  if (!campaign.visionSubmittedAt && !campaign.visionData) return true;
  if (!campaign.concepts || campaign.concepts.length !== 3) return true;
  return campaign.conceptsGeneratedAt !== campaign.visionSubmittedAt;
}

function persistConcepts(
  campaign: CampaignRecord,
  concepts: readonly FeedbackConceptPreview[],
): CampaignRecord {
  const updated: CampaignRecord = {
    ...campaign,
    concepts: [...concepts],
    conceptsGeneratedAt: campaign.visionSubmittedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveCurrentCampaign(updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }
  return updated;
}

/** Build three directions from the campaign record creative brief. */
export function generateCampaignConceptsFromBrief(
  campaign: CampaignRecord,
): FeedbackConceptPreview[] | null {
  const brief = extractBrief(campaign);
  if (!brief) return null;

  const { projectName, business, audience, goals, personality, colors } = brief;
  const businessShort = firstPhrase(business, 48);
  const audienceShort = firstPhrase(audience, 40);
  const goalShort = firstPhrase(goals, 56);
  const timingLine = brief.timing ? truncate(brief.timing, 64) : "Launch timing from your intake";

  const warmHeadline = truncate(
    businessShort
      ? `${projectName} — built for ${audienceShort || "your community"}`
      : `${projectName} — welcome them in`,
    72,
  );
  const boldHeadline = truncate(`${projectName} — ${goalShort || "act now"}`, 72).toUpperCase();
  const premiumHeadline = truncate(
    businessShort ? `${projectName} — ${firstPhrase(businessShort, 32)}` : `${projectName}`,
    64,
  );

  const avoidClause = brief.avoidNotes
    ? ` We will avoid ${truncate(brief.avoidNotes, 90).toLowerCase()}.`
    : "";

  return [
    {
      id: "A",
      directionLabel: "Direction A",
      tagline: "Warm & welcoming",
      summary: truncate(
        `A community-first take on ${projectName} — leading with ${brief.toneGuidance.toLowerCase()} and an invitation meant for ${audience.toLowerCase()}.`,
        220,
      ),
      whyChosen: truncate(
        `Built from your intake: you described ${personality.toLowerCase()} brand energy, want ${audience.toLowerCase()} to feel welcomed, and asked for ${brief.toneGuidance.toLowerCase()}.${avoidClause}`,
        280,
      ),
      hero: {
        headline: warmHeadline,
        subhead: timingLine,
        accent: "warm",
      },
      social: {
        platform: "Instagram",
        body: truncate(
          `${projectName} is almost here. ${brief.desiredOutcome || `We built this for ${audience.toLowerCase()}.`} ${brief.coreMessage ? firstPhrase(brief.coreMessage, 100) : ""}`.trim(),
          220,
        ),
        cta: "Learn more",
      },
      email: {
        subject: truncate(`${projectName} — you're invited in`, 72),
        preheader: truncate(firstPhrase(brief.desiredOutcome || goals, 80), 90),
        body: truncate(
          `Hi there — we're shaping ${projectName} around what you shared: ${brief.toneGuidance.toLowerCase()} for ${audience.toLowerCase()}. ${brief.successMetric ? `Success looks like: ${brief.successMetric}.` : ""}`.trim(),
          320,
        ),
      },
      sms: {
        body: truncate(`${projectName} update — crafted for ${audienceShort || "you"}. Details inside. Reply STOP to opt out.`, 140),
      },
    },
    {
      id: "B",
      directionLabel: "Direction B",
      tagline: "Bold & bright",
      summary: truncate(
        `High-energy creative for ${projectName} — built to ${goalShort.toLowerCase()} with clear action and ${colors.toLowerCase()} cues from your brand intake.`,
        220,
      ),
      whyChosen: truncate(
        `Your goals emphasize ${goals.toLowerCase()} and your personality notes include ${personality.toLowerCase()}. This direction leads with contrast, urgency, and one clear action per touchpoint.${avoidClause}`,
        280,
      ),
      hero: {
        headline: boldHeadline,
        subhead: truncate(brief.successMetric || timingLine, 64),
        accent: "bold",
      },
      social: {
        platform: "Facebook",
        body: truncate(
          `${projectName.toUpperCase()} — ${goalShort.toUpperCase()}. ${brief.desiredOutcome || `Built for ${audience}.`} Tag someone who needs to see this.`,
          220,
        ),
        cta: "Take action",
      },
      email: {
        subject: truncate(`${projectName} — ${goalShort}`, 72),
        preheader: truncate(brief.successMetric || brief.desiredOutcome, 90),
        body: truncate(
          `This is the bold read on ${projectName}: ${goals}. ${brief.coreMessage ? firstPhrase(brief.coreMessage, 120) : ""}`.trim(),
          320,
        ),
      },
      sms: {
        body: truncate(`${projectName}: ${goalShort}. Tap for details → [link] Reply STOP to opt out.`, 140),
      },
    },
    {
      id: "C",
      directionLabel: "Direction C",
      tagline: "Clean & premium",
      summary: truncate(
        `A refined presentation of ${projectName} — generous space, ${colors.toLowerCase()}, and copy that reflects ${personality.toLowerCase()} without noise.`,
        220,
      ),
      whyChosen: truncate(
        `Your brand personality (${personality.toLowerCase()}) and inspiration notes point toward restraint and confidence. This direction keeps the focus on ${businessShort || projectName}.${brief.inspiration ? ` Reference: ${truncate(brief.inspiration, 80)}.` : ""}${avoidClause}`,
        280,
      ),
      hero: {
        headline: premiumHeadline,
        subhead: truncate(brief.desiredOutcome || timingLine, 64),
        accent: "premium",
      },
      social: {
        platform: "LinkedIn",
        body: truncate(
          `Introducing ${projectName}. ${businessShort ? `${businessShort}. ` : ""}${brief.desiredOutcome || `Designed for ${audience.toLowerCase()}.`}`.trim(),
          220,
        ),
        cta: "View details",
      },
      email: {
        subject: truncate(`${projectName} — a considered approach`, 72),
        preheader: truncate(firstPhrase(brief.toneGuidance, 80), 90),
        body: truncate(
          `Thank you for the clarity in your intake. ${projectName} is presented with ${personality.toLowerCase()} tone, ${colors.toLowerCase()}, and messaging shaped around ${goals.toLowerCase()}.`,
          320,
        ),
      },
      sms: {
        body: truncate(`${projectName} preview is ready. View your direction: [link]`, 140),
      },
    },
  ];
}

/** Generate (if needed) and save concepts on the live campaign record. */
export function ensureCampaignConceptsOnRecord(
  campaign?: CampaignRecord | null,
): CampaignRecord | null {
  const target = campaign ?? readCurrentCampaign();
  if (!target?.campaignId) return null;
  if (!shouldRegenerateConcepts(target)) return target;

  const generated = generateCampaignConceptsFromBrief(target);
  if (!generated) return target;

  const live = readCurrentCampaign();
  if (!live || live.campaignId !== target.campaignId) return target;

  return persistConcepts(live, generated);
}

/** Concepts for Review Room — stored on record, or generated from intake brief. */
export function resolveCampaignConcepts(campaign: CampaignRecord | null): FeedbackConceptPreview[] {
  if (!campaign) return [];

  if (!shouldRegenerateConcepts(campaign) && campaign.concepts) {
    return campaign.concepts;
  }

  const ensured = ensureCampaignConceptsOnRecord(campaign);
  return ensured?.concepts ?? generateCampaignConceptsFromBrief(campaign) ?? [];
}

/** Content-engine handoff — replace generated concepts with authored directions. */
export function setCampaignConcepts(concepts: readonly FeedbackConceptPreview[]): CampaignRecord | null {
  const campaign = readCurrentCampaign();
  if (!campaign || concepts.length !== 3) return null;
  return persistConcepts(campaign, concepts);
}

export function hasCampaignBrief(campaign: CampaignRecord | null): boolean {
  if (!campaign) return false;
  return extractBrief(campaign) !== null;
}
