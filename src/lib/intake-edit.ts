import type { StudioGuidePackageId } from "@/config/studio-guide";
import { draftRoom } from "@/config/draft-room";
import type { CampaignStatus } from "@/config/studio-board";

/** Statuses where customers may review and edit intake answers. */
export const INTAKE_EDITABLE_STATUSES = ["DRAFT_RECEIVED", "PAYMENT_RECEIVED"] as const satisfies readonly CampaignStatus[];

export type IntakeEditableStatus = (typeof INTAKE_EDITABLE_STATUSES)[number];

export function isIntakeEditable(status: CampaignStatus | null | undefined): status is IntakeEditableStatus {
  if (!status) return false;
  return (INTAKE_EDITABLE_STATUSES as readonly string[]).includes(status);
}

export function draftRoomEditHref(packageId?: StudioGuidePackageId): string {
  const base = `${draftRoom.routes.draftRoom}?begin=1&edit=1`;
  return packageId ? `${base}&package=${packageId}` : base;
}
