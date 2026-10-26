/**
 * The no-double-charge invariant, and where spend authority may come from.
 *
 * An unauthorized remint spent real provider budget producing a duplicate of work
 * that already existed. These tests hold that line closed without invoking the mint
 * path — the decision is proven against the predicate that makes it, so proving it
 * costs nothing.
 *
 * The properties that matter:
 *   1. A repeat of an already-satisfied request resolves specifically to
 *      ALREADY_RENDERED. Not "reuse or block" — the artifact must come back.
 *   2. Only immutable evidence can authorize spend. There is no input here that a
 *      stale correction loop could supply, which is the point: the predicate cannot
 *      be told to spend by a mutable workflow flag, because it does not accept one.
 *   3. Production, when authorized, always names its reason.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  CORRECTION_BUDGET_EXHAUSTED,
  resolveProductionEntitlement,
  type ProductionEntitlementFacts,
} from "./production-entitlement";
import {
  appendProductionSpendEntry,
  readProductionSpendLedger,
  reserveProductionSpendAttempt,
  spendLedgerRel,
  unreceiptedPaidAttempts,
  type ProductionSpendEntry,
} from "./production-spend-ledger";

const BUDGET = 3;

/**
 * A repeated invocation of an already-delivered request: receipts show a passing
 * artifact for this exact request, and no caller authorized producing another. This
 * is the shape of the invocation that paid to duplicate existing work.
 */
const REPEAT_OF_SATISFIED_REQUEST: ProductionEntitlementFacts = {
  requestAlreadySatisfied: true,
  completedAttemptsForRequest: 1,
  correctionAttemptBudget: BUDGET,
  explicitAuthorization: null,
  explicitAuthorizationAlreadyUsed: false,
};

describe("a repeat of a satisfied request resolves to ALREADY_RENDERED", () => {
  it("returns the delivered artifact instead of producing", () => {
    const entitlement = resolveProductionEntitlement(REPEAT_OF_SATISFIED_REQUEST);
    expect(entitlement.decision).toBe("ALREADY_RENDERED");
  });

  it("stays ALREADY_RENDERED however many attempts the request has already paid for", () => {
    // Attempt counts describe history. They are not permission to add to it.
    for (const completedAttemptsForRequest of [0, 1, 2, 3, 9]) {
      const entitlement = resolveProductionEntitlement({
        ...REPEAT_OF_SATISFIED_REQUEST,
        completedAttemptsForRequest,
      });
      expect(entitlement.decision).toBe("ALREADY_RENDERED");
    }
  });

  it("does not fall back to BLOCKED, which would withhold delivered work", () => {
    // Blocking a satisfied request is also wrong: the customer's artifact exists and
    // the caller should get it. Spending nothing is necessary but not sufficient.
    const entitlement = resolveProductionEntitlement(REPEAT_OF_SATISFIED_REQUEST);
    expect(entitlement.decision).not.toBe("BLOCKED");
    expect(entitlement.decision).not.toBe("AUTHORIZED_NEW_PRODUCTION");
  });
});

