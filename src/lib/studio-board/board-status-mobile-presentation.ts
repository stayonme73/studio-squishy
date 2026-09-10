/**
 * Phone-only Board status presentation. Does not change next-action or
 * visibility derivation. Duplicate ceremonial lines already live in the
 * Project status story; repeating them in Next Action is noise.
 */
import { studioBoard } from "@/config/studio-board";
import { DISCOVERY_COMPLETE_LEAD } from "@/lib/studio-board-next-action";
import { PROJECT_INTAKE_RECEIVED_LEAD } from "@/lib/post-submit-customer-signals";
import { customerVisibilityContinuityV1 as copy } from "@/config/customer-visibility-continuity-v1";

const CEREMONIAL_NEXT_UPDATE = studioBoard.statusContent.PAYMENT_RECEIVED.nextUpdateLabel;

export function isDuplicateStatusNextStep(nextStep: string, studioWorking: string): boolean {
  return nextStep.trim() === studioWorking.trim();
}

export function isEmptyStatusRisk(risk: string): boolean {
  return risk.trim() === copy.empty.noRisk;
}

export function isCeremonialNextActionLead(lead: string): boolean {
  const trimmed = lead.trim();
  return trimmed === PROJECT_INTAKE_RECEIVED_LEAD || trimmed === DISCOVERY_COMPLETE_LEAD;
}

export function isDuplicateStatusAndStage(statusLabel: string, stageLabel: string): boolean {
  return statusLabel.trim() === stageLabel.trim();
}

export function isCeremonialNextUpdate(label: string | null | undefined): boolean {
  return (label ?? "").trim() === CEREMONIAL_NEXT_UPDATE;
}
