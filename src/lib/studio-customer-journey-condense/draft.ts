import {
  builderCopyForPackage,
  isPublicLaunchPackageId,
  resolveCondensedPackageId,
  supportOptionsForPackage,
  type CondensedBuilderSectionId,
  type CondensedPackageId,
  type CondensedSupportId,
} from "@/config/studio-customer-journey-condense-v1";
import { STUDIO_EXTRA_IDS, studioExtrasV1 } from "@/config/studio-extras-v1";

export const CONDENSED_JOURNEY_DRAFT_KEY = "studioCondensedJourneyDraft.v1";

export type CondensedSupportChoice = "SELECT" | "SKIP" | "";

export type CondensedAboutProject = {
  purpose: string;
  context: string;
  cta: string;
  facts: string;
  assets: string;
  rights: boolean;
  qualifyingSource: boolean;
  intelligible: boolean;
  markedMoments: boolean;
  usableFootage: boolean;
};

export type CondensedJourneyDraft = {
  version: 1;
  packageId: CondensedPackageId;
  aboutYou: {
    name: string;
    email: string;
    company: string;
  };
  aboutProject: CondensedAboutProject;
  upload: {
    materials: string;
  };
  preferences: {
    mustKeep: string;
    mustNotInclude: string;
    studioDecide: boolean;
  };
  support: Record<CondensedSupportId, CondensedSupportChoice>;
  completedSections: CondensedBuilderSectionId[];
  /** Stable id for the existing checkout campaign. Reused across retries. */
  checkoutCampaignId?: string;
};

function emptyAboutProject(): CondensedAboutProject {
  return {
    purpose: "",
    context: "",
    cta: "",
    facts: "",
    assets: "",
    rights: false,
    qualifyingSource: false,
    intelligible: false,
    markedMoments: false,
    usableFootage: false,
  };
}

export function emptySupport(
  _packageId: CondensedPackageId = "clip_repurposing",
): Record<CondensedSupportId, CondensedSupportChoice> {
  return Object.fromEntries(STUDIO_EXTRA_IDS.map((id) => [id, ""])) as Record<
    CondensedSupportId,
    CondensedSupportChoice
  >;
}

/** Only known Extras survive a stored draft (retired support ids are dropped). */
function restoreSupport(
  packageId: CondensedPackageId,
  stored: unknown,
): Record<CondensedSupportId, CondensedSupportChoice> {
  const next = emptySupport(packageId);
  if (!stored || typeof stored !== "object") return next;
  for (const id of STUDIO_EXTRA_IDS) {
    const choice = (stored as Record<string, unknown>)[id];
    if (choice === "SELECT" || choice === "SKIP") next[id] = choice;
  }
  return next;
}

/** Selected Extras that the package allows, in canonical order. */
export function selectedStudioExtras(draft: CondensedJourneyDraft): CondensedSupportId[] {
  return supportOptionsForPackage(draft.packageId)
    .filter((option) => draft.support[option.id] === "SELECT")
    .map((option) => option.id);
}

/**
 * Add or Skip one Extra. A third Add is refused. Unselected Extras stay
 * unselected; they are not marked Skip just because two are already chosen.
 */
export function chooseStudioExtra(
  draft: CondensedJourneyDraft,
  id: CondensedSupportId,
  choice: "SELECT" | "SKIP",
): CondensedJourneyDraft {
  const eligible = supportOptionsForPackage(draft.packageId).map((option) => option.id);
  if (!eligible.includes(id)) return draft;
  const selected = selectedStudioExtras(draft);
  if (choice === "SELECT" && !selected.includes(id) && selected.length >= studioExtrasV1.maxSelectionsPerOrder) {
    return draft;
  }
  return { ...draft, support: { ...draft.support, [id]: choice } };
}

/** Take one chosen Extra off the order and leave the others untouched. */
export function removeStudioExtra(
  draft: CondensedJourneyDraft,
  id: CondensedSupportId,
): CondensedJourneyDraft {
  if (draft.support[id] !== "SELECT") return draft;
  const next = { ...draft, support: { ...draft.support, [id]: "" as const } };
  if (isSectionComplete(next, "support")) return next;
  return {
    ...next,
    completedSections: next.completedSections.filter((section) => section !== "support"),
  };
}

export function skipAllStudioExtras(draft: CondensedJourneyDraft): CondensedJourneyDraft {
  const support = { ...draft.support };
  for (const option of supportOptionsForPackage(draft.packageId)) support[option.id] = "SKIP";
  return { ...draft, support };
}

export function emptyCondensedJourneyDraft(
  packageId: CondensedPackageId = "clip_repurposing",
): CondensedJourneyDraft {
  return {
    version: 1,
    packageId,
    aboutYou: { name: "", email: "", company: "" },
    aboutProject: emptyAboutProject(),
    upload: { materials: "" },
    preferences: { mustKeep: "", mustNotInclude: "", studioDecide: false },
    support: emptySupport(packageId),
    completedSections: [],
  };
}