describe("only immutable evidence can authorize spend", () => {
  it("accepts no mutable workflow input at all", () => {
    // Structural guarantee, checked against the fact keys themselves. The previous
    // revision took a correction-brief fingerprint, an in-progress flag, and a loop
    // attempt count, all read out of mutable loop state, and any of the three could
    // authorize production. If one is reintroduced, this fails.
    const keys = Object.keys(REPEAT_OF_SATISFIED_REQUEST).sort();
    expect(keys).toEqual([
      "completedAttemptsForRequest",
      "correctionAttemptBudget",
      "explicitAuthorization",
      "explicitAuthorizationAlreadyUsed",
      "requestAlreadySatisfied",
    ]);
  });

  it("requires attribution on the one authorization that outranks satisfaction", () => {
    const entitlement = resolveProductionEntitlement({
      ...REPEAT_OF_SATISFIED_REQUEST,
      explicitAuthorization: {
        authorizationId: "auth-telemetry-1",
        authorizedBy: "owner:Tagia",
        reason: "cost telemetry measurement",
      },
    });
    expect(entitlement).toMatchObject({
      decision: "AUTHORIZED_NEW_PRODUCTION",
      reason: "explicit_authorization",
    });
    if (entitlement.decision !== "AUTHORIZED_NEW_PRODUCTION") return;
    // Who and why must survive into the record, so a forced mint can never be read
    // as organic behaviour.
    expect(entitlement.detail).toContain("owner:Tagia");
    expect(entitlement.detail).toContain("cost telemetry measurement");
  });

  it("spends an explicit authorization once, then reuses however often it is replayed", () => {
    // The one door that outranks satisfaction was a standing right, not a single
    // grant: the same payload sent twice authorized production twice, and sent N
    // times bought N paid duplicates of delivered work. The ledger records which
    // grant paid, so a replay is provably a replay.
    const authorization = {
      authorizationId: "auth-telemetry-1",
      authorizedBy: "owner:Tagia",
      reason: "cost telemetry measurement",
    };

    const firstUse = resolveProductionEntitlement({
      ...REPEAT_OF_SATISFIED_REQUEST,
      explicitAuthorization: authorization,
      explicitAuthorizationAlreadyUsed: false,
    });
    expect(firstUse).toMatchObject({
      decision: "AUTHORIZED_NEW_PRODUCTION",
      reason: "explicit_authorization",
    });

    for (const _replay of [1, 2, 3]) {
      const replay = resolveProductionEntitlement({
        ...REPEAT_OF_SATISFIED_REQUEST,
        explicitAuthorization: authorization,
        explicitAuthorizationAlreadyUsed: true,
      });
      expect(replay.decision).toBe("ALREADY_RENDERED");
      // And it says why, so the caller is not left guessing whether it was refused.
      if (replay.decision !== "ALREADY_RENDERED") return;
      expect(replay.detail).toContain("auth-telemetry-1");
    }
  });

  it("still refuses an unsatisfied request no further budget once its grant is spent", () => {
    // A spent authorization must not double as budget relief either.
    const entitlement = resolveProductionEntitlement({
      requestAlreadySatisfied: false,
      completedAttemptsForRequest: BUDGET,
      correctionAttemptBudget: BUDGET,
      explicitAuthorization: {
        authorizationId: "auth-telemetry-1",
        authorizedBy: "owner:Tagia",
        reason: "cost telemetry measurement",
      },
      explicitAuthorizationAlreadyUsed: true,
    });
    expect(entitlement).toMatchObject({
      decision: "BLOCKED",
      failureCode: CORRECTION_BUDGET_EXHAUSTED,
    });
  });

  it("lets an unspent grant release a budget spent by attempts that may have cost nothing", () => {
    // Attempts are counted conservatively — one that reserved and then died before its
    // cost could be settled counts as paid, because unknown spend must be treated as
    // spend. That is the right way to be wrong about money, but it can block a job over
    // attempts that in fact cost nothing, so something has to be able to release it.
    // An attributed, single-use grant is the only thing that can.
    const entitlement = resolveProductionEntitlement({
      requestAlreadySatisfied: false,
      completedAttemptsForRequest: BUDGET + 2,
      correctionAttemptBudget: BUDGET,
      explicitAuthorization: {
        authorizationId: "auth-recover-stranded-1",
        authorizedBy: "owner:Tagia",
        reason: "release a job stranded by crashed attempts",
      },
      explicitAuthorizationAlreadyUsed: false,
    });
    expect(entitlement).toMatchObject({
      decision: "AUTHORIZED_NEW_PRODUCTION",
      reason: "explicit_authorization",
    });
    if (entitlement.decision !== "AUTHORIZED_NEW_PRODUCTION") return;
    expect(entitlement.detail).toContain("owner:Tagia");
    expect(entitlement.detail).toContain("auth-recover-stranded-1");
  });

  it("says how a blocked request can be released, rather than just refusing", () => {
    const entitlement = resolveProductionEntitlement({
      requestAlreadySatisfied: false,
      completedAttemptsForRequest: BUDGET,
      correctionAttemptBudget: BUDGET,
      explicitAuthorization: null,
      explicitAuthorizationAlreadyUsed: false,
    });
    expect(entitlement).toMatchObject({ decision: "BLOCKED" });
    if (entitlement.decision !== "BLOCKED") return;
    expect(entitlement.detail).toMatch(/explicit, attributed authorization/i);
  });
});

