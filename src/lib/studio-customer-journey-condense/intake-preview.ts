/**
 * Unpaid Project Intake preview.
 * The working draft already holds Build Your Project answers.
 * This page may add the recording checks and optional notes.
 * It does not open Studio Board and it does not take payment.
 */

import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import { builderCopyForPackage } from "@/config/studio-customer-journey-condense-v1";
import { projectIntakeServiceFieldKey } from "@/lib/project-intake-plan";
import type { CondensedAboutProject, CondensedJourneyDraft } from "@/lib/studio-customer-journey-condense/draft";

const TEXT_FIELDS = ["purpose", "context", "cta", "facts", "assets"] as const;
const CHECK_FIELDS = [
  "rights",
  "qualifyingSource",
  "intelligible",
  "markedMoments",
  "usableFootage",
] as const;

type CheckField = (typeof CHECK_FIELDS)[number];

function isCheckField(name: string): name is CheckField {
  return (CHECK_FIELDS as readonly string[]).includes(name);
}

/** Intake answer keys for facts already stored on the working draft. */
export function journeyDraftToIntakeAnswers(
  draft: CondensedJourneyDraft,
): RouteMapIntakeAnswers {
  const answers: RouteMapIntakeAnswers = {};
  const packageId = draft.packageId;
  const copy = builderCopyForPackage(packageId);
  const text: Array<[string, string]> = [
    ["purpose", draft.aboutProject.purpose],
    ["context", draft.aboutProject.context],
    ["cta", draft.aboutProject.cta],
    ["facts", draft.aboutProject.facts],
    ["assets", draft.aboutProject.assets],
    ["mustKeep", draft.preferences.mustKeep],
    ["mustNot", draft.preferences.mustNotInclude],
  ];
  for (const [fieldId, value] of text) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    answers[projectIntakeServiceFieldKey(packageId, fieldId)] = trimmed;
  }
  for (const field of copy.aboutProject.fields) {
    if (field.kind !== "checkbox" || !isCheckField(field.name)) continue;
    if (draft.aboutProject[field.name] !== true) continue;
    answers[projectIntakeServiceFieldKey(packageId, field.name)] = field.label;
  }
  return answers;
}

/**
 * Write the preview's checks and notes back onto the working draft.
 * Name and email stay where Build Your Project saved them.
 */
export function mergeIntakePreviewIntoDraft(
  draft: CondensedJourneyDraft,
  answers: RouteMapIntakeAnswers,
): CondensedJourneyDraft {
  const packageId = draft.packageId;
  const copy = builderCopyForPackage(packageId);
  const aboutProject: CondensedAboutProject = { ...draft.aboutProject };
  const preferences = { ...draft.preferences };
  for (const fieldId of TEXT_FIELDS) {
    const key = projectIntakeServiceFieldKey(packageId, fieldId);
    if (!Object.prototype.hasOwnProperty.call(answers, key)) continue;
    aboutProject[fieldId] = String(answers[key] ?? "");
  }
  const mustKeepKey = projectIntakeServiceFieldKey(packageId, "mustKeep");
  if (Object.prototype.hasOwnProperty.call(answers, mustKeepKey)) {
    preferences.mustKeep = String(answers[mustKeepKey] ?? "");
  }
  const mustNotKey = projectIntakeServiceFieldKey(packageId, "mustNot");
  if (Object.prototype.hasOwnProperty.call(answers, mustNotKey)) {
    preferences.mustNotInclude = String(answers[mustNotKey] ?? "");
  }
  for (const field of copy.aboutProject.fields) {
    if (field.kind !== "checkbox" || !isCheckField(field.name)) continue;
    const key = projectIntakeServiceFieldKey(packageId, field.name);
    if (!Object.prototype.hasOwnProperty.call(answers, key)) continue;
    aboutProject[field.name] = String(answers[key] ?? "").trim() === field.label;
  }
  return { ...draft, aboutProject, preferences };
}
