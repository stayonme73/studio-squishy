import { describe, expect, it } from "vitest";

import { studioAutonomousProductionLoopV1 } from "@/config/studio-autonomous-production-loop-v1";

import { buildProductionCorrectionBrief } from "./brief";
import {
  appendInternalAttempt,
  beginNewAttemptSequence,
  createInternalProductionLoop,
  currentSequenceAttempts,
  remainingInternalAttempts,
  resolveWorkingProductionLoop,
  nextAttemptTriggeredBy,
  wouldExceedInternalAttemptBudget,
} from "./ledger";
import {
  classifyFindingId,
  constraintsForClasses,
  mergeFlyerReasoningConstraints,
} from "./types";
import type { InternalProductionAttemptRecord } from "./types";

describe("STUDIO-OPERATING-AUTONOMOUS-PRODUCTION-LOOP-1 ledger", () => {
  it("keeps a finite internal budget separate from customer revisions", () => {
    expect(studioAutonomousProductionLoopV1.maxInternalProductionAttempts).toBe(3);
    expect(studioAutonomousProductionLoopV1.customerRevisionPolicyUnchanged).toBe(
      true,
    );
    expect(studioAutonomousProductionLoopV1.refundPolicyUnchanged).toBe(true);

    let loop = createInternalProductionLoop({
      campaignId: "camp-loop",
      jobId: "camp-loop::v2-rtu-flyer",
      dispatchId: "dd:camp-loop::v2-rtu-flyer",
    });
    expect(remainingInternalAttempts(loop)).toBe(3);
    expect(wouldExceedInternalAttemptBudget(loop)).toBe(false);

    for (let n = 1; n <= 3; n += 1) {
      const brief = buildProductionCorrectionBrief({
        sourceAttemptNumber: n,
        findings: [
          {
            id: "excessive_dominant_geometry",
            severity: "fail",
            checkKind: "creative_quality",
            message: "A single geometric seal dominates the composition",
          },
        ],
      });
      loop = appendInternalAttempt(loop, {
        attemptNumber: n,
        triggeredBy: n === 1 ? "initial_dispatch" : "qa_correction",
        productionCapabilityId: "studio_design_renderer",
        correctionBriefId: loop.activeBrief?.briefId ?? null,
        correctionBriefFingerprint: brief.fingerprint,
        renderVersion: n,
        pngContentSha256: null,
        qaResult: "fail",
        failureClasses: brief.failureClasses,
        failureCode: "QA_FAILURE",
        message: brief.findings[0]?.message ?? "fail",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }, brief);
    }

    expect(loop.status).toBe("fail_closed");
    expect(loop.ownerEscalation).toBeNull();
    expect(loop.failClosed?.required).toBe(true);
    expect(loop.failClosed?.customerDisposition).toBe("refund_or_cannot_deliver");
    expect(loop.attempts).toHaveLength(3);
    expect(remainingInternalAttempts(loop)).toBe(0);
  });

  it("maps class findings into production constraints without pixel layouts", () => {
    expect(classifyFindingId("excessive_dominant_geometry")).toBe(
      "excessive_dominant_geometry",
    );
    expect(classifyFindingId("instructional_purpose_on_art")).toBe(
      "instructional_copy_leakage",
    );
    const constraints = constraintsForClasses(["excessive_dominant_geometry"]);
    expect(constraints.capDominantGeometry).toBe(true);
    expect(constraints.tightenComposition).toBe(true);
    const brief = buildProductionCorrectionBrief({
      sourceAttemptNumber: 1,
      findings: [
        {
          id: "excessive_dominant_geometry",
          severity: "fail",
          checkKind: "creative_quality",
          message: "A single geometric seal dominates the composition",
        },
      ],
    });
    expect(brief.preserveCustomerFacts).toBe(true);
    expect(JSON.stringify(brief)).not.toMatch(/"x":\s*\d+/);
    expect(brief.requiredStandards[0]).toMatch(/must not dominate/i);
  });

  it("maps headline/CTA duplication and hollow field plates to class constraints", () => {
    expect(classifyFindingId("duplicate_headline_cta")).toBe(
      "duplicate_customer_facing_copy",
    );
    expect(classifyFindingId("redundant_price_representation")).toBe(
      "duplicate_customer_facing_copy",
    );
    expect(classifyFindingId("hollow_field_plate")).toBe(
      "hollow_unused_composition",
    );
    expect(classifyFindingId("identity_offer_ungrouped")).toBe(
      "hollow_unused_composition",
    );
    expect(classifyFindingId("content_disproportionate_format")).toBe(
      "hollow_unused_composition",
    );
    const constraints = constraintsForClasses([
      "duplicate_customer_facing_copy",
      "hollow_unused_composition",
    ]);
    expect(constraints.preferOfferLedHierarchy).toBe(true);
    expect(constraints.tightenComposition).toBe(true);
  });

  it("carries every constraint across attempts instead of forgetting the layout instruction", () => {
    // The loop settles constraints between attempts. A constraint the merge drops
    // is one the reasoner stops hearing on exactly the retry that needed it.
    const first = constraintsForClasses(["creatively_insufficient"]);
    expect(first.preferAlternateLayoutFamily).toBe(true);

    const second = mergeFlyerReasoningConstraints(first, {
      capDominantGeometry: false,
      tightenComposition: false,
      preferOfferLedHierarchy: true,
      preferAlternateLayoutFamily: false,
      excludeLayoutFamilyIds: ["editorial_split"],
    });
    expect(second.preferAlternateLayoutFamily).toBe(true);
    expect(second.preferOfferLedHierarchy).toBe(true);
    expect(second.tightenComposition).toBe(true);

    // Exclusions accumulate: a family already rejected does not become acceptable
    // again because a later attempt failed for a different reason.
    const third = mergeFlyerReasoningConstraints(second, {
      capDominantGeometry: false,
      tightenComposition: false,
      preferOfferLedHierarchy: false,
      excludeLayoutFamilyIds: ["type_led_premium"],
    });
    expect(third.excludeLayoutFamilyIds).toEqual([
      "editorial_split",
      "type_led_premium",
    ]);
  });

  it("opens a Studio-quality-correction loop when production facts change after prior attempts", () => {
    const prior = createInternalProductionLoop({
      campaignId: "camp-loop",
      jobId: "camp-loop::v2-rtu-flyer",
      dispatchId: "dd:camp-loop::v2-rtu-flyer",
      productionFactFingerprint: "fingerprint-old",
    });
    const exhausted = appendInternalAttempt(
      prior,
      {
        attemptNumber: 1,
        triggeredBy: "initial_dispatch",
        productionCapabilityId: "studio_design_renderer",
        correctionBriefId: null,
        correctionBriefFingerprint: "none",
        renderVersion: 1,
        pngContentSha256: null,
        qaResult: "fail",
        failureClasses: ["excessive_dominant_geometry"],
        failureCode: "QA_FAILURE",
        message: "fail",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      null,
    );
    const next = resolveWorkingProductionLoop({
      stored: exhausted,
      campaignId: "camp-loop",
      jobId: "camp-loop::v2-rtu-flyer",
      dispatchId: "dd:camp-loop::v2-rtu-flyer",
      productionFactFingerprint: "fingerprint-new",
    });
    expect(next.origin).toBe("studio_quality_correction");
    expect(next.status).toBe("in_progress");
    expect(next.attempts).toHaveLength(0);
    expect(nextAttemptTriggeredBy(next)).toBe("studio_quality_correction");

    const sameFacts = resolveWorkingProductionLoop({
      stored: { ...exhausted, status: "escalated", productionFactFingerprint: "fingerprint-old" },
      campaignId: "camp-loop",
      jobId: "camp-loop::v2-rtu-flyer",
      dispatchId: "dd:camp-loop::v2-rtu-flyer",
      productionFactFingerprint: "fingerprint-old",
    });
    expect(sameFacts.status).toBe("escalated");
    expect(sameFacts.attempts).toHaveLength(1);
  });

  it("recovers a technically exhausted loop without consuming customer revisions", () => {
    let loop = createInternalProductionLoop({
      campaignId: "camp-loop",
      jobId: "camp-loop::v2-rtu-flyer",
      dispatchId: "dd:camp-loop::v2-rtu-flyer",
      productionFactFingerprint: "fingerprint-tech",
    });
    for (let n = 1; n <= 3; n += 1) {
      loop = appendInternalAttempt(
        loop,
        {
          attemptNumber: n,
          triggeredBy: n === 1 ? "initial_dispatch" : "qa_correction",
          productionCapabilityId: "studio_design_renderer",
          correctionBriefId: null,
          correctionBriefFingerprint: "none",
          renderVersion: null,
          pngContentSha256: null,
          qaResult: "fail",
          failureClasses: ["technical_render_failure"],
          failureCode: "EXPORT_FAILURE",
          message: "browser missing",
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        null,
      );
    }
    expect(loop.status).toBe("fail_closed");
    const recovered = resolveWorkingProductionLoop({
      stored: loop,
      campaignId: "camp-loop",
      jobId: "camp-loop::v2-rtu-flyer",
      dispatchId: "dd:camp-loop::v2-rtu-flyer",
      productionFactFingerprint: "fingerprint-tech",
    });
    expect(recovered.origin).toBe("technical_recovery");
    expect(recovered.status).toBe("in_progress");
    expect(recovered.attempts).toHaveLength(0);
  });
});

/**
 * What a finished sequence is allowed to cost the next one.
 *
 * `attempts` is the job's history. Every count that meant "how far into this run are we"
 * used to read its length, so a production that was legitimately entitled to run was
 * treated as a retry of one that had already finished — the creative reasoner skipped, the
 * budget already spent, escalation one failure away.
 */
describe("a new production sequence does not inherit a finished one's attempts", () => {
  const base = () =>
    createInternalProductionLoop({
      campaignId: "camp-sequence",
      jobId: "camp-sequence::v2-rtu-flyer",
      dispatchId: "dd:camp-sequence::v2-rtu-flyer",
      productionFactFingerprint: "fingerprint-sequence",
    });

  const attempt = (
    n: number,
    qaResult: "pass" | "fail",
  ): InternalProductionAttemptRecord => ({
    attemptNumber: n,
    triggeredBy: n === 1 ? "initial_dispatch" : "qa_correction",
    productionCapabilityId: "studio_design_renderer",
    correctionBriefId: null,
    correctionBriefFingerprint: "none",
    renderVersion: n,
    pngContentSha256: null,
    qaResult,
    failureClasses: qaResult === "fail" ? ["excessive_dominant_geometry"] : [],
    failureCode: qaResult === "fail" ? "QA_FAILURE" : null,
    message: qaResult,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });

  it("gives a fresh sequence its whole budget and its first-attempt standing", () => {
    const settled = appendInternalAttempt(base(), attempt(1, "pass"), null);
    expect(settled.status).toBe("passed");

    // The defect, stated exactly: the settled loop reports one attempt, so every count
    // that read `attempts.length` saw a run already in progress.
    expect(settled.attempts).toHaveLength(1);
    expect(currentSequenceAttempts(settled)).toBe(1);
    expect(remainingInternalAttempts(settled)).toBe(2);
    expect(nextAttemptTriggeredBy(settled)).toBe("qa_correction");

    const fresh = beginNewAttemptSequence(settled);

    // The history is still there. Only the counting moved.
    expect(fresh.attempts).toHaveLength(1);
    expect(fresh.attempts[0]).toEqual(settled.attempts[0]);
    expect(currentSequenceAttempts(fresh)).toBe(0);
    expect(remainingInternalAttempts(fresh)).toBe(
      studioAutonomousProductionLoopV1.maxInternalProductionAttempts,
    );
    expect(wouldExceedInternalAttemptBudget(fresh)).toBe(false);
    expect(nextAttemptTriggeredBy(fresh)).not.toBe("qa_correction");

    // Nothing the idempotency key is built from moved with it.
    expect(fresh.status).toBe(settled.status);
    expect(fresh.settledConstraints).toEqual(settled.settledConstraints);
    expect(fresh.settledBriefFingerprint).toBe(settled.settledBriefFingerprint);
    expect(fresh.productionFactFingerprint).toBe(settled.productionFactFingerprint);
  });

  it("still escalates a fresh sequence after its own budget, not sooner", () => {
    // A job at the end of its history: three attempts already on the record.
    let loop = base();
    for (const n of [1, 2, 3]) {
      loop = appendInternalAttempt(loop, attempt(n, n === 3 ? "pass" : "fail"), null);
    }
    expect(loop.attempts).toHaveLength(3);
    expect(loop.status).toBe("passed");

    // Before the repair this run had nothing left to spend and would have been refused
    // INTERNAL_CORRECTION_EXHAUSTED while being fully entitled to produce.
    let fresh = beginNewAttemptSequence(loop);
    expect(remainingInternalAttempts(fresh)).toBe(3);

    for (const n of [4, 5]) {
      fresh = appendInternalAttempt(fresh, attempt(n, "fail"), null);
      expect(fresh.status).toBe("in_progress");
      expect(fresh.ownerEscalation).toBeNull();
    }
    expect(remainingInternalAttempts(fresh)).toBe(1);
    expect(currentSequenceAttempts(fresh)).toBe(2);

    fresh = appendInternalAttempt(fresh, attempt(6, "fail"), null);
    expect(currentSequenceAttempts(fresh)).toBe(3);
    expect(remainingInternalAttempts(fresh)).toBe(0);
    expect(fresh.status).toBe("fail_closed");
    expect(fresh.ownerEscalation).toBeNull();
    expect(fresh.failClosed?.required).toBe(true);
    // Bounded, and the whole record is intact.
    expect(fresh.attempts).toHaveLength(6);
  });

  it("does not hand a sequence still in progress a second budget", () => {
    const failed = appendInternalAttempt(base(), attempt(1, "fail"), null);
    expect(failed.status).toBe("in_progress");
    expect(remainingInternalAttempts(failed)).toBe(2);

    // Resuming a correction is not a new production. Its own attempt still counts, or a
    // crash mid-sequence would return a full budget every time it was retried.
    expect(beginNewAttemptSequence(failed)).not.toBe(failed);
    expect(currentSequenceAttempts(beginNewAttemptSequence(failed))).toBe(0);
    // Which is why the hook only begins a sequence for a settled loop — proven there.
    expect(failed.sequenceStartedAtAttempt).toBeUndefined();
  });

  it("counts the whole history when the record says something it cannot mean", () => {
    let loop = base();
    for (const n of [1, 2]) {
      loop = appendInternalAttempt(loop, attempt(n, "fail"), null);
    }

    // The field is read from a file. A start past the end of `attempts` would report zero
    // attempts however many the run had made, and the attempt loop is bounded by exactly
    // that number — an unbounded licence to produce. Anything untrustworthy counts the
    // full history instead, which bounds the run.
    for (const bogus of [99, -1, 1.5, Number.NaN, "1" as unknown as number]) {
      const tampered = { ...loop, sequenceStartedAtAttempt: bogus };
      expect(currentSequenceAttempts(tampered)).toBe(2);
      expect(remainingInternalAttempts(tampered)).toBe(1);
    }

    // And a tampered record still escalates rather than failing forever.
    const tampered = appendInternalAttempt(
      { ...loop, sequenceStartedAtAttempt: 99 },
      attempt(3, "fail"),
      null,
    );
    expect(tampered.status).toBe("fail_closed");
  });

  it("reads a record written before sequences exactly as it always did", () => {
    let legacy = base();
    for (const n of [1, 2]) {
      legacy = appendInternalAttempt(legacy, attempt(n, "fail"), null);
    }
    expect(legacy.sequenceStartedAtAttempt).toBeUndefined();
    expect(currentSequenceAttempts(legacy)).toBe(2);
    expect(remainingInternalAttempts(legacy)).toBe(1);
    expect(nextAttemptTriggeredBy(legacy)).toBe("qa_correction");
  });
});
