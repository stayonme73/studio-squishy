/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { InternalProductionLoopRecord } from "@/lib/studio-production-correction";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import {
  LAYOUT_ARCHETYPES,
  signatureFromSpec,
} from "@/lib/studio-design-intelligence";
import type {
  DesignLayoutFamilyId,
  VisualSignature,
} from "@/lib/studio-design-intelligence";
import { recentSignaturesPath } from "@/lib/studio-design-intelligence/signatures";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { studioAutonomousProductionLoopV1 } from "@/config/studio-autonomous-production-loop-v1";
import {
  DESIGN_RENDERER_VERSION,
  designFactSignature,
  factProjectionTruth,
  fingerprintDesignSpec,
  fingerprintMaterials,
  reasonFlyerDesignSpecDeterministic,
} from "@/lib/studio-design-renderer";

import {
  invokeDesignRendererDispatchHook,
  type DesignDispatchHookResult,
} from "./design-renderer-hook";
import {
  buildIdempotencyKey,
  buildRequestKey,
  summarizeRequestSatisfaction,
  tryAcquireRenderLock,
  RENDERER_ONLY_PRODUCTION_METHOD_ID,
} from "./hook-idempotency";
import { resolveProductionEntitlement } from "./production-entitlement";
import {
  appendProductionSpendEntry,
  reserveProductionSpendAttempt,
  spendLedgerRel,
} from "./production-spend-ledger";
import { evaluateJobDispatch } from "./evaluate";
import {
  customerArtifactRootRel,
  mapFlyerProjectTruthFromJob,
} from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");

function readyFlyerRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-flyer`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: "v2-rtu-flyer" as const,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-idem",
    capabilityReadiness: "contract_ready" as const,
    evaluatedAt: new Date().toISOString(),
    reason: null,
    blocker: null,
    ownerActionRequired: false as const,
  };
  return evaluateJobDispatch({
    campaignId,
    routing,
    jobId,
    skuId: "v2-rtu-flyer",
  });
}

function customerCampaign(
  campaignId: string,
  mustInclude?: string,
): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Idempotency Lane Co",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Idempotency fixture",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        flyerPurpose: "Neighborhood spring portraits",
        mustInclude:
          mustInclude ??
          "Spring Open House — portraits $99. April 12 – April 20, 2026. Call (804) 555-0199 or visit idem.example/open-house",
        materials: "Logo staged",
        intendedUse: "Both print and digital",
        disclaimers: "Appointments while available.",
      },
    },
    routeMapIntakeSubmittedAt: now,
  };
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

function stageLogo(campaignId: string, svg = HARBOR_OAK_LOGO_SVG): string {
  const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
  const abs = path.join(REPO, logoRel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, svg, "utf8");
  return logoRel;
}

function renderVersions(campaignId: string, dispatchId: string): number[] {
  const safe = dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const dir = path.join(
    REPO,
    "data/campaign-design-artifacts",
    campaignId,
    safe,
    "renders",
  );
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((n) => /^v(\d+)$/.exec(n)?.[1])
    .filter(Boolean)
    .map((n) => Number(n));
}

describe("STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1", () => {
  it("keeps renderer-only keys stable and treats a generated visual as a different execution", () => {
    const base = {
      dispatchId: "dd:camp:v2-rtu-flyer",
      jobId: "camp:v2-rtu-flyer",
      skuId: "v2-rtu-flyer",
      designSpecFingerprint: "spec-fp",
      materialFingerprint: "mat-fp",
      rendererVersion: "renderer-1",
      correctionBriefFingerprint: "none",
    };
    const legacy = buildIdempotencyKey(base);
    expect(buildIdempotencyKey({ ...base, productionMethodId: undefined })).toBe(
      legacy,
    );
    expect(
      buildIdempotencyKey({
        ...base,
        productionMethodId: RENDERER_ONLY_PRODUCTION_METHOD_ID,
      }),
    ).toBe(legacy);
    const hybrid = buildIdempotencyKey({
      ...base,
      productionMethodId: "image_plus_renderer",
    });
    expect(hybrid).not.toBe(legacy);
    expect(hybrid).toContain("image_plus_renderer");
  });

  it(
    "first render once; identical second returns ALREADY_RENDERED without new version",
    async () => {
      const campaignId = `camp-hook-idem-1-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const first = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");
      const v1 = first.identity.renderVersion;
      const hash1 = first.identity.pngContentSha256;
      const receipt1 = readFileSync(
        path.join(REPO, first.receiptRelativePath),
        "utf8",
      );

      const second = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(second.identity.renderVersion).toBe(v1);
      expect(second.identity.pngContentSha256).toBe(hash1);
      expect(second.identity.renderId).toBe(first.identity.renderId);

      const versions = renderVersions(campaignId, record.dispatchId);
      expect(versions.filter((v) => v === v1).length).toBe(1);
      expect(Math.max(...versions)).toBe(v1);

      // Historical receipt immutable
      expect(
        readFileSync(path.join(REPO, first.receiptRelativePath), "utf8"),
      ).toBe(receipt1);
    },
    180_000,
  );

  it(
    "certification authorization forces a fresh mint that reuse would have served",
    async () => {
      const campaignId = `camp-hook-fresh-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const first = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");
      // Nothing forced it, so nothing is recorded.
      expect(first.certificationFreshExecution).toBeUndefined();
      const firstReceipt = readFileSync(
        path.join(REPO, first.receiptRelativePath),
        "utf8",
      );

      // Same execution again: proves reuse is what would otherwise happen.
      const reused = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(reused.ok).toBe(true);
      if (!reused.ok) return;
      expect(reused.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(reused.identity.renderVersion).toBe(first.identity.renderVersion);

      // Identical inputs, plus the authorization: a real mint at a new version.
      const authorization = {
        authorizationId: `auth-telemetry-${campaignId}`,
        authorizedBy: "owner:Tagia",
        reason: "cost telemetry measurement",
      };
      const forced = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        certificationFreshExecution: authorization,
      });
      expect(forced.ok).toBe(true);
      if (!forced.ok) return;
      expect(forced.invocationOutcome).toBe("RENDERED");
      expect(forced.identity.renderVersion).toBeGreaterThan(
        first.identity.renderVersion,
      );
      // Recorded, so a forced mint can never be read as organic behavior.
      expect(forced.certificationFreshExecution?.authorizedBy).toBe("owner:Tagia");

      // Reuse only: the prior version's receipt is untouched.
      expect(
        readFileSync(path.join(REPO, first.receiptRelativePath), "utf8"),
      ).toBe(firstReceipt);

      // One grant, one artifact. Replaying the same authorization used to buy another
      // one every time it was presented — the standing right that outranked
      // satisfaction, which is the one door that must not be a loophole.
      const versionsAfterForcedMint = renderVersions(campaignId, record.dispatchId);
      const realFetch = globalThis.fetch;
      const replayCalls: string[] = [];
      globalThis.fetch = (async (...args: Parameters<typeof realFetch>) => {
        replayCalls.push(String(args[0]));
        throw new Error("A provider was called on a replayed authorization.");
      }) as typeof realFetch;
      try {
        for (const _attempt of [1, 2]) {
          const replay = await invokeDesignRendererDispatchHook({
            repoRoot: REPO,
            campaign,
            dispatchRecord: record,
            materials,
            stagedLogoRelativePath: logoRel,
            certificationFreshExecution: authorization,
          });
          expect(replay.ok).toBe(true);
          if (!replay.ok) return;
          expect(replay.invocationOutcome).toBe("ALREADY_RENDERED");
          expect(replay.identity.renderVersion).toBe(forced.identity.renderVersion);
        }
      } finally {
        globalThis.fetch = realFetch;
      }
      expect(replayCalls).toEqual([]);
      expect(renderVersions(campaignId, record.dispatchId)).toEqual(
        versionsAfterForcedMint,
      );

      // And the grant is one right to spend, not one right per request.
      //
      // Only a satisfied request needs a grant at all — an unsatisfied one produces on
      // its own first-production entitlement, within its own budget. So the case that
      // matters is a *second already-satisfied* request presented with the same id.
      // That used to succeed: the check read the ledger of the request being produced,
      // so one authorization could buy a duplicate per campaign, concurrently, each
      // holding its own lock. Now the grant is claimed repo-wide by exclusive create.
      const otherCampaignId = `camp-hook-fresh-other-${Date.now()}`;
      const otherLogoRel = stageLogo(otherCampaignId);
      const otherRecord = readyFlyerRecord(otherCampaignId);
      const otherCampaign = customerCampaign(otherCampaignId);
      const otherMaterials = [approvedLogo(otherCampaignId)];

      const otherFirst = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: otherCampaign,
        dispatchRecord: otherRecord,
        materials: otherMaterials,
        stagedLogoRelativePath: otherLogoRel,
      });
      expect(otherFirst.ok).toBe(true);
      if (!otherFirst.ok) return;
      expect(otherFirst.invocationOutcome).toBe("RENDERED");
      const otherVersions = renderVersions(otherCampaignId, otherRecord.dispatchId);

      const elsewhere = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: otherCampaign,
        dispatchRecord: otherRecord,
        materials: otherMaterials,
        stagedLogoRelativePath: otherLogoRel,
        certificationFreshExecution: authorization,
      });
      expect(elsewhere.ok).toBe(true);
      if (!elsewhere.ok) return;
      // The spent grant buys nothing here: it falls back to the artifact this campaign
      // already has, rather than minting a duplicate of it.
      expect(elsewhere.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(renderVersions(otherCampaignId, otherRecord.dispatchId)).toEqual(
        otherVersions,
      );
    },
    240_000,
  );

  it(
    "a repeated invocation reaches no provider and mints nothing",
    async () => {
      // The no-double-charge invariant, proven where the money is actually spent.
      //
      // Creative reasoning used to be sampled at the top of the attempt, before the
      // reuse decision — so a request that turned out to be reusable had already been
      // billed for, and because the sample was then fingerprinted into the identity,
      // the reuse lookup it fed could not match, and production ran again. Every
      // billable call in this hook leaves through `fetch`, so counting fetches is a
      // direct measure of spend.
      const campaignId = `camp-hook-no-double-charge-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const first = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");
      const versionsAfterFirst = renderVersions(campaignId, record.dispatchId);

      // Reproduce the incident's two preconditions.
      //
      // First, the correction loop reads as fresh. Loop state is mutable and has more
      // than one writer, so a repeat invocation can genuinely see zero attempts on
      // already-delivered work — which is what put it on the creative-sampling path.
      //
      // Second, the stored identity no longer equals the identity the request
      // recomputes. In the incident the delivered version had been produced under a
      // correction brief while the reset loop recomputed the brief as `none`, so every
      // identity-based check fell through. Writing that brief into the stored keys
      // reproduces the mismatch, on both the pointer and the per-version receipt, so
      // no identity cache can rescue this — reuse has to come from the request key.
      //
      // `requestKey` is left untouched, which is the point: the customer's request did
      // not change, only the workflow around it did.
      const artifactRoot = path.join(
        REPO,
        "data/campaign-design-artifacts",
        campaignId,
        record.dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_"),
      );
      rmSync(path.join(artifactRoot, "internal-production-loop.json"), {
        force: true,
      });
      const driftIdentity = (receiptPath: string) => {
        const stored = JSON.parse(readFileSync(receiptPath, "utf8")) as {
          idempotencyKey: string;
          requestKey?: string;
        };
        expect(stored.requestKey).toBeTruthy();
        writeFileSync(
          receiptPath,
          JSON.stringify({
            ...stored,
            idempotencyKey: stored.idempotencyKey.replace(
              "|none|",
              "|brief-from-a-prior-correction|",
            ),
          }),
          "utf8",
        );
      };
      driftIdentity(path.join(artifactRoot, "current-dispatch-hook-receipt.json"));
      driftIdentity(path.join(REPO, first.receiptRelativePath));

      const realFetch = globalThis.fetch;
      const priorKey = process.env.ANTHROPIC_API_KEY;
      const providerCalls: string[] = [];
      globalThis.fetch = (async (...args: Parameters<typeof realFetch>) => {
        providerCalls.push(String(args[0]));
        throw new Error(
          "A provider was called on a repeated invocation — this is the double-charge defect.",
        );
      }) as typeof realFetch;
      // Creative reasoning is key-gated, so without a key the paid path is never
      // attempted and this test would pass for the wrong reason. The spy above stands
      // in for the provider; no real request can leave.
      process.env.ANTHROPIC_API_KEY = "test-key-never-used";

      try {
        // Identical request, and this time creative reasoning is switched on — the
        // exact combination that paid twice.
        const repeat = await invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
          preferAnthropic: true,
        });

        // Zero provider calls, and the delivered artifact comes back. Refusing would
        // also spend nothing, but it would withhold work the customer already has, so
        // BLOCKED is not an acceptable substitute here.
        expect(providerCalls).toEqual([]);
        expect(repeat.ok).toBe(true);
        if (!repeat.ok) return;
        expect(repeat.invocationOutcome).toBe("ALREADY_RENDERED");
        expect(repeat.identity.renderVersion).toBe(first.identity.renderVersion);
        expect(repeat.identity.pngContentSha256).toBe(
          first.identity.pngContentSha256,
        );
        // No new version, and no new receipt: nothing was minted and nothing was
        // billed, so there is no spend telemetry to record.
        expect(renderVersions(campaignId, record.dispatchId)).toEqual(
          versionsAfterFirst,
        );
      } finally {
        globalThis.fetch = realFetch;
        if (priorKey === undefined) delete process.env.ANTHROPIC_API_KEY;
        else process.env.ANTHROPIC_API_KEY = priorKey;
      }
    },
    240_000,
  );

  it(
    "stale correction-loop state cannot authorize spend on a satisfied request",
    async () => {
      // The defect this closes: production reasons used to be read out of
      // correction-loop state — an active brief, an in-progress flag, an attempt
      // count. That state is mutable, has more than one writer, and goes stale, so a
      // stale loop could manufacture a reason to spend on already-delivered work.
      //
      // Here the loop is made to claim, as loudly as it can, that a correction is
      // underway. Receipts say the request is satisfied. Receipts must win.
      const campaignId = `camp-hook-stale-loop-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const materials = [approvedLogo(campaignId)];
      const campaign = customerCampaign(campaignId);

      const delivered = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(delivered.ok).toBe(true);
      if (!delivered.ok) return;
      expect(delivered.invocationOutcome).toBe("RENDERED");
      const versionsAfterDelivery = renderVersions(campaignId, record.dispatchId);

      const loopPath = path.join(
        REPO,
        "data/campaign-design-artifacts",
        campaignId,
        record.dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_"),
        "internal-production-loop.json",
      );
      const storedLoop = JSON.parse(
        readFileSync(loopPath, "utf8"),
      ) as InternalProductionLoopRecord;
      const staleLoop: InternalProductionLoopRecord = {
        ...storedLoop,
        status: "in_progress",
        settledBriefFingerprint: null,
        settledConstraints: null,
        activeBrief: {
          ...(storedLoop.briefs[0] ?? ({} as InternalProductionLoopRecord["briefs"][number])),
          briefId: `brief-stale-${campaignId}`,
          fingerprint: "stale-brief-fingerprint",
        },
        // A fingerprint that no longer matches the request, which is what made
        // `resolveWorkingProductionLoop` reset the loop during the incident.
        productionFactFingerprint: "stale-production-fact-fingerprint",
      };
      writeFileSync(loopPath, JSON.stringify(staleLoop), "utf8");

      const realFetch = globalThis.fetch;
      const priorKey = process.env.ANTHROPIC_API_KEY;
      const providerCalls: string[] = [];
      globalThis.fetch = (async (...args: Parameters<typeof realFetch>) => {
        providerCalls.push(String(args[0]));
        throw new Error("Stale loop state bought a provider call.");
      }) as typeof realFetch;
      process.env.ANTHROPIC_API_KEY = "test-key-never-used";

      try {
        const withStaleLoop = await invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign: {
            ...campaign,
            // The other writer of loop state, also stale, and it takes precedence.
            internalProductionLoop: staleLoop,
          },
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
          preferAnthropic: true,
        });

        expect(providerCalls).toEqual([]);
        expect(withStaleLoop.ok).toBe(true);
        if (!withStaleLoop.ok) return;
        expect(withStaleLoop.invocationOutcome).toBe("ALREADY_RENDERED");
        expect(withStaleLoop.identity.renderVersion).toBe(
          delivered.identity.renderVersion,
        );
        expect(renderVersions(campaignId, record.dispatchId)).toEqual(
          versionsAfterDelivery,
        );
      } finally {
        globalThis.fetch = realFetch;
        if (priorKey === undefined) delete process.env.ANTHROPIC_API_KEY;
        else process.env.ANTHROPIC_API_KEY = priorKey;
      }
    },
    300_000,
  );

  it(
    "another campaign's render cannot make a delivered request look like new work",
    async () => {
      // A second, independent way mutable state was reaching spend authority.
      //
      // `mapFlyerProjectTruthFromJob` chooses a creative direction by scoring routes
      // against `recent-signatures.json` — a global rolling log of the last two dozen
      // renders across every campaign, kept so consecutive jobs don't look alike. The
      // chosen route lands in the design spec, so the spec fingerprint of an unchanged
      // request moved whenever anything else in the Studio rendered.
      //
      // In production that means one customer's flyer could make another customer's
      // delivered job look like new work and buy a duplicate. Variety is a decision
      // about how to satisfy a request, so it is excluded from the request key.
      const campaignId = `camp-hook-variety-drift-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const materials = [approvedLogo(campaignId)];
      const campaign = customerCampaign(campaignId);

      const delivered = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(delivered.ok).toBe(true);
      if (!delivered.ok) return;
      expect(delivered.invocationOutcome).toBe("RENDERED");
      const versionsAfterDelivery = renderVersions(campaignId, record.dispatchId);

      // The signature this render just persisted, replayed as though a dozen other
      // campaigns had all produced the same look. Route scoring penalises recently used
      // families, so this drives the direction for an unchanged request somewhere else
      // — and the assertion below is that it changes the artifact's *styling* without
      // changing whether the request counts as satisfied.
      const signaturesPath = recentSignaturesPath(REPO);
      const priorSignatures = existsSync(signaturesPath)
        ? readFileSync(signaturesPath, "utf8")
        : null;
      const ownSignature = (
        JSON.parse(readFileSync(signaturesPath, "utf8")) as {
          signatures: VisualSignature[];
        }
      ).signatures.find((entry) => entry.campaignId === campaignId);
      expect(ownSignature).toBeTruthy();
      const crowdedLog: VisualSignature[] = Array.from(
        { length: 12 },
        (_unused, index) => ({
          ...ownSignature!,
          campaignId: `camp-someone-else-${index}`,
        }),
      );
      mkdirSync(path.dirname(signaturesPath), { recursive: true });
      writeFileSync(
        signaturesPath,
        `${JSON.stringify({ signatures: crowdedLog }, null, 2)}\n`,
        "utf8",
      );

      // Confirm the premise: with that log in place, the direction this request
      // computes really has moved. Otherwise the assertions below prove nothing.
      const driftedTruth = mapFlyerProjectTruthFromJob({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(driftedTruth.ok).toBe(true);
      if (!driftedTruth.ok) return;
      expect(driftedTruth.truth.creativeDirection?.selectedRoute.layoutFamilyId).not.toBe(
        delivered.designSpec.creativeDirection?.layoutFamilyId,
      );

      const realFetch = globalThis.fetch;
      const providerCalls: string[] = [];
      globalThis.fetch = (async (...args: Parameters<typeof realFetch>) => {
        providerCalls.push(String(args[0]));
        throw new Error("Another campaign's render bought a provider call.");
      }) as typeof realFetch;
      try {
        const repeat = await invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
        });
        expect(providerCalls).toEqual([]);
        expect(repeat.ok).toBe(true);
        if (!repeat.ok) return;
        expect(repeat.invocationOutcome).toBe("ALREADY_RENDERED");
        expect(repeat.identity.renderVersion).toBe(delivered.identity.renderVersion);
        expect(renderVersions(campaignId, record.dispatchId)).toEqual(
          versionsAfterDelivery,
        );
      } finally {
        globalThis.fetch = realFetch;
        if (priorSignatures == null) rmSync(signaturesPath, { force: true });
        else writeFileSync(signaturesPath, priorSignatures, "utf8");
      }
    },
    300_000,
  );

  it(
    "a customer revision authorizes exactly one new production, then reuses",
    async () => {
      // A revision must not be mistaken for a duplicate. It changes the customer's
      // request, so it earns exactly one new artifact — and only one. Running the
      // revised request again must be free.
      //
      // Revision *accounting* is not this hook's job: the round is consumed upstream
      // in the Review Room, which is certified separately. What is asserted here is
      // that the hook neither consumes a round nor spends twice for one revision.
      const campaignId = `camp-hook-revision-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const materials = [approvedLogo(campaignId)];
      const campaign = customerCampaign(campaignId);

      const delivered = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(delivered.ok).toBe(true);
      if (!delivered.ok) return;
      expect(delivered.invocationOutcome).toBe("RENDERED");

      // What a real revision leaves on the record: the customer's instruction, which
      // `mapFlyerProjectTruthFromJob` folds into the mapped truth.
      const revised: CampaignRecord = {
        ...campaign,
        revisionRoundsUsed: 1,
        machineFlyerRevisionEmphasis: {
          instruction: "Make the call-to-action the headline.",
          emphasizeExistingCtaAsHeadline: true,
        },
      } as CampaignRecord;

      const afterRevision = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: revised,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(afterRevision.ok).toBe(true);
      if (!afterRevision.ok) return;
      // The revision changed the request, so this is new work, not reuse.
      expect(afterRevision.invocationOutcome).toBe("RENDERED");
      expect(afterRevision.identity.renderVersion).toBeGreaterThan(
        delivered.identity.renderVersion,
      );
      const versionsAfterRevision = renderVersions(campaignId, record.dispatchId);

      // The same revised request again: one revision buys one artifact.
      const realFetch = globalThis.fetch;
      const providerCalls: string[] = [];
      globalThis.fetch = (async (...args: Parameters<typeof realFetch>) => {
        providerCalls.push(String(args[0]));
        throw new Error("A provider was called on a repeat of a revised request.");
      }) as typeof realFetch;
      try {
        const repeatRevision = await invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign: revised,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
        });
        expect(providerCalls).toEqual([]);
        expect(repeatRevision.ok).toBe(true);
        if (!repeatRevision.ok) return;
        expect(repeatRevision.invocationOutcome).toBe("ALREADY_RENDERED");
        expect(repeatRevision.identity.renderVersion).toBe(
          afterRevision.identity.renderVersion,
        );
        expect(renderVersions(campaignId, record.dispatchId)).toEqual(
          versionsAfterRevision,
        );
      } finally {
        globalThis.fetch = realFetch;
      }

      // The hook did not touch revision accounting in either direction.
      expect(revised.revisionRoundsUsed).toBe(1);
      expect(campaign.revisionRoundsUsed).toBe(0);
    },
    300_000,
  );

  it(
    "a Studio correction produces once without consuming a revision, then cannot spend again",
    async () => {
      // A Studio correction is the Studio's own quality judgement, absorbed
      // internally. It may produce a new artifact while the request is unsatisfied,
      // it must not charge the customer a revision round, and once it has produced a
      // passing artifact the same correction must not be able to buy another.
      const campaignId = `camp-hook-studio-correction-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const materials = [approvedLogo(campaignId)];
      const campaign = customerCampaign(campaignId);

      // QA rejects the first attempt, which is what puts the request in correction.
      const rejected = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        forceQaFail: true,
      });
      expect(rejected.ok).toBe(false);
      if (rejected.ok) return;
      expect(rejected.failureCode).toBe("QA_FAILURE");

      // The request is unsatisfied and within budget, so the correction may produce.
      const corrected = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(corrected.ok).toBe(true);
      if (!corrected.ok) return;
      expect(corrected.invocationOutcome).toBe("RENDERED");
      const versionsAfterCorrection = renderVersions(campaignId, record.dispatchId);

      // The correction is settled. Asking again must not buy a second one.
      const realFetch = globalThis.fetch;
      const providerCalls: string[] = [];
      globalThis.fetch = (async (...args: Parameters<typeof realFetch>) => {
        providerCalls.push(String(args[0]));
        throw new Error("A provider was called on a repeat of a settled correction.");
      }) as typeof realFetch;
      try {
        const repeatCorrection = await invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
        });
        expect(providerCalls).toEqual([]);
        expect(repeatCorrection.ok).toBe(true);
        if (!repeatCorrection.ok) return;
        expect(repeatCorrection.invocationOutcome).toBe("ALREADY_RENDERED");
        expect(renderVersions(campaignId, record.dispatchId)).toEqual(
          versionsAfterCorrection,
        );
      } finally {
        globalThis.fetch = realFetch;
      }

      // The customer paid nothing for the Studio's own correction.
      expect(campaign.revisionRoundsUsed).toBe(0);
    },
    300_000,
  );

  it(
    "changed design truth creates a new immutable version",
    async () => {
      const campaignId = `camp-hook-idem-change-spec-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const materials = [approvedLogo(campaignId)];

      const first = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: customerCampaign(campaignId),
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");

      const second = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: customerCampaign(
          campaignId,
          "Autumn Open House — portraits $129. Oct 1 – Oct 15, 2026. Call (804) 555-0199 or visit idem.example/autumn",
        ),
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("RENDERED");
      expect(second.identity.renderVersion).toBeGreaterThan(
        first.identity.renderVersion,
      );
      expect(second.identity.pngContentSha256).not.toBe(
        first.identity.pngContentSha256,
      );
      expect(
        existsSync(path.join(REPO, first.receiptRelativePath)),
      ).toBe(true);
      expect(
        readFileSync(path.join(REPO, first.receiptRelativePath), "utf8"),
      ).toContain('"status": "success"');
    },
    180_000,
  );

  it(
    "changed materials create a new version",
    async () => {
      const campaignId = `camp-hook-idem-change-mat-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const materials = [approvedLogo(campaignId)];
      const campaign = customerCampaign(campaignId);

      const first = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");

      writeFileSync(
        path.join(REPO, logoRel),
        HARBOR_OAK_LOGO_SVG.replace("#1F3A5F", "#102030"),
        "utf8",
      );

      const second = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("RENDERED");
      expect(second.identity.renderVersion).toBeGreaterThan(
        first.identity.renderVersion,
      );
      expect(second.identity.materialFingerprint).not.toBe(
        first.identity.materialFingerprint,
      );
    },
    180_000,
  );

  it(
    "QA-failed prior render is not reusable PASS; retry may execute again",
    async () => {
      const campaignId = `camp-hook-idem-qa-fail-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const failed = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        forceQaFail: true,
      });
      expect(failed.ok).toBe(false);
      if (failed.ok) return;
      expect(failed.failureCode).toBe("QA_FAILURE");

      const retry = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        forceQaFail: false,
      });
      expect(retry.ok).toBe(true);
      if (!retry.ok) return;
      expect(retry.invocationOutcome).toBe("RENDERED");
    },
    180_000,
  );

  it(
    "partial PNG-without-identity fails closed",
    async () => {
      const campaignId = `camp-hook-idem-partial-${Date.now()}`;
      const record = readyFlyerRecord(campaignId);
      const safe = record.dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_");
      const partialPng = path.join(
        REPO,
        "data/campaign-design-artifacts",
        campaignId,
        safe,
        "renders/v1/flyer.png",
      );
      mkdirSync(path.dirname(partialPng), { recursive: true });
      writeFileSync(partialPng, Buffer.from([1, 2, 3, 4]));

      const logoRel = stageLogo(campaignId);
      const result = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: customerCampaign(campaignId),
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failureCode).toBe("PARTIAL_RENDER_STATE");
    },
    60_000,
  );

  it(
    "concurrent identical invokes cannot mint two successful identities",
    async () => {
      const campaignId = `camp-hook-idem-concurrent-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const [a, b] = await Promise.all([
        invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
        }),
        invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
        }),
      ]);

      const oks = [a, b].filter((r) => r.ok);
      expect(oks.length).toBeGreaterThanOrEqual(1);
      const rendered = oks.filter(
        (r) => r.ok && r.invocationOutcome === "RENDERED",
      );
      expect(rendered.length).toBeLessThanOrEqual(1);

      if (oks.length === 2 && oks[0]!.ok && oks[1]!.ok) {
        expect(oks[0].identity.renderId).toBe(oks[1].identity.renderId);
        expect(oks[0].identity.pngContentSha256).toBe(
          oks[1].identity.pngContentSha256,
        );
      }

      const versions = renderVersions(campaignId, record.dispatchId);
      const successVersions = versions.filter((v) => {
        const receiptPath = path.join(
          REPO,
          "data/campaign-design-artifacts",
          campaignId,
          record.dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_"),
          `renders/v${v}/dispatch-hook-receipt.json`,
        );
        if (!existsSync(receiptPath)) return false;
        const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
          status?: string;
        };
        return receipt.status === "success";
      });
      expect(successVersions.length).toBe(1);
    },
    180_000,
  );

  it(
    "escalated correction state cannot withhold an artifact the customer already has",
    async () => {
      // Gate ordering. `loop.status === "escalated"` was checked before anything asked
      // whether the request was satisfied, so a repeat of a delivered request could come
      // back as INTERNAL_CORRECTION_EXHAUSTED. Escalation is a statement about attempts;
      // it is not a reason to withhold finished work, and serving finished work spends
      // nothing for escalation to protect against.
      const campaignId = `camp-hook-escalated-gate-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const delivered = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(delivered.ok).toBe(true);
      if (!delivered.ok) return;
      expect(delivered.invocationOutcome).toBe("RENDERED");
      const versionsAfterDelivery = renderVersions(campaignId, record.dispatchId);

      const loopPath = path.join(
        REPO,
        "data/campaign-design-artifacts",
        campaignId,
        record.dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_"),
        "internal-production-loop.json",
      );
      const storedLoop = JSON.parse(
        readFileSync(loopPath, "utf8"),
      ) as InternalProductionLoopRecord;
      const escalatedLoop: InternalProductionLoopRecord = {
        ...storedLoop,
        status: "escalated",
        ownerEscalation: {
          required: true,
          reason: "Internal production correction budget exhausted.",
          at: new Date().toISOString(),
          failureClasses: [],
        },
      };
      writeFileSync(loopPath, JSON.stringify(escalatedLoop), "utf8");

      const repeat = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: { ...campaign, internalProductionLoop: escalatedLoop },
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });

      expect(repeat.ok).toBe(true);
      if (!repeat.ok) return;
      expect(repeat.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(repeat.identity.renderVersion).toBe(delivered.identity.renderVersion);
      expect(renderVersions(campaignId, record.dispatchId)).toEqual(
        versionsAfterDelivery,
      );
    },
    240_000,
  );

  it(
    "an artifact with no request key is recognised by the facts it carries",
    async () => {
      // Legacy artifact equivalence. Receipts written before `requestKey` existed used
      // to be matched by rebuilding a request key from their stored idempotency key —
      // which keeps that key's spec fingerprint, and the spec fingerprint has the layout
      // family baked in. Whether a delivered artifact was recognised therefore depended
      // on which family the variety selector happened to pick today. Pick another and
      // the artifact stopped matching, the request looked new, and the Studio paid to
      // produce a duplicate of work it had already delivered.
      //
      // Both halves of that are reproduced here: the request key is stripped from the
      // receipt, and the stored idempotency key is rewritten so no identity path can
      // match either. All that is left to recognise the artifact by is its stored spec.
      const campaignId = `camp-hook-legacy-facts-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const delivered = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(delivered.ok).toBe(true);
      if (!delivered.ok) return;
      expect(delivered.invocationOutcome).toBe("RENDERED");
      const versionsAfterDelivery = renderVersions(campaignId, record.dispatchId);

      const artifactRoot = path.join(
        REPO,
        "data/campaign-design-artifacts",
        campaignId,
        record.dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_"),
      );
      const makeLegacy = (receiptPath: string) => {
        const stored = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<
          string,
          unknown
        > & { idempotencyKey: string };
        expect(stored.requestKey).toBeTruthy();
        delete stored.requestKey;
        writeFileSync(
          receiptPath,
          JSON.stringify({
            ...stored,
            // A spec fingerprint from a layout family that is not the one this request
            // computes today, so key-based matching cannot succeed by luck.
            idempotencyKey: stored.idempotencyKey.replace(
              /\|[0-9a-f]{64}\|/,
              "|" + "a".repeat(64) + "|",
            ),
          }),
          "utf8",
        );
      };
      makeLegacy(path.join(artifactRoot, "current-dispatch-hook-receipt.json"));
      makeLegacy(path.join(REPO, delivered.receiptRelativePath));
      // The loop is cleared too, so nothing but immutable evidence is left to decide on.
      rmSync(path.join(artifactRoot, "internal-production-loop.json"), {
        force: true,
      });

      const realFetch = globalThis.fetch;
      const priorKey = process.env.ANTHROPIC_API_KEY;
      const providerCalls: string[] = [];
      globalThis.fetch = (async (...args: Parameters<typeof realFetch>) => {
        providerCalls.push(String(args[0]));
        throw new Error("A legacy artifact went unrecognised and bought a duplicate.");
      }) as typeof realFetch;
      process.env.ANTHROPIC_API_KEY = "test-key-never-used";

      try {
        const repeat = await invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
          preferAnthropic: true,
        });

        expect(providerCalls).toEqual([]);
        expect(repeat.ok).toBe(true);
        if (!repeat.ok) return;
        expect(repeat.invocationOutcome).toBe("ALREADY_RENDERED");
        expect(repeat.identity.renderVersion).toBe(delivered.identity.renderVersion);
        expect(renderVersions(campaignId, record.dispatchId)).toEqual(
          versionsAfterDelivery,
        );
      } finally {
        globalThis.fetch = realFetch;
        if (priorKey === undefined) delete process.env.ANTHROPIC_API_KEY;
        else process.env.ANTHROPIC_API_KEY = priorKey;
      }
    },
    240_000,
  );

  it(
    "a paid attempt that fails before any version still bounds further spend",
    async () => {
      // The unbounded-spend path. On the hybrid route OpenAI is paid for a generated
      // visual before the renderer produces anything, so a failure between the image and
      // the export — EXPORT_FAILURE, RENDER_FAILURE, BROKEN_ASSET_REFERENCE — returned
      // with no identity, and therefore no version directory to write a receipt into.
      // The money was spent and nothing recorded it. Entitlement counts paid attempts to
      // decide whether a request still has budget, so those attempts read as zero: every
      // repeat was entitled as first production, spent again, failed again, and recorded
      // nothing again.
      //
      // Proven against the spend ledger, which is where a paid attempt lands when there
      // is no version to attach it to. No provider is called.
      const campaignId = `camp-hook-paid-failure-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];
      const artifactRootRel = customerArtifactRootRel(campaignId, record.dispatchId);

      const mapped = mapFlyerProjectTruthFromJob({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(mapped.ok).toBe(true);
      if (!mapped.ok) return;
      const factsSpec = reasonFlyerDesignSpecDeterministic(
        factProjectionTruth(mapped.truth),
      );
      const requestKey = buildRequestKey({
        dispatchId: record.dispatchId,
        jobId: record.jobId,
        skuId: record.skuId,
        requestSpecFingerprint: fingerprintDesignSpec(factsSpec),
        materialFingerprint: fingerprintMaterials(factsSpec),
        rendererVersion: DESIGN_RENDERER_VERSION,
        productionMethodId: RENDERER_ONLY_PRODUCTION_METHOD_ID,
      });
      const equivalence = {
        requestKey,
        factSignature: designFactSignature(factsSpec),
        dispatchId: record.dispatchId,
        jobId: record.jobId,
        skuId: record.skuId,
        rendererVersion: DESIGN_RENDERER_VERSION,
        hybrid: false,
      };
      const budget = studioAutonomousProductionLoopV1.maxInternalProductionAttempts;

      let attemptSeq = 0;
      const paidFailure = (billableCalls: number) => ({
        attemptId: `attempt-${(attemptSeq += 1)}`,
        requestKey,
        idempotencyKey: `${requestKey}|whatever-brief`,
        dispatchId: record.dispatchId,
        jobId: record.jobId,
        campaignId,
        skuId: record.skuId,
        productionMethodId: RENDERER_ONLY_PRODUCTION_METHOD_ID,
        // No version, exactly as an export failure leaves things.
        renderVersion: null,
        outcome: "technical_failure" as const,
        failureCode: "EXPORT_FAILURE",
        billableCalls,
        totalCostUsd: billableCalls * 0.13,
        costByPurpose: {},
        startedAt: new Date().toISOString(),
      });

      const entitlementNow = () => {
        const satisfaction = summarizeRequestSatisfaction({
          repoRoot: REPO,
          artifactRootRel,
          equivalence,
        });
        return {
          completedAttempts: satisfaction.completedAttempts,
          decision: resolveProductionEntitlement({
            requestAlreadySatisfied: Boolean(satisfaction.satisfiedBy),
            completedAttemptsForRequest: satisfaction.completedAttempts,
            correctionAttemptBudget: budget,
            explicitAuthorization: null,
            explicitAuthorizationAlreadyUsed: false,
          }).decision,
        };
      };

      // Nothing recorded yet: the first attempt is entitled, as it should be.
      expect(entitlementNow()).toEqual({
        completedAttempts: 0,
        decision: "AUTHORIZED_NEW_PRODUCTION",
      });

      // Spend the whole budget on attempts that each paid and then died before a version
      // existed. Every one of these used to be invisible.
      for (let i = 0; i < budget; i++) {
        appendProductionSpendEntry({
          repoRoot: REPO,
          artifactRootRel,
          entry: paidFailure(2),
        });
      }
      expect(entitlementNow()).toEqual({
        completedAttempts: budget,
        decision: "BLOCKED",
      });

      // And the distinction that keeps this from stranding recoverable jobs: an attempt
      // that reached no paid provider consumed no money, so it consumes no budget either.
      const freshCampaignId = `camp-hook-free-failure-${Date.now()}`;
      const freshRoot = customerArtifactRootRel(freshCampaignId, record.dispatchId);
      for (let i = 0; i < budget + 2; i++) {
        appendProductionSpendEntry({
          repoRoot: REPO,
          artifactRootRel: freshRoot,
          entry: { ...paidFailure(0), campaignId: freshCampaignId },
        });
      }
      const free = summarizeRequestSatisfaction({
        repoRoot: REPO,
        artifactRootRel: freshRoot,
        equivalence,
      });
      expect(free.completedAttempts).toBe(0);

      // An attempt still sitting at `in_flight` counts. Recording cost *after* the
      // fact is not enough on its own: if that write fails, a paid attempt vanishes
      // and the next invocation spends as if it were the first. Unknown spend has to
      // be treated as spend.
      const inFlightCampaignId = `camp-hook-in-flight-${Date.now()}`;
      const inFlightRoot = customerArtifactRootRel(
        inFlightCampaignId,
        record.dispatchId,
      );
      const reserved = reserveProductionSpendAttempt({
        repoRoot: REPO,
        artifactRootRel: inFlightRoot,
        reservation: {
          requestKey,
          idempotencyKey: `${requestKey}|whatever-brief`,
          dispatchId: record.dispatchId,
          jobId: record.jobId,
          campaignId: inFlightCampaignId,
          skuId: record.skuId,
          productionMethodId: RENDERER_ONLY_PRODUCTION_METHOD_ID,
          startedAt: new Date().toISOString(),
        },
      });
      expect(reserved.ok).toBe(true);
      expect(
        summarizeRequestSatisfaction({
          repoRoot: REPO,
          artifactRootRel: inFlightRoot,
          equivalence,
        }).completedAttempts,
      ).toBe(1);
    },
    120_000,
  );

  it(
    "refuses to call a paid provider when the attempt cannot be recorded",
    async () => {
      // The ledger write used to be best-effort: a failure returned `appended: false`
      // and the caller carried on regardless. So one unwritable line — disk full,
      // permissions, I/O error — made a paid attempt invisible to every later
      // entitlement decision, and repeated invocations were each entitled to spend as
      // if they were the first.
      //
      // Being unable to account for money is now a reason not to spend it. Here the
      // ledger path is occupied by a *directory*, so appending to it cannot succeed.
      const campaignId = `camp-hook-ledger-blocked-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];
      const artifactRootRel = customerArtifactRootRel(campaignId, record.dispatchId);
      mkdirSync(path.join(REPO, spendLedgerRel(artifactRootRel)), {
        recursive: true,
      });

      const realFetch = globalThis.fetch;
      const providerCalls: string[] = [];
      globalThis.fetch = (async (...args: Parameters<typeof realFetch>) => {
        providerCalls.push(String(args[0]));
        throw new Error("A provider was called without a recordable attempt.");
      }) as typeof realFetch;
      let outcome: DesignDispatchHookResult;
      try {
        outcome = await invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
        });
      } finally {
        globalThis.fetch = realFetch;
      }

      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.failureCode).toBe("SPEND_LEDGER_UNAVAILABLE");
      // Refused before the provider, and with nothing minted.
      expect(providerCalls).toEqual([]);
      expect(renderVersions(campaignId, record.dispatchId)).toEqual([]);
    },
    120_000,
  );

  it(
    "invocations of one request contend for one lock however stale their workflow state",
    async () => {
      // Entitlement was not atomic with production. The render lock was keyed on the
      // idempotency key, which folds in the correction brief and the loop constraints —
      // mutable state with more than one writer. Two concurrent invocations of the same
      // customer request holding different stale brief state computed different keys,
      // took different locks, each looked and saw the request unsatisfied, and each
      // produced. The lock was held the whole time and prevented nothing, because they
      // were never contending for the same one.
      //
      // Here the request's lock is taken by hand, then the hook is invoked with brief
      // state that would have produced a different key. It must find the lock held.
      const campaignId = `camp-hook-request-lock-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];
      const artifactRootRel = customerArtifactRootRel(campaignId, record.dispatchId);

      const mapped = mapFlyerProjectTruthFromJob({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(mapped.ok).toBe(true);
      if (!mapped.ok) return;
      const factsSpec = reasonFlyerDesignSpecDeterministic(
        factProjectionTruth(mapped.truth),
      );
      const requestKey = buildRequestKey({
        dispatchId: record.dispatchId,
        jobId: record.jobId,
        skuId: record.skuId,
        requestSpecFingerprint: fingerprintDesignSpec(factsSpec),
        materialFingerprint: fingerprintMaterials(factsSpec),
        rendererVersion: DESIGN_RENDERER_VERSION,
        productionMethodId: RENDERER_ONLY_PRODUCTION_METHOD_ID,
      });

      const held = tryAcquireRenderLock({
        repoRoot: REPO,
        artifactRootRel,
        idempotencyKey: requestKey,
      });
      expect(held.ok).toBe(true);
      if (!held.ok) return;

      try {
        // Brief state that makes this invocation's execution identity differ from the
        // one the lock was taken under. Under the old key that was enough to miss the
        // lock entirely and produce alongside the holder.
        const contended = await invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign: {
            ...campaign,
            internalProductionLoop: {
              campaignId,
              jobId: record.jobId,
              dispatchId: record.dispatchId,
              status: "in_progress",
              attempts: [],
              briefs: [],
              activeBrief: {
                briefId: `brief-contended-${campaignId}`,
                fingerprint: "a-brief-the-lock-holder-does-not-have",
                sourceAttemptNumber: 1,
                failureClasses: [],
                instructions: [],
                constraints: null,
                createdAt: new Date().toISOString(),
              },
              settledBriefFingerprint: null,
              settledConstraints: null,
              productionFactFingerprint: null,
              ownerEscalation: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as unknown as InternalProductionLoopRecord,
          },
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
        });

        expect(contended.ok).toBe(false);
        if (contended.ok) return;
        expect(contended.failureCode).toBe("CONCURRENT_IN_PROGRESS");
        // Nothing was minted while the request's lock was held elsewhere.
        expect(renderVersions(campaignId, record.dispatchId)).toEqual([]);
      } finally {
        held.handle.release();
      }
    },
    120_000,
  );

  it("does not take a live holder's lock however long production runs", () => {
    // The lock had a flat 120-second age limit and no liveness check, and hybrid
    // production — three image generations plus vision review — routinely runs longer
    // than that. So a live holder's lock became stealable mid-production: a second
    // invocation deleted it, entered, saw the request still unsatisfied because no
    // receipt existed yet, and paid for the same work. Then the first holder released,
    // deleting the second's lock, and admitted a third.
    const campaignId = `camp-hook-lock-lease-${Date.now()}`;
    const record = readyFlyerRecord(campaignId);
    const artifactRootRel = customerArtifactRootRel(campaignId, record.dispatchId);
    const lockKey = `request-key-${campaignId}`;

    const holder = tryAcquireRenderLock({
      repoRoot: REPO,
      artifactRootRel,
      idempotencyKey: lockKey,
    });
    expect(holder.ok).toBe(true);
    if (!holder.ok) return;

    const lockAbs = holder.handle.lockAbs;
    const lockDirAbs = path.dirname(lockAbs);
    const asHeld = (file = lockAbs) =>
      JSON.parse(readFileSync(file, "utf8")) as {
        owner: string;
        pid: number;
        generation: number;
        acquiredAt: string;
      };
    expect(asHeld().owner).toBe(holder.handle.owner);
    expect(holder.handle.generation).toBe(1);

    const contend = () =>
      tryAcquireRenderLock({
        repoRoot: REPO,
        artifactRootRel,
        idempotencyKey: lockKey,
      });

    // Held right now: busy, as before.
    expect(contend()).toMatchObject({ ok: false, reason: "busy" });

    // Backdate the record by increasing amounts, well past the old 120-second limit and
    // past any plausible production run. This process is the holder and is plainly
    // alive, so the lock stays its own at every horizon — being slow is not being gone,
    // and no amount of elapsed time makes a working holder displaceable. An earlier
    // revision allowed a steal after thirty minutes, which reopened the same race the
    // 120-second limit had.
    let stale = asHeld();
    for (const heldForMinutes of [3, 20, 45, 600]) {
      stale = {
        ...stale,
        acquiredAt: new Date(Date.now() - heldForMinutes * 60_000).toISOString(),
      };
      writeFileSync(lockAbs, `${JSON.stringify(stale)}\n`, "utf8");
      expect(contend()).toMatchObject({ ok: false, reason: "busy" });
      expect(asHeld().owner).toBe(holder.handle.owner);
    }

    // A holder whose process is gone is a different matter: that generation is abandoned,
    // and the next contender may open the next one. Note what does *not* happen — the
    // dead holder's record is not deleted. Recovery is by moving forward.
    const deadPid = 0x7ffffffe;
    writeFileSync(lockAbs, `${JSON.stringify({ ...stale, pid: deadPid })}\n`, "utf8");

    const replacement = contend();
    expect(replacement.ok).toBe(true);
    if (!replacement.ok) return;
    expect(replacement.handle.generation).toBe(2);
    expect(existsSync(lockAbs)).toBe(true);
    expect(asHeld().pid).toBe(deadPid);
    expect(asHeld(replacement.handle.lockAbs).owner).toBe(replacement.handle.owner);

    // The ordering that survived three attempts at this: a second contender that read
    // the same dead holder, then acts on that stale reading *after* the first has already
    // moved on and started producing.
    //
    // Every previous revision handed that contender a way to delete — plain unlink, then
    // rename, then a re-verified unlink under a marker whose own cleanup had the same
    // flaw. There is now nothing to delete. A stale reading can only try to open a
    // generation that already exists, which fails, and the contender is told to look
    // again.
    expect(contend()).toMatchObject({ ok: false, reason: "busy" });
    expect(asHeld(replacement.handle.lockAbs).owner).toBe(replacement.handle.owner);

    // The first holder returning late marks its own generation finished. Under every
    // previous revision this deleted a path that now belongs to someone else, admitting
    // a third producer. It cannot touch the live generation.
    holder.handle.release();
    expect(existsSync(path.join(lockDirAbs, "g1.done"))).toBe(true);
    expect(existsSync(replacement.handle.lockAbs)).toBe(true);
    expect(asHeld(replacement.handle.lockAbs).owner).toBe(replacement.handle.owner);
    expect(contend()).toMatchObject({ ok: false, reason: "busy" });

    // Only the live holder finishing frees the request.
    replacement.handle.release();
    const third = contend();
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.handle.generation).toBe(3);
    third.handle.release();
  });

  it("a contender that already published the next generation cannot be displaced", () => {
    // Two contenders both find the top generation dead and both try to take the next
    // one. Exactly one can, because opening it is exclusive; the other is told to look
    // again rather than being allowed to act on what it saw.
    const campaignId = `camp-hook-lock-gen-${Date.now()}`;
    const record = readyFlyerRecord(campaignId);
    const artifactRootRel = customerArtifactRootRel(campaignId, record.dispatchId);
    const lockKey = `request-key-${campaignId}`;

    const contend = () =>
      tryAcquireRenderLock({
        repoRoot: REPO,
        artifactRootRel,
        idempotencyKey: lockKey,
      });

    const first = contend();
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const lockDirAbs = path.dirname(first.handle.lockAbs);

    // Leave generation 1 looking crashed.
    const payload = JSON.parse(
      readFileSync(first.handle.lockAbs, "utf8"),
    ) as Record<string, unknown>;
    writeFileSync(
      first.handle.lockAbs,
      `${JSON.stringify({ ...payload, pid: 0x7ffffffe })}\n`,
      "utf8",
    );

    // Stand in for the winning contender by publishing generation 2 with a live pid,
    // exactly as `tryAcquireRenderLock` would.
    writeFileSync(
      path.join(lockDirAbs, "g2"),
      `${JSON.stringify({
        lockKey,
        owner: "someone-else",
        pid: process.pid,
        generation: 2,
        acquiredAt: new Date().toISOString(),
      })}\n`,
      "utf8",
    );

    // The losing contender does not get in, and cannot reach past generation 2.
    expect(contend()).toMatchObject({ ok: false, reason: "busy" });
    expect(existsSync(path.join(lockDirAbs, "g3"))).toBe(false);
    expect(
      (JSON.parse(readFileSync(path.join(lockDirAbs, "g2"), "utf8")) as { owner: string })
        .owner,
    ).toBe("someone-else");

    // An unreadable top generation reads as held, never as free. This is unreachable
    // through the normal path — records are linked into place complete — and reading it
    // as free would be a licence to displace a live holder.
    writeFileSync(path.join(lockDirAbs, "g2"), '{"lockKey":"trunc', "utf8");
    expect(contend()).toMatchObject({ ok: false, reason: "busy" });
  });

  it("still refuses non-flyer SKUs (menu uses its own hook, not flyer hook)", async () => {
    const menu = resolveServiceProductionContract("v2-rtu-menu");
    expect(menu.status).toBe("resolved");
    if (menu.status === "resolved") {
      expect(menu.contract.primaryTool.toolId).toBe("studio_design_renderer");
    }

    const record = readyFlyerRecord("camp-hook-idem-sku");
    const bad = {
      ...record,
      skuId: "v2-rtu-menu" as const,
      jobId: "camp-hook-idem-sku::v2-rtu-menu",
      dispatchId: "dd:camp-hook-idem-sku::v2-rtu-menu",
    };
    const result = await invokeDesignRendererDispatchHook({
      repoRoot: REPO,
      campaign: customerCampaign("camp-hook-idem-sku"),
      dispatchRecord: bad,
      materials: [approvedLogo("camp-hook-idem-sku")],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("SKU_NOT_SUPPORTED");
  });

  it("not-ready dispatch still rejected", async () => {
    const campaignId = "camp-hook-idem-not-ready";
    const record = {
      ...readyFlyerRecord(campaignId),
      executionIdentityReady: false,
      status: "WAITING_FOR_PREREQUISITE" as const,
    };
    const result = await invokeDesignRendererDispatchHook({
      repoRoot: REPO,
      campaign: customerCampaign(campaignId),
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("DISPATCH_NOT_READY");
  });
});
