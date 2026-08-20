import type {
  ApprovedCustomerFactRecord,
  CustomerFactId,
  CustomerFactSource,
  CustomerFactSourceGateFinding,
  CustomerFactSourceGateInput,
  CustomerFactSourceGateResult,
  ProductionRoutingEligibility,
  ProductionRoutingEligibilityInput,
} from "./types";
import { PRODUCTION_ALLOWED_FACT_STATUSES } from "./types";

const PHONE_RE = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const URL_RE = /\b[a-z0-9][a-z0-9.-]*\.[a-z]{2,}\/[^\s]*/gi;

const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /\(555\)\s*555-5555/,
  /555-555-5555/,
  /000-000-0000/,
  /123-456-7890/,
  /\bTBD\b/i,
  /\bTODO\b/i,
  /\bN\/A\b/i,
  /REPLACE_ME/i,
  /YOUR[_-]?PHONE/i,
  /INSERT[_-]?PHONE/i,
  /lorem ipsum/i,
  /placeholder\.(com|net)/i,
  /xxx-xxx-xxxx/i,
];

const UNAPPROVED_CLAIM_PATTERNS: readonly RegExp[] = [
  /guaranteed/i,
  /best in /i,
  /#1/,
  /number one/i,
  /50%\s*off/i,
  /we will post for you/i,
  /ad account/i,
];

function push(
  findings: CustomerFactSourceGateFinding[],
  finding: CustomerFactSourceGateFinding,
): void {
  findings.push(finding);
}

function isProductionAllowedStatus(
  status: ApprovedCustomerFactRecord["approvalStatus"],
): boolean {
  return (PRODUCTION_ALLOWED_FACT_STATUSES as readonly string[]).includes(
    status,
  );
}

function mergedValues(
  record: ApprovedCustomerFactRecord,
  candidateValues?: Partial<Record<CustomerFactId, string>>,
): Partial<Record<CustomerFactId, string>> {
  return { ...(candidateValues ?? {}), ...record.values };
}

