/**
 * Project Intake plan — one shared materials/contact section + per-service fields.
 * Fixes single-job intake that only used routeMapContext.jobId (first service).
 */

import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import {
  getRouteMapIntakeSchema,
  type RouteMapIntakeAnswers,
  type RouteMapIntakeField,
  type RouteMapIntakeTemplateId,
} from "@/catalog/intake";
import {
  builderCopyForPackage,
  CONDENSED_PACKAGE_IDS,
  type CondensedPackageId,
} from "@/config/studio-customer-journey-condense-v1";
import {
  getRouteMapJob,
  type RouteMapJobId,
} from "@/config/route-map-v1";

/** Contact / identity fields asked once for the whole project when present on any service. */
export const PROJECT_INTAKE_SHARED_CONTACT_FIELD_IDS = [
  "businessName",
  "phone",
  "email",
  "webOrSocial",
] as const;

export const PROJECT_INTAKE_SHARED_MATERIALS_KEY = "shared:materials" as const;

export type ProjectIntakeServiceSection = {
  serviceId: ServiceId;
  jobId: RouteMapJobId | ServiceId;
  jobName: string;
  intakeType: RouteMapIntakeTemplateId;
  /** Customer-facing section title (e.g. "Flyer"). */
  title: string;
  fields: readonly RouteMapIntakeField[];
};

export type ProjectIntakeSharedField = {
  /** Answer storage key — `shared:materials` or `shared:{fieldId}`. */
  answerKey: string;
  field: RouteMapIntakeField;
};

export type ProjectIntakePlan = {
  selectedServiceIds: readonly ServiceId[];
  sharedFields: readonly ProjectIntakeSharedField[];
  services: readonly ProjectIntakeServiceSection[];
};

export function projectIntakeServiceFieldKey(
  serviceId: string,
  fieldId: string,
): string {
  return `${serviceId}:${fieldId}`;
}

export function projectIntakeSharedContactKey(fieldId: string): string {
  return `shared:${fieldId}`;
}

/**
 * Copy contact the customer already gave into the intake answer bag.
 * Ask-once hides those questions. The continue button still reads this bag,
 * so a hidden answer has to be present or the button stays shut.
 * Blank answers are filled. An answer the customer already typed is left alone.
 */
export function withSavedIntakeContact(
  answers: RouteMapIntakeAnswers | null | undefined,
  packageId: string,
  contact?: {
    businessName?: string | null;
    email?: string | null;
    purpose?: string | null;
  },
): RouteMapIntakeAnswers {
  const filled: RouteMapIntakeAnswers = { ...(answers ?? {}) };
  const pairs: Array<[string, string]> = [
    [projectIntakeSharedContactKey("businessName"), contact?.businessName?.trim() ?? ""],
    [projectIntakeSharedContactKey("email"), contact?.email?.trim() ?? ""],
    [
      projectIntakeServiceFieldKey(packageId, "purpose"),
      contact?.purpose?.trim() ?? "",
    ],
  ];
  for (const [key, value] of pairs) {
    if (!value) continue;
    if (String(filled[key] ?? "").trim()) continue;
    filled[key] = value;
  }
  return filled;
}

const CLIP_PRODUCTION_FACT_FIELDS = [
  "purpose",
  "qualifyingSource",
  "intelligible",
  "rights",
] as const;

/** Production facts already saved for Clip. A blank call to action does not fail this. */
export function clipProductionFactsSaved(
  answers: Record<string, string | undefined> | null | undefined,
): boolean {
  return CLIP_PRODUCTION_FACT_FIELDS.every((fieldId) =>
    Boolean(readProjectIntakeAnswer(answers, fieldId, "clip_repurposing")),
  );
}

const CLIP_INTAKE_CHECK_FIELDS = ["qualifyingSource", "intelligible", "rights"] as const;
const CLIP_INTAKE_OPTIONAL_FIELDS = ["context", "cta", "mustKeep", "mustNot"] as const;

/**
 * Required Clip answers still missing after Build Your Project.
 * A blank call to action is not one of them.
 */
