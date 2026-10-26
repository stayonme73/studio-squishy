/**
 * Escalation — rare Owner judgment vs Scout engineering recovery.
 * Ugly composition, tiny text, boring video, and broken exports are not Owner tickets.
 * Taught-forward playbook: docs/studio-owner-resolve-once-teach-forward-v1-locked.md
 * Do not send Owner a class already taught (missing promised materials, authorized Studio-created visuals).
 */

import type { StudioManagerAction } from "@/config/studio-studio-wide-orchestration-v1";
import { isEngineeringDefect } from "@/lib/studio-project-alpha/engineering-recovery";

const OWNER_JUDGMENT_PATTERNS =
  /brand-direction|strategic creative|pricing exception|scope exception|refund exception|customer exception|revision-policy|two equally strong/i;

const ROUTINE_QUALITY_PATTERNS =
  /empty|tiny text|weak cta|boring video|broken export|dead button|top-heavy|unreadable|missing provider/i;

const ROUTINE_MATERIALS_PATTERNS =
  /promised photos|missing materials|has not sent|waiting on materials|customer has not supplied/i;

export function classifyEscalation(input: {
  question?: string;
  failureCode?: string;
  internalAttemptCount: number;
  twoStrongDirections?: boolean;
}): {
  action: StudioManagerAction;
  ownerOnly: boolean;
  why: string;
} {
  if (isEngineeringDefect(input.failureCode) || /export|renderer|dispatch|corrupt|api/i.test(input.failureCode ?? "")) {
    return {
      action: "engineering_recovery_required",
      ownerOnly: false,
      why: "Technical problem → Scout recovery. Owner is not first-line engineering QA.",
    };
  }
  if (input.twoStrongDirections) {
    return {
      action: "owner_judgment_required",
      ownerOnly: true,
      why: "Two equally strong strategic creative directions remain. Owner brand judgment is required.",
    };
  }
  if (OWNER_JUDGMENT_PATTERNS.test(input.question ?? "")) {
    return {
      action: "owner_judgment_required",
      ownerOnly: true,
      why: "Genuine non-deterministic business or brand decision.",
    };
  }
  if (ROUTINE_MATERIALS_PATTERNS.test(input.question ?? "")) {
    return {
      action: "request_customer_information",
      ownerOnly: false,
      why: "Promised materials are missing. Studio Voice follows up. Machine waits. Not an Owner escalation.",
    };
  }
  if (ROUTINE_QUALITY_PATTERNS.test(input.question ?? "")) {
    return {
      action: "studio_correction_required",
      ownerOnly: false,
      why: "Routine quality belongs to Production / Creative Director, not Owner.",
    };
  }
  if (input.internalAttemptCount >= 3) {
    return {
      action: "owner_judgment_required",
      ownerOnly: true,
      why: "Internal 1–3 attempt budget exhausted. Remaining choice is Owner judgment.",
    };
  }
  return {
    action: "continue_production",
    ownerOnly: false,
    why: "No Owner escalation. Machine continues with Studio Manager and Production.",
  };
}
