/**
 * Completeness helpers for multi-service Project Intake answers.
 */

import type { RouteMapIntakeAnswers, RouteMapIntakeField } from "@/catalog/intake";
import {
  buildMaterialsPathAnswer,
  isMaterialsPathAnswerComplete,
  parseMaterialsPathAnswer,
} from "@/lib/route-map-intake-materials";
import {
  countProjectIntakeSections,
  projectIntakeServiceFieldKey,
  type ProjectIntakePlan,
  type ProjectIntakeSharedField,
} from "@/lib/project-intake-plan";

export function isProjectIntakeFieldComplete(
  field: RouteMapIntakeField,
  value: string | undefined,
): boolean {
  if (field.role === "materials") {
    const parsed = parseMaterialsPathAnswer(value);
    return isMaterialsPathAnswerComplete(
      parsed.availability,
      parsed.detail,
      Boolean(field.required),
    );
  }
  const trimmed = String(value ?? "").trim();
  if (field.required) return trimmed.length > 0;
  return trimmed.length > 0;
}

export function countCompletedProjectIntakeSections(
  plan: ProjectIntakePlan,
  answers: RouteMapIntakeAnswers,
): number {
  let completed = 0;
  for (const shared of plan.sharedFields) {
    if (isProjectIntakeFieldComplete(shared.field, answers[shared.answerKey])) {
      completed += 1;
    }
  }
  for (const section of plan.services) {
    for (const field of section.fields) {
      const key = projectIntakeServiceFieldKey(section.serviceId, field.id);
      if (isProjectIntakeFieldComplete(field, answers[key])) completed += 1;
    }
  }
  return completed;
}

export function isProjectIntakePlanReady(
  plan: ProjectIntakePlan,
  answers: RouteMapIntakeAnswers,
): boolean {
  for (const shared of plan.sharedFields) {
    if (!shared.field.required) continue;
    if (!isProjectIntakeFieldComplete(shared.field, answers[shared.answerKey])) {
      return false;
    }
  }
  for (const section of plan.services) {
    for (const field of section.fields) {
      if (!field.required) continue;
      const key = projectIntakeServiceFieldKey(section.serviceId, field.id);
      if (!isProjectIntakeFieldComplete(field, answers[key])) return false;
    }
  }
  return true;
}

export function projectIntakeProgressLabel(
  plan: ProjectIntakePlan,
  answers: RouteMapIntakeAnswers,
): { completed: number; total: number } {
  return {
    completed: countCompletedProjectIntakeSections(plan, answers),
    total: countProjectIntakeSections(plan),
  };
}

/** Prefill shared business name when empty. */
export function prefillProjectIntakeAnswers(
  plan: ProjectIntakePlan,
  draft: RouteMapIntakeAnswers | null | undefined,
  opening: { businessName?: string | null },
): RouteMapIntakeAnswers {
  const next: RouteMapIntakeAnswers = { ...(draft ?? {}) };
  const businessKey = plan.sharedFields.find(
    (f) => f.field.id === "businessName",
  )?.answerKey;
  const businessName = opening.businessName?.trim();
  if (businessKey && businessName && !String(next[businessKey] ?? "").trim()) {
    next[businessKey] = businessName;
  }
  return next;
}

export function setSharedMaterialsAnswer(
  shared: ProjectIntakeSharedField,
  availability: string,
  detail: string,
): string {
  if (shared.field.role !== "materials") return detail;
  return buildMaterialsPathAnswer(availability, detail);
}
