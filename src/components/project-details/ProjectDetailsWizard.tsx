"use client";

import { useEffect, useMemo, useState } from "react";

import {
  EMPTY_PROJECT_DETAILS_FORM,
  isProjectDetailsFormValid,
  isProjectDetailsStepValid,
  projectDetails,
  resolveProjectDetailsSteps,
  type ProjectDetailsFormValues,
  type ProjectDetailsUploadedFile,
} from "@/config/project-details";
import type { ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlan } from "@/config/studio-board";
import { saveProjectDetailsDraft } from "@/lib/project-details-session";

import ProjectDetailsStepPanel from "./ProjectDetailsStepPanel";

type Props = {
  campaignId: string;
  serviceIds: readonly ServiceId[];
  approvedStudioPlan?: ApprovedStudioPlan | null;
  initialForm?: ProjectDetailsFormValues;
  initialFiles?: readonly ProjectDetailsUploadedFile[];
  onSubmit: (form: ProjectDetailsFormValues, files: ProjectDetailsUploadedFile[]) => void;
  submitting?: boolean;
};

export default function ProjectDetailsWizard({
  campaignId,
  serviceIds,
  approvedStudioPlan,
  initialForm,
  initialFiles,
  onSubmit,
  submitting = false,
}: Props) {
  const steps = useMemo(() => resolveProjectDetailsSteps(serviceIds), [serviceIds]);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<ProjectDetailsFormValues>({
    ...EMPTY_PROJECT_DETAILS_FORM,
    ...initialForm,
  });
  const [files, setFiles] = useState<ProjectDetailsUploadedFile[]>([...(initialFiles ?? [])]);

  const currentStepId = steps[stepIndex] ?? "final-review";
  const isFinalStep = currentStepId === "final-review";
  const stepValid = isProjectDetailsStepValid(currentStepId, form, files, serviceIds);
  const formValid = isProjectDetailsFormValid(form, files, serviceIds);

  useEffect(() => {
    saveProjectDetailsDraft(campaignId, form, files);
  }, [campaignId, form, files]);

  function handleFormChange(patch: Partial<ProjectDetailsFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleContinue() {
    if (!stepValid) return;
    if (isFinalStep) {
      if (!formValid || submitting) return;
      onSubmit(form, files);
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  function handleBack() {
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  return (
    <div className="pd-wizard utility-card">
      <div className="pd-wizard__progress" aria-live="polite">
        Step {stepIndex + 1} of {steps.length} — {projectDetails.steps[currentStepId].title}
      </div>

      <ProjectDetailsStepPanel
        stepId={currentStepId}
        form={form}
        files={files}
        serviceIds={serviceIds}
        approvedStudioPlan={approvedStudioPlan}
        campaignId={campaignId}
        onFormChange={handleFormChange}
        onFilesChange={setFiles}
      />

      <div className="pd-wizard__actions">
        {stepIndex > 0 ? (
          <button type="button" className="utility-btn utility-btn--secondary" onClick={handleBack}>
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={!stepValid || (isFinalStep && (!formValid || submitting))}
          onClick={handleContinue}
        >
          {isFinalStep ? projectDetails.submitLabel : "Continue"}
        </button>
      </div>
    </div>
  );
}