export function clipIntakeVisibleGaps(
  answers: Record<string, string | undefined> | null | undefined,
  contact?: {
    businessName?: string | null;
    email?: string | null;
    purpose?: string | null;
  },
): string[] {
  const filled: Record<string, string | undefined> = { ...(answers ?? {}) };
  const nameKey = projectIntakeSharedContactKey("businessName");
  const emailKey = projectIntakeSharedContactKey("email");
  const purposeKey = projectIntakeServiceFieldKey("clip_repurposing", "purpose");
  const savedName = contact?.businessName?.trim() ?? "";
  const savedEmail = contact?.email?.trim() ?? "";
  const savedPurpose = contact?.purpose?.trim() ?? "";
  if (!String(filled[nameKey] ?? "").trim() && savedName) filled[nameKey] = savedName;
  if (!String(filled[emailKey] ?? "").trim() && savedEmail) filled[emailKey] = savedEmail;
  if (!String(filled[purposeKey] ?? "").trim() && savedPurpose) filled[purposeKey] = savedPurpose;
  const keys = [
    nameKey,
    emailKey,
    purposeKey,
    ...CLIP_INTAKE_CHECK_FIELDS.map((fieldId) =>
      projectIntakeServiceFieldKey("clip_repurposing", fieldId),
    ),
  ];
  return keys.filter((key) => !String(filled[key] ?? "").trim());
}

/**
 * Optional Clip notes shown once, beside the required recording checks.
 */
export function clipIntakeOptionalKeys(
  answers: Record<string, string | undefined> | null | undefined,
): string[] {
  const checksOpen = CLIP_INTAKE_CHECK_FIELDS.some(
    (fieldId) => !readProjectIntakeAnswer(answers, fieldId, "clip_repurposing"),
  );
  if (!checksOpen) return [];
  return CLIP_INTAKE_OPTIONAL_FIELDS.map((fieldId) =>
    projectIntakeServiceFieldKey("clip_repurposing", fieldId),
  ).filter((key) => !String(answers?.[key] ?? "").trim());
}

/**
 * Social graphics questions still missing after Build Your Project.
 * Facts, logo notes, call to action, preferences, and the rights line stay there.
 * The actual files are added in My Studio.
 */
export function socialIntakeVisibleGaps(
  answers: Record<string, string | undefined> | null | undefined,
  contact?: {
    businessName?: string | null;
    email?: string | null;
    purpose?: string | null;
  },
): string[] {
  const filled: Record<string, string | undefined> = { ...(answers ?? {}) };
  const nameKey = projectIntakeSharedContactKey("businessName");
  const emailKey = projectIntakeSharedContactKey("email");
  const purposeKey = projectIntakeServiceFieldKey("social_and_promo_graphics", "purpose");
  const savedName = contact?.businessName?.trim() ?? "";
  const savedEmail = contact?.email?.trim() ?? "";
  const savedPurpose = contact?.purpose?.trim() ?? "";
  if (!String(filled[nameKey] ?? "").trim() && savedName) filled[nameKey] = savedName;
  if (!String(filled[emailKey] ?? "").trim() && savedEmail) filled[emailKey] = savedEmail;
  if (!String(filled[purposeKey] ?? "").trim() && savedPurpose) filled[purposeKey] = savedPurpose;
  const rightsKey = projectIntakeServiceFieldKey("social_and_promo_graphics", "rights");
  return [nameKey, emailKey, purposeKey, rightsKey].filter((key) => !String(filled[key] ?? "").trim());
}

const SOCIAL_INTAKE_OPTIONAL_FIELDS = ["facts", "assets", "cta", "mustKeep", "mustNot"] as const;

/** Optional Social notes shown once, beside the required permission check. */
export function socialIntakeOptionalKeys(
  answers: Record<string, string | undefined> | null | undefined,
): string[] {
  if (readProjectIntakeAnswer(answers, "rights", "social_and_promo_graphics")) return [];
  return SOCIAL_INTAKE_OPTIONAL_FIELDS.map((fieldId) =>
    projectIntakeServiceFieldKey("social_and_promo_graphics", fieldId),
  ).filter((key) => !String(answers?.[key] ?? "").trim());
}

const SHORT_FORM_INTAKE_CHECK_FIELDS = ["markedMoments", "usableFootage", "rights"] as const;
const SHORT_FORM_INTAKE_OPTIONAL_FIELDS = ["selectedMoments", "cta", "mustKeep", "mustNot"] as const;

