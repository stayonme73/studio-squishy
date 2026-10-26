/**
 * Build a Machine correction brief from QA/render evidence.
 * Describes WHAT failed and WHICH standard must be satisfied.
 * Does not include pixel positions or a replacement layout.
 */

import { createHash } from "crypto";

import {
  PRODUCTION_FAILURE_CLASS_STANDARDS,
  studioAutonomousProductionLoopV1,
} from "@/config/studio-autonomous-production-loop-v1";
import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality";

import {
  classifyPipelineFailureCode,
  classifyQualityFindings,
  constraintsForClasses,
  uniqueClasses,
  type ProductionCorrectionBrief,
  type ProductionCorrectionFinding,
} from "./types";

function fingerprintBrief(input: {
  sourceAttemptNumber: number;
  failureClasses: readonly string[];
  findingIds: readonly string[];
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        packageId: studioAutonomousProductionLoopV1.packageId,
        sourceAttemptNumber: input.sourceAttemptNumber,
        failureClasses: [...input.failureClasses].sort(),
        findingIds: [...input.findingIds].sort(),
      }),
    )
    .digest("hex");
}

export function buildProductionCorrectionBrief(input: {
  sourceAttemptNumber: number;
  findings?: readonly DesignQualityFinding[];
  failureCode?: string;
  message?: string;
  occurredAt?: string;
}): ProductionCorrectionBrief {
  const fromQa = classifyQualityFindings(input.findings ?? []);
  const extras: ProductionCorrectionFinding[] = [];
  if (fromQa.length === 0 && input.failureCode) {
    extras.push({
      id: input.failureCode,
      failureClass: classifyPipelineFailureCode(input.failureCode),
      message: input.message ?? input.failureCode,
      source: "render",
    });
  }
  const findings = fromQa.length > 0 ? fromQa : extras;
  const failureClasses = uniqueClasses(findings);
  const fingerprint = fingerprintBrief({
    sourceAttemptNumber: input.sourceAttemptNumber,
    failureClasses,
    findingIds: findings.map((finding) => finding.id),
  });
  const createdAt = input.occurredAt ?? new Date().toISOString();
  return {
    packageId: studioAutonomousProductionLoopV1.packageId,
    briefId: `pcb:${input.sourceAttemptNumber}:${fingerprint.slice(0, 12)}`,
    fingerprint,
    sourceAttemptNumber: input.sourceAttemptNumber,
    failureClasses,
    findings,
    requiredStandards: failureClasses.map(
      (failureClass) => PRODUCTION_FAILURE_CLASS_STANDARDS[failureClass],
    ),
    constraints: constraintsForClasses(failureClasses),
    preserveCustomerFacts: true,
    doNotInventCustomerFacts: true,
    createdAt,
  };
}
