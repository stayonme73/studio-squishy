import { draftRoom, type DraftIntakeFormValues } from "@/config/draft-room";
import type { CampaignRecord } from "@/config/studio-board";
import { resolveCampaignDisplayName, resolveVisionData } from "@/lib/campaign-record";

const { sections } = draftRoom.intakeForm;
const NOT_PROVIDED = "Not provided";

function labelFor<T extends { id: string; label: string }>(options: readonly T[], id: string) {
  return options.find((option) => option.id === id)?.label ?? id;
}

function selectionLabels<T extends { id: string; label: string }>(
  options: readonly T[],
  ids: readonly string[],
) {
  return ids.map((id) => labelFor(options, id));
}

function joinParagraphs(parts: readonly string[]) {
  return parts.map((part) => part.trim()).filter(Boolean).join("\n\n");
}

function bulletBlock(items: readonly string[]) {
  const trimmed = items.map((item) => item.trim()).filter(Boolean);
  if (trimmed.length === 0) return NOT_PROVIDED;
  return trimmed.map((item) => `• ${item}`).join("\n");
}

function parseColorEntries(vision: DraftIntakeFormValues): string[] {
  if (vision.brandHasColors === "yes" && vision.brandColorList.trim()) {
    return vision.brandColorList
      .split(/[,;\n]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  const chips = selectionLabels(sections.brandColors.directionOptions, vision.brandColorSelections);
  if (chips.length > 0) return chips;

  if (vision.brandColorNotes.trim()) return [vision.brandColorNotes.trim()];
  return [];
}

function resolveAudience(vision: DraftIntakeFormValues) {
  return joinParagraphs([
    vision.audienceFit ? labelFor(sections.audience.options, vision.audienceFit) : "",
    vision.audienceNotes.trim(),
  ]);
}

function resolveGoals(vision: DraftIntakeFormValues) {
  const bullets = selectionLabels(sections.goal.options, vision.goalSelections);
  if (vision.goalNotes.trim()) bullets.push(vision.goalNotes.trim());
  return bulletBlock(bullets);
}

function resolvePersonality(vision: DraftIntakeFormValues) {
  const bullets = selectionLabels(
    sections.brandPersonality.options,
    vision.brandPersonalitySelections,
  );
  if (vision.brandPersonalityNotes.trim()) bullets.push(vision.brandPersonalityNotes.trim());
  return bulletBlock(bullets);
}

function resolveFinalNotes(vision: DraftIntakeFormValues) {
  return (
    joinParagraphs([
      vision.anythingElse.trim(),
      vision.visionAvoid.trim(),
      vision.visionFeel.trim(),
      vision.visionRemember.trim(),
      vision.visionDesired.trim(),
      vision.visionSuccess.trim(),
      vision.message.trim(),
    ]) || NOT_PROVIDED
  );
}

function resolveInspiration(vision: DraftIntakeFormValues) {
  const like = vision.inspirationLike.trim();
  const dislike = vision.inspirationDislike.trim();
  if (!like && !dislike) return NOT_PROVIDED;
  if (like && dislike) return `${like}\n\nAvoid: ${dislike}`;
  if (dislike) return `Avoid: ${dislike}`;
  return like;
}

function formatSection(title: string, body: string) {
  return `${title}\n${body}`;
}

/** Human-readable campaign brief for clipboard export (owner workflow). */
export function formatCampaignBriefForCopy(campaign: CampaignRecord): string {
  const vision = resolveVisionData(campaign);
  const campaignName = resolveCampaignDisplayName(campaign) || NOT_PROVIDED;
  const packageName = campaign.packageLabel.trim().toUpperCase() || NOT_PROVIDED;

  if (!vision) {
    return [
      formatSection("CAMPAIGN NAME", campaignName),
      "",
      formatSection("PACKAGE", packageName),
      "",
      formatSection("BUSINESS", NOT_PROVIDED),
      "",
      formatSection("AUDIENCE", NOT_PROVIDED),
      "",
      formatSection("GOALS", NOT_PROVIDED),
      "",
      formatSection("BRAND PERSONALITY", NOT_PROVIDED),
      "",
      formatSection("BRAND COLORS", NOT_PROVIDED),
      "",
      formatSection("FINAL NOTES", NOT_PROVIDED),
      "",
      formatSection("INSPIRATION", NOT_PROVIDED),
    ].join("\n");
  }

  return [
    formatSection("CAMPAIGN NAME", campaignName),
    "",
    formatSection("PACKAGE", packageName),
    "",
    formatSection("BUSINESS", vision.business.trim() || NOT_PROVIDED),
    "",
    formatSection("AUDIENCE", resolveAudience(vision) || NOT_PROVIDED),
    "",
    formatSection("GOALS", resolveGoals(vision)),
    "",
    formatSection("BRAND PERSONALITY", resolvePersonality(vision)),
    "",
    formatSection("BRAND COLORS", bulletBlock(parseColorEntries(vision))),
    "",
    formatSection("FINAL NOTES", resolveFinalNotes(vision)),
    "",
    formatSection("INSPIRATION", resolveInspiration(vision)),
  ].join("\n");
}
