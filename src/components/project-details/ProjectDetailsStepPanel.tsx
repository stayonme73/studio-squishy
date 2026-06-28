"use client";

import type { ProjectDetailsFormValues, ProjectDetailsStepId, ProjectDetailsUploadedFile } from "@/config/project-details";
import {
  projectDetails,
  resolveProjectDetailsMissingItems,
  resolveProjectDetailsReviewServiceNames,
  resolveProjectDetailsSteps,
  stepRequiresBrandFoundationQuestions,
  stepShowsAdPackage,
  stepShowsConcepts,
  stepShowsEmail,
  stepShowsMarketingAutomation,
  stepShowsSocial,
} from "@/config/project-details";
import type { ApprovedStudioPlan } from "@/config/studio-board";
import type { ServiceId } from "@/catalog/types";
import type { ChangeEvent } from "react";

import ProjectDetailsFileUpload from "./ProjectDetailsFileUpload";

type Props = {
  stepId: ProjectDetailsStepId;
  form: ProjectDetailsFormValues;
  files: readonly ProjectDetailsUploadedFile[];
  serviceIds: readonly ServiceId[];
  approvedStudioPlan?: ApprovedStudioPlan | null;
  campaignId: string;
  onFormChange: (patch: Partial<ProjectDetailsFormValues>) => void;
  onFilesChange: (files: ProjectDetailsUploadedFile[]) => void;
};