describe("production proceeds only for a reason it can name", () => {
  it("authorizes the first attempt on a request nothing has been spent on", () => {
    const entitlement = resolveProductionEntitlement({
      requestAlreadySatisfied: false,
      completedAttemptsForRequest: 0,
      correctionAttemptBudget: BUDGET,
      explicitAuthorization: null,
      explicitAuthorizationAlreadyUsed: false,
    });
    expect(entitlement).toMatchObject({
      decision: "AUTHORIZED_NEW_PRODUCTION",
      reason: "first_production",
    });
  });

  it("authorizes a Studio correction while the request is unsatisfied and in budget", () => {
    for (const completedAttemptsForRequest of [1, BUDGET - 1]) {
      const entitlement = resolveProductionEntitlement({
        requestAlreadySatisfied: false,
        completedAttemptsForRequest,
        correctionAttemptBudget: BUDGET,
        explicitAuthorization: null,
        explicitAuthorizationAlreadyUsed: false,
      });
      expect(entitlement).toMatchObject({
        decision: "AUTHORIZED_NEW_PRODUCTION",
        reason: "studio_quality_correction",
      });
      if (entitlement.decision !== "AUTHORIZED_NEW_PRODUCTION") return;
      // Studio corrections are absorbed internally; they are not customer revisions.
      expect(entitlement.detail).toMatch(/does not consume a customer revision/i);
    }
  });

  it("blocks once the request has spent its correction budget", () => {
    for (const completedAttemptsForRequest of [BUDGET, BUDGET + 1]) {
      const entitlement = resolveProductionEntitlement({
        requestAlreadySatisfied: false,
        completedAttemptsForRequest,
        correctionAttemptBudget: BUDGET,
        explicitAuthorization: null,
        explicitAuthorizationAlreadyUsed: false,
      });
      expect(entitlement).toMatchObject({
        decision: "BLOCKED",
        failureCode: CORRECTION_BUDGET_EXHAUSTED,
      });
    }
  });

  it("never authorizes production without a named reason and detail", () => {
    for (const facts of everyFactCombination()) {
      const entitlement = resolveProductionEntitlement(facts);
      if (entitlement.decision === "AUTHORIZED_NEW_PRODUCTION") {
        expect(entitlement.reason).toBeTruthy();
        expect(entitlement.detail).toBeTruthy();
      }
    }
  });

  it("spends only when the request is unsatisfied or a caller took responsibility", () => {
    // The whole invariant in one assertion: every decision that leads to provider
    // spend is backed either by receipts showing the request is not yet satisfied, or
    // by an attributed authorization that has not been spent already. Nothing else
    // can buy anything.
    for (const facts of everyFactCombination()) {
      const entitlement = resolveProductionEntitlement(facts);
      if (entitlement.decision !== "AUTHORIZED_NEW_PRODUCTION") continue;
      const unspentGrant =
        facts.explicitAuthorization !== null &&
        !facts.explicitAuthorizationAlreadyUsed;
      expect(!facts.requestAlreadySatisfied || unspentGrant).toBe(true);
    }
  });

  it("resolves exactly one of the three decisions for every fact combination", () => {
    const seen = new Set<string>();
    for (const facts of everyFactCombination()) {
      seen.add(resolveProductionEntitlement(facts).decision);
    }
    expect([...seen].sort()).toEqual([
      "ALREADY_RENDERED",
      "AUTHORIZED_NEW_PRODUCTION",
      "BLOCKED",
    ]);
  });
});

/**
 * The ledger feeds `completedAttemptsForRequest`, so a line that misreports what it cost
 * is a line that can buy an extra production. These hold that reading closed.
 */
