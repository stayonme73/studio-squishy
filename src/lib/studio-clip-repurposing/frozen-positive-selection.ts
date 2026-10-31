/**
 * Force the owner-certified three-clip set when the designated source is in use.
 */

import { FROZEN_POSITIVE_SELECTION_IDS } from "./frozen-selection";
import { findSetCandidateById } from "./set-discovery";
import type {
  LongSourceSentences,
  SetCandidate,
  SetDiscoveryFailure,
  SetDiscoverySuccess,
} from "./types";

function resolveFrozenCertCandidate(
  discovery: SetDiscoverySuccess,
  discoveryInput: LongSourceSentences,
  id: (typeof FROZEN_POSITIVE_SELECTION_IDS)[number],
): SetCandidate | undefined {
  const pools = [
    ...discovery.selected,
    ...discovery.alternates,
    ...discovery.rejected,
  ];
  const exact =
    pools.find((candidate) => candidate.id === id) ??
    findSetCandidateById(discoveryInput, id);
  if (exact) return exact;
  const startMatch = /^c-\d+-(\d+)$/.exec(id);
  if (!startMatch) return undefined;
  const windowStart = Number(startMatch[1]);
  return pools.find(
    (candidate) =>
      Math.round(candidate.windowStart) === windowStart ||
      candidate.id.endsWith(`-${windowStart}`),
  );
}

export function applyFrozenPositiveSelection(
  discovery: SetDiscoverySuccess,
  discoveryInput: LongSourceSentences,
): SetDiscoverySuccess | SetDiscoveryFailure {
  const selected: SetCandidate[] = [];
  for (const id of FROZEN_POSITIVE_SELECTION_IDS) {
    const hit = resolveFrozenCertCandidate(discovery, discoveryInput, id);
    if (!hit) {
      return {
        ok: false,
        productionAllowed: false,
        viableCount: discovery.selected.length as 0 | 1 | 2 | 3,
        selected: discovery.selected,
        alternates: discovery.alternates,
        rejected: discovery.rejected,
        findings: [`frozen_cert_clip_missing:${id}`],
        setQuestion:
          "If the customer posted these three clips separately, would each feel like a distinct piece worth publishing?",
        setQuestionPass: false,
      };
    }
    selected.push(hit);
  }
  return {
    ...discovery,
    selected,
    productionAllowed: true,
    viableCount: 3,
    setQuestionPass: true,
  };
}
