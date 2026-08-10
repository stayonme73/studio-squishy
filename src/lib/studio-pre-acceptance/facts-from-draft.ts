import {
  readOpeningAnswers,
  readSelectedRoute,
  readSelectedServices,
} from "@/lib/conversation-room-draft";
import type { WorkingDraftRecord } from "@/lib/studio-working-draft";

import type { PreAcceptanceProjectFacts } from "./types";

/** Pull pre-acceptance facts from the authoritative working draft. */
export function projectFactsFromWorkingDraft(
  draft: WorkingDraftRecord,
): PreAcceptanceProjectFacts {
  const opening = readOpeningAnswers(draft);
  const route = readSelectedRoute(draft);
  const services = readSelectedServices(draft);
  return {
    draftRevision: draft.revision,
    routeId: route?.roadId ?? null,
    selectedServiceIds: services.map((s) => String(s.jobId)),
    projectNeed: opening.projectNeed,
    businessName: opening.businessName,
    requestedDeadline: opening.requestedDeadline,
    deadlineStatus: opening.deadlineStatus,
    existingMaterialsNote: opening.existingMaterialsNote,
    riskScanText: opening.projectNeed,
  };
}
