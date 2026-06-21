import {
  draftRoom,
  EMPTY_DRAFT_INTAKE_FORM,
  formatProjectValue,
  type DraftIntakeFormValues,
  type DraftIntakePayload,
  type DraftIntakeProjectStarterId,
} from "@/config/draft-room";

/** Resolved campaign / project label from wizard fields. */
export function resolveDraftIntakeProject(values: DraftIntakeFormValues): string {
  if (values.project.trim()) return values.project.trim();
  if (values.projectStarter) {
    return formatProjectValue(values.projectStarter, values.projectDetail).trim();
  }
  return "";
}

function isBareStarterLabel(project: string, starter: DraftIntakeProjectStarterId | ""): boolean {
  if (!starter || starter === "other") return false;
  const chip = draftRoom.intakeForm.sections.project.starterChips.find((entry) => entry.id === starter);
  if (!chip) return false;
  return project.trim().toLowerCase() === chip.label.toLowerCase();
}

/** Customer-facing campaign name — prefer specific detail over generic chip labels. */
export function resolveCampaignCustomerName(values: DraftIntakeFormValues): string {
  const normalized = normalizeDraftIntakeFormValues(values);
  const project = resolveDraftIntakeProject(normalized);

  if (normalized.projectDetail.trim() && normalized.projectStarter) {
    return formatProjectValue(normalized.projectStarter, normalized.projectDetail).trim();
  }

  if (project && !isBareStarterLabel(project, normalized.projectStarter)) {
    return project;
  }

  if (normalized.business.trim()) return normalized.business.trim();
  return project;
}

export function normalizeDraftIntakeFormValues(
  values: DraftIntakeFormValues,
): DraftIntakeFormValues {
  return {
    ...values,
    project: resolveDraftIntakeProject(values),
  };
}

export function visionDataHasContent(values: DraftIntakeFormValues): boolean {
  const v = normalizeDraftIntakeFormValues(values);
  return Boolean(
    v.project ||
      v.business.trim() ||
      v.audienceFit ||
      v.audienceNotes.trim() ||
      v.message.trim() ||
      v.goalSelections.length ||
      v.goalNotes.trim() ||
      v.brandPersonalitySelections.length ||
      v.brandPersonalityNotes.trim() ||
      v.brandHasColors ||
      v.brandColorList.trim() ||
      v.brandColorSelections.length ||
      v.brandColorNotes.trim() ||
      v.visionFeel.trim() ||
      v.visionRemember.trim() ||
      v.visionDesired.trim() ||
      v.visionSuccess.trim() ||
      v.visionAvoid.trim() ||
      v.inspirationLike.trim() ||
      v.inspirationDislike.trim() ||
      v.anythingElse.trim(),
  );
}

/** Prefer non-empty fields from `preferred`; fill gaps from `fallback`. */
export function mergeVisionData(
  preferred: DraftIntakeFormValues,
  fallback: DraftIntakeFormValues,
): DraftIntakeFormValues {
  const a = normalizeDraftIntakeFormValues(preferred);
  const b = normalizeDraftIntakeFormValues(fallback);

  return normalizeDraftIntakeFormValues({
    ...EMPTY_DRAFT_INTAKE_FORM,
    ...b,
    ...a,
    project: a.project || b.project,
    projectStarter: a.projectStarter || b.projectStarter,
    projectDetail: a.projectDetail.trim() || b.projectDetail.trim(),
    business: a.business.trim() || b.business.trim(),
    audienceFit: a.audienceFit || b.audienceFit,
    audienceNotes: a.audienceNotes.trim() || b.audienceNotes.trim(),
    message: a.message.trim() || b.message.trim(),
    goalSelections: a.goalSelections.length ? a.goalSelections : b.goalSelections,
    goalNotes: a.goalNotes.trim() || b.goalNotes.trim(),
    brandPersonalitySelections: a.brandPersonalitySelections.length
      ? a.brandPersonalitySelections
      : b.brandPersonalitySelections,
    brandPersonalityNotes: a.brandPersonalityNotes.trim() || b.brandPersonalityNotes.trim(),
    brandHasColors: a.brandHasColors || b.brandHasColors,
    brandColorList: a.brandColorList.trim() || b.brandColorList.trim(),
    brandColorSelections: a.brandColorSelections.length
      ? a.brandColorSelections
      : b.brandColorSelections,
    brandColorNotes: a.brandColorNotes.trim() || b.brandColorNotes.trim(),
    visionFeel: a.visionFeel.trim() || b.visionFeel.trim(),
    visionRemember: a.visionRemember.trim() || b.visionRemember.trim(),
    visionDesired: a.visionDesired.trim() || b.visionDesired.trim(),
    visionSuccess: a.visionSuccess.trim() || b.visionSuccess.trim(),
    visionAvoid: a.visionAvoid.trim() || b.visionAvoid.trim(),
    inspirationLike: a.inspirationLike.trim() || b.inspirationLike.trim(),
    inspirationDislike: a.inspirationDislike.trim() || b.inspirationDislike.trim(),
    anythingElse: a.anythingElse.trim() || b.anythingElse.trim(),
  });
}

export function normalizeDraftIntakePayload(payload: DraftIntakePayload): DraftIntakePayload {
  const {
    idea: _idea,
    audience: _audience,
    action: _action,
    deadline: _deadline,
    packageId,
    packageLabel,
    submittedAt,
    ...formValues
  } = payload;

  const normalized = normalizeDraftIntakeFormValues({
    ...EMPTY_DRAFT_INTAKE_FORM,
    ...formValues,
  });

  return {
    ...normalized,
    ...payload,
    ...normalized,
    project: normalized.project,
    packageId,
    packageLabel,
    submittedAt,
  };
}
