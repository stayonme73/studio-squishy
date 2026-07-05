import type { ProjectDetailsRecord } from "@/config/project-details";
import {
  projectDetails,
  resolveProjectDetailsMissingItems,
} from "@/config/project-details";
import type { ServiceId } from "@/catalog/types";
import {
  RECORD_EMPTY_ANSWER,
  RECORD_MISSING_SECTION_TITLE,
  formatRecordFieldValue,
} from "@/lib/project-record-client-copy";

export type ProjectDetailsSummarySection = {
  title: string;
  items: { label: string; value: string }[];
};

export type ProjectDetailsSummaryAudience = "client-record" | "file-room";

function buildWorkingOnItems(form: ProjectDetailsRecord["form"]) {
  return [
    { label: projectDetails.fields.workingOn.label, value: form.workingOn },
    { label: projectDetails.fields.mainOffer.label, value: form.mainOffer },
    { label: projectDetails.fields.importantDates.label, value: form.importantDates },
    { label: projectDetails.fields.callToAction.label, value: form.callToAction },
    { label: projectDetails.fields.destinationLink.label, value: form.destinationLink },
    { label: projectDetails.fields.mustIncludeExactly.label, value: form.mustIncludeExactly },
  ];
}

function buildApprovalContactItems(form: ProjectDetailsRecord["form"]) {
  return [
    { label: projectDetails.fields.primaryApproverName.label, value: form.primaryApproverName },
    { label: projectDetails.fields.primaryApproverEmail.label, value: form.primaryApproverEmail },
    { label: projectDetails.fields.secondaryApproverName.label, value: form.secondaryApproverName },
    { label: projectDetails.fields.secondaryApproverEmail.label, value: form.secondaryApproverEmail },
  ];
}

/**
 * Build Project Details summary sections for Project Record or File Room.
 * Shared field list — audience controls empty-value formatting and missing-section copy.
 */
export function buildProjectDetailsSummary(
  record: ProjectDetailsRecord | undefined,
  serviceIds: readonly ServiceId[],
  audience: ProjectDetailsSummaryAudience = "client-record",
): readonly ProjectDetailsSummarySection[] {
  if (!record) return [];
  const { form, files } = record;
  const sections: ProjectDetailsSummarySection[] = [];

  const pushSection = (title: string, items: { label: string; value: string | undefined }[]) => {
    if (audience === "client-record") {
      const filled = items
        .map((item) => ({
          label: item.label,
          value: formatRecordFieldValue(item.value),
          raw: item.value?.trim() ?? "",
        }))
        .filter((item) => item.value !== RECORD_EMPTY_ANSWER || item.raw.length > 0)
        .map(({ label, value }) => ({ label, value }));
      if (filled.length) sections.push({ title, items: filled });
      return;
    }

    const filled = items
      .map((item) => ({ label: item.label, value: (item.value ?? "").trim() }))
      .filter((item) => item.value);
    if (filled.length) sections.push({ title, items: filled });
  };

  pushSection(projectDetails.steps["working-on"].title, buildWorkingOnItems(form));

  if (files.length) {
    sections.push({
      title: projectDetails.steps["brand-materials"].title,
      items: files.map((file) => ({
        label: projectDetails.fileCategories[file.category],
        value: file.fileName,
      })),
    });
  }

  pushSection(projectDetails.steps["approval-contact"].title, buildApprovalContactItems(form));

  if (serviceIds.length) {
    const missing = resolveProjectDetailsMissingItems(form, files, serviceIds);
    if (missing.length) {
      sections.push({
        title: audience === "client-record" ? RECORD_MISSING_SECTION_TITLE : "Missing at submission",
        items: missing.map((item) => ({
          label: item.label,
          value: audience === "client-record" ? RECORD_EMPTY_ANSWER : "Required",
        })),
      });
    }
  }

  return sections;
}
