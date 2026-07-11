import type { CampaignRecord } from "@/config/studio-board";
import type { ProjectDetailsFormValues } from "@/config/project-details";

import type { DirectApplyTargetKey } from "./types";

type FieldBinding = {
  key: DirectApplyTargetKey;
  label: string;
  read: (record: CampaignRecord) => string | null | undefined;
  write: (form: ProjectDetailsFormValues, value: string) => ProjectDetailsFormValues;
};

const BINDINGS: readonly FieldBinding[] = [
  {
    key: "primary_approver_name",
    label: "Primary approver name",
    read: (r) => r.projectDetails?.form.primaryApproverName,
    write: (f, v) => ({ ...f, primaryApproverName: v }),
  },
  {
    key: "primary_approver_email",
    label: "Primary approver email",
    read: (r) => r.projectDetails?.form.primaryApproverEmail,
    write: (f, v) => ({ ...f, primaryApproverEmail: v }),
  },
  {
    key: "secondary_approver_name",
    label: "Secondary approver name",
    read: (r) => r.projectDetails?.form.secondaryApproverName,
    write: (f, v) => ({ ...f, secondaryApproverName: v }),
  },
  {
    key: "secondary_approver_email",
    label: "Secondary approver email",
    read: (r) => r.projectDetails?.form.secondaryApproverEmail,
    write: (f, v) => ({ ...f, secondaryApproverEmail: v }),
  },
  {
    key: "destination_url",
    label: "Destination URL",
    read: (r) => r.projectDetails?.form.destinationLink,
    write: (f, v) => ({ ...f, destinationLink: v }),
  },
  {
    key: "social_account_links",
    label: "Social account links",
    read: (r) => r.projectDetails?.form.socialAccountLinks,
    write: (f, v) => ({ ...f, socialAccountLinks: v }),
  },
  {
    key: "email_sender_name",
    label: "Email sender name",
    read: (r) => r.projectDetails?.form.emailSender,
    write: (f, v) => ({ ...f, emailSender: v }),
  },
  {
    key: "email_platform",
    label: "Email platform",
    read: (r) => r.projectDetails?.form.emailPlatform,
    write: (f, v) => ({ ...f, emailPlatform: v }),
  },
];

const bindingByKey = new Map(BINDINGS.map((b) => [b.key, b]));

export function isDirectApplyTargetKey(value: string): value is DirectApplyTargetKey {
  return bindingByKey.has(value as DirectApplyTargetKey);
}

export function directApplyTargetLabel(key: DirectApplyTargetKey): string {
  return bindingByKey.get(key)!.label;
}

export function readOfficialFieldValue(record: CampaignRecord, key: DirectApplyTargetKey): string | null {
  const raw = bindingByKey.get(key)!.read(record);
  return raw ?? null;
}

export function canDirectApplyToRecord(record: CampaignRecord): boolean {
  return Boolean(record.projectDetailsSubmittedAt && record.projectDetails?.form);
}

export function writeOfficialFieldValue(
  record: CampaignRecord,
  key: DirectApplyTargetKey,
  value: string,
): CampaignRecord {
  const binding = bindingByKey.get(key)!;
  const projectDetails = record.projectDetails;
  if (!projectDetails?.form) {
    throw new Error(`Cannot write ${key} — project details are not on record.`);
  }
  return {
    ...record,
    projectDetails: {
      ...projectDetails,
      form: binding.write(projectDetails.form, value),
    },
  };
}

export const FREEFORM_REQUEST_TARGET_KEYS = [
  "phone_number",
  "contact_information",
  "business_hours",
  "forgotten_note",
  "clarification",
] as const;

export type FreeformRequestTargetKey = (typeof FREEFORM_REQUEST_TARGET_KEYS)[number];

export function isFreeformRequestTargetKey(value: string): value is FreeformRequestTargetKey {
  return (FREEFORM_REQUEST_TARGET_KEYS as readonly string[]).includes(value);
}

export function freeformRequestTargetLabel(key: FreeformRequestTargetKey): string {
  const labels: Record<FreeformRequestTargetKey, string> = {
    phone_number: "Phone number",
    contact_information: "Contact information",
    business_hours: "Business hours",
    forgotten_note: "Forgotten note",
    clarification: "Clarification",
  };
  return labels[key];
}

export type RequestTargetKey = DirectApplyTargetKey | FreeformRequestTargetKey;

export function isRequestTargetKey(value: string): value is RequestTargetKey {
  return isDirectApplyTargetKey(value) || isFreeformRequestTargetKey(value);
}

export function requestTargetLabel(key: RequestTargetKey): string {
  if (isDirectApplyTargetKey(key)) return directApplyTargetLabel(key);
  return freeformRequestTargetLabel(key);
}
