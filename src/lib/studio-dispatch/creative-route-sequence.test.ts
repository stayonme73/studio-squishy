/**
 * STUDIO-OPERATING-PROJECT-ALPHA-HYBRID-CREATIVE-CERTIFICATION-1
 *
 * Which reasoner an authorized fresh production actually gets.
 *
 * V18 was produced through the certified path and composed by the deterministic reasoner
 * anyway. The route was chosen by `loop.attempts.length === 0`, and Customer-One's loop
 * already carried the attempt that made v17 — so an explicitly authorized fresh production
 * read as a retry of a sequence that had finished months of work earlier.
 *
 * Counting the current sequence instead was still a rule about mutable state: the loop is
 * read from the campaign record in preference to the artifact ledger, the two have separate
 * writers, and on Customer-One they have already diverged. So the route now comes from the
 * entitlement that authorized the attempt — receipts and the append-only spend ledger —
 * plus a counter local to the invocation. The loop record is evidence.
 *
 * These run the real hook: real entitlement, real lock, real spend ledger, real loop file,
 * real renderer. Only the provider boundary is stubbed, and it is stubbed by replacing
 * `fetch` — so a call that should not happen fails the test instead of costing money, and
 * the call that should happen is observed rather than paid for.
 *
 * Each test gets its own repo root, because every path the hook writes — artifacts, spend
 * ledger, loop file, and the rolling variety log the design spec is scored against — hangs
 * off that root. Sharing the real one made these tests read a log other workers were
 * writing, which moved this job's fact fingerprint mid-test and opened a loop the run had
 * not asked for; the earlier version pinned that log instead, which stopped the flake by
 * overwriting a file other suites legitimately use. An isolated root needs neither.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  existsSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import {
  currentSequenceAttempts,
  loopLedgerRelativePath,
  readInternalProductionLoopFile,
  remainingInternalAttempts,
  studioAutonomousProductionLoopV1,
} from "@/lib/studio-production-correction";

import { invokeDesignRendererDispatchHook } from "./design-renderer-hook";
import { evaluateJobDispatch } from "./evaluate";
import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { spendLedgerRel, type ProductionSpendEntry } from "./production-spend-ledger";
import type { JobDispatchRecord } from "./types";

/**
 * A plainly informational job, so the Machine routes renderer-only and no image capability
 * is reached. The creative-reasoner choice is the same code either way, and proving it here
 * costs nothing; the hybrid leg is proven by the live authorized run itself.
 */
function ledgerBooksCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Fenwick Bookkeeping",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Quarterly close service flyer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        flyerPurpose: "Small-business bookkeeping and quarterly close",
        mustInclude:
          "Quarterly close review $180. Call (804) 555-0142 or visit fenwickbooks.example",
        materials: "Logo staged",
        intendedUse: "Both print and digital",
        disclaimers: "Appointments while available.",
      },
    },
    routeMapIntakeSubmittedAt: now,
  };
}

function readyFlyerRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-flyer`;
  return evaluateJobDispatch({
    campaignId,
    jobId,
    skuId: "v2-rtu-flyer",
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: "v2-rtu-flyer" as const,
      status: "READY_FOR_DISPATCH" as const,
      readyForDispatch: true,
      productionFamilyId: "marketing_assets" as const,
      controlLane: "standard" as const,
      factFingerprint: "fp-creative-route",
      capabilityReadiness: "contract_ready" as const,
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false as const,
    },
  });
}

function approvedLogo(campaignId: string): CampaignMaterialItem {
  const now = new Date().toISOString();
  return {
    id: `logo-${campaignId}`,
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "approved_for_use",
    contentKind: "file-metadata",
    label: "Logo",
    reason: "Brand mark",
    relatedServiceIds: ["v2-rtu-flyer"],
    uploadStatus: "stored",
    useAuthorization: { basis: "customer_owns", attestedAt: now },
  };
}

function stageLogo(root: string, campaignId: string): string {
  const rel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
  const abs = path.join(root, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, HARBOR_OAK_LOGO_SVG, "utf8");
  return rel;
}

function renderVersions(root: string, campaignId: string, dispatchId: string): number[] {
  const dir = path.join(
    root,
    customerArtifactRootRel(campaignId, dispatchId),
    "renders",
  );
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => /^v(\d+)$/.exec(name)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number)
    .sort((a, b) => a - b);
}

function spendEntries(
  root: string,
  campaignId: string,
  dispatchId: string,
): ProductionSpendEntry[] {
  const abs = path.join(
    root,
    spendLedgerRel(customerArtifactRootRel(campaignId, dispatchId)),
  );
  if (!existsSync(abs)) return [];
  return readFileSync(abs, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as ProductionSpendEntry);
}

/**
 * Stand in for every provider, and answer only the one call the creative route makes.
 *
 * The Anthropic reply is canned in-process: the route selector's own request carries the
 * candidate routes, so echoing one back produces a genuine `anthropic_route_select`
 * direction without a token leaving the machine. Every other URL throws, which is how this
 * proves an attempt reached no provider rather than asserting it did not.
 */
function interceptProviders(): {
  urls: string[];
  routeSelectCalls: number;
  echoedRouteIds: string[];
  restore: () => void;
} {
  const real = globalThis.fetch;
  const state = {
    urls: [] as string[],
    routeSelectCalls: 0,
    echoedRouteIds: [] as string[],
  };

  globalThis.fetch = (async (...args: Parameters<typeof real>) => {
    const url = String(args[0]);
    state.urls.push(url);
    if (!url.startsWith("https://api.anthropic.com/")) {
      throw new Error(`A provider was called that this test does not pay for: ${url}`);
    }
    const body = JSON.parse(String((args[1] as RequestInit | undefined)?.body ?? "{}")) as {
      messages?: Array<{ content?: string }>;
    };
    let routeId: string | null = null;
    try {
      const asked = JSON.parse(String(body.messages?.[0]?.content ?? "{}")) as {
        routes?: Array<{ routeId?: string }>;
      };
      routeId = asked.routes?.[0]?.routeId ?? null;
    } catch {
      routeId = null;
    }
    if (routeId) {
      state.routeSelectCalls += 1;
      state.echoedRouteIds.push(routeId);
    }
    return new Response(
      JSON.stringify({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              selectedRouteId: routeId ?? "none",
              why: "canned in-process reply",
            }),
          },
        ],
        usage: { input_tokens: 1_400, output_tokens: 120 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof real;

  return {
    get urls() {
      return state.urls;
    },
    get routeSelectCalls() {
      return state.routeSelectCalls;
    },
    get echoedRouteIds() {
      return state.echoedRouteIds;
    },
    restore: () => {
      globalThis.fetch = real;
    },
  };
}

const restorers: Array<() => void> = [];
afterEach(() => {
  while (restorers.length) restorers.pop()!();
});

/**
 * A repo root of this test's own, so nothing it observes can be moved by another worker.
 *
 * The variety log the design spec is scored against lives under the root, and so does every
 * artifact, receipt, and ledger line the hook writes. Isolating the root makes the fact
 * fingerprint — and therefore which loop a run resumes — depend only on this test.
 */
function isolatedRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "studio-creative-route-"));
  restorers.push(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

/** A key the stub never sends anywhere, so the creative path is not skipped for want of one. */
function withStubbedAnthropicKey(): () => void {
  const prior = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-not-a-real-key";
  return () => {
    if (prior === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prior;
  };
}

describe("an authorized fresh production is not a retry of the sequence before it", () => {
  it(
    "gives the fresh run the creative reasoner, its whole budget, and the history intact",
    async () => {
      const campaignId = `intel-qa-creative-route-${Date.now()}`;
      const root = isolatedRoot();
      const logoRel = stageLogo(root, campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = ledgerBooksCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];
      const artifactRootRel = customerArtifactRootRel(campaignId, record.dispatchId);

      const providers = interceptProviders();
      restorers.push(providers.restore);
      restorers.push(withStubbedAnthropicKey());

      // First production. Deterministic by request, so the only creative call in this test
      // is the one the repair is about.
      const first = await invokeDesignRendererDispatchHook({
        repoRoot: root,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        preferAnthropic: false,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");
      // Renderer-first, which is why no image capability was reached above.
      expect(first.productionMethodId).toBe("renderer_first");
      expect(first.productionMethodId).not.toBe("image_plus_renderer");
      expect(providers.routeSelectCalls).toBe(0);
      expect(first.designSpec.reasoningMode).toBe("deterministic_constrained");

      const settled = readInternalProductionLoopFile(root, artifactRootRel)!;
      expect(settled.status).toBe("passed");
      // The inheritance that caused this, on the record: the sequence that just finished
      // leaves an attempt behind, and `attempts.length === 0` is the expression that read
      // it as "this run has already attempted once".
      expect(settled.attempts.length).toBeGreaterThanOrEqual(1);
      const historyBefore = settled.attempts.length;

      // Authorized fresh production of the same request. Reuse would otherwise serve it,
      // which is what makes this the same situation Customer-One was in.
      const authorized = await invokeDesignRendererDispatchHook({
        repoRoot: root,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        preferAnthropic: true,
        certificationFreshExecution: {
          authorizationId: `auth-creative-route-${campaignId}`,
          authorizedBy: "owner:Tagia",
          reason: "creative-path correction proof",
        },
      });
      expect(authorized.ok).toBe(true);
      if (!authorized.ok) return;
      expect(authorized.invocationOutcome).toBe("RENDERED");
      expect(authorized.identity.renderVersion).toBeGreaterThan(
        first.identity.renderVersion,
      );

      // The intended creative reasoner ran, and the artifact says so.
      expect(authorized.designSpec.reasoningMode).toBe("anthropic_text_model");
      expect(authorized.designSpec.reasoningModel).toBeTruthy();
      expect(providers.routeSelectCalls).toBe(1);
      // Not merely that a call happened: the route the reply named is the route the design
      // was composed on, so the creative decision came from the reasoner.
      expect(authorized.designSpec.creativeDirection?.routeId).toBe(
        providers.echoedRouteIds[0],
      );

      // And it is metered, which is the other half of what V18 could not report: the
      // Anthropic leg showed $0 because it never ran.
      const entries = spendEntries(root, campaignId, record.dispatchId);
      // The authorization is written at reservation, before the money is committed; the
      // settled line for the same attempt is the truth about what it cost.
      const reservation = entries.find(
        (entry) =>
          entry.authorizationId === `auth-creative-route-${campaignId}` &&
          entry.outcome === "in_flight",
      );
      expect(reservation).toBeTruthy();
      const newest = entries.find(
        (entry) =>
          entry.attemptId === reservation!.attemptId && entry.outcome === "success",
      );
      expect(newest).toBeTruthy();
      expect(newest!.renderVersion).toBe(authorized.identity.renderVersion);
      expect(newest!.costByPurpose?.creative_reasoning?.calls).toBe(1);
      expect(newest!.costByPurpose?.creative_reasoning?.costUsd).toBeGreaterThan(0);
      expect(newest!.costByPurpose?.image_generation?.calls ?? 0).toBe(0);

      // The production before it was composed deterministically, so it has no reasoning
      // cost at all. That difference is exactly what V18 could not show.
      const firstSettled = entries.find(
        (entry) =>
          entry.renderVersion === first.identity.renderVersion &&
          entry.outcome === "success",
      );
      expect(firstSettled?.costByPurpose?.creative_reasoning?.calls).toBe(0);

      // The fresh sequence began where it began. History kept; counting moved.
      const afterAuthorized = readInternalProductionLoopFile(root, artifactRootRel)!;
      // Premise, asserted so it cannot pass for the wrong reason: this is the *same* loop
      // continued, not a new one opened because the facts appeared to change. A drifted
      // fingerprint would also produce a fresh sequence, by a different mechanism, and
      // would prove nothing about the repair.
      expect(afterAuthorized.productionFactFingerprint).toBe(
        settled.productionFactFingerprint,
      );
      expect(afterAuthorized.sequenceStartedAtAttempt).toBe(historyBefore);
      expect(afterAuthorized.attempts.length).toBe(historyBefore + 1);
      expect(afterAuthorized.attempts.slice(0, historyBefore)).toEqual(
        settled.attempts.slice(0, historyBefore),
      );
      expect(currentSequenceAttempts(afterAuthorized)).toBe(1);

      // Producing did not touch the customer's revision.
      expect(campaign.revisionRoundsUsed).toBe(0);
      expect(
        afterAuthorized.attempts.every(
          (attempt) => attempt.productionCapabilityId === "studio_design_renderer",
        ),
      ).toBe(true);

      // A plain repeat is still a repeat: the grant is spent, so reuse serves it, and no
      // provider is reached at all — the stub would throw on any URL but Anthropic, and
      // the route selector is not consulted either.
      const versionsBeforeRepeat = renderVersions(root, campaignId, record.dispatchId);
      const urlsBeforeRepeat = providers.urls.length;
      for (let repeat = 1; repeat <= 2; repeat += 1) {
        const repeated = await invokeDesignRendererDispatchHook({
          repoRoot: root,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
          preferAnthropic: true,
        });
        expect(repeated.ok).toBe(true);
        if (!repeated.ok) return;
        expect(repeated.invocationOutcome).toBe("ALREADY_RENDERED");
        expect(repeated.identity.renderVersion).toBe(authorized.identity.renderVersion);
      }
      expect(providers.urls.length).toBe(urlsBeforeRepeat);
      expect(providers.routeSelectCalls).toBe(1);
      expect(renderVersions(root, campaignId, record.dispatchId)).toEqual(versionsBeforeRepeat);
      expect(spendEntries(root, campaignId, record.dispatchId).length).toBe(entries.length);
    },
    300_000,
  );

  it(
    "keeps a correction that is still in progress on the deterministic reasoner",
    async () => {
      const campaignId = `intel-qa-creative-retry-${Date.now()}`;
      const root = isolatedRoot();
      const logoRel = stageLogo(root, campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = ledgerBooksCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];
      const artifactRootRel = customerArtifactRootRel(campaignId, record.dispatchId);

      const providers = interceptProviders();
      restorers.push(providers.restore);
      restorers.push(withStubbedAnthropicKey());

      // Leave a sequence genuinely mid-correction: one QA failure of its own, still open,
      // carrying the constraints its correction is meant to answer. Written by the hook
      // rather than by hand, so the loop it resumes is the one production would actually
      // find — a hand-written record with no fact fingerprint is discarded and replaced,
      // which makes the next run fresh and proves nothing.
      const rejected = await invokeDesignRendererDispatchHook({
        repoRoot: root,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        preferAnthropic: false,
        forceQaFail: true,
      });
      expect(rejected.ok).toBe(false);
      expect(providers.routeSelectCalls).toBe(0);

      const midCorrection = readInternalProductionLoopFile(root, artifactRootRel)!;
      expect(
        existsSync(path.join(root, loopLedgerRelativePath(artifactRootRel))),
      ).toBe(true);
      expect(midCorrection.status).toBe("in_progress");
      expect(midCorrection.attempts).toHaveLength(1);
      expect(midCorrection.activeBrief).toBeTruthy();
      expect(midCorrection.productionFactFingerprint).toBeTruthy();
      expect(remainingInternalAttempts(midCorrection)).toBe(
        studioAutonomousProductionLoopV1.maxInternalProductionAttempts - 1,
      );

      // This is the case the repair must not loosen: a retry composes against the Creative
      // Director's constraints, and a resumed sequence gets neither a fresh budget nor a
      // fresh reroll.
      const resumed = await invokeDesignRendererDispatchHook({
        repoRoot: root,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        preferAnthropic: true,
      });
      expect(resumed.ok).toBe(true);
      if (!resumed.ok) return;
      expect(resumed.invocationOutcome).toBe("RENDERED");
      // Anthropic was available and asked for, and the route still declined to reroll.
      expect(process.env.ANTHROPIC_API_KEY).toBeTruthy();
      expect(providers.routeSelectCalls).toBe(0);
      expect(resumed.designSpec.reasoningMode).toBe("deterministic_constrained");

      // The open sequence kept its own bound rather than restarting it.
      const after = readInternalProductionLoopFile(root, artifactRootRel)!;
      // Same loop continued, so what follows is about the resumed sequence.
      expect(after.productionFactFingerprint).toBe(
        midCorrection.productionFactFingerprint,
      );
      expect(after.sequenceStartedAtAttempt ?? 0).toBe(0);
      expect(currentSequenceAttempts(after)).toBe(2);
      expect(remainingInternalAttempts(after)).toBe(
        studioAutonomousProductionLoopV1.maxInternalProductionAttempts - 2,
      );
    },
    300_000,
  );

  it(
    "routes and bounds the run even when the two copies of loop state disagree",
    async () => {
      const campaignId = `intel-qa-creative-divergent-${Date.now()}`;
      const root = isolatedRoot();
      const logoRel = stageLogo(root, campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = ledgerBooksCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];
      const artifactRootRel = customerArtifactRootRel(campaignId, record.dispatchId);

      const providers = interceptProviders();
      restorers.push(providers.restore);
      restorers.push(withStubbedAnthropicKey());

      const first = await invokeDesignRendererDispatchHook({
        repoRoot: root,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        preferAnthropic: false,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const settled = readInternalProductionLoopFile(root, artifactRootRel)!;
      expect(settled.status).toBe("passed");

      // The divergence, made concrete.
      //
      // The hook prefers `campaign.internalProductionLoop` over the artifact ledger, and
      // the two have separate writers. On Customer-One they have already drifted apart: the
      // artifact ledger says `passed` with two attempts, the campaign copy `in_progress`
      // with none. So this stages the harmful shape of that drift — a campaign copy that
      // still claims a correction is under way *and* claims every attempt of the budget is
      // spent — and asks an explicitly authorized fresh production to run against it.
      //
      // Same fingerprint, so this is the loop production actually resumes rather than one
      // it discards and replaces. QA failures rather than technical ones, so it is not
      // read as technical-only exhaustion and quietly restarted. Under the previous repair
      // this copy alone decided both answers, and got both wrong: `status !== "passed"`
      // skipped the fresh sequence and handed the run the deterministic reasoner, and
      // three inherited attempts left `remainingInternalAttempts` at zero, which refused
      // the run outright as INTERNAL_CORRECTION_EXHAUSTED while it was fully entitled to
      // produce.
      const inherited = settled.attempts[0];
      const staleCampaign: CampaignRecord = {
        ...campaign,
        internalProductionLoop: {
          ...settled,
          status: "in_progress",
          sequenceStartedAtAttempt: undefined,
          ownerEscalation: null,
          attempts: [
            ...settled.attempts,
            ...[2, 3].map((attemptNumber) => ({
              ...inherited,
              attemptNumber,
              qaResult: "fail" as const,
              failureCode: "QA_FAILURE",
              failureClasses: ["excessive_dominant_geometry" as const],
            })),
          ],
        },
      };
      expect(staleCampaign.internalProductionLoop!.attempts.length).toBe(
        studioAutonomousProductionLoopV1.maxInternalProductionAttempts,
      );
      expect(remainingInternalAttempts(staleCampaign.internalProductionLoop!)).toBe(0);

      const authorized = await invokeDesignRendererDispatchHook({
        repoRoot: root,
        campaign: staleCampaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        preferAnthropic: true,
        certificationFreshExecution: {
          authorizationId: `auth-divergent-${campaignId}`,
          authorizedBy: "owner:Tagia",
          reason: "divergent loop state proof",
        },
      });

      // Produced, because immutable evidence — receipts and the spend ledger — is what says
      // whether this request may spend, and an attributed grant is what says it may spend
      // against work already delivered. The stale copy is evidence, not authority.
      expect(authorized.ok).toBe(true);
      if (!authorized.ok) return;
      expect(authorized.invocationOutcome).toBe("RENDERED");
      expect(authorized.identity.renderVersion).toBeGreaterThan(
        first.identity.renderVersion,
      );

      // Composed by the intended reasoner, decided by the entitlement that authorized it.
      expect(authorized.designSpec.reasoningMode).toBe("anthropic_text_model");
      expect(providers.routeSelectCalls).toBe(1);
      expect(authorized.designSpec.creativeDirection?.routeId).toBe(
        providers.echoedRouteIds[0],
      );

      // Exactly one paid attempt, and the customer's revision is untouched.
      const settlements = spendEntries(root, campaignId, record.dispatchId).filter(
        (entry) => entry.outcome === "success",
      );
      expect(settlements).toHaveLength(2);
      expect(renderVersions(root, campaignId, record.dispatchId)).toHaveLength(2);
      expect(staleCampaign.revisionRoundsUsed).toBe(0);

      // And the grant is still single-use: the same request, repeated, is served rather
      // than produced, however the stale copy reads.
      const repeated = await invokeDesignRendererDispatchHook({
        repoRoot: root,
        campaign: staleCampaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        preferAnthropic: true,
        certificationFreshExecution: {
          authorizationId: `auth-divergent-${campaignId}`,
          authorizedBy: "owner:Tagia",
          reason: "divergent loop state proof",
        },
      });
      expect(repeated.ok).toBe(true);
      if (!repeated.ok) return;
      expect(repeated.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(repeated.identity.renderVersion).toBe(authorized.identity.renderVersion);
      expect(providers.routeSelectCalls).toBe(1);
      expect(renderVersions(root, campaignId, record.dispatchId)).toHaveLength(2);
    },
    300_000,
  );
});
