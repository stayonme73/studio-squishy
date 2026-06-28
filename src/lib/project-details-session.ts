import {
  EMPTY_PROJECT_DETAILS_FORM,
  type ProjectDetailsFormValues,
  type ProjectDetailsRecord,
  type ProjectDetailsUploadedFile,
} from "@/config/project-details";

const DRAFT_KEY_PREFIX = "studio-squishy:project-details-draft:";

function draftKey(campaignId: string) {
  return `${DRAFT_KEY_PREFIX}${campaignId}`;
}

export function readProjectDetailsDraft(campaignId: string): ProjectDetailsRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(draftKey(campaignId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProjectDetailsRecord;
    return {
      form: { ...EMPTY_PROJECT_DETAILS_FORM, ...parsed.form },
      files: parsed.files ?? [],
      submittedAt: parsed.submittedAt,
    };
  } catch {
    return null;
  }
}

export function saveProjectDetailsDraft(
  campaignId: string,
  form: ProjectDetailsFormValues,
  files: readonly ProjectDetailsUploadedFile[],
) {
  if (typeof window === "undefined") return;
  const payload: ProjectDetailsRecord = { form, files: [...files] };
  window.localStorage.setItem(draftKey(campaignId), JSON.stringify(payload));
}

export function clearProjectDetailsDraft(campaignId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftKey(campaignId));
}

export function mergeProjectDetailsForm(
  base: ProjectDetailsFormValues,
  patch: Partial<ProjectDetailsFormValues>,
): ProjectDetailsFormValues {
  return { ...base, ...patch };
}
