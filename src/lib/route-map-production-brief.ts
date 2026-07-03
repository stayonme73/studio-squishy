/**
 * Route Map V2 — intake answers → client Campaign Record summary + internal production brief.
 * Business rules live here; UI components render resolved view-models only.
 */

import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import {
  getRouteMapIntakeSchema,
  type RouteMapIntakeAnswers,
} from "@/config/route-map-intake-v1";
import {
  getRouteMapJob,
  type RouteMapIntakeType,
  type RouteMapJobId,
} from "@/config/route-map-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { resolveApprovedPlanServiceNames } from "@/lib/approved-plan-display";

export type RouteMapSummaryItem = {
  label: string;
  value: string;
};

export type RouteMapClientSummary = {
  title: string;
  submittedAt: string;
  items: readonly RouteMapSummaryItem[];
  clientNote?: string;
};

export type RouteMapProductionBriefSection = {
  title: string;
  items: readonly RouteMapSummaryItem[];
};

export type RouteMapProductionBrief = {
  jobName: string;
  skuId: RouteMapJobId;
  intakeType: RouteMapIntakeType;
  submittedAt: string;
  sections: readonly RouteMapProductionBriefSection[];
  postPublishIncluded: boolean;
};

type ProductionFieldDef = {
  label: string;
  fieldId: string;
};

type ProductionSectionDef = {
  title: string;
  fields: readonly ProductionFieldDef[];
};

const V2_RUT_INTAKE_TYPES = new Set<RouteMapIntakeType>([
  "rtu-flyer",
  "rtu-menu",
  "rtu-service-sheet",
  "rtu-social-posts",
  "rtu-promotion-graphics",
  "rtu-email-kit",
  "rtu-sms-kit",
  "rtu-voice",
  "rtu-short-video",
]);

