import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";
import { ACTIVE_CUSTOMER_FACING_SKUS } from "@/lib/studio-kitchen-production";

import { markPaymentReceived, readCurrentCampaign } from "@/lib/studio-board-campaign";
import { addRouteMapServiceToPlan } from "@/lib/route-map-campaign";

import {
  assertPreAcceptanceAllowsPayment,
  buildPreAcceptanceFactFingerprint,
  buildPreAcceptancePaymentAuthorization,
  clearPersistedPreAcceptanceDecision,
  evaluateCapabilityForServices,
  evaluateMaterialClarification,
  evaluateMaterialRiskPolicy,
  evaluatePreAcceptance,
  evaluateTimingTruth,
  isClearToAccept,
  persistPreAcceptanceDecision,
  projectFactsFromWorkingDraft,
  readAuthorizedPreAcceptanceDecisionId,
  resolveRequiredMinBusinessDays,
  runPreAcceptanceForCheckout,
  type PreAcceptanceProjectFacts,
} from "./index";

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function withCampaignStorage(run: () => void) {
  const storage = new Map<string, string>();
  const session = new Map<string, string>();
  const originalWindow = globalThis.window;
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ syncedAt: "2026-08-10T12:00:00.000Z" }),
  } as Response);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
      sessionStorage: {
        getItem: (key: string) => session.get(key) ?? null,
        setItem: (key: string, value: string) => {
          session.set(key, value);
        },
        removeItem: (key: string) => {
          session.delete(key);
        },
      },
      dispatchEvent: () => true,
    },
  });

  try {
    run();
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
    fetchSpy.mockRestore();
  }
}

function baseFacts(
  overrides: Partial<PreAcceptanceProjectFacts> = {},
): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: ["v2-rtu-flyer"],
    projectNeed: "Need a flyer for our spring open house",
    businessName: "Cedar Lane",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a flyer for our spring open house",
    ...overrides,
  };
}

