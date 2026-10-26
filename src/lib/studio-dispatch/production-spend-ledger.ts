/**
 * Append-only record of provider money spent producing one job's artifacts.
 *
 * Receipts are written per render version, which means they only exist once a
 * version directory does. The hybrid route pays OpenAI for a generated visual
 * *before* the renderer produces anything: image generation, then a text audit of
 * that image, then HTML render, then export. A failure between the image and the
 * export — `EXPORT_FAILURE`, `RENDER_FAILURE`, `BROKEN_ASSET_REFERENCE` — returns
 * with no identity and therefore no version to write a receipt against. The money
 * was spent and the only trace of it was the provider's invoice.
 *
 * That is what makes it unbounded. Entitlement counts paid attempts to decide
 * whether a request still has budget. An attempt that spends and leaves no evidence
 * counts as zero, so the next plain invocation is entitled as first production
 * again, spends again, fails the same way again, and records nothing again.
 *
 * This ledger is where a paid attempt lands when there is no version to attach it
 * to. Appended, never rewritten — including attempts that cost nothing, so the
 * history distinguishes "no spend" from "spend not recorded".
 *
 * Recording after the fact is not enough on its own. If the ledger write itself
 * fails — disk full, permissions, I/O error — a paid attempt still disappears and
 * the next invocation is entitled to spend again. So an attempt is written twice:
 * an `in_flight` reservation *before* any provider is called, and a settled line
 * afterwards. A reservation that cannot be written means the Machine cannot prove
 * what it spends, so it must not spend; a settlement that cannot be written leaves
 * the reservation standing, which still bounds the budget. Both failure directions
 * cost at most one attempt rather than an unbounded number.
 */

import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from "fs";
import path from "path";

import { randomUUID } from "crypto";

export const PRODUCTION_SPEND_LEDGER_PACKAGE_ID =
  "STUDIO-OPERATING-PRODUCTION-SPEND-LEDGER-1" as const;

export type ProductionAttemptOutcome =
  /**
   * Written before the first provider call. Its cost is unknown by definition, so
   * it counts against budget until a settled line supersedes it — an attempt whose
   * outcome was never recorded has to be assumed to have spent.
   */
  | "in_flight"
  /** Produced an artifact that passed QA. */
  | "success"
  /** Produced an artifact that failed QA — creative spend, correction lane. */
  | "qa_failed"
  /**
   * Failed before producing an artifact: render, export, or a thrown error.
   * Costs whatever had already been paid for by that point, which on the hybrid
   * route is the whole generated visual.
   */
  | "technical_failure";

export type ProductionSpendEntry = {
  packageId: typeof PRODUCTION_SPEND_LEDGER_PACKAGE_ID;
  /**
   * Ties a reservation to its settlement. Two lines share one `attemptId` and
   * describe one attempt; the later line is the truth about it.
   */
  attemptId: string;
  /** The customer request this attempt was spending against. */
  requestKey: string;
  /** The full execution identity, for tracing back to a receipt. */
  idempotencyKey: string;
  dispatchId: string;
  jobId: string;
  campaignId: string;
  skuId: string;
  productionMethodId: string;
  /**
   * The explicit authorization this attempt was spent under, when one was presented.
   *
   * Written at reservation time, so the record exists before the money is committed.
   * This is what makes such an authorization single-use: the ledger can be asked
   * whether a grant has already produced, and a replay of it is refused.
   */
  authorizationId?: string | null;
  /** Version produced, or null when the attempt failed before persisting one. */
  renderVersion: number | null;
  outcome: ProductionAttemptOutcome;
  failureCode: string | null;
  /**
   * Provider calls this attempt was actually charged for. Zero is a meaningful
   * value: it says the attempt reached no paid provider, so it consumed no budget.
   */
  billableCalls: number;
  totalCostUsd: number;
  /** Per-purpose breakdown, so a cost can be attributed without re-deriving it. */
  costByPurpose: Record<string, { calls: number; costUsd: number }>;
  startedAt: string;
  recordedAt: string;
};

export function spendLedgerRel(artifactRootRel: string): string {
  return `${artifactRootRel}/production-spend-ledger.jsonl`;
}