function valueOf(
  values: Partial<Record<CustomerFactId, string>>,
  factId: CustomerFactId,
): string {
  return values[factId] ?? "";
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeUrl(value: string): string {
  return value.trim().toLowerCase().replace(/\/+$/, "");
}

function approvedPhoneDigits(record: ApprovedCustomerFactRecord): Set<string> {
  const digits = new Set<string>();
  for (const value of Object.values(record.values)) {
    if (!value) continue;
    for (const match of value.matchAll(new RegExp(PHONE_RE.source, "g"))) {
      digits.add(phoneDigits(match[0]));
    }
  }
  return digits;
}

function approvedUrls(record: ApprovedCustomerFactRecord): Set<string> {
  const urls = new Set<string>();
  for (const value of Object.values(record.values)) {
    if (!value) continue;
    for (const match of value.matchAll(new RegExp(URL_RE.source, "gi"))) {
      urls.add(normalizeUrl(match[0]));
    }
  }
  return urls;
}

export function evaluateApprovedCustomerFactRecord(
  input: ProductionRoutingEligibilityInput,
): CustomerFactSourceGateFinding[] {
  const findings: CustomerFactSourceGateFinding[] = [];
  const { approvedRecord, candidateValues } = input;

  if (!isProductionAllowedStatus(approvedRecord.approvalStatus)) {
    const code =
      approvedRecord.approvalStatus === "MACHINE_INFERRED"
        ? "machine_inferred_contact"
        : approvedRecord.approvalStatus === "PLACEHOLDER"
          ? "placeholder_contact"
          : "facts_not_approved";
    push(findings, {
      code,
      sourceId: "approved-record",
      expected: approvedRecord.approvalStatus,
      detail: "Required customer facts are not approved for production routing.",
    });
  }

  for (const factId of approvedRecord.requiredFactIds) {
    const expected = valueOf(approvedRecord.values, factId);
    if (!expected) {
      push(findings, {
        code: "required_fact_missing",
        sourceId: "approved-record",
        factId,
        detail: `Required ${factId} is not present on the approved fact record.`,
      });
    }
  }

  if (candidateValues) {
    for (const factId of approvedRecord.requiredFactIds) {
      const locked = valueOf(approvedRecord.values, factId);
      const candidate = candidateValues[factId];
      if (locked && candidate != null && candidate !== locked) {
        push(findings, {
          code: "owner_lock_mismatch",
          sourceId: "canonical",
          factId,
          expected: locked,
          detail: `Hashed-brief ${factId} does not match the approved fact record.`,
        });
      }
    }
  }

  return findings;
}

function evaluateSource(
  source: CustomerFactSource,
  values: Partial<Record<CustomerFactId, string>>,
  record: ApprovedCustomerFactRecord,
  findings: CustomerFactSourceGateFinding[],
): void {
  for (const factId of source.requireExact) {
    const expected = valueOf(values, factId);
    if (!expected) {
      push(findings, {
        code: "canonical_value_empty",
        sourceId: source.sourceId,
        factId,
        detail: `Canonical ${factId} is empty; cannot prove ${source.sourceId}.`,
      });
      continue;
    }
    if (!source.text.includes(expected)) {
      push(findings, {
        code: "missing_exact_fact",
        sourceId: source.sourceId,
        factId,
        expected,
        detail: `${source.sourceId} is missing exact ${factId}.`,
      });
    }
  }

  for (const factId of source.forbidExact ?? []) {
    const forbidden = valueOf(values, factId);
    if (forbidden && source.text.includes(forbidden)) {
      push(findings, {
        code: "forbidden_canonical_present",
        sourceId: source.sourceId,
        factId,
        expected: forbidden,
        detail: `${source.sourceId} must not contain ${factId}.`,
      });
    }
  }

  for (const snippet of source.forbidSubstrings ?? []) {
    if (snippet && source.text.includes(snippet)) {
      push(findings, {
        code: "forbidden_substring_present",
        sourceId: source.sourceId,
        expected: snippet,
        detail: `${source.sourceId} contains a forbidden substring.`,
      });
    }
  }

  for (const stale of record.forbiddenExact) {
    if (stale && source.text.includes(stale)) {
      push(findings, {
        code: "stale_or_invented_fact",
        sourceId: source.sourceId,
        expected: stale,
        detail: `${source.sourceId} contains a stale or invented fact.`,
      });
    }
  }

  const approvedPhones = approvedPhoneDigits(record);
  for (const match of source.text.matchAll(new RegExp(PHONE_RE.source, "g"))) {
    const digits = phoneDigits(match[0]);
    if (digits && !approvedPhones.has(digits)) {
      push(findings, {
        code: "machine_inferred_contact",
        sourceId: source.sourceId,
        expected: match[0],
        detail: `${source.sourceId} contains contact that is not on the approved fact record.`,
      });
    }
  }

  const urls = approvedUrls(record);
  for (const match of source.text.matchAll(new RegExp(URL_RE.source, "gi"))) {
    const normalized = normalizeUrl(match[0]);
    if (normalized && !urls.has(normalized)) {
      push(findings, {
        code: "machine_inferred_contact",
        sourceId: source.sourceId,
        expected: match[0],
        detail: `${source.sourceId} contains a booking URL that is not on the approved fact record.`,
      });
    }
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(source.text)) {
      push(findings, {
        code: "placeholder_contact",
        sourceId: source.sourceId,
        detail: `${source.sourceId} contains placeholder contact information.`,
      });
      break;
    }
  }

  const claimPatterns = [
    ...UNAPPROVED_CLAIM_PATTERNS,
    ...(record.unapprovedClaimPatterns ?? []).map(
      (pattern) => new RegExp(pattern, "i"),
    ),
  ];
  for (const pattern of claimPatterns) {
    if (pattern.test(source.text)) {
      push(findings, {
        code: "unapproved_claim",
        sourceId: source.sourceId,
        detail: `${source.sourceId} contains an unapproved customer claim.`,
      });
      break;
    }
  }
}

export function formatCustomerFactSourceGateFailure(
  result: CustomerFactSourceGateResult,
): string {
  return result.findings
    .map((finding) =>
      [finding.code, finding.sourceId, finding.factId, finding.expected]
        .filter((part) => part != null && part !== "")
        .join(":"),
    )
    .join("|");
}

export function evaluateProductionRoutingEligibility(
  input: ProductionRoutingEligibilityInput,
): ProductionRoutingEligibility {
  const findings = evaluateApprovedCustomerFactRecord(input);
  return { routingAllowed: findings.length === 0, findings };
}

export function assertProductionRoutingAllowed(
  input: ProductionRoutingEligibilityInput,
): void {
  const result = evaluateProductionRoutingEligibility(input);
  if (!result.routingAllowed) {
    throw new Error(
      `PRODUCTION_ROUTING_BLOCKED:${formatCustomerFactSourceGateFailure({
        ok: false,
        findings: result.findings,
      })}`,
    );
  }
}

export function evaluateCustomerFactSourceGate(
  input: CustomerFactSourceGateInput,
): CustomerFactSourceGateResult {
  const findings = evaluateApprovedCustomerFactRecord(input);
  const values = mergedValues(input.approvedRecord, input.candidateValues);
  for (const source of input.sources) {
    evaluateSource(source, values, input.approvedRecord, findings);
  }
  return { ok: findings.length === 0, findings };
}

export function assertCustomerFactSourceGate(
  input: CustomerFactSourceGateInput,
): void {
  const result = evaluateCustomerFactSourceGate(input);
  if (!result.ok) {
    throw new Error(
      `CUSTOMER_FACT_SOURCE_GATE:${formatCustomerFactSourceGateFailure(result)}`,
    );
  }
}