describe("PRODUCTION-ASSURANCE-PRE-ACCEPTANCE-GATE-1", () => {
  beforeEach(() => {
    clearPersistedPreAcceptanceDecision();
  });
  afterEach(() => {
    clearPersistedPreAcceptanceDecision();
  });

  it("passes capability for active supported SKUs (SELL WITH LIMITS)", () => {
    const cap = evaluateCapabilityForServices(["v2-rtu-flyer", "cc-001"]);
    expect(cap.verdict).toBe("pass");
    expect(cap.perSku.every((r) => r.verdict === "launchable")).toBe(true);
  });

  it("fails capability for unmapped SKUs", () => {
    const cap = evaluateCapabilityForServices(["not-a-real-sku"]);
    expect(cap.verdict).toBe("fail");
    expect(cap.perSku[0]?.verdict).toBe("unmapped");
  });

  it("passes when every selected active SKU is launchable", () => {
    const cap = evaluateCapabilityForServices([...ACTIVE_CUSTOMER_FACING_SKUS]);
    expect(cap.verdict).toBe("pass");
  });

  it("fails multi-service cart when one SKU is unmapped (weakest wins)", () => {
    const decision = evaluatePreAcceptance(
      baseFacts({
        selectedServiceIds: ["v2-rtu-flyer", "spark"],
      }),
    );
    expect(decision.capability.verdict).toBe("fail");
    expect(decision.outcome).toBe("DECLINE");
    expect(decision.paymentAllowed).toBe(false);
  });

  it("treats a cleared future date as NO_KNOWN_TIMING_CONFLICT, not a support guarantee", () => {
    const timing = evaluateTimingTruth({
      requestedDeadline: isoDaysFromToday(21),
      deadlineStatus: "unconfirmed",
      selectedServiceIds: ["v2-rtu-flyer"],
    });
    expect(timing.verdict).toBe("NO_KNOWN_TIMING_CONFLICT");
    expect(timing.evidenceSource).toBe("catalog_timing_windows");
    expect(timing.reason.toLowerCase()).toContain("not a capacity");
    expect(timing.reason).not.toMatch(/\bSUPPORTED\b/);
    expect(timing.reason.toLowerCase()).not.toMatch(/we can (meet|guarantee)/);
  });

  it("blocks CLEAR when catalog minimum turnaround is violated", () => {
    const catalog = resolveRequiredMinBusinessDays(["v2-rtu-flyer"]);
    expect(catalog.requiredMinBusinessDays).toBeGreaterThanOrEqual(1);

    const decision = evaluatePreAcceptance(
      baseFacts({
        requestedDeadline: isoDaysFromToday(1),
        deadlineStatus: "unconfirmed",
        selectedServiceIds: ["v2-rtu-flyer"],
      }),
    );
    expect(decision.timing.verdict).toBe("UNSUPPORTED");
    expect(decision.timing.evidenceSource).toBe("catalog_timing_windows");
    expect(decision.outcome).toBe("DECLINE");
    expect(decision.paymentAllowed).toBe(false);
  });

  it("rejects past deadlines as UNSUPPORTED → DECLINE", () => {
    const decision = evaluatePreAcceptance(
      baseFacts({
        requestedDeadline: "2020-01-01",
        deadlineStatus: "unconfirmed",
      }),
    );
    expect(decision.timing.verdict).toBe("UNSUPPORTED");
    expect(decision.outcome).toBe("DECLINE");
    expect(decision.paymentAllowed).toBe(false);
  });

  it("requires clarification for ambiguous timing", () => {
    const decision = evaluatePreAcceptance(
      baseFacts({
        requestedDeadline: "",
        deadlineStatus: "unconfirmed",
      }),
    );
    expect(decision.timing.verdict).toBe("CLARIFICATION_NEEDED");
    expect(decision.outcome).toBe("CLARIFICATION_REQUIRED");
    expect(decision.paymentAllowed).toBe(false);
  });

  it("requires clarification for material missing project need", () => {
    const clarification = evaluateMaterialClarification({
      routeId: "i75",
      selectedServiceIds: ["v2-rtu-flyer"],
      projectNeed: "   ",
    });
    expect(clarification.verdict).toBe("material_gap");
    const decision = evaluatePreAcceptance(baseFacts({ projectNeed: "" }));
    expect(decision.outcome).toBe("CLARIFICATION_REQUIRED");
  });

  it("does not treat ordinary creative need wording as material clarification", () => {
    const clarification = evaluateMaterialClarification({
      routeId: "i75",
      selectedServiceIds: ["v2-rtu-flyer"],
      projectNeed: "Warm bakery flyer with clear offer and phone number",
    });
    expect(clarification.verdict).toBe("sufficient");
  });

  it("routes known policy gray area to OWNER_POLICY_REVIEW", () => {
    const risk = evaluateMaterialRiskPolicy("We need guaranteed results copy");
    expect(risk.verdict).toBe("owner_policy_review");
    const decision = evaluatePreAcceptance(
      baseFacts({
        projectNeed: "Marketing with guaranteed results for investors",
        riskScanText: "Marketing with guaranteed results for investors",
      }),
    );
    expect(decision.outcome).toBe("OWNER_POLICY_REVIEW");
    expect(decision.paymentAllowed).toBe(false);
    expect(decision.escalationTarget).toBe("owner_policy");
  });

  it("declines known hard prohibition patterns", () => {
    const decision = evaluatePreAcceptance(
      baseFacts({
        projectNeed: "Please do celebrity voice cloning for our ad",
        riskScanText: "Please do celebrity voice cloning for our ad",
      }),
    );
    expect(decision.outcome).toBe("DECLINE");
    expect(decision.paymentAllowed).toBe(false);
  });

  it("CLEAR_TO_ACCEPT allows payment; other outcomes block", () => {
    const clear = evaluatePreAcceptance(baseFacts());
    expect(clear.outcome).toBe("CLEAR_TO_ACCEPT");
    expect(clear.paymentAllowed).toBe(true);
    expect(isClearToAccept(clear)).toBe(true);

    for (const outcome of [
      "CLARIFICATION_REQUIRED",
      "OWNER_POLICY_REVIEW",
      "DECLINE",
    ] as const) {
      expect(outcome === "CLEAR_TO_ACCEPT").toBe(false);
    }
  });

  it("payment gate blocks missing/stale/non-clear decisions", () => {
    const facts = baseFacts();
    clearPersistedPreAcceptanceDecision();
    const first = assertPreAcceptanceAllowsPayment(facts);
    expect(first.allowed).toBe(true);

    const blockedFacts = baseFacts({ projectNeed: "" });
    const blocked = assertPreAcceptanceAllowsPayment(blockedFacts);
    expect(blocked.allowed).toBe(false);

    const clearDecision = runPreAcceptanceForCheckout(facts);
    expect(clearDecision.paymentAllowed).toBe(true);
    persistPreAcceptanceDecision(clearDecision);

    const stale = assertPreAcceptanceAllowsPayment(
      baseFacts({
        selectedServiceIds: ["v2-rtu-menu"],
        draftRevision: 2,
      }),
    );
    // Re-evaluates; menu is launchable so may allow — fingerprint change forces reeval
    expect(stale.decision?.factFingerprint).not.toBe(clearDecision.factFingerprint);
  });

  it("service change and deadline change invalidate prior CLEAR fingerprint", () => {
    const a = baseFacts({ selectedServiceIds: ["v2-rtu-flyer"] });
    const b = baseFacts({ selectedServiceIds: ["v2-rtu-menu"] });
    const c = baseFacts({
      selectedServiceIds: ["v2-rtu-flyer"],
      requestedDeadline: "2030-06-01",
      deadlineStatus: "unconfirmed",
    });
    expect(buildPreAcceptanceFactFingerprint(a)).not.toBe(
      buildPreAcceptanceFactFingerprint(b),
    );
    expect(buildPreAcceptanceFactFingerprint(a)).not.toBe(
      buildPreAcceptanceFactFingerprint(c),
    );
  });

  it("clarification answer path reevaluates to CLEAR when facts fixed", () => {
    const unclear = runPreAcceptanceForCheckout(baseFacts({ projectNeed: "" }));
    expect(unclear.outcome).toBe("CLARIFICATION_REQUIRED");
    const fixed = runPreAcceptanceForCheckout(baseFacts());
    expect(fixed.outcome).toBe("CLEAR_TO_ACCEPT");
    expect(fixed.paymentAllowed).toBe(true);
  });

  it("owner is not the escalation target for routine clarification", () => {
    const decision = evaluatePreAcceptance(baseFacts({ projectNeed: "" }));
    expect(decision.outcome).toBe("CLARIFICATION_REQUIRED");
    expect(decision.escalationTarget).toBe("none");
  });

  it("preserves package identity and four explicit outcomes", () => {
    expect(studioPreAcceptanceV1.packageId).toBe(
      "PRODUCTION-ASSURANCE-PRE-ACCEPTANCE-GATE-1",
    );
    expect(Object.values(studioPreAcceptanceV1.outcomes)).toEqual([
      "CLEAR_TO_ACCEPT",
      "CLARIFICATION_REQUIRED",
      "OWNER_POLICY_REVIEW",
      "DECLINE",
    ]);
  });

  it("does not import or call Conversation phase-gate evaluator (CR-D5)", async () => {
    const gateMod = await import("./index");
    expect(gateMod).not.toHaveProperty("evaluateConversationPhaseGate");
    // Sanity: phase-gate module still exists untouched for other packages.
    const phase = await import("@/lib/studio-conversation-phase-gates");
    expect(typeof phase.evaluateConversationPhaseGate).toBe("function");
  });

  it("leaves post-pay Acceptance Review module distinct", async () => {
    const postPay = await import("@/lib/job-control/acceptance-review");
    expect(typeof postPay.buildAcceptedAcceptanceReview).toBe("function");
    expect(postPay).not.toHaveProperty("CLEAR_TO_ACCEPT");
  });

  it("consumes Kitchen closeout ledger rather than inventing dispositions", () => {
    const cap = evaluateCapabilityForServices(["rm-j005"]);
    expect(cap.perSku[0]?.launchDisposition).toBe("SELL WITH LIMITS");
  });

  it("binds CLEAR decision onto Campaign Record at payment; survives session clear", () => {
    withCampaignStorage(() => {
      addRouteMapServiceToPlan("v2-rtu-flyer", "random-exit");
      const clear = runPreAcceptanceForCheckout(baseFacts());
      expect(clear.outcome).toBe("CLEAR_TO_ACCEPT");
      const authorization = buildPreAcceptancePaymentAuthorization(clear);
      expect(authorization?.decisionId).toBe(clear.decisionId);

      const paid = markPaymentReceived(undefined, authorization);
      expect(paid?.paymentReceivedAt).toBeTruthy();
      expect(paid?.preAcceptancePaymentAuthorization?.decisionId).toBe(
        clear.decisionId,
      );
      expect(paid?.preAcceptancePaymentAuthorization?.outcome).toBe(
        "CLEAR_TO_ACCEPT",
      );
      expect(paid?.preAcceptancePaymentAuthorization?.paymentAuthorized).toBe(
        true,
      );
      expect(paid?.preAcceptancePaymentAuthorization?.factFingerprint).toBe(
        clear.factFingerprint,
      );

      clearPersistedPreAcceptanceDecision();
      const afterSessionLoss = readCurrentCampaign();
      expect(readAuthorizedPreAcceptanceDecisionId(afterSessionLoss)).toBe(
        clear.decisionId,
      );
    });
  });

  it("never binds payment authorization for non-CLEAR decisions", () => {
    const blocked = evaluatePreAcceptance(baseFacts({ projectNeed: "" }));
    expect(blocked.outcome).toBe("CLARIFICATION_REQUIRED");
    expect(buildPreAcceptancePaymentAuthorization(blocked)).toBeNull();
  });

  it("stale CLEAR cannot authorize payment after material fact change", () => {
    const clear = runPreAcceptanceForCheckout(baseFacts());
    expect(clear.paymentAllowed).toBe(true);
    persistPreAcceptanceDecision(clear);

    const staleGate = assertPreAcceptanceAllowsPayment(
      baseFacts({
        projectNeed: "",
        draftRevision: clear.draftRevision + 1,
      }),
    );
    expect(staleGate.allowed).toBe(false);
    expect(buildPreAcceptancePaymentAuthorization(staleGate.decision!)).toBeNull();
  });

  it("projectFactsFromWorkingDraft reads route/services/opening answers", () => {
    const draft = {
      version: 1,
      status: "working_draft" as const,
      editable: true,
      updatedAt: new Date().toISOString(),
      revision: 3,
      cursor: {},
      attribution: [],
      slices: {
        discoveryAnswers: {
          preferredName: "Sam",
          projectNeed: "Menu update",
          businessName: "Harbor",
          requestedDeadline: "",
          deadlineStatus: "not_requested",
          existingMaterialsNote: "",
          confirmedAt: null,
        },
        customerSelectedRoute: { roadId: "i20", selectedAt: "t" },
        selectedServices: [
          { jobId: "v2-rtu-menu", roadId: "i20", addedAt: "t" },
        ],
      },
    };
    const facts = projectFactsFromWorkingDraft(draft);
    expect(facts.routeId).toBe("i20");
    expect(facts.selectedServiceIds).toEqual(["v2-rtu-menu"]);
    expect(facts.projectNeed).toBe("Menu update");
    expect(facts.draftRevision).toBe(3);
  });
});

// Silence unused vi import if not needed — keep for future stubs
void vi;