/** Required Short-Form checks still missing after Build Your Project. */
export function shortFormIntakeVisibleGaps(
  answers: Record<string, string | undefined> | null | undefined,
  contact?: {
    businessName?: string | null;
    email?: string | null;
    purpose?: string | null;
  },
): string[] {
  const filled: Record<string, string | undefined> = { ...(answers ?? {}) };
  const nameKey = projectIntakeSharedContactKey("businessName");
  const emailKey = projectIntakeSharedContactKey("email");
  const purposeKey = projectIntakeServiceFieldKey("short_form_video_editing", "purpose");
  if (!String(filled[nameKey] ?? "").trim() && contact?.businessName?.trim()) {
    filled[nameKey] = contact.businessName.trim();
  }
  if (!String(filled[emailKey] ?? "").trim() && contact?.email?.trim()) {
    filled[emailKey] = contact.email.trim();
  }
  if (!String(filled[purposeKey] ?? "").trim() && contact?.purpose?.trim()) {
    filled[purposeKey] = contact.purpose.trim();
  }
  return [nameKey, emailKey, purposeKey, ...SHORT_FORM_INTAKE_CHECK_FIELDS.map((fieldId) =>
    projectIntakeServiceFieldKey("short_form_video_editing", fieldId),
  )].filter((key) => !String(filled[key] ?? "").trim());
}

/** Optional Short-Form notes shown once, beside the required footage checks. */
export function shortFormIntakeOptionalKeys(
  answers: Record<string, string | undefined> | null | undefined,
): string[] {
  const checksOpen = SHORT_FORM_INTAKE_CHECK_FIELDS.some(
    (fieldId) => !readProjectIntakeAnswer(answers, fieldId, "short_form_video_editing"),
  );
  if (!checksOpen) return [];
  return SHORT_FORM_INTAKE_OPTIONAL_FIELDS.map((fieldId) =>
    projectIntakeServiceFieldKey("short_form_video_editing", fieldId),
  ).filter((key) => !String(answers?.[key] ?? "").trim());
}

const KIT_INTAKE_REQUIRED_FIELDS = ["facts", "prices", "dates", "phone", "website", "rights"] as const;
const KIT_INTAKE_OPTIONAL_FIELDS = ["cta", "mustKeep", "mustNot"] as const;

/** Required Campaign Launch Kit details still missing after the objective is saved. */
export function kitIntakeVisibleGaps(
  answers: Record<string, string | undefined> | null | undefined,
  contact?: {
    businessName?: string | null;
    email?: string | null;
    purpose?: string | null;
  },
): string[] {
  const filled: Record<string, string | undefined> = { ...(answers ?? {}) };
  const nameKey = projectIntakeSharedContactKey("businessName");
  const emailKey = projectIntakeSharedContactKey("email");
  const purposeKey = projectIntakeServiceFieldKey("campaign_launch_kit", "purpose");
  if (!String(filled[nameKey] ?? "").trim() && contact?.businessName?.trim()) {
    filled[nameKey] = contact.businessName.trim();
  }
  if (!String(filled[emailKey] ?? "").trim() && contact?.email?.trim()) {
    filled[emailKey] = contact.email.trim();
  }
  if (!String(filled[purposeKey] ?? "").trim() && contact?.purpose?.trim()) {
    filled[purposeKey] = contact.purpose.trim();
  }
  return [nameKey, emailKey, purposeKey, ...KIT_INTAKE_REQUIRED_FIELDS.map((fieldId) =>
    projectIntakeServiceFieldKey("campaign_launch_kit", fieldId),
  )].filter((key) => !String(filled[key] ?? "").trim());
}

/** Optional Kit notes shown once, beside the required offer details. */
export function kitIntakeOptionalKeys(
  answers: Record<string, string | undefined> | null | undefined,
): string[] {
  const requiredOpen = KIT_INTAKE_REQUIRED_FIELDS.some(
    (fieldId) => !readProjectIntakeAnswer(answers, fieldId, "campaign_launch_kit"),
  );
  if (!requiredOpen) return [];
  return KIT_INTAKE_OPTIONAL_FIELDS.map((fieldId) =>
    projectIntakeServiceFieldKey("campaign_launch_kit", fieldId),
  ).filter((key) => !String(answers?.[key] ?? "").trim());
}

