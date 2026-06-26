/**
 * Project Summary — view-model types.
 * Customer-facing bridge after Project Discovery — presentation only.
 */

export const PROJECT_SUMMARY_LABELS = {
  pageTitle: "Project Summary",
  pageLead:
    "The Studio reviewed your discovery answers. Confirm your plan before production begins.",
  heardTitle: "Here's what we heard",
  heardEmpty: "No discovery answers saved yet.",
  recommendTitle: "Here's what we recommend",
  changesTitle: "Need to make changes?",
  changesLead:
    "Edit your discovery answers or adjust services below. Additional services beyond your package show cost before you confirm.",
  editDiscovery: "Edit discovery answers",
  confirmPlan: "Confirm and continue",
} as const;

export type DiscoveryAnswerHeardItem = {
  label: string;
  value: string;
};