function Field({
  id,
  label,
  required,
  placeholder,
  value,
  onChange,
  multiline = false,
}: {
  id: keyof ProjectDetailsFormValues;
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const common = {
    id,
    name: id,
    className: "pd-field__input",
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    placeholder,
    required,
  };

  return (
    <label className="pd-field" htmlFor={id}>
      <span className="pd-field__label">
        {label}
        {required ? " *" : ""}
      </span>
      {multiline ? <textarea {...common} rows={4} /> : <input type="text" {...common} />}
    </label>
  );
}

export default function ProjectDetailsStepPanel({
  stepId,
  form,
  files,
  serviceIds,
  approvedStudioPlan,
  campaignId,
  onFormChange,
  onFilesChange,
}: Props) {
  const copy = projectDetails.fields;

  if (stepId === "working-on") {
    return (
      <div className="pd-step">
        <h2 className="pd-step__title">{projectDetails.steps["working-on"].title}</h2>
        <Field
          id="workingOn"
          label={copy.workingOn.label}
          required
          value={form.workingOn}
          onChange={(value) => onFormChange({ workingOn: value })}
        />
        <Field
          id="mainOffer"
          label={copy.mainOffer.label}
          required
          value={form.mainOffer}
          onChange={(value) => onFormChange({ mainOffer: value })}
        />
        <Field
          id="importantDates"
          label={copy.importantDates.label}
          required
          value={form.importantDates}
          onChange={(value) => onFormChange({ importantDates: value })}
        />
        <Field
          id="callToAction"
          label={copy.callToAction.label}
          placeholder={copy.callToAction.placeholder}
          required
          value={form.callToAction}
          onChange={(value) => onFormChange({ callToAction: value })}
        />
        <Field
          id="destinationLink"
          label={copy.destinationLink.label}
          required
          value={form.destinationLink}
          onChange={(value) => onFormChange({ destinationLink: value })}
        />
        <Field
          id="mustIncludeExactly"
          label={copy.mustIncludeExactly.label}
          value={form.mustIncludeExactly}
          onChange={(value) => onFormChange({ mustIncludeExactly: value })}
          multiline
        />
      </div>
    );
  }

  if (stepId === "brand-materials") {
    return (
      <div className="pd-step">
        <h2 className="pd-step__title">{projectDetails.steps["brand-materials"].title}</h2>
        <ProjectDetailsFileUpload
          campaignId={campaignId}
          files={files}
          onFilesChange={onFilesChange}
        />
        <Field
          id="inspirationLinks"
          label={copy.brandLinks.label}
          value={form.inspirationLinks}
          onChange={(value) => onFormChange({ inspirationLinks: value })}
          multiline
        />
        <Field
          id="brandColorsFonts"
          label={copy.brandColorsFonts.label}
          value={form.brandColorsFonts}
          onChange={(value) => onFormChange({ brandColorsFonts: value })}
        />
        <Field
          id="brandDoNotUse"
          label={copy.brandDoNotUse.label}
          value={form.brandDoNotUse}
          onChange={(value) => onFormChange({ brandDoNotUse: value })}
          multiline
        />
        {stepRequiresBrandFoundationQuestions(serviceIds) ? (
          <>
            <Field
              id="brandOutdatedParts"
              label={copy.brandOutdatedParts.label}
              required
              value={form.brandOutdatedParts}
              onChange={(value) => onFormChange({ brandOutdatedParts: value })}
              multiline
            />
            <Field
              id="brandPartsToKeep"
              label={copy.brandPartsToKeep.label}
              required
              value={form.brandPartsToKeep}
              onChange={(value) => onFormChange({ brandPartsToKeep: value })}
              multiline
            />
          </>
        ) : null}
      </div>
    );
  }

  if (stepId === "channels") {
    return (
      <div className="pd-step">
        <h2 className="pd-step__title">{projectDetails.steps.channels.title}</h2>
        {stepShowsSocial(serviceIds) ? (
          <>
            <h3 className="pd-step__subtitle">Social media</h3>
            <Field
              id="socialPlatforms"
              label={copy.socialPlatforms.label}
              required
              value={form.socialPlatforms}
              onChange={(value) => onFormChange({ socialPlatforms: value })}
            />
            <Field
              id="socialAccountLinks"
              label={copy.socialAccountLinks.label}
              required
              value={form.socialAccountLinks}
              onChange={(value) => onFormChange({ socialAccountLinks: value })}
              multiline
            />
            <Field
              id="socialPostingWindow"
              label={copy.socialPostingWindow.label}
              value={form.socialPostingWindow}
              onChange={(value) => onFormChange({ socialPostingWindow: value })}
            />
          </>
        ) : null}
        {stepShowsEmail(serviceIds) ? (
          <>
            <h3 className="pd-step__subtitle">Email</h3>
            <Field
              id="emailPlatform"
              label={copy.emailPlatform.label}
              required
              value={form.emailPlatform}
              onChange={(value) => onFormChange({ emailPlatform: value })}
            />
            <Field
              id="emailSender"
              label={copy.emailSender.label}
              required
              value={form.emailSender}
              onChange={(value) => onFormChange({ emailSender: value })}
            />
            <Field
              id="emailSendTiming"
              label={copy.emailSendTiming.label}
              required
              value={form.emailSendTiming}
              onChange={(value) => onFormChange({ emailSendTiming: value })}
            />
            <label className="pd-field" htmlFor="emailListReady">
              <span className="pd-field__label">{copy.emailListReady.label} *</span>
              <select
                id="emailListReady"
                className="pd-field__input"
                value={form.emailListReady}
                onChange={(event) => onFormChange({ emailListReady: event.target.value })}
                required
              >
                <option value="">Select…</option>
                <option value="yes">Yes — list is ready</option>
                <option value="no">Not yet — need help</option>
              </select>
            </label>
          </>
        ) : null}
      </div>
    );
  }

  if (stepId === "service-specific") {
    return (
      <div className="pd-step">
        <h2 className="pd-step__title">{projectDetails.steps["service-specific"].title}</h2>
        {stepShowsConcepts(serviceIds) ? (
          <>
            <h3 className="pd-step__subtitle">Campaign concepts</h3>
            <Field
              id="conceptIntendedUse"
              label={copy.conceptIntendedUse.label}
              required
              value={form.conceptIntendedUse}
              onChange={(value) => onFormChange({ conceptIntendedUse: value })}
              multiline
            />
            <Field
              id="conceptAudience"
              label={copy.conceptAudience.label}
              required
              value={form.conceptAudience}
              onChange={(value) => onFormChange({ conceptAudience: value })}
            />
            <Field
              id="conceptRequiredWording"
              label={copy.conceptRequiredWording.label}
              required
              value={form.conceptRequiredWording}
              onChange={(value) => onFormChange({ conceptRequiredWording: value })}
              multiline
            />
          </>
        ) : null}
        {stepShowsMarketingAutomation(serviceIds) ? (
          <>
            <h3 className="pd-step__subtitle">Marketing automation</h3>
            <Field
              id="marketingPieces"
              label={copy.marketingPieces.label}
              required
              value={form.marketingPieces}
              onChange={(value) => onFormChange({ marketingPieces: value })}
              multiline
            />
            <Field
              id="marketingPieceUsage"
              label={copy.marketingPieceUsage.label}
              required
              value={form.marketingPieceUsage}
              onChange={(value) => onFormChange({ marketingPieceUsage: value })}
              multiline
            />
            <Field
              id="marketingFormats"
              label={copy.marketingFormats.label}
              value={form.marketingFormats}
              onChange={(value) => onFormChange({ marketingFormats: value })}
            />
          </>
        ) : null}
        {stepShowsAdPackage(serviceIds) ? (
          <>
            <h3 className="pd-step__subtitle">Ad package</h3>
            <ProjectDetailsFileUpload
              campaignId={campaignId}
              files={files.filter((file) => file.category === "script")}
              onFilesChange={(scriptFiles) => {
                const other = files.filter((file) => file.category !== "script");
                onFilesChange([...other, ...scriptFiles]);
              }}
              categories={["script"]}
            />
            <Field
              id="adScript"
              label={copy.adScript.label}
              required
              value={form.adScript}
              onChange={(value) => onFormChange({ adScript: value })}
              multiline
            />
            <Field
              id="adIntendedUse"
              label={copy.adIntendedUse.label}
              required
              value={form.adIntendedUse}
              onChange={(value) => onFormChange({ adIntendedUse: value })}
              multiline
            />
            <Field
              id="adVoiceStyle"
              label={copy.adVoiceStyle.label}
              value={form.adVoiceStyle}
              onChange={(value) => onFormChange({ adVoiceStyle: value })}
            />
            <Field
              id="adPronunciation"
              label={copy.adPronunciation.label}
              value={form.adPronunciation}
              onChange={(value) => onFormChange({ adPronunciation: value })}
            />
          </>
        ) : null}
      </div>
    );
  }

  if (stepId === "approval-contact") {
    return (
      <div className="pd-step">
        <h2 className="pd-step__title">{projectDetails.steps["approval-contact"].title}</h2>
        <Field
          id="primaryApproverName"
          label={copy.primaryApproverName.label}
          required
          value={form.primaryApproverName}
          onChange={(value) => onFormChange({ primaryApproverName: value })}
        />
        <Field
          id="primaryApproverEmail"
          label={copy.primaryApproverEmail.label}
          required
          value={form.primaryApproverEmail}
          onChange={(value) => onFormChange({ primaryApproverEmail: value })}
        />
        <label className="pd-field" htmlFor="hasSecondaryApprover">
          <span className="pd-field__label">{copy.hasSecondaryApprover.label}</span>
          <select
            id="hasSecondaryApprover"
            className="pd-field__input"
            value={form.hasSecondaryApprover}
            onChange={(event) => onFormChange({ hasSecondaryApprover: event.target.value })}
          >
            <option value="">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        {form.hasSecondaryApprover === "yes" ? (
          <>
            <Field
              id="secondaryApproverName"
              label={copy.secondaryApproverName.label}
              required
              value={form.secondaryApproverName}
              onChange={(value) => onFormChange({ secondaryApproverName: value })}
            />
            <Field
              id="secondaryApproverEmail"
              label={copy.secondaryApproverEmail.label}
              required
              value={form.secondaryApproverEmail}
              onChange={(value) => onFormChange({ secondaryApproverEmail: value })}
            />
          </>
        ) : null}
      </div>
    );
  }

  const missing = resolveProjectDetailsMissingItems(form, files, serviceIds);
  const steps = resolveProjectDetailsSteps(serviceIds);
  const reviewServiceNames = resolveProjectDetailsReviewServiceNames(
    approvedStudioPlan,
    serviceIds,
  );

  return (
    <div className="pd-step">
      <h2 className="pd-step__title">{projectDetails.steps["final-review"].title}</h2>
      <p className="pd-muted">{projectDetails.workBeginsNote}</p>

      <div className="pd-review">
        <h3 className="pd-step__subtitle">Selected services</h3>
        <ul className="pd-review__services">
          {reviewServiceNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>

        <h3 className="pd-step__subtitle">Checklist</h3>
        <ul className="pd-review__checklist">
          {steps
            .filter((id) => id !== "final-review")
            .map((id) => (
              <li key={id}>{projectDetails.steps[id].title}</li>
            ))}
        </ul>

        {files.length > 0 ? (
          <>
            <h3 className="pd-step__subtitle">Uploaded materials</h3>
            <ul className="pd-upload__list">
              {files.map((file) => (
                <li key={file.id} className="pd-upload__item">
                  {projectDetails.fileCategories[file.category]} — {file.fileName}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {missing.length > 0 ? (
          <div className="pd-review__missing" role="alert">
            <h3 className="pd-step__subtitle">Missing required items</h3>
            <ul>
              {missing.map((item) => (
                <li key={`${item.stepId}-${item.label}`}>{item.label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="pd-review__ready">All required details are complete.</p>
        )}
      </div>
    </div>
  );
}