export const SOCIAL_FILES_NEXT = {
  statusLabel: "Files needed",
  lead: "Add your logo and photos in My Studio. Your project answers are already saved.",
  actionLabel: "Add the files",
  href: "/studio-board#sb-materials",
  materialsSupportLine:
    "Add your logo and photos in this section. Your project answers are already saved.",
} as const;

type SocialAnswerCampaign = {
  paymentReceivedAt?: string | null;
  condensedOffer?: {
    packageId?: string | null;
    company?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    projectNeed?: string | null;
  } | null;
  routeMapIntake?: { answers?: Record<string, string | undefined> | null } | null;
  routeMapIntakeDraft?: { answers?: Record<string, string | undefined> | null } | null;
};

/** Paid Social graphics project whose builder answers are already stored. The files are the remaining request. */
export function socialGraphicsFilesAreNext(
  campaign: SocialAnswerCampaign | null | undefined,
): boolean {
  if (!campaign?.paymentReceivedAt) return false;
  if (campaign.condensedOffer?.packageId !== "social_and_promo_graphics") return false;
  const answers = {
    ...(campaign.routeMapIntakeDraft?.answers ?? {}),
    ...(campaign.routeMapIntake?.answers ?? {}),
  };
  const offer = campaign.condensedOffer;
  return (
    socialIntakeVisibleGaps(answers, {
      businessName: offer?.company,
      purpose: offer?.projectNeed,
    }).length === 0
  );
}

/**
 * Read one Intake answer using the live form's storage keys first.
 * Live Project Intake writes `${serviceId}:${fieldId}` and `shared:{fieldId}`.
 * Production mappers historically read bare field ids — both must resolve.
 */
