import {
  exceptionKindProducerResolvable,
  exceptionKindRequiresOwner,
} from "@/config/campaign-exceptions";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import { resolveOwnerReviewRequired } from "@/lib/campaign-tasks/exceptions-view";
import type { OwnerDecisionInteractionRecord } from "@/lib/campaign-tasks/owner-decision-interaction-types";

import type { KitchenOwnerEscalationVerdict } from "./types";

/**
 * Owner escalation filter — reuses existing exception / Owner Desk authority.
 * Does not invent new business policy. Uncertainty does NOT route to owner.
 */
export function ownerEscalationForException(
  record: CampaignExceptionRecord,
): KitchenOwnerEscalationVerdict {
  if (resolveOwnerReviewRequired(record)) return "owner_required";
  if (exceptionKindProducerResolvable(record.kind)) return "owner_not_required";
  if (exceptionKindRequiresOwner(record.kind) && !resolveOwnerReviewRequired(record)) {
    // Owner-held kind but no longer requiring review (resolved/promoted/etc.).
    return "owner_not_required";
  }
  if (
    !exceptionKindRequiresOwner(record.kind) &&
    !exceptionKindProducerResolvable(record.kind)
  ) {
    return "owner_authority_unclear";
  }
  return "owner_not_required";
}

export function ownerEscalationForOwnerInteraction(
  record: OwnerDecisionInteractionRecord,
): KitchenOwnerEscalationVerdict {
  if (record.status === "waiting_owner") {
    return "owner_required";
  }
  if (
    record.status === "resolved" ||
    record.status === "waiting_client" ||
    record.status === "waiting_internal"
  ) {
    return "owner_not_required";
  }
  return "owner_authority_unclear";
}

/** Routine production/QA/handoff/outbox events — owner not required by default. */
export function ownerEscalationForRoutineOperationalEvent(): KitchenOwnerEscalationVerdict {
  return "owner_not_required";
}