export function applyPackageIdentity(
  draft: CondensedJourneyDraft,
  nextPackageId: CondensedPackageId,
): CondensedJourneyDraft {
  if (draft.packageId === nextPackageId) {
    return { ...draft, packageId: nextPackageId };
  }
  const next = emptyCondensedJourneyDraft(nextPackageId);
  const kept = {
    ...next,
    aboutYou: draft.aboutYou,
  };
  if (isSectionComplete(kept, "about-you")) {
    kept.completedSections = ["about-you"];
  }
  return kept;
}

function requiredAboutProjectComplete(draft: CondensedJourneyDraft): boolean {
  if (isPublicLaunchPackageId(draft.packageId)) {
    return draft.aboutProject.purpose.trim().length > 0;
  }
  const fields = builderCopyForPackage(draft.packageId).aboutProject.fields;
  const answers = draft.aboutProject as unknown as Record<string, string | boolean>;
  return fields.every((field) => {
    if (!field.required) return true;
    const value = answers[field.name];
    if (field.kind === "checkbox") return value === true;
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function isSectionComplete(
  draft: CondensedJourneyDraft,
  id: CondensedBuilderSectionId,
): boolean {
  if (id === "about-you") {
    return Boolean(draft.aboutYou.name.trim() && draft.aboutYou.email.trim());
  }
  if (id === "about-project") {
    return requiredAboutProjectComplete(draft);
  }
  if (id === "upload") {
    if (isPublicLaunchPackageId(draft.packageId)) return true;
    return Boolean(draft.upload.materials.trim());
  }
  if (id === "preferences") {
    return true;
  }
  const options = supportOptionsForPackage(draft.packageId);
  const selectedCount = options.filter((option) => draft.support[option.id] === "SELECT").length;
  if (selectedCount >= studioExtrasV1.maxSelectionsPerOrder) return true;
  return options.every(
    (option) =>
      draft.support[option.id] === "SELECT" || draft.support[option.id] === "SKIP",
  );
}

export function requiredBuilderReady(draft: CondensedJourneyDraft): boolean {
  return (
    isSectionComplete(draft, "about-you") &&
    isSectionComplete(draft, "about-project") &&
    isSectionComplete(draft, "upload")
  );
}

export function selectedSupportLabels(draft: CondensedJourneyDraft): string[] {
  return supportOptionsForPackage(draft.packageId)
    .filter((option) => draft.support[option.id] === "SELECT")
    .map((option) => option.label);
}

export function skippedSupportLabels(draft: CondensedJourneyDraft): string[] {
  return supportOptionsForPackage(draft.packageId)
    .filter((option) => draft.support[option.id] === "SKIP")
    .map((option) => option.label);
}

export function readCondensedJourneyDraft(): CondensedJourneyDraft {
  if (typeof window === "undefined") return emptyCondensedJourneyDraft();
  try {
    const raw = window.sessionStorage.getItem(CONDENSED_JOURNEY_DRAFT_KEY);
    if (!raw) return emptyCondensedJourneyDraft();
    const parsed = JSON.parse(raw) as Partial<CondensedJourneyDraft> & {
      aboutProject?: Partial<CondensedAboutProject> & { talkingHeadConfirm?: boolean };
    };
    const packageId = resolveCondensedPackageId(parsed.packageId);
    const empty = emptyCondensedJourneyDraft(packageId);
    const oldConfirm = Boolean(parsed.aboutProject?.talkingHeadConfirm);
    return {
      ...empty,
      ...parsed,
      version: 1,
      packageId,
      aboutYou: { ...empty.aboutYou, ...parsed.aboutYou },
      aboutProject: {
        ...empty.aboutProject,
        ...parsed.aboutProject,
        qualifyingSource:
          parsed.aboutProject?.qualifyingSource ?? oldConfirm ?? false,
      },
      upload: { ...empty.upload, ...parsed.upload },
      preferences: { ...empty.preferences, ...parsed.preferences },
      support: restoreSupport(packageId, parsed.support),
      completedSections: Array.isArray(parsed.completedSections)
        ? parsed.completedSections
        : [],
      checkoutCampaignId:
        typeof parsed.checkoutCampaignId === "string" && parsed.checkoutCampaignId.trim()
          ? parsed.checkoutCampaignId.trim()
          : undefined,
    };
  } catch {
    return emptyCondensedJourneyDraft();
  }
}

export function writeCondensedJourneyDraft(
  draft: CondensedJourneyDraft,
): CondensedJourneyDraft {
  const next = {
    ...draft,
    version: 1 as const,
    packageId: resolveCondensedPackageId(draft.packageId),
  };
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(CONDENSED_JOURNEY_DRAFT_KEY, JSON.stringify(next));
  }
  return next;
}

export function markSectionComplete(
  draft: CondensedJourneyDraft,
  id: CondensedBuilderSectionId,
): CondensedJourneyDraft {
  if (!isSectionComplete(draft, id)) return draft;
  if (draft.completedSections.includes(id)) return draft;
  return writeCondensedJourneyDraft({
    ...draft,
    completedSections: [...draft.completedSections, id],
  });
}