export function readProjectIntakeAnswer(
  answers: RouteMapIntakeAnswers | Record<string, string | undefined> | null | undefined,
  fieldId: string,
  serviceId?: string,
): string {
  if (!answers) return "";
  const candidates: Array<string | undefined> = [];
  if (serviceId) {
    candidates.push(answers[projectIntakeServiceFieldKey(serviceId, fieldId)]);
  }
  candidates.push(answers[projectIntakeSharedContactKey(fieldId)]);
  if (fieldId === "materials") {
    candidates.push(answers[PROJECT_INTAKE_SHARED_MATERIALS_KEY]);
  }
  candidates.push(answers[fieldId]);
  for (const value of candidates) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function sectionTitleFromSchema(schemaTitle: string, jobName: string): string {
  const stripped = schemaTitle.replace(/\s*Intake\s*$/i, "").trim();
  return stripped || jobName;
}

function isSharedContactField(fieldId: string): boolean {
  return (PROJECT_INTAKE_SHARED_CONTACT_FIELD_IDS as readonly string[]).includes(
    fieldId,
  );
}

/**
 * Build intake requirements for every selected service.
 * Materials + shared contact fields are asked once; service-unique fields stay per section.
 */
export function buildProjectIntakePlan(
  selectedServiceIds: readonly ServiceId[],
): ProjectIntakePlan {
  const sharedByKey = new Map<string, ProjectIntakeSharedField>();
  const services: ProjectIntakeServiceSection[] = [];
  const seen = new Set<string>();

  for (const serviceId of selectedServiceIds) {
    if (seen.has(serviceId)) continue;
    seen.add(serviceId);

    const job = getRouteMapJob(serviceId as RouteMapJobId);
    const catalog = getServiceById(serviceId);
    const intakeType = job?.intakeType ?? catalog?.intakeTemplate;
    if (!intakeType) continue;

    const schema = getRouteMapIntakeSchema(intakeType);
    const serviceFields: RouteMapIntakeField[] = [];

    for (const field of schema.fields) {
      if (field.role === "materials") {
        if (!sharedByKey.has(PROJECT_INTAKE_SHARED_MATERIALS_KEY)) {
          sharedByKey.set(PROJECT_INTAKE_SHARED_MATERIALS_KEY, {
            answerKey: PROJECT_INTAKE_SHARED_MATERIALS_KEY,
            field: {
              ...field,
              id: "materials",
              label: field.label,
              hint:
                field.hint ??
                "Describe filenames, links, or brand notes you have. If you do not have materials yet, say so — do not invent files. You can send an actual file from your Studio Board after this form.",
            },
          });
        } else {
          const existing = sharedByKey.get(PROJECT_INTAKE_SHARED_MATERIALS_KEY)!;
          if (field.required && !existing.field.required) {
            sharedByKey.set(PROJECT_INTAKE_SHARED_MATERIALS_KEY, {
              answerKey: PROJECT_INTAKE_SHARED_MATERIALS_KEY,
              field: { ...existing.field, required: true },
            });
          }
        }
        continue;
      }

      if (isSharedContactField(field.id)) {
        const answerKey = projectIntakeSharedContactKey(field.id);
        const prior = sharedByKey.get(answerKey);
        if (!prior) {
          sharedByKey.set(answerKey, { answerKey, field });
        } else if (field.required && !prior.field.required) {
          sharedByKey.set(answerKey, {
            answerKey,
            field: { ...prior.field, required: true },
          });
        }
        continue;
      }

      serviceFields.push(field);
    }

    const jobName = job?.name ?? catalog?.name ?? serviceId;
    services.push({
      serviceId,
      jobId: job?.id ?? serviceId,
      jobName,
      intakeType,
      title: sectionTitleFromSchema(schema.title, jobName),
      fields: serviceFields,
    });
  }

  const sharedOrder = [
    PROJECT_INTAKE_SHARED_MATERIALS_KEY,
    ...PROJECT_INTAKE_SHARED_CONTACT_FIELD_IDS.map(projectIntakeSharedContactKey),
  ];
  const sharedFields = sharedOrder
    .map((key) => sharedByKey.get(key))
    .filter((entry): entry is ProjectIntakeSharedField => Boolean(entry));

  for (const [key, entry] of sharedByKey) {
    if (!sharedFields.some((s) => s.answerKey === key)) {
      sharedFields.push(entry);
    }
  }

  return {
    selectedServiceIds: [...seen] as ServiceId[],
    sharedFields,
    services,
  };
}

const CONDENSED_MATERIALS_HINT: Record<CondensedPackageId, string> = {
  clip_repurposing:
    "After this form, you add one recording in My Studio. It should be 15–60 minutes, filmed vertically, in English, with one primary speaker. Name it here if you already know it.",
  short_form_video_editing:
    "After this form, you add up to 3 selected English clips in My Studio. Each one should be 45 seconds or less. Name the moments here if you already know them.",
  social_and_promo_graphics:
    "After this form, you add your logo and photos in My Studio. Name them here if you already know them, along with any prices or disclosures the graphics need.",
  creative_qa_finish:
    "After this form, you add one or two existing static assets in My Studio. Name them here if you already know them.",
  campaign_launch_kit:
    "After this form, you add your logo and photos in My Studio. The four channels are already set: flyer, email, two texts, and square plus portrait graphics.",
};

const CONDENSED_MATERIALS_PLACEHOLDER: Record<CondensedPackageId, string> = {
  clip_repurposing: "Name the recording if you already know it.",
  short_form_video_editing: "Name the clips or moments if you already know them.",
  social_and_promo_graphics: "Name the logo, photos, or facts if you already know them.",
  creative_qa_finish: "Name the existing static assets if you already know them.",
  campaign_launch_kit: "Name the logo or photos if you already know them.",
};

function condensedNote(
  id: string,
  label: string,
  required = false,
): RouteMapIntakeField {
  return { id, label, type: "textarea", required };
}

function condensedCheckbox(id: string, label: string): RouteMapIntakeField {
  return { id, label, type: "checkbox", required: true };
}

function builderFieldLabel(packageId: CondensedPackageId, name: string): string {
  return (
    builderCopyForPackage(packageId).aboutProject.fields.find((field) => field.name === name)
      ?.label ?? name
  );
}

function condensedPackageFields(packageId: CondensedPackageId): RouteMapIntakeField[] {
  const copy = builderCopyForPackage(packageId);
  if (packageId === "clip_repurposing") {
    return [
      condensedNote("purpose", builderFieldLabel(packageId, "purpose"), true),
      condensedCheckbox("qualifyingSource", builderFieldLabel(packageId, "qualifyingSource")),
      condensedCheckbox("intelligible", builderFieldLabel(packageId, "intelligible")),
      condensedCheckbox("rights", builderFieldLabel(packageId, "rights")),
      condensedNote("context", builderFieldLabel(packageId, "context")),
      condensedNote("cta", builderFieldLabel(packageId, "cta")),
      condensedNote("mustKeep", copy.preferences.mustKeep),
      condensedNote("mustNot", copy.preferences.mustNot),
    ];
  }
  if (packageId === "short_form_video_editing") {
    return [
      condensedNote("purpose", builderFieldLabel(packageId, "purpose"), true),
      condensedCheckbox("markedMoments", builderFieldLabel(packageId, "markedMoments")),
      condensedCheckbox("usableFootage", builderFieldLabel(packageId, "usableFootage")),
      condensedCheckbox("rights", builderFieldLabel(packageId, "rights")),
      condensedNote(
        "selectedMoments",
        "Which selected English clips or marked moments should be used?",
      ),
      condensedNote("cta", builderFieldLabel(packageId, "cta")),
      condensedNote("mustKeep", copy.preferences.mustKeep),
      condensedNote("mustNot", copy.preferences.mustNot),
    ];
  }
  if (packageId === "campaign_launch_kit") {
    return [
      condensedNote("purpose", builderFieldLabel(packageId, "purpose"), true),
      condensedNote("facts", builderFieldLabel(packageId, "facts"), true),
      condensedNote("prices", builderFieldLabel(packageId, "prices"), true),
      condensedNote("dates", builderFieldLabel(packageId, "dates"), true),
      condensedNote("phone", builderFieldLabel(packageId, "phone"), true),
      condensedNote("website", builderFieldLabel(packageId, "website"), true),
      condensedNote("cta", builderFieldLabel(packageId, "cta")),
      condensedNote("mustKeep", copy.preferences.mustKeep),
      condensedNote("mustNot", copy.preferences.mustNot),
      condensedCheckbox("rights", builderFieldLabel(packageId, "rights")),
    ];
  }
  return [
    condensedNote("purpose", builderFieldLabel(packageId, "purpose"), true),
    condensedNote("facts", builderFieldLabel(packageId, "facts")),
    condensedNote("assets", builderFieldLabel(packageId, "assets")),
    condensedNote("cta", builderFieldLabel(packageId, "cta")),
    condensedNote("mustKeep", copy.preferences.mustKeep),
    condensedNote("mustNot", copy.preferences.mustNot),
    condensedCheckbox("rights", builderFieldLabel(packageId, "rights")),
  ];
}

/**
 * Post-payment intake for a condensed launch offer.
 * Uses the existing intake field shape and the package's existing builder labels.
 * It does not load a historical catalog schema and it does not ask for a file.
 */
export function buildCondensedOfferIntakePlan(input: {
  packageId: string;
  name: string;
}): ProjectIntakePlan {
  const serviceId = input.packageId as ServiceId;
  const packageId = (CONDENSED_PACKAGE_IDS as readonly string[]).includes(
    input.packageId,
  )
    ? (input.packageId as CondensedPackageId)
    : null;
  const sharedFields: ProjectIntakeSharedField[] = [
    {
      answerKey: projectIntakeSharedContactKey("businessName"),
      field: {
        id: "businessName",
        label: "Business name",
        type: "text",
        required: true,
      },
    },
    {
      answerKey: projectIntakeSharedContactKey("email"),
      field: {
        id: "email",
        label: "Business email",
        type: "text",
        required: true,
      },
    },
    {
      answerKey: PROJECT_INTAKE_SHARED_MATERIALS_KEY,
      field: {
        id: "materials",
        label: "Materials you can describe",
        hint: packageId
          ? CONDENSED_MATERIALS_HINT[packageId]
          : "Describe filenames, links, or brand notes you have. If you do not have materials yet, say so. You can send an actual file from My Studio after this form.",
        placeholder: packageId ? CONDENSED_MATERIALS_PLACEHOLDER[packageId] : undefined,
        type: "textarea",
        required: false,
        role: "materials",
      },
    },
  ];
  return {
    selectedServiceIds: [serviceId],
    sharedFields,
    services: [
      {
        serviceId,
        jobId: serviceId,
        jobName: input.name,
        intakeType: "discovery",
        title: input.name,
        fields: packageId
          ? condensedPackageFields(packageId)
          : [
              {
                id: "projectNotes",
                label: "Anything else The Studio should know before starting?",
                type: "textarea",
                required: false,
              },
            ],
      },
    ],
  };
}

export function countProjectIntakeSections(plan: ProjectIntakePlan): number {
  return (
    plan.sharedFields.length +
    plan.services.reduce((sum, section) => sum + section.fields.length, 0)
  );
}
