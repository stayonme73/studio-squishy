/**
 * Scenario 3 claim authority — only approved visitor claims; no prohibited inventions.
 */

import {
  MOSS_THREAD_AUTHORIZED_CLAIM,
  MOSS_THREAD_FORBIDDEN_INVENTIONS,
  studioRoom4cScenario3MossAndThreadV1 as brief,
} from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";

const PROHIBITED_CLAIM_PATTERNS: readonly RegExp[] = [
  /\$\d/,
  /\bdiscount\b/i,
  /\bpercent off\b/i,
  /\bworkshop\b/i,
  /\bdemonstration\b/i,
  /\blive demo\b/i,
  /\brefreshment/i,
  /\bgiveaway\b/i,
  /\blimited\b/i,
  /custom[-\s]?order/i,
  /\bwheelchair\b/i,
  /accessible entrance/i,
  /\bparking\b/i,
  /\bshipping\b/i,
  /\bnia\b/i,
  /\byoga\b/i,
  /wellness studio/i,
  /\(\d{3}\)/,
  /214 Clay Street/i,
  /mossthread\.example\/visit/i,
];

export function scenario3ApprovedClaims(): readonly string[] {
  return brief.approvedClaims;
}

export function scenario3ForbiddenInventions(): readonly string[] {
  return MOSS_THREAD_FORBIDDEN_INVENTIONS;
}

/**
 * Strip campaign-direction / acceptance boundary language that lists prohibited
 * inventions. Matching `\blimited\b` inside "Do not invent … limited quantities"
 * is a false positive — those sentences forbid claims, they do not make them.
 */
export function stripScenario3ClaimBoundaryLanguage(text: string): string {
  return text
    .replace(/Do not invent[^.?!]*[.?!]/gi, " ")
    .replace(/Maker photographs must not[^.?!]*[.?!]/gi, " ")
    .replace(/must not (?:claim|imply|present)[^.?!]*[.?!]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findProhibitedClaimHits(text: string): string[] {
  const scan = stripScenario3ClaimBoundaryLanguage(text);
  const hits: string[] = [];
  for (const pattern of PROHIBITED_CLAIM_PATTERNS) {
    if (pattern.test(scan)) {
      hits.push(pattern.source);
    }
  }
  return hits;
}

export function assertScenario3ClaimAuthority(label: string, text: string): void {
  const hits = findProhibitedClaimHits(text);
  if (hits.length > 0) {
    throw new Error(`CLAIM_AUTHORITY_FAIL:${label}:${hits.join(",")}`);
  }
  const scan = stripScenario3ClaimBoundaryLanguage(text);
  if (/live demo/i.test(scan) || /\bdemonstration\b/i.test(scan)) {
    throw new Error(`CLAIM_AUTHORITY_LIVE_DEMO:${label}`);
  }
}

export function assertScenario3VisitorClaimPresent(label: string, text: string): void {
  const claim = MOSS_THREAD_AUTHORIZED_CLAIM;
  const softened =
    /view the studio|meet the maker|shop available textile pieces/i.test(text);
  if (!text.includes(claim) && !softened) {
    throw new Error(`CLAIM_AUTHORITY_MISSING_VISITOR_CLAIM:${label}`);
  }
}

export function evaluateScenario3ClaimCopyGate(texts: readonly {
  label: string;
  text: string;
  requireVisitorClaim?: boolean;
}[]): { ok: boolean; findings: string[] } {
  const findings: string[] = [];
  for (const entry of texts) {
    const hits = findProhibitedClaimHits(entry.text);
    for (const hit of hits) {
      findings.push(`${entry.label}:${hit}`);
    }
    if (entry.requireVisitorClaim) {
      try {
        assertScenario3VisitorClaimPresent(entry.label, entry.text);
      } catch (err) {
        findings.push(
          err instanceof Error ? err.message : `CLAIM_MISSING:${entry.label}`,
        );
      }
    }
  }
  return { ok: findings.length === 0, findings };
}