const PRODUCTION_SECTIONS: Partial<Record<RouteMapIntakeType, readonly ProductionSectionDef[]>> = {
  "rtu-flyer": [
    {
      title: "Flyer",
      fields: [
        { label: "Purpose", fieldId: "flyerPurpose" },
        { label: "Required wording", fieldId: "mustInclude" },
        { label: "Size", fieldId: "sizeNotes" },
        { label: "Print / digital use", fieldId: "intendedUse" },
        { label: "Materials", fieldId: "materials" },
        { label: "Disclosures (client-supplied)", fieldId: "disclaimers" },
      ],
    },
  ],
  "rtu-menu": [
    {
      title: "Menu",
      fields: [
        { label: "Business", fieldId: "businessName" },
        { label: "Sections & order", fieldId: "sections" },
        { label: "Items & prices", fieldId: "items" },
        { label: "Dietary / allergen labels", fieldId: "dietaryLabels" },
        { label: "Size", fieldId: "sizeNotes" },
        { label: "Print / digital use", fieldId: "intendedUse" },
        { label: "Materials", fieldId: "materials" },
        { label: "Disclosures (client-supplied)", fieldId: "disclaimers" },
      ],
    },
  ],
  "rtu-service-sheet": [
    {
      title: "Service sheet",
      fields: [
        { label: "Services & prices", fieldId: "services" },
        { label: "Contact details", fieldId: "contactDetails" },
        { label: "Required wording", fieldId: "wording" },
        { label: "Size", fieldId: "sizeNotes" },
        { label: "Materials", fieldId: "materials" },
      ],
    },
  ],
  "rtu-social-posts": [
    {
      title: "Social posts",
      fields: [
        { label: "Theme / campaign focus", fieldId: "postsAbout" },
        { label: "Platform", fieldId: "platform" },
        { label: "CTA & key details", fieldId: "callToAction" },
        { label: "Required wording & hashtags", fieldId: "wordingHashtags" },
        { label: "Assets", fieldId: "materials" },
        { label: "Must not say or show", fieldId: "mustNotSay" },
      ],
    },
    {
      title: "Post / Publish",
      fields: [
        { label: "Publish platform", fieldId: "publishPlatform" },
        { label: "Account access", fieldId: "publishAccess" },
        { label: "Publish timing", fieldId: "publishTiming" },
      ],
    },
  ],
  "rtu-promotion-graphics": [
    {
      title: "Campaign graphics",
      fields: [
        { label: "Campaign focus", fieldId: "campaignFocus" },
        { label: "Exact copy", fieldId: "mustInclude" },
        { label: "Dates & deadlines", fieldId: "dates" },
        { label: "CTA / link / phone", fieldId: "callToAction" },
        { label: "Intended use", fieldId: "intendedUse" },
        { label: "Size / format", fieldId: "sizeNotes" },
        { label: "Materials", fieldId: "materials" },
        { label: "Disclosures (client-supplied)", fieldId: "disclaimers" },
      ],
    },
  ],
  "rtu-email-kit": [
    {
      title: "Email kit",
      fields: [
        { label: "Campaign goal", fieldId: "campaignGoal" },
        { label: "Message & required copy", fieldId: "mustInclude" },
        { label: "CTA", fieldId: "callToAction" },
        { label: "Materials", fieldId: "materials" },
        { label: "Compliance wording", fieldId: "compliance" },
        { label: "Must not say or show", fieldId: "mustNotSay" },
      ],
    },
    {
      title: "Client sending responsibilities",
      fields: [
        { label: "List & consent", fieldId: "listConsent" },
        { label: "Sending account / platform", fieldId: "sendingAccount" },
      ],
    },
  ],
  "rtu-sms-kit": [
    {
      title: "SMS kit",
      fields: [
        { label: "Campaign goal", fieldId: "campaignGoal" },
        { label: "Required offer / dates / links", fieldId: "mustInclude" },
        { label: "CTA", fieldId: "callToAction" },
        { label: "Message copy (up to 4)", fieldId: "messageCopy" },
        { label: "Sequence timing", fieldId: "timingNotes" },
        { label: "Opt-out / compliance wording", fieldId: "optOutWording" },
        { label: "Must not say or show", fieldId: "mustNotSay" },
      ],
    },
    {
      title: "Client sending responsibilities",
      fields: [
        { label: "List & SMS consent", fieldId: "listConsent" },
        { label: "Sending account / platform", fieldId: "sendingAccount" },
      ],
    },
  ],
  "rtu-voice": [
    {
      title: "Voice announcement",
      fields: [
        { label: "Purpose & key message", fieldId: "announcementPurpose" },
        { label: "Approved details for script", fieldId: "approvedDetails" },
        { label: "Voice style", fieldId: "voiceTone" },
        { label: "Language", fieldId: "language" },
        { label: "Pronunciation notes", fieldId: "pronunciationNotes" },
        { label: "Must not say", fieldId: "mustNotSay" },
      ],
    },
  ],
  "rtu-short-video": [
    {
      title: "Short video",
      fields: [
        { label: "Purpose", fieldId: "videoPurpose" },
        { label: "Format", fieldId: "format" },
        { label: "Footage & assets", fieldId: "footageMaterials" },
        { label: "On-screen text & CTA", fieldId: "onScreenText" },
        { label: "Brand style references", fieldId: "brandStyle" },
        { label: "Captions / disclaimers", fieldId: "disclaimers" },
        { label: "Must not show or say", fieldId: "mustNotShow" },
      ],
    },
  ],
};

