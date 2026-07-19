/**
 * Project Intake plan — one shared materials/contact section + per-service fields.
 * Fixes single-job intake that only used routeMapContext.jobId (first service).
 */

import type { ServiceId } from "@/catalog/types";
import {
  getRouteMapIntakeSchema,
  type RouteMapIntakeField,
  type RouteMapIntakeTemplateId,
} from "@/catalog/intake";
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
  jobId: RouteMapJobId;
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
  serviceId: ServiceId,
  fieldId: string,
): string {
  return `${serviceId}:${fieldId}`;
}

export function projectIntakeSharedContactKey(fieldId: string): string {
  return `shared:${fieldId}`;
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
    if (!job) continue;

    const schema = getRouteMapIntakeSchema(job.intakeType);
    const serviceFields: RouteMapIntakeField[] = [];

    for (const field of schema.fields) {
      if (field.role === "materials") {
        if (!sharedByKey.has(PROJECT_INTAKE_SHARED_MATERIALS_KEY)) {
          sharedByKey.set(PROJECT_INTAKE_SHARED_MATERIALS_KEY, {
            answerKey: PROJECT_INTAKE_SHARED_MATERIALS_KEY,
            field: {
              ...field,
              id: "materials",
              label: "Logo, photos, colors, or brand references",
              hint:
                field.hint ??
                "Describe filenames, links, or brand notes you have. If you do not have materials yet, say so — do not invent files. Files are not uploaded on this form.",
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

    services.push({
      serviceId,
      jobId: job.id,
      jobName: job.name,
      intakeType: job.intakeType,
      title: sectionTitleFromSchema(schema.title, job.name),
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

export function countProjectIntakeSections(plan: ProjectIntakePlan): number {
  return (
    plan.sharedFields.length +
    plan.services.reduce((sum, section) => sum + section.fields.length, 0)
  );
}
