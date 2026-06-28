import type { ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlan } from "@/config/studio-board";
import { resolveApprovedServiceDisplayNames } from "@/lib/approved-plan-display";

/** Green SKUs eligible for post-payment Project Details intake (V1). */
export const PROJECT_DETAILS_GREEN_SKU_IDS = [
  "bf-001",
  "sm-001",
  "sm-001-monthly",
  "em-001",
  "em-001-monthly",
  "cc-001",
  "ma-001",
  "ap-001",
] as const satisfies readonly ServiceId[];

export type ProjectDetailsGreenSkuId = (typeof PROJECT_DETAILS_GREEN_SKU_IDS)[number];

export const PROJECT_DETAILS_ROUTE = "/project-details";

export type ProjectDetailsStepId =
  | "working-on"
  | "brand-materials"
  | "channels"
  | "service-specific"
  | "approval-contact"
  | "final-review";

export type ProjectDetailsFileCategory =
  | "logo"
  | "photos"
  | "graphics"
  | "brand-materials"
  | "script";

export type ProjectDetailsUploadedFile = {
  id: string;
  category: ProjectDetailsFileCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type ProjectDetailsFormValues = {
  workingOn: string;
  mainOffer: string;
  importantDates: string;
  callToAction: string;
  destinationLink: string;
  mustIncludeExactly: string;
  brandColorsFonts: string;
  inspirationLinks: string;
  brandDoNotUse: string;
  brandOutdatedParts: string;
  brandPartsToKeep: string;
  socialPlatforms: string;
  socialAccountLinks: string;
  socialPostingWindow: string;
  emailPlatform: string;
  emailSender: string;
  emailSendTiming: string;
  emailListReady: string;
  conceptIntendedUse: string;
  conceptAudience: string;
  conceptRequiredWording: string;
  marketingPieces: string;
  marketingPieceUsage: string;
  marketingFormats: string;
  adScript: string;
  adIntendedUse: string;
  adVoiceStyle: string;
  adPronunciation: string;
  primaryApproverName: string;
  primaryApproverEmail: string;
  hasSecondaryApprover: string;
  secondaryApproverName: string;
  secondaryApproverEmail: string;
};

export type ProjectDetailsRecord = {
  form: ProjectDetailsFormValues;
  files: readonly ProjectDetailsUploadedFile[];
  submittedAt?: string;
};

export const EMPTY_PROJECT_DETAILS_FORM: ProjectDetailsFormValues = {
  workingOn: "",
  mainOffer: "",
  importantDates: "",
  callToAction: "",
  destinationLink: "",
  mustIncludeExactly: "",
  brandColorsFonts: "",
  inspirationLinks: "",
  brandDoNotUse: "",
  brandOutdatedParts: "",
  brandPartsToKeep: "",
  socialPlatforms: "",
  socialAccountLinks: "",
  socialPostingWindow: "",
  emailPlatform: "",
  emailSender: "",
  emailSendTiming: "",
  emailListReady: "",
  conceptIntendedUse: "",
  conceptAudience: "",
  conceptRequiredWording: "",
  marketingPieces: "",
  marketingPieceUsage: "",
  marketingFormats: "",
  adScript: "",
  adIntendedUse: "",
  adVoiceStyle: "",
  adPronunciation: "",
  primaryApproverName: "",
  primaryApproverEmail: "",
  hasSecondaryApprover: "",
  secondaryApproverName: "",
  secondaryApproverEmail: "",
};

const STEP1_SKUS: readonly ServiceId[] = [
  "sm-001",
  "sm-001-monthly",
  "em-001",
  "em-001-monthly",
  "cc-001",
  "ma-001",
  "ap-001",
];

const STEP2_SKUS: readonly ServiceId[] = [
  "bf-001",
  "sm-001",
  "sm-001-monthly",
  "ma-001",
  "em-001",
  "em-001-monthly",
  "ap-001",
];

const SOCIAL_SKUS: readonly ServiceId[] = ["sm-001", "sm-001-monthly"];
const EMAIL_SKUS: readonly ServiceId[] = ["em-001", "em-001-monthly"];

export const projectDetails = {
  pageTitle: "Project Details",
  pageLead:
    "Tell us what we need to complete the services in your approved Studio Plan.",
  submitLabel: "Submit Project Details",
  workBeginsNote: "Work begins after required details and materials are received.",
  prefill: {
    businessNameLabel: "Business name",
    businessOfferLabel: "What your business offers",
    selectedServicesLabel: "Selected services",
    discoverySummaryLabel: "Discovery summary",
  },
  steps: {
    "working-on": {
      id: "working-on" as const,
      title: "What are we working on?",
      order: 1,
    },
    "brand-materials": {
      id: "brand-materials" as const,
      title: "Brand materials",
      order: 2,
    },
    channels: {
      id: "channels" as const,
      title: "Channel details",
      order: 3,
    },
    "service-specific": {
      id: "service-specific" as const,
      title: "Service-specific details",
      order: 4,
    },
    "approval-contact": {
      id: "approval-contact" as const,
      title: "Approval contact",
      order: 5,
    },
    "final-review": {
      id: "final-review" as const,
      title: "Final review",
      order: 6,
    },
  },
  fields: {
    workingOn: {
      label: "What are we promoting or working on?",
      required: true,
    },
    mainOffer: {
      label: "Main offer, event, announcement, or message",
      required: true,
    },
    importantDates: {
      label: "Important dates or deadlines",
      required: true,
    },
    callToAction: {
      label: "What should people do next?",
      placeholder: "Visit a link, call, book, shop, RSVP, stop by, etc.",
      required: true,
    },
    destinationLink: {
      label: "Link, phone number, or destination to use",
      required: true,
    },
    mustIncludeExactly: {
      label: "Anything that must be included exactly",
      required: false,
    },
    brandUploads: {
      label: "Upload logo, photos, graphics, or brand materials",
      required: true,
    },
    brandLinks: {
      label: "Links or examples (optional alternative to uploads)",
      required: false,
    },
    brandColorsFonts: {
      label: "Existing colors or fonts to keep",
      required: false,
    },
    inspirationLinks: {
      label: "Links or examples you like",
      required: false,
    },
    brandDoNotUse: {
      label: "Anything you do not want used",
      required: false,
    },
    brandOutdatedParts: {
      label: "What feels outdated or inconsistent?",
      required: true,
      bf001Only: true,
    },
    brandPartsToKeep: {
      label: "What parts of your current look should stay?",
      required: true,
      bf001Only: true,
    },
    socialPlatforms: {
      label: "Which platforms should we use?",
      required: true,
    },
    socialAccountLinks: {
      label: "Account links or handles",
      required: true,
    },
    socialPostingWindow: {
      label: "Preferred posting window or dates",
      required: false,
    },
    emailPlatform: {
      label: "Email platform",
      required: true,
    },
    emailSender: {
      label: "Sender name and address",
      required: true,
    },
    emailSendTiming: {
      label: "When should emails send?",
      required: true,
    },
    emailListReady: {
      label: "Is your email list ready to use?",
      required: true,
    },
    conceptIntendedUse: {
      label: "Intended use for campaign concepts",
      required: true,
    },
    conceptAudience: {
      label: "Audience for these concepts",
      required: true,
    },
    conceptRequiredWording: {
      label: "Required wording, facts, or claims",
      required: true,
    },
    marketingPieces: {
      label: "Four requested marketing pieces",
      required: true,
    },
    marketingPieceUsage: {
      label: "Where each piece will be used",
      required: true,
    },
    marketingFormats: {
      label: "Preferred sizes or formats",
      required: false,
    },
    adScript: {
      label: "Script (upload or paste below)",
      required: true,
    },
    adIntendedUse: {
      label: "Intended use for this ad package",
      required: true,
    },
    adVoiceStyle: {
      label: "Voice style preferences",
      required: false,
    },
    adPronunciation: {
      label: "Pronunciation notes",
      required: false,
    },
    primaryApproverName: {
      label: "Primary approver name",
      required: true,
    },
    primaryApproverEmail: {
      label: "Primary approver email",
      required: true,
    },
    hasSecondaryApprover: {
      label: "Is there a secondary approver?",
      required: false,
    },
    secondaryApproverName: {
      label: "Secondary approver name",
      required: false,
    },
    secondaryApproverEmail: {
      label: "Secondary approver email",
      required: false,
    },
  },
  fileCategories: {
    logo: "Logo",
    photos: "Photos",
    graphics: "Graphics",
    "brand-materials": "Brand materials",
    script: "Script",
  } as const satisfies Record<ProjectDetailsFileCategory, string>,
} as const;

export function resolveApprovedGreenServiceIds(
  approved?: ApprovedStudioPlan | null,
): ServiceId[] {
  if (!approved) return [];
  const selected =
    approved.selectedServiceIds?.length > 0
      ? approved.selectedServiceIds
      : [...approved.includedServiceIds, ...approved.additionalServiceIds];
  const greenSet = new Set<string>(PROJECT_DETAILS_GREEN_SKU_IDS);
  return selected.filter((id) => greenSet.has(id));
}

export function planHasSku(serviceIds: readonly ServiceId[], skuIds: readonly ServiceId[]) {
  const set = new Set(serviceIds);
  return skuIds.some((id) => set.has(id));
}

export function resolveProjectDetailsSteps(serviceIds: readonly ServiceId[]): ProjectDetailsStepId[] {
  const steps: ProjectDetailsStepId[] = [];

  if (planHasSku(serviceIds, STEP1_SKUS)) {
    steps.push("working-on");
  }
  if (planHasSku(serviceIds, STEP2_SKUS)) {
    steps.push("brand-materials");
  }
  if (planHasSku(serviceIds, SOCIAL_SKUS) || planHasSku(serviceIds, EMAIL_SKUS)) {
    steps.push("channels");
  }
  if (planHasSku(serviceIds, ["cc-001", "ma-001", "ap-001"])) {
    steps.push("service-specific");
  }
  steps.push("approval-contact", "final-review");
  return steps;
}

export function stepShowsSocial(serviceIds: readonly ServiceId[]) {
  return planHasSku(serviceIds, SOCIAL_SKUS);
}

export function stepShowsEmail(serviceIds: readonly ServiceId[]) {
  return planHasSku(serviceIds, EMAIL_SKUS);
}

export function stepShowsConcepts(serviceIds: readonly ServiceId[]) {
  return serviceIds.includes("cc-001");
}

export function stepShowsMarketingAutomation(serviceIds: readonly ServiceId[]) {
  return serviceIds.includes("ma-001");
}

export function stepShowsAdPackage(serviceIds: readonly ServiceId[]) {
  return serviceIds.includes("ap-001");
}

export function stepRequiresBrandFoundationQuestions(serviceIds: readonly ServiceId[]) {
  return serviceIds.includes("bf-001");
}

function fieldFilled(value: string | undefined) {
  return Boolean(value?.trim());
}

function brandMaterialsSatisfied(
  form: ProjectDetailsFormValues,
  files: readonly ProjectDetailsUploadedFile[],
  serviceIds: readonly ServiceId[],
): boolean {
  const hasUploads = files.some((file) =>
    ["logo", "photos", "graphics", "brand-materials"].includes(file.category),
  );
  if (!hasUploads) {
    return false;
  }
  if (stepRequiresBrandFoundationQuestions(serviceIds)) {
    if (!fieldFilled(form.brandOutdatedParts) || !fieldFilled(form.brandPartsToKeep)) {
      return false;
    }
  }
  return true;
}

export function isProjectDetailsStepValid(
  stepId: ProjectDetailsStepId,
  form: ProjectDetailsFormValues,
  files: readonly ProjectDetailsUploadedFile[],
  serviceIds: readonly ServiceId[],
): boolean {
  switch (stepId) {
    case "working-on":
      return (
        fieldFilled(form.workingOn) &&
        fieldFilled(form.mainOffer) &&
        fieldFilled(form.importantDates) &&
        fieldFilled(form.callToAction) &&
        fieldFilled(form.destinationLink)
      );
    case "brand-materials":
      return brandMaterialsSatisfied(form, files, serviceIds);
    case "channels": {
      let valid = true;
      if (stepShowsSocial(serviceIds)) {
        valid =
          valid &&
          fieldFilled(form.socialPlatforms) &&
          fieldFilled(form.socialAccountLinks);
      }
      if (stepShowsEmail(serviceIds)) {
        valid =
          valid &&
          fieldFilled(form.emailPlatform) &&
          fieldFilled(form.emailSender) &&
          fieldFilled(form.emailSendTiming) &&
          fieldFilled(form.emailListReady);
      }
      return valid;
    }
    case "service-specific": {
      let valid = true;
      if (stepShowsConcepts(serviceIds)) {
        valid =
          valid &&
          fieldFilled(form.conceptIntendedUse) &&
          fieldFilled(form.conceptAudience) &&
          fieldFilled(form.conceptRequiredWording);
      }
      if (stepShowsMarketingAutomation(serviceIds)) {
        valid =
          valid &&
          fieldFilled(form.marketingPieces) &&
          fieldFilled(form.marketingPieceUsage);
      }
      if (stepShowsAdPackage(serviceIds)) {
        const hasScript =
          fieldFilled(form.adScript) || files.some((file) => file.category === "script");
        valid = valid && hasScript && fieldFilled(form.adIntendedUse);
      }
      return valid;
    }
    case "approval-contact": {
      if (!fieldFilled(form.primaryApproverName) || !fieldFilled(form.primaryApproverEmail)) {
        return false;
      }
      if (form.hasSecondaryApprover === "yes") {
        return (
          fieldFilled(form.secondaryApproverName) && fieldFilled(form.secondaryApproverEmail)
        );
      }
      return true;
    }
    case "final-review": {
      const steps = resolveProjectDetailsSteps(serviceIds).filter((id) => id !== "final-review");
      return steps.every((id) =>
        isProjectDetailsStepValid(id, form, files, serviceIds),
      );
    }
    default:
      return false;
  }
}

export function isProjectDetailsFormValid(
  form: ProjectDetailsFormValues,
  files: readonly ProjectDetailsUploadedFile[],
  serviceIds: readonly ServiceId[],
): boolean {
  const steps = resolveProjectDetailsSteps(serviceIds);
  return steps.every((stepId) =>
    isProjectDetailsStepValid(stepId, form, files, serviceIds),
  );
}

export type ProjectDetailsMissingItem = {
  stepId: ProjectDetailsStepId;
  label: string;
};

export function resolveProjectDetailsMissingItems(
  form: ProjectDetailsFormValues,
  files: readonly ProjectDetailsUploadedFile[],
  serviceIds: readonly ServiceId[],
): ProjectDetailsMissingItem[] {
  const missing: ProjectDetailsMissingItem[] = [];
  const steps = resolveProjectDetailsSteps(serviceIds).filter((id) => id !== "final-review");

  for (const stepId of steps) {
    if (isProjectDetailsStepValid(stepId, form, files, serviceIds)) continue;

    if (stepId === "working-on") {
      if (!fieldFilled(form.workingOn)) {
        missing.push({ stepId, label: projectDetails.fields.workingOn.label });
      }
      if (!fieldFilled(form.mainOffer)) {
        missing.push({ stepId, label: projectDetails.fields.mainOffer.label });
      }
      if (!fieldFilled(form.importantDates)) {
        missing.push({ stepId, label: projectDetails.fields.importantDates.label });
      }
      if (!fieldFilled(form.callToAction)) {
        missing.push({ stepId, label: projectDetails.fields.callToAction.label });
      }
      if (!fieldFilled(form.destinationLink)) {
        missing.push({ stepId, label: projectDetails.fields.destinationLink.label });
      }
    }

    if (stepId === "brand-materials") {
      const hasUploads = files.some((file) =>
        ["logo", "photos", "graphics", "brand-materials"].includes(file.category),
      );
      if (!hasUploads) {
        missing.push({ stepId, label: projectDetails.fields.brandUploads.label });
      }
      if (stepRequiresBrandFoundationQuestions(serviceIds)) {
        if (!fieldFilled(form.brandOutdatedParts)) {
          missing.push({ stepId, label: projectDetails.fields.brandOutdatedParts.label });
        }
        if (!fieldFilled(form.brandPartsToKeep)) {
          missing.push({ stepId, label: projectDetails.fields.brandPartsToKeep.label });
        }
      }
    }

    if (stepId === "channels") {
      if (stepShowsSocial(serviceIds)) {
        if (!fieldFilled(form.socialPlatforms)) {
          missing.push({ stepId, label: projectDetails.fields.socialPlatforms.label });
        }
        if (!fieldFilled(form.socialAccountLinks)) {
          missing.push({ stepId, label: projectDetails.fields.socialAccountLinks.label });
        }
      }
      if (stepShowsEmail(serviceIds)) {
        if (!fieldFilled(form.emailPlatform)) {
          missing.push({ stepId, label: projectDetails.fields.emailPlatform.label });
        }
        if (!fieldFilled(form.emailSender)) {
          missing.push({ stepId, label: projectDetails.fields.emailSender.label });
        }
        if (!fieldFilled(form.emailSendTiming)) {
          missing.push({ stepId, label: projectDetails.fields.emailSendTiming.label });
        }
        if (!fieldFilled(form.emailListReady)) {
          missing.push({ stepId, label: projectDetails.fields.emailListReady.label });
        }
      }
    }

    if (stepId === "service-specific") {
      if (stepShowsConcepts(serviceIds)) {
        if (!fieldFilled(form.conceptIntendedUse)) {
          missing.push({ stepId, label: projectDetails.fields.conceptIntendedUse.label });
        }
        if (!fieldFilled(form.conceptAudience)) {
          missing.push({ stepId, label: projectDetails.fields.conceptAudience.label });
        }
        if (!fieldFilled(form.conceptRequiredWording)) {
          missing.push({ stepId, label: projectDetails.fields.conceptRequiredWording.label });
        }
      }
      if (stepShowsMarketingAutomation(serviceIds)) {
        if (!fieldFilled(form.marketingPieces)) {
          missing.push({ stepId, label: projectDetails.fields.marketingPieces.label });
        }
        if (!fieldFilled(form.marketingPieceUsage)) {
          missing.push({ stepId, label: projectDetails.fields.marketingPieceUsage.label });
        }
      }
      if (stepShowsAdPackage(serviceIds)) {
        const hasScript =
          fieldFilled(form.adScript) || files.some((file) => file.category === "script");
        if (!hasScript) {
          missing.push({ stepId, label: projectDetails.fields.adScript.label });
        }
        if (!fieldFilled(form.adIntendedUse)) {
          missing.push({ stepId, label: projectDetails.fields.adIntendedUse.label });
        }
      }
    }

    if (stepId === "approval-contact") {
      if (!fieldFilled(form.primaryApproverName)) {
        missing.push({ stepId, label: projectDetails.fields.primaryApproverName.label });
      }
      if (!fieldFilled(form.primaryApproverEmail)) {
        missing.push({ stepId, label: projectDetails.fields.primaryApproverEmail.label });
      }
      if (form.hasSecondaryApprover === "yes") {
        if (!fieldFilled(form.secondaryApproverName)) {
          missing.push({ stepId, label: projectDetails.fields.secondaryApproverName.label });
        }
        if (!fieldFilled(form.secondaryApproverEmail)) {
          missing.push({ stepId, label: projectDetails.fields.secondaryApproverEmail.label });
        }
      }
    }
  }

  return missing;
}

export function projectDetailsHref(packageId?: string): string {
  if (!packageId) return PROJECT_DETAILS_ROUTE;
  return `${PROJECT_DETAILS_ROUTE}?package=${packageId}`;
}

/** Final review — client-facing service names only (never SKU IDs). */
export function resolveProjectDetailsReviewServiceNames(
  approved: ApprovedStudioPlan | null | undefined,
  serviceIds: readonly ServiceId[],
): readonly string[] {
  if (!approved) return [];
  return resolveApprovedServiceDisplayNames(approved, serviceIds);
}