function trimField(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function resolveRouteMapIntakeContext(campaign: CampaignRecord) {
  const answers = campaign.routeMapIntake?.answers;
  const submittedAt = campaign.routeMapIntakeSubmittedAt;
  const jobId = campaign.routeMapContext?.jobId;
  if (!answers || !submittedAt || !jobId) return null;

  const job = getRouteMapJob(jobId);
  if (!job) return null;

  const includePostPublish = campaign.routeMapContext?.postPublishAddon === true;
  const schema = getRouteMapIntakeSchema(job.intakeType, { includePostPublish });

  return { answers, submittedAt, job, jobId, schema, includePostPublish };
}

function buildItemsFromFields(
  answers: RouteMapIntakeAnswers,
  fields: readonly { label: string; fieldId: string }[],
): RouteMapSummaryItem[] {
  return fields
    .map(({ label, fieldId }) => ({ label, value: trimField(answers[fieldId]) }))
    .filter((item) => item.value);
}

/** Client-facing intake summary — what the customer submitted, using intake form labels. */
export function resolveRouteMapClientSummary(
  campaign: CampaignRecord,
): RouteMapClientSummary | null {
  const ctx = resolveRouteMapIntakeContext(campaign);
  if (!ctx) return null;

  const items = ctx.schema.fields
    .map((field) => ({ label: field.label, value: trimField(ctx.answers[field.id]) }))
    .filter((item) => item.value);

  if (items.length === 0) return null;

  return {
    title: ctx.schema.title,
    submittedAt: ctx.submittedAt,
    items,
    clientNote: ctx.schema.clientResponsibilityNote,
  };
}

function buildJobContextSection(campaign: CampaignRecord, jobId: RouteMapJobId): RouteMapProductionBriefSection {
  const job = getRouteMapJob(jobId)!;
  const catalog = getServiceById(jobId as ServiceId);
  const serviceNames = campaign.approvedStudioPlan
    ? resolveApprovedPlanServiceNames(campaign.approvedStudioPlan)
    : [job.name];
  const deliverables =
    campaign.approvedStudioPlan?.lineItems.flatMap((line) => line.deliverables) ??
    catalog?.deliverables ??
    job.deliverables;

  return {
    title: "Job context",
    items: [
      { label: "Job", value: job.name },
      { label: "SKU", value: jobId },
      { label: "Turnaround", value: job.timingLabel },
      { label: "Approved services", value: serviceNames.join(", ") },
      { label: "Deliverables", value: deliverables.join("; ") },
    ],
  };
}

function buildGenericProductionSections(
  intakeType: RouteMapIntakeType,
  answers: RouteMapIntakeAnswers,
  schemaTitle: string,
  includePostPublish: boolean,
): readonly RouteMapProductionBriefSection[] {
  const sectionDefs = PRODUCTION_SECTIONS[intakeType];
  if (sectionDefs) {
    return sectionDefs
      .map((section) => {
        if (section.title === "Post / Publish" && !includePostPublish) {
          return { title: section.title, items: [] as RouteMapSummaryItem[] };
        }
        return {
          title: section.title,
          items: buildItemsFromFields(answers, section.fields),
        };
      })
      .filter((section) => section.items.length > 0);
  }

  const schema = getRouteMapIntakeSchema(intakeType, { includePostPublish });
  const items = schema.fields
    .map((field) => ({ label: field.label, value: trimField(answers[field.id]) }))
    .filter((item) => item.value);

  return items.length ? [{ title: schemaTitle, items }] : [];
}

/** Internal production brief — job-specific work instructions for the team. */
export function resolveRouteMapProductionBrief(
  campaign: CampaignRecord,
): RouteMapProductionBrief | null {
  const ctx = resolveRouteMapIntakeContext(campaign);
  if (!ctx) return null;

  const contentSections = buildGenericProductionSections(
    ctx.job.intakeType,
    ctx.answers,
    ctx.schema.title,
    ctx.includePostPublish,
  );
  if (contentSections.length === 0) return null;

  const sections: RouteMapProductionBriefSection[] = [
    buildJobContextSection(campaign, ctx.jobId),
    ...contentSections,
  ];

  if (ctx.schema.clientResponsibilityNote) {
    sections.push({
      title: "Client responsibilities",
      items: [{ label: "Reminder", value: ctx.schema.clientResponsibilityNote }],
    });
  }

  if (ctx.includePostPublish && ctx.job.intakeType === "rtu-social-posts") {
    sections.push({
      title: "Add-on",
      items: [{ label: "Post / Publish", value: "Included at checkout — publish fields above." }],
    });
  }

  return {
    jobName: ctx.job.name,
    skuId: ctx.jobId,
    intakeType: ctx.job.intakeType,
    submittedAt: ctx.submittedAt,
    sections,
    postPublishIncluded: ctx.includePostPublish,
  };
}

export function hasRouteMapProductionBrief(campaign: CampaignRecord | null): boolean {
  if (!campaign) return false;
  return resolveRouteMapProductionBrief(campaign) !== null;
}

export function isV2RtuRouteMapJob(campaign: CampaignRecord): boolean {
  const intakeType = campaign.routeMapContext?.jobId
    ? getRouteMapJob(campaign.routeMapContext.jobId)?.intakeType
    : undefined;
  return intakeType !== undefined && V2_RUT_INTAKE_TYPES.has(intakeType);
}

function formatSection(title: string, items: readonly RouteMapSummaryItem[]): string {
  const body = items.map((item) => `${item.label}: ${item.value}`).join("\n");
  return `${title}\n${body}`;
}

/** Plain-text production brief for clipboard / ChatGPT handoff. */
export function formatRouteMapProductionBriefForCopy(campaign: CampaignRecord): string {
  const brief = resolveRouteMapProductionBrief(campaign);
  if (!brief) return "";

  const blocks = [
    "PRODUCTION BRIEF",
    `Job: ${brief.jobName}`,
    `SKU: ${brief.skuId}`,
    `Submitted: ${brief.submittedAt}`,
    "",
    ...brief.sections.flatMap((section) => ["", formatSection(section.title.toUpperCase(), section.items)]),
  ];

  return blocks.join("\n").trim();
}