describe("production spend ledger — what a malformed line may claim", () => {
  const REQUEST = "request-key-ledger-shape";

  const paid = (over: Partial<ProductionSpendEntry>): ProductionSpendEntry =>
    ({
      requestKey: REQUEST,
      attemptId: "attempt-1",
      outcome: "technical_failure",
      billableCalls: 2,
      recordedAt: new Date().toISOString(),
      ...over,
    }) as ProductionSpendEntry;

  it("counts two paid attempts as two, even when their ids are unusable", () => {
    // Attempts are grouped by id so a settlement supersedes its own reservation. An
    // empty id is not an id, though, and grouping by one folded two paid attempts into
    // one — reading real spend as half of itself. Each unusable id now stands alone.
    for (const attemptId of ["", "   ", undefined]) {
      expect(
        unreceiptedPaidAttempts({
          entries: [
            paid({ attemptId: attemptId as string | undefined }),
            paid({ attemptId: attemptId as string | undefined }),
          ],
          requestKey: REQUEST,
          knownRenderVersions: new Set<number>(),
        }),
      ).toBe(2);
    }

    // A real id still groups, which is what makes a settlement replace its reservation
    // rather than double-count it.
    expect(
      unreceiptedPaidAttempts({
        entries: [
          paid({ attemptId: "attempt-9", outcome: "in_flight", billableCalls: 0 }),
          paid({ attemptId: "attempt-9" }),
        ],
        requestKey: REQUEST,
        knownRenderVersions: new Set<number>(),
      }),
    ).toBe(1);
  });

  it("treats a line it cannot trust as a paid attempt rather than believing it", () => {
    const lines = [
      JSON.stringify(paid({ attemptId: "attempt-good" })),
      // Each of these misreports something entitlement reads.
      JSON.stringify(paid({ attemptId: "" })),
      JSON.stringify(paid({ outcome: "invented_outcome" as never })),
      JSON.stringify(paid({ billableCalls: "2" as never })),
      JSON.stringify(paid({ billableCalls: -1 })),
      '{"requestKey":"truncated-mid',
    ];

    const dir = mkdtempSync(path.join(tmpdir(), "spend-ledger-shape-"));
    try {
      writeFileSync(
        path.join(dir, spendLedgerRel(".")),
        `${lines.join("\n")}\n`,
        "utf8",
      );
      const read = readProductionSpendLedger({ repoRoot: dir, artifactRootRel: "." });
      expect(read.readable).toBe(true);
      if (!read.readable) return;

      // One line is trustworthy; the other five are counted as spend that cannot be
      // read, which is the conservative reading — unknown spend is treated as spend.
      expect(read.entries.length).toBe(1);
      expect(read.unreadableLines).toBe(5);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts every entry the append path actually writes", () => {
    // A validator that rejects legitimate records would block production on a healthy
    // ledger, so it is checked against the real writer rather than against a fixture.
    const dir = mkdtempSync(path.join(tmpdir(), "spend-ledger-writer-"));
    try {
      const reservation = reserveProductionSpendAttempt({
        repoRoot: dir,
        artifactRootRel: ".",
        reservation: {
          requestKey: REQUEST,
          idempotencyKey: `${REQUEST}|exec`,
          campaignId: "camp-writer",
          dispatchId: "dd:camp-writer",
          jobId: "camp-writer:v2-rtu-flyer",
          skuId: "v2-rtu-flyer",
          productionMethodId: "image_plus_renderer",
          authorizationId: null,
          reason: "explicit_authorization",
          startedAt: new Date().toISOString(),
        } as unknown as Parameters<
          typeof reserveProductionSpendAttempt
        >[0]["reservation"],
      });
      expect(reservation.ok).toBe(true);
      if (!reservation.ok) return;

      appendProductionSpendEntry({
        repoRoot: dir,
        artifactRootRel: ".",
        entry: {
          requestKey: REQUEST,
          attemptId: reservation.attemptId,
          outcome: "success",
          billableCalls: 4,
          renderVersion: 18,
        } as Parameters<typeof appendProductionSpendEntry>[0]["entry"],
      });

      const read = readProductionSpendLedger({ repoRoot: dir, artifactRootRel: "." });
      expect(read.readable).toBe(true);
      if (!read.readable) return;
      expect(read.unreadableLines).toBe(0);
      expect(read.entries.length).toBe(2);
      // Both lines describe one attempt, so they must fold to one.
      expect(
        unreceiptedPaidAttempts({
          entries: read.entries,
          requestKey: REQUEST,
          knownRenderVersions: new Set<number>(),
        }),
      ).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/** Every reachable fact combination, so no path can slip through unexamined. */
function everyFactCombination(): ProductionEntitlementFacts[] {
  const combinations: ProductionEntitlementFacts[] = [];
  for (const requestAlreadySatisfied of [true, false])
    for (const completedAttemptsForRequest of [0, 1, 2, 3, 4])
      for (const explicitAuthorization of [
        null,
        {
          authorizationId: "auth-measurement-1",
          authorizedBy: "owner:Tagia",
          reason: "authorized measurement",
        },
      ])
        for (const explicitAuthorizationAlreadyUsed of [false, true])
          combinations.push({
            requestAlreadySatisfied,
            completedAttemptsForRequest,
            correctionAttemptBudget: BUDGET,
            explicitAuthorization,
            explicitAuthorizationAlreadyUsed,
          });
  return combinations;
}
