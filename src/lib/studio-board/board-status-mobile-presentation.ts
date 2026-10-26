/**
 * Phone-only Board status presentation. Does not change next-action or
 * visibility derivation. Duplicate ceremonial lines already live in the
 * Project status story; repeating them in Next Action is noise.
 */
import { studioPaidActivationRecoveryV1 } from "@/config/studio-paid-activation-recovery-v1";
import { studioBoard } from "@/config/studio-board";
import { DISCOVERY_COMPLETE_LEAD } from "@/lib/studio-board-next-action";
import { PROJECT_INTAKE_RECEIVED_LEAD } from "@/lib/post-submit-customer-signals";
import { customerVisibilityContinuityV1 as copy } from "@/config/customer-visibility-continuity-v1";

const CEREMONIAL_NEXT_UPDATE = studioBoard.statusContent.PAYMENT_RECEIVED.nextUpdateLabel;

function normalizeStatusCopy(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isOverlappingStatusCopy(left: string, right: string): boolean {
  const a = normalizeStatusCopy(left);
  const b = normalizeStatusCopy(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function isRepeatedRecoveryCopy(text: string): boolean {
  return isOverlappingStatusCopy(
    text,
    studioPaidActivationRecoveryV1.customerCopy.recoveringLead,
  );
}

export function isDuplicateStatusNextStep(nextStep: string, studioWorking: string): boolean {
  return isOverlappingStatusCopy(nextStep, studioWorking);
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
