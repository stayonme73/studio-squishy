/**
 * STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-PROOF-1
 * Proof only — primaryTool stays Canva. No dispatch/observer wiring. No sealed-lane edits.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import { runDesignRendererProofPipeline } from "./pipeline";
import { buildHarborOakFlyerProjectTruth } from "./fixtures";
import { buildHarborOakBusinessCardProjectTruth } from "./card-fixtures";
import { runBusinessCardProofPipeline } from "./card-pipeline";
import {
  buildSaltCedarMenuProjectTruthMax,
  MENU_PROOF_ARTIFACT_ROOT,
} from "./menu-fixtures";
import { runMenuProofPipeline } from "./menu-pipeline";
import {
  buildHarborOakServiceSheetProjectTruthMax,
  SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
} from "./service-sheet-fixtures";
import { runServiceSheetProofPipeline } from "./service-sheet-pipeline";
import {
  buildHarborOakPromoCampaignSetTruth,
  PROMO_PROOF_ARTIFACT_ROOT,
} from "./promo-fixtures";
import { runPromoProofPipeline } from "./promo-pipeline";
import { PROMO_SQUARE_PLATE } from "./promo-types";

import {
  assertCaptionsBoundToPosts,
  reasonSocialPostCaptionsDeterministic,
  validateCaptionFacts,
} from "./social-posts-captions";
import { SOCIAL_POSTS_PROOF_CONTRACT } from "./social-posts-contracts";
import {
  buildHarborOakSocialPostsSetTruth,
  SOCIAL_POSTS_PROOF_ARTIFACT_ROOT,
} from "./social-posts-fixtures";
import { runSocialPostsProofPipeline } from "./social-posts-pipeline";
import {
  assertSocialPostsRequiredTruth,
  reasonSocialPostsSetDeterministic,
} from "./social-posts-reason";
import { evaluateSocialPostsSetConsistency } from "./social-posts-set-qa";
import {
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POSTS_SQUARE_PLATE,
  type SocialPostCaption,
} from "./social-posts-types";
import { validateSocialPostsSetSpec } from "./social-posts-validate";

const repoRoot = process.cwd();

function readJson(rel: string): unknown {
  return JSON.parse(readFileSync(path.join(repoRoot, rel), "utf8"));
}

describe("studio-design-renderer social-posts proof (v2-rtu-social-posts)", () => {
  it("retargets primaryTool to studio_design_renderer after DISPATCH-HOOK-1", () => {
    const resolved = resolveServiceProductionContract("v2-rtu-social-posts");
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    expect(resolved.contract.primaryTool.toolId).toBe("studio_design_renderer");
    expect(SOCIAL_POSTS_PROOF_CONTRACT.primaryToolRemapAuthorized).toBe(true);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.dispatchHookAuthorized).toBe(true);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.observerWiringAuthorized).toBe(true);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.canvaUsedInProof).toBe(false);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.makeUsedInProof).toBe(false);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.ownerRoutineResponsibility).toBe("NONE");
  });

  it("reuses the promotion-graphics square CERT plate rather than defining a rival plate", () => {
    expect(SOCIAL_POSTS_SQUARE_PLATE).toBe(PROMO_SQUARE_PLATE);
    expect(SOCIAL_POSTS_SQUARE_PLATE.plateId).toBe("cert-square-1024");
    expect(SOCIAL_POSTS_PROOF_CONTRACT.squarePlateReused).toEqual({
      plateId: "cert-square-1024",
      widthPx: 1024,
      heightPx: 1024,
    });
    expect(SOCIAL_POSTS_PROOF_CONTRACT.portraitVariantsAuthorized).toBe(false);
    expect(SOCIAL_POSTS_PROOF_CONTRACT.exactAssetCount).toBe(4);
  });

  it("reasoner produces four distinct 1024x1024 layouts, not four clones", () => {
    const truth = buildHarborOakSocialPostsSetTruth({ repoRoot });
    const spec = reasonSocialPostsSetDeterministic(truth);
    const validated = validateSocialPostsSetSpec(repoRoot, spec, truth);
    expect(validated.ok).toBe(true);

    expect(spec.assets).toHaveLength(SOCIAL_POSTS_EXACT_COUNT);
    for (const asset of spec.assets) {
      expect(asset.plateId).toBe("cert-square-1024");
      expect(asset.canvas).toEqual({ widthPx: 1024, heightPx: 1024 });
    }
    expect(spec.assets.map((a) => a.orderIndex)).toEqual([1, 2, 3, 4]);
    expect(spec.assets.map((a) => a.assetId)).toEqual([
      "social-post-1",
      "social-post-2",
      "social-post-3",
      "social-post-4",
    ]);
    expect(spec.assets.map((a) => a.roleAngle)).toEqual([
      "offer_lead",
      "cta_book",
      "dates_window",
      "trust_brand",
    ]);

    const layouts = spec.assets.map((a) =>
      a.layers
        .map((l) =>
          l.type === "text"
            ? `${l.role}:${l.x},${l.y},${l.fontSizePx},${l.align}`
            : `${l.role}:${l.x},${l.y},${l.width}x${l.height}`,
        )
        .join("|"),
    );
    expect(new Set(layouts).size).toBe(SOCIAL_POSTS_EXACT_COUNT);
  });

  it("missing member, duplicate order, or repeated role angle fails closed", () => {
    const truth = buildHarborOakSocialPostsSetTruth({ repoRoot });

    const threePosts = {
      ...truth,
      assets: truth.assets.slice(0, 3) as unknown as typeof truth.assets,
    };
    expect(() => assertSocialPostsRequiredTruth(threePosts)).toThrow(
      /exactly 4 posts required/,
    );

    const dupOrder = {
      ...truth,
      assets: [
        truth.assets[0]!,
        { ...truth.assets[1]!, orderIndex: 1 as const },
        truth.assets[2]!,
        truth.assets[3]!,
      ] as typeof truth.assets,
    };
    expect(() => assertSocialPostsRequiredTruth(dupOrder)).toThrow(
      /duplicate orderIndex/,
    );

    const dupAngle = {
      ...truth,
      assets: [
        truth.assets[0]!,
        { ...truth.assets[1]!, roleAngle: "offer_lead" },
        truth.assets[2]!,
        truth.assets[3]!,
      ] as typeof truth.assets,
    };
    expect(() => assertSocialPostsRequiredTruth(dupAngle)).toThrow(
      /distinct roleAngle/,
    );

    const noLogo = { ...truth, materials: [] };
    expect(() => assertSocialPostsRequiredTruth(noLogo)).toThrow(
      /MISSING_REQUIRED_MATERIAL/,
    );
  });

  it("writes exactly four captions bound to their posts", () => {
    const truth = buildHarborOakSocialPostsSetTruth({ repoRoot });
    const spec = reasonSocialPostsSetDeterministic(truth);
    const captions = reasonSocialPostCaptionsDeterministic(truth, spec.assets);

    expect(captions).toHaveLength(SOCIAL_POSTS_EXACT_COUNT);
    expect(captions.map((c) => c.captionId)).toEqual([
      "caption-1",
      "caption-2",
      "caption-3",
      "caption-4",
    ]);
    expect(captions.map((c) => c.assetId)).toEqual([
      "social-post-1",
      "social-post-2",
      "social-post-3",
      "social-post-4",
    ]);
    expect(assertCaptionsBoundToPosts(captions, spec.assets).ok).toBe(true);

    // Offer-role captions carry price + offer; the brand-trust caption carries neither.
    for (const caption of captions.slice(0, 3)) {
      expect(caption.text).toContain("$189");
      expect(caption.text).toContain("Tune-Up");
    }
    expect(captions[3]!.text).not.toContain("$189");
    expect(captions[3]!.text).toContain("Harbor & Oak");

    for (const caption of captions) {
      expect(caption.text).not.toMatch(/CERTIFICATION FIXTURE|INTERNAL TEST/i);
      expect(validateCaptionFacts(caption, truth).ok).toBe(true);
    }
  });

  it("caption that invents a price or claim fails CAPTION_FAILURE; creative phrasing passes", () => {
    const truth = buildHarborOakSocialPostsSetTruth({ repoRoot });
    const base: SocialPostCaption = {
      captionId: "caption-1",
      assetId: "social-post-1",
      orderIndex: 1,
      text: "",
    };

    const invented = validateCaptionFacts(
      { ...base, text: "Spring Tune-Up + Drain Clear is $99 this week." },
      truth,
    );
    expect(invented.ok).toBe(false);
    if (!invented.ok) expect(invented.code).toBe("CAPTION_FAILURE");

    const inventedDate = validateCaptionFacts(
      { ...base, text: "Spring Tune-Up + Drain Clear — $189 through May 31." },
      truth,
    );
    expect(inventedDate.ok).toBe(false);

    const prohibited = validateCaptionFacts(
      { ...base, text: "Best in Richmond — Spring Tune-Up + Drain Clear $189." },
      truth,
    );
    expect(prohibited.ok).toBe(false);

    const fixtureLeak = validateCaptionFacts(
      { ...base, text: "CERTIFICATION FIXTURE — Spring Tune-Up $189." },
      truth,
    );
    expect(fixtureLeak.ok).toBe(false);
    if (!fixtureLeak.ok) expect(fixtureLeak.code).toBe("FIXTURE_LEAKAGE");

    // Studio voice is free as long as every stated fact comes from the record.
    const creative = validateCaptionFacts(
      {
        ...base,
        text: "No hype, just steady work. Spring Tune-Up + Drain Clear is $189 at Harbor & Oak Home Services, March 10 – April 15, 2026.",
      },
      truth,
    );
    expect(creative.ok).toBe(true);
  });

  it("caption bound to the wrong post fails BINDING_FAILURE", () => {
    const truth = buildHarborOakSocialPostsSetTruth({ repoRoot });
    const spec = reasonSocialPostsSetDeterministic(truth);
    const captions = [...reasonSocialPostCaptionsDeterministic(truth, spec.assets)];
    const swapped = [
      { ...captions[0]!, assetId: captions[1]!.assetId },
      { ...captions[1]!, assetId: captions[0]!.assetId },
      captions[2]!,
      captions[3]!,
    ];
    const bound = assertCaptionsBoundToPosts(swapped, spec.assets);
    expect(bound.ok).toBe(false);
    if (!bound.ok) expect(bound.code).toBe("BINDING_FAILURE");

    const missing = assertCaptionsBoundToPosts(captions.slice(0, 3), spec.assets);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe("CAPTION_FAILURE");
  });

  it("set QA rejects a cloned layout even when every other rule passes", () => {
    const truth = buildHarborOakSocialPostsSetTruth({ repoRoot });
    const spec = reasonSocialPostsSetDeterministic(truth);
    const captions = reasonSocialPostCaptionsDeterministic(truth, spec.assets);
    const postingOrder = captions.map((c) => ({
      position: c.orderIndex,
      assetId: c.assetId,
      captionId: c.captionId,
    })) as unknown as Parameters<
      typeof evaluateSocialPostsSetConsistency
    >[0]["postingOrder"];

    const declaredTextByAsset: Record<string, string> = {};
    for (const asset of spec.assets) {
      declaredTextByAsset[asset.assetId] = asset.layers
        .filter((l) => l.type === "text")
        .map((l) => (l as { content: string }).content)
        .join(" ");
    }

    const healthy = evaluateSocialPostsSetConsistency({
      truth,
      spec,
      declaredTextByAsset,
      captions,
      postingOrder,
    });
    expect(healthy.ok).toBe(true);

    const cloned = {
      ...spec,
      assets: [
        spec.assets[0]!,
        {
          ...spec.assets[1]!,
          layers: spec.assets[0]!.layers,
        },
        spec.assets[2]!,
        spec.assets[3]!,
      ] as typeof spec.assets,
    };
    const clonedResult = evaluateSocialPostsSetConsistency({
      truth,
      spec: cloned,
      declaredTextByAsset,
      captions,
      postingOrder,
    });
    expect(clonedResult.ok).toBe(false);
    if (!clonedResult.ok) {
      expect(clonedResult.code).toBe("SET_CONSISTENCY_FAILURE");
      expect(clonedResult.message).toMatch(/cloned/i);
    }
  });

  it("full proof produces four PNGs, captions.json, and posting-order.json with durable bindings", async () => {
    const truth = buildHarborOakSocialPostsSetTruth({ repoRoot });
    const result = await runSocialPostsProofPipeline({ repoRoot, truth });
    if (!result.ok) {
      throw new Error(`${result.failureCode}: ${result.message}`);
    }
    expect(result.verdict).toBe("SOCIAL_POSTS_RENDERER_PROOF_PASS");
    expect(result.squarePlateReused).toEqual({
      plateId: "cert-square-1024",
      widthPx: 1024,
      heightPx: 1024,
    });

    const identity = result.identity;
    expect(identity.assets).toHaveLength(SOCIAL_POSTS_EXACT_COUNT);
    expect(identity.captions).toHaveLength(SOCIAL_POSTS_EXACT_COUNT);
    expect(identity.postingOrder).toHaveLength(SOCIAL_POSTS_EXACT_COUNT);
    expect(identity.setQaOk).toBe(true);
    expect(identity.campaignSetRenderVersion).toBeGreaterThanOrEqual(1);
    expect(identity.platformLabel).toBe("Instagram Post — square feed (CERT)");
    expect(identity.dispatchWiringScopeNote).toMatch(
      /studio_design_renderer|DISPATCH-HOOK/i,
    );

    const shas = new Set<string>();
    for (const asset of identity.assets) {
      expect(asset.widthPx).toBe(1024);
      expect(asset.heightPx).toBe(1024);
      expect(asset.plateId).toBe("cert-square-1024");
      expect(asset.individualQaOk).toBe(true);
      expect(asset.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      shas.add(asset.pngContentSha256);
      expect(existsSync(path.join(repoRoot, asset.pngRelativePath))).toBe(true);
      expect(existsSync(path.join(repoRoot, asset.pdfRelativePath))).toBe(true);
      expect(existsSync(path.join(repoRoot, asset.htmlRelativePath))).toBe(true);
    }
    // Four visually different posts must produce four different PNG hashes.
    expect(shas.size).toBe(SOCIAL_POSTS_EXACT_COUNT);

    expect(
      existsSync(path.join(repoRoot, identity.designSpecRelativePath)),
    ).toBe(true);
    expect(
      existsSync(path.join(repoRoot, identity.captionFileRelativePath)),
    ).toBe(true);
    expect(
      existsSync(path.join(repoRoot, identity.captionTextRelativePath)),
    ).toBe(true);
    expect(
      existsSync(path.join(repoRoot, identity.postingOrderRelativePath)),
    ).toBe(true);

    const captionsFile = readJson(identity.captionFileRelativePath) as {
      captions: { captionId: string; assetId: string; orderIndex: number }[];
    };
    expect(captionsFile.captions).toHaveLength(SOCIAL_POSTS_EXACT_COUNT);

    const orderFile = readJson(identity.postingOrderRelativePath) as {
      postingOrder: { position: number; assetId: string; captionId: string }[];
    };
    expect(orderFile.postingOrder.map((e) => e.position)).toEqual([1, 2, 3, 4]);

    // Every position resolves to one post and the caption written for that post.
    for (const entry of orderFile.postingOrder) {
      const asset = identity.assets.find((a) => a.assetId === entry.assetId)!;
      expect(asset).toBeDefined();
      expect(asset.orderIndex).toBe(entry.position);
      expect(asset.captionId).toBe(entry.captionId);
      const caption = captionsFile.captions.find(
        (c) => c.captionId === entry.captionId,
      )!;
      expect(caption.assetId).toBe(entry.assetId);
      expect(caption.orderIndex).toBe(entry.position);
    }

    const captionsText = readFileSync(
      path.join(repoRoot, identity.captionTextRelativePath),
      "utf8",
    )
      .trim()
      .split("\n");
    expect(captionsText).toHaveLength(SOCIAL_POSTS_EXACT_COUNT);
    captionsText.forEach((line, i) => {
      expect(line.startsWith(`Post ${i + 1} / social-post-${i + 1} /`)).toBe(true);
    });

    const trust = identity.assets.find((a) => a.roleAngle === "trust_brand")!;
    expect(result.declaredTextByAsset[trust.assetId]).not.toContain("$189");
    for (const asset of identity.assets.filter(
      (a) => a.roleAngle !== "trust_brand",
    )) {
      expect(result.declaredTextByAsset[asset.assetId]).toContain("$189");
      expect(result.declaredTextByAsset[asset.assetId]).toContain(
        asset.roleAngle,
      );
    }
  }, 240_000);

  it("second run versions the whole set to vN+1 and retains the prior set", async () => {
    const truth = buildHarborOakSocialPostsSetTruth({
      repoRoot,
      campaignId: "camp-design-social-posts-proof-versioning",
    });
    const artifactRootRel = `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}-versioning`;

    const first = await runSocialPostsProofPipeline({
      repoRoot,
      truth,
      artifactRootRel,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.campaignSetRenderVersion;
    for (const asset of first.identity.assets) {
      expect(asset.pngRelativePath).toContain(`/v${v1}/`);
    }
    expect(first.identity.captionFileRelativePath).toContain(`/v${v1}/`);
    expect(first.identity.postingOrderRelativePath).toContain(`/v${v1}/`);

    const second = await runSocialPostsProofPipeline({
      repoRoot,
      truth,
      artifactRootRel,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const v2 = second.identity.campaignSetRenderVersion;
    expect(v2).toBe(v1 + 1);
    for (const asset of second.identity.assets) {
      expect(asset.pngRelativePath).toContain(`/v${v2}/`);
    }
    expect(second.identity.captionFileRelativePath).toContain(`/v${v2}/`);
    expect(second.identity.postingOrderRelativePath).toContain(`/v${v2}/`);

    // Prior whole set retained — posts, captions, and order alike.
    for (const asset of first.identity.assets) {
      expect(existsSync(path.join(repoRoot, asset.pngRelativePath))).toBe(true);
    }
    expect(
      existsSync(path.join(repoRoot, first.identity.captionFileRelativePath)),
    ).toBe(true);
    expect(
      existsSync(path.join(repoRoot, first.identity.postingOrderRelativePath)),
    ).toBe(true);
  }, 360_000);

  it("post 3 export failure fails the whole set (PARTIAL_SET_FAILURE)", async () => {
    const truth = buildHarborOakSocialPostsSetTruth({
      repoRoot,
      campaignId: "camp-design-social-posts-proof-partial",
    });
    const result = await runSocialPostsProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}-partial`,
      forceThirdAssetExportFail: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("PARTIAL_SET_FAILURE");
    expect(result.verdict).toBe("SOCIAL_POSTS_RENDERER_PROOF_FAIL");
  }, 240_000);

  it("forced design-QA failure blocks success", async () => {
    const truth = buildHarborOakSocialPostsSetTruth({
      repoRoot,
      campaignId: "camp-design-social-posts-proof-fail-qa",
    });
    const result = await runSocialPostsProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}-fail-qa`,
      forceQaFail: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("QA_FAILURE");
  }, 240_000);

  it("forced set-consistency failure blocks success even when renders exist", async () => {
    const truth = buildHarborOakSocialPostsSetTruth({
      repoRoot,
      campaignId: "camp-design-social-posts-proof-set-fail",
    });
    const result = await runSocialPostsProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}-set-fail`,
      forceSetConsistencyFail: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("SET_CONSISTENCY_FAILURE");
  }, 240_000);

  it("wrong caption binding fails closed through the pipeline", async () => {
    const truth = buildHarborOakSocialPostsSetTruth({
      repoRoot,
      campaignId: "camp-design-social-posts-proof-caption-bind",
    });
    const result = await runSocialPostsProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}-caption-bind`,
      forceCaptionBindFail: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("BINDING_FAILURE");
  }, 240_000);

  it("missing caption fails closed through the pipeline", async () => {
    const truth = buildHarborOakSocialPostsSetTruth({
      repoRoot,
      campaignId: "camp-design-social-posts-proof-caption-missing",
    });
    const result = await runSocialPostsProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}-caption-missing`,
      forceMissingCaption: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("CAPTION_FAILURE");
  }, 240_000);

  it("invented caption price fails closed through the pipeline", async () => {
    const truth = buildHarborOakSocialPostsSetTruth({
      repoRoot,
      campaignId: "camp-design-social-posts-proof-caption-invent",
    });
    const result = await runSocialPostsProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${SOCIAL_POSTS_PROOF_ARTIFACT_ROOT}-caption-invent`,
      forceCaptionInventFail: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("CAPTION_FAILURE");
  }, 240_000);
});

describe("social-posts proof — sealed-lane regression protection", () => {
  it("flyer proof still green", async () => {
    const truth = buildHarborOakFlyerProjectTruth({ repoRoot });
    const result = await runDesignRendererProofPipeline({ repoRoot, truth });
    expect(result.ok).toBe(true);
  }, 120_000);

  it("business-card proof still green", async () => {
    const truth = buildHarborOakBusinessCardProjectTruth({ repoRoot });
    const result = await runBusinessCardProofPipeline({ repoRoot, truth });
    expect(result.ok).toBe(true);
  }, 120_000);

  it("menu proof still green", async () => {
    const truth = buildSaltCedarMenuProjectTruthMax({ repoRoot });
    const result = await runMenuProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: MENU_PROOF_ARTIFACT_ROOT,
    });
    expect(result.ok).toBe(true);
  }, 180_000);

  it("service-sheet proof still green", async () => {
    const truth = buildHarborOakServiceSheetProjectTruthMax({ repoRoot });
    const result = await runServiceSheetProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: SERVICE_SHEET_PROOF_ARTIFACT_ROOT,
    });
    expect(result.ok).toBe(true);
  }, 180_000);

  it("promotion-graphics proof still green", async () => {
    const truth = buildHarborOakPromoCampaignSetTruth({ repoRoot });
    const result = await runPromoProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: PROMO_PROOF_ARTIFACT_ROOT,
    });
    expect(result.ok).toBe(true);
  }, 180_000);
});
