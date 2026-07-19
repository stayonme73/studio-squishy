/**
 * Live tablet status for Conversation Room Project Intake.
 * Derives Completed / Still needed / Next from plan + answers — not static copy.
 */

import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import {
  INTAKE_MATERIALS_NONE_YET,
  INTAKE_MATERIALS_PROVIDE_LATER,
  parseMaterialsPathAnswer,
} from "@/lib/route-map-intake-materials";
import {
  isProjectIntakeFieldComplete,
  isProjectIntakePlanReady,
} from "@/lib/project-intake-completeness";
import {
  projectIntakeServiceFieldKey,
  type ProjectIntakePlan,
} from "@/lib/project-intake-plan";

export type ProjectIntakeTabletStatusCopy = {
  paymentReceivedLabel: string;
  servicesConfirmedLabel: string;
  stillNeededNoneLabel: string;
  nextRequiredRemaining: string;
  nextReady: string;
  nextReadyMaterialsLater: string;
};

export type ProjectIntakeTabletStatus = {
  completed: string[];
  stillNeeded: string[];
  nextLine: string;
  ready: boolean;
  hasMaterialsDeferred: boolean;
};

function fieldDisplayLabel(
  sectionTitle: string | null,
  fieldLabel: string,
): string {
  return sectionTitle ? `${sectionTitle}: ${fieldLabel}` : fieldLabel;
}

export function hasDeferredMaterialsAnswer(
  plan: ProjectIntakePlan,
  answers: RouteMapIntakeAnswers,
): boolean {
  for (const shared of plan.sharedFields) {
    if (shared.field.role !== "materials") continue;
    const availability = parseMaterialsPathAnswer(
      answers[shared.answerKey],
    ).availability;
    if (
      availability === INTAKE_MATERIALS_NONE_YET ||
      availability === INTAKE_MATERIALS_PROVIDE_LATER
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Build tablet Completed / Still needed / Next from current answers.
 */
export function buildProjectIntakeTabletStatus(input: {
  plan: ProjectIntakePlan;
  answers: RouteMapIntakeAnswers;
  paymentReceived: boolean;
  servicesConfirmed: boolean;
  copy: ProjectIntakeTabletStatusCopy;
}): ProjectIntakeTabletStatus {
  const { plan, answers, paymentReceived, servicesConfirmed, copy } = input;
  const completed: string[] = [];
  const stillNeeded: string[] = [];

  if (paymentReceived) completed.push(copy.paymentReceivedLabel);
  if (servicesConfirmed) completed.push(copy.servicesConfirmedLabel);

  for (const shared of plan.sharedFields) {
    const value = answers[shared.answerKey];
    const label = fieldDisplayLabel(null, shared.field.label);
    const complete = isProjectIntakeFieldComplete(shared.field, value);
    if (shared.field.required) {
      if (complete) completed.push(label);
      else stillNeeded.push(label);
    } else if (complete) {
      completed.push(label);
    }
  }

  for (const section of plan.services) {
    for (const field of section.fields) {
      const key = projectIntakeServiceFieldKey(section.serviceId, field.id);
      const value = answers[key];
      const label = fieldDisplayLabel(section.title, field.label);
      const complete = isProjectIntakeFieldComplete(field, value);
      if (field.required) {
        if (complete) completed.push(label);
        else stillNeeded.push(label);
      } else if (complete) {
        completed.push(label);
      }
    }
  }

  const ready = isProjectIntakePlanReady(plan, answers);
  const hasMaterialsDeferred = hasDeferredMaterialsAnswer(plan, answers);

  let nextLine = copy.nextRequiredRemaining;
  if (ready) {
    nextLine = hasMaterialsDeferred
      ? copy.nextReadyMaterialsLater
      : copy.nextReady;
  }

  return {
    completed,
    stillNeeded:
      stillNeeded.length > 0 ? stillNeeded : [copy.stillNeededNoneLabel],
    nextLine,
    ready,
    hasMaterialsDeferred,
  };
}

/** Debounce for autosaving Intake answers to campaign routeMapIntakeDraft. */
export const PROJECT_INTAKE_AUTOSAVE_DEBOUNCE_MS = 500;