/**
 * Append one attempt. Never rewrites, never reorders, and never fails the caller:
 * a ledger write that throws must not turn a completed production into an error,
 * so the failure is reported and the line is lost rather than the work.
 *
 * Losing a *settlement* is survivable because the reservation it was superseding
 * still stands and still counts. Losing a *reservation* is not, which is why
 * `reserveProductionSpendAttempt` reports failure and the caller refuses to spend.
 */
export function appendProductionSpendEntry(input: {
  repoRoot: string;
  artifactRootRel: string;
  entry: Omit<ProductionSpendEntry, "packageId" | "recordedAt">;
}): { appended: boolean; ledgerRel: string; error?: string } {
  const ledgerRel = spendLedgerRel(input.artifactRootRel);
  const abs = path.join(input.repoRoot, ledgerRel);
  const entry: ProductionSpendEntry = {
    packageId: PRODUCTION_SPEND_LEDGER_PACKAGE_ID,
    ...input.entry,
    recordedAt: new Date().toISOString(),
  };
  try {
    mkdirSync(path.dirname(abs), { recursive: true });
    // Flushed to disk before returning, not merely to the filesystem cache. A
    // reservation whose whole purpose is to survive the attempt it precedes cannot be
    // allowed to disappear in a host crash between the write and the provider call —
    // that is the invisible paid attempt again, arriving by a different route.
    const fd = openSync(abs, "a");
    try {
      writeSync(fd, `${JSON.stringify(entry)}\n`, null, "utf8");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    return { appended: true, ledgerRel };
  } catch (e) {
    return {
      appended: false,
      ledgerRel,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Claim the right to spend, before spending.
 *
 * The Machine must be able to account for money it is about to commit. If this
 * line cannot be written, the attempt would be invisible to every later
 * entitlement decision, and an invisible paid attempt is what makes repeated
 * spending unbounded. So a failure here is a refusal to produce, not a warning.
 */
export function reserveProductionSpendAttempt(input: {
  repoRoot: string;
  artifactRootRel: string;
  reservation: Omit<
    ProductionSpendEntry,
    | "packageId"
    | "recordedAt"
    | "attemptId"
    | "outcome"
    | "failureCode"
    | "renderVersion"
    | "billableCalls"
    | "totalCostUsd"
    | "costByPurpose"
  >;
}): { ok: true; attemptId: string } | { ok: false; error: string } {
  const attemptId = randomUUID();
  const appended = appendProductionSpendEntry({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    entry: {
      ...input.reservation,
      attemptId,
      renderVersion: null,
      outcome: "in_flight",
      failureCode: null,
      billableCalls: 0,
      totalCostUsd: 0,
      costByPurpose: {},
    },
  });
  if (!appended.appended) {
    return {
      ok: false,
      error:
        appended.error ??
        `Could not reserve a production spend attempt in ${appended.ledgerRel}.`,
    };
  }
  return { ok: true, attemptId };
}

const KNOWN_OUTCOMES: readonly ProductionAttemptOutcome[] = [
  "in_flight",
  "success",
  "qa_failed",
  "technical_failure",
];

/**
 * Whether a parsed line can be trusted to say what an attempt cost.
 *
 * Every field this checks is one that entitlement reads to decide whether more money
 * may be spent. Validating only `requestKey` was not enough: a line could parse as JSON,
 * be attributed to the right request, and still carry a missing `attemptId` (folding two
 * attempts into one), an unrecognised `outcome` (escaping the `in_flight` charge), or a
 * non-numeric `billableCalls` (reading as free). A line that cannot answer those
 * questions is counted as an unreadable paid attempt rather than believed.
 */
function isWellFormedSpendEntry(entry: unknown): entry is ProductionSpendEntry {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry as Partial<ProductionSpendEntry>;
  if (typeof candidate.requestKey !== "string" || !candidate.requestKey) return false;
  // Present-but-empty is rejected rather than tolerated: an empty id is not an id, and
  // grouping by one would fold separate paid attempts together.
  if (
    candidate.attemptId != null &&
    (typeof candidate.attemptId !== "string" || !candidate.attemptId.trim())
  ) {
    return false;
  }
  if (!KNOWN_OUTCOMES.includes(candidate.outcome as ProductionAttemptOutcome)) return false;
  if (
    typeof candidate.billableCalls !== "number" ||
    !Number.isFinite(candidate.billableCalls) ||
    candidate.billableCalls < 0
  ) {
    return false;
  }
  if (
    candidate.renderVersion != null &&
    (typeof candidate.renderVersion !== "number" ||
      !Number.isInteger(candidate.renderVersion))
  ) {
    return false;
  }
  return true;
}

/**
 * Read the ledger, distinguishing "nothing has been spent here" from "what was spent
 * here cannot be read".
 *
 * The difference decides whether it is safe to produce. An absent ledger genuinely
 * means no attempt has been recorded. An unreadable one means the history exists and
 * cannot be consulted — and treating that as zero attempts is exactly how a request
 * ends up spending its budget over and over. Callers must fail closed on `false`.
 */
export function readProductionSpendLedger(input: {
  repoRoot: string;
  artifactRootRel: string;
}): {
  readable: boolean;
  entries: ProductionSpendEntry[];
  /**
   * Lines that exist but could not be parsed — a write torn by a crash.
   *
   * Each one is an attempt whose cost is unrecoverable from the record, so each is
   * counted as a paid attempt. Skipping them silently, as an earlier revision did,
   * undercounts spend in exactly the situation where spend is most likely: the ledger
   * was being written when something went wrong.
   *
   * Counting rather than declaring the whole ledger unreadable is deliberate. A torn
   * final line is the *expected* residue of a crash, and bricking the job over it
   * would strand recoverable work; charging it as one attempt bounds the money
   * without doing that.
   */
  unreadableLines: number;
  error?: string;
} {
  const abs = path.join(input.repoRoot, spendLedgerRel(input.artifactRootRel));
  if (!existsSync(abs)) return { readable: true, entries: [], unreadableLines: 0 };

  let raw: string;
  try {
    raw = readFileSync(abs, "utf8");
  } catch (e) {
    return {
      readable: false,
      entries: [],
      unreadableLines: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const entries: ProductionSpendEntry[] = [];
  let unreadableLines = 0;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as ProductionSpendEntry;
      if (!isWellFormedSpendEntry(parsed)) {
        unreadableLines += 1;
        continue;
      }
      entries.push(parsed);
    } catch {
      unreadableLines += 1;
    }
  }
  return { readable: true, entries, unreadableLines };
}

/** Entries only. Prefer `readProductionSpendLedger` where readability matters. */
export function readProductionSpendEntries(input: {
  repoRoot: string;
  artifactRootRel: string;
}): ProductionSpendEntry[] {
  return readProductionSpendLedger(input).entries;
}

/**
 * Paid attempts against this request that no version receipt can account for.
 *
 * `knownRenderVersions` are the versions already counted from receipts. An entry
 * that produced one of those is the same attempt seen from the other side, so it is
 * not counted twice. Everything else — a failure that never reached a version, or a
 * version whose receipt is missing — is an attempt that spent money and would
 * otherwise be invisible to entitlement.
 *
 * Each attempt is counted once, from its latest line: a settlement supersedes its
 * reservation. An attempt still sitting at `in_flight` counts, because its cost was
 * never recorded and unknown spend has to be treated as spend. A *settled* attempt
 * that cost nothing does not count — budget bounds money, so a failure that reached
 * no paid provider must not consume it and strand a job that only needs a retry.
 *
 * Lines written before attempts had ids are each treated as their own attempt.
 */
export function unreceiptedPaidAttempts(input: {
  entries: readonly ProductionSpendEntry[];
  requestKey: string;
  knownRenderVersions: ReadonlySet<number>;
}): number {
  const latestByAttempt = new Map<string, ProductionSpendEntry>();
  let index = 0;
  for (const entry of input.entries) {
    index += 1;
    if (entry.requestKey !== input.requestKey) continue;
    // Only a genuine attempt id may group two lines together. Anything else gets a key
    // unique to its line, so a missing or empty id can never merge two paid attempts
    // into one and undercount what was spent.
    const key =
      typeof entry.attemptId === "string" && entry.attemptId.trim()
        ? `attempt:${entry.attemptId}`
        : `line:${index}`;
    latestByAttempt.set(key, entry);
  }

  let count = 0;
  for (const entry of latestByAttempt.values()) {
    const spent = entry.outcome === "in_flight" || entry.billableCalls > 0;
    if (!spent) continue;
    if (
      entry.renderVersion != null &&
      input.knownRenderVersions.has(entry.renderVersion)
    ) {
      continue;
    }
    count += 1;
  }
  return count;
}

/** Where authorization claims live: one file per grant, repo-wide. */
export function authorizationClaimRel(authorizationId: string): string {
  const token = authorizationId.replace(/[^a-zA-Z0-9_.-]+/g, "_").slice(0, 200);
  return `data/campaign-design-artifacts/production-authorizations/${token}.claim.json`;
}

/**
 * Claim an explicit authorization, once, repo-wide.
 *
 * Two earlier attempts at this were both wrong in the same way. The first checked
 * nothing, so a grant was a standing right. The second checked the spend ledger of the
 * request being produced — which scopes the grant to that request, so the same
 * authorization presented against a *different* request, or a different campaign, was
 * unused again and bought another artifact. And because each request takes its own
 * lock, two such invocations could run concurrently and both produce.
 *
 * A grant is a single right to spend, not a right per request. This claims it with an
 * exclusive create: exactly one caller anywhere in the repo can create a given path,
 * and the loser gets `EEXIST`. No read-then-write window, so concurrency is decided by
 * the filesystem rather than by ordering luck.
 */
export function claimExplicitAuthorization(input: {
  repoRoot: string;
  authorizationId: string;
  authorizedBy: string;
  reason: string;
  requestKey: string;
  campaignId: string;
}): { claimed: boolean; claimRel: string; alreadyClaimedBy?: string } {
  const claimRel = authorizationClaimRel(input.authorizationId);
  const abs = path.join(input.repoRoot, claimRel);
  mkdirSync(path.dirname(abs), { recursive: true });

  const claim = {
    authorizationId: input.authorizationId,
    authorizedBy: input.authorizedBy,
    reason: input.reason,
    requestKey: input.requestKey,
    campaignId: input.campaignId,
    claimedAt: new Date().toISOString(),
  };

  try {
    const fd = openSync(abs, "wx");
    try {
      writeSync(fd, `${JSON.stringify(claim, null, 2)}\n`, null, "utf8");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    return { claimed: true, claimRel };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") {
      // Cannot tell whether this grant is spent. Unknown counts as spent.
      return { claimed: false, claimRel };
    }
    let alreadyClaimedBy: string | undefined;
    try {
      const existing = JSON.parse(readFileSync(abs, "utf8")) as typeof claim;
      alreadyClaimedBy = `${existing.requestKey} (campaign ${existing.campaignId}, ${existing.claimedAt})`;
    } catch {
      /* the claim exists; its detail is a nicety */
    }
    return { claimed: false, claimRel, alreadyClaimedBy };
  }
}

/** Whether a grant has been claimed already, without claiming it. */
export function explicitAuthorizationAlreadyClaimed(input: {
  repoRoot: string;
  authorizationId: string;
}): boolean {
  return existsSync(
    path.join(input.repoRoot, authorizationClaimRel(input.authorizationId)),
  );
}

/**
 * Give a claimed grant back, having spent nothing under it.
 *
 * The grant has to be claimed *before* the provider call, which means it is claimed
 * before everything that can still refuse — a reservation that cannot be written, for
 * one. Leaving the claim in place then burns a real authorization on an attempt that
 * never happened, and the owner has to issue a new id to get the run they already
 * authorized.
 *
 * Only ever called on a path that has not spent. Once a provider has been paid, the
 * grant is genuinely used and must stay claimed.
 */
export function releaseUnspentAuthorizationClaim(input: {
  repoRoot: string;
  authorizationId: string;
}): void {
  try {
    const abs = path.join(
      input.repoRoot,
      authorizationClaimRel(input.authorizationId),
    );
    if (existsSync(abs)) unlinkSync(abs);
  } catch {
    // A claim that cannot be released is a grant that needs reissuing. That is a
    // visible inconvenience, not a spend.
  }
}
