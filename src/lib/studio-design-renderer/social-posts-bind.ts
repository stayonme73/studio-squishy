/**
 * Four-post set artifact identity — one whole-set version binds all four posts,
 * their captions, and the posting order together.
 */

import { randomUUID } from "crypto";
import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion, sha256Bytes, sha256File } from "./bind";
import { SOCIAL_POSTS_PROOF_PACKAGE_ID } from "./social-posts-fixtures";
import {
  SOCIAL_POSTS_DESIGN_SPEC_VERSION,
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POSTS_RENDERER_VERSION,
  type SocialPostAssetArtifact,
  type SocialPostAssetSpec,
  type SocialPostCaption,
  type SocialPostingOrderEntry,
  type SocialPostsProjectTruth,
  type SocialPostsQuad,
  type SocialPostsSetIdentity,
  type SocialPostsSetSpec,
} from "./social-posts-types";

export function fingerprintSocialPostsSharedSpec(
  spec: SocialPostsSetSpec,
): string {
  return sha256Bytes(
    JSON.stringify({
      specVersion: spec.specVersion,
      skuId: spec.skuId,
      platformLabel: spec.platformLabel,
      colors: spec.colors,
      sharedCampaign: spec.sharedCampaign,
      materials: spec.materials.map((m) => ({
        materialId: m.materialId,
        contentSha256: m.contentSha256,
        relativePath: m.relativePath,
      })),
      assetIds: spec.assets.map((a) => a.assetId),
      orderIndexes: spec.assets.map((a) => a.orderIndex),
    }),
  );
}

export function fingerprintSocialPostAssetSpec(
  asset: SocialPostAssetSpec,
): string {
  return sha256Bytes(JSON.stringify(asset));
}

export function fingerprintSocialPostsMaterials(
  spec: SocialPostsSetSpec,
): string {
  const parts = spec.materials
    .map((m) => `${m.materialId}:${m.contentSha256}`)
    .sort();
  return sha256Bytes(parts.join("|"));
}

export function fingerprintSocialPostCaptions(
  captions: readonly SocialPostCaption[],
): string {
  return sha256Bytes(
    JSON.stringify(
      [...captions]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((c) => ({
          captionId: c.captionId,
          assetId: c.assetId,
          orderIndex: c.orderIndex,
          text: c.text,
        })),
    ),
  );
}

export function fingerprintSocialPostingOrder(
  order: readonly SocialPostingOrderEntry[],
): string {
  return sha256Bytes(
    JSON.stringify(
      [...order]
        .sort((a, b) => a.position - b.position)
        .map((e) => `${e.position}:${e.assetId}:${e.captionId}`),
    ),
  );
}

export function resolveSocialPostsRenderPaths(input: {
  artifactRootRel: string;
  renderVersion: number;
  assetId: string;
}): {
  dirRel: string;
  htmlRel: string;
  pngRel: string;
  pdfRel: string;
  specRel: string;
  captionsRel: string;
  captionsTextRel: string;
  postingOrderRel: string;
  identityRel: string;
  qaRel: string;
} {
  const dirRel = `${input.artifactRootRel}/renders/v${input.renderVersion}`;
  const safe = input.assetId.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return {
    dirRel,
    htmlRel: `${dirRel}/${safe}.html`,
    pngRel: `${dirRel}/${safe}.png`,
    pdfRel: `${dirRel}/${safe}.pdf`,
    specRel: `${dirRel}/campaign-set-design-spec.json`,
    captionsRel: `${dirRel}/captions.json`,
    captionsTextRel: `${dirRel}/captions.txt`,
    postingOrderRel: `${dirRel}/posting-order.json`,
    identityRel: `${dirRel}/artifact-identity.json`,
    qaRel: `${dirRel}/campaign-set.design-qa.json`,
  };
}

export type SocialPostAssetRenderInput = {
  asset: SocialPostAssetSpec;
  html: string;
  pngAbsolutePath: string;
  pdfAbsolutePath: string;
  overflowOk: boolean;
  overflowDetail: string;
  individualQaOk: boolean;
};

export function persistSocialPostsSetArtifacts(input: {
  repoRoot: string;
  truth: SocialPostsProjectTruth;
  spec: SocialPostsSetSpec;
  artifactRootRel: string;
  assetRenders: readonly SocialPostAssetRenderInput[];
  captions: readonly SocialPostCaption[];
  postingOrder: readonly SocialPostingOrderEntry[];
  setQaOk: boolean;
}): SocialPostsSetIdentity {
  if (input.assetRenders.length !== SOCIAL_POSTS_EXACT_COUNT) {
    throw new Error(
      `PARTIAL_SET_FAILURE: persist requires exactly ${SOCIAL_POSTS_EXACT_COUNT} post renders, received ${input.assetRenders.length}`,
    );
  }
  if (input.captions.length !== SOCIAL_POSTS_EXACT_COUNT) {
    throw new Error(
      `CAPTION_FAILURE: persist requires exactly ${SOCIAL_POSTS_EXACT_COUNT} captions, received ${input.captions.length}`,
    );
  }
  if (input.postingOrder.length !== SOCIAL_POSTS_EXACT_COUNT) {
    throw new Error(
      `ORDER_FAILURE: persist requires exactly ${SOCIAL_POSTS_EXACT_COUNT} posting-order entries, received ${input.postingOrder.length}`,
    );
  }

  const captionByAssetId = new Map(
    input.captions.map((c) => [c.assetId, c] as const),
  );
  for (const render of input.assetRenders) {
    if (!captionByAssetId.has(render.asset.assetId)) {
      throw new Error(
        `BINDING_FAILURE: post ${render.asset.assetId} has no caption to persist`,
      );
    }
  }

  const renderVersion = nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const sharedPaths = resolveSocialPostsRenderPaths({
    artifactRootRel: input.artifactRootRel,
    renderVersion,
    assetId: "set",
  });
  const absDir = path.join(input.repoRoot, sharedPaths.dirRel);
  mkdirSync(absDir, { recursive: true });

  writeFileSync(
    path.join(input.repoRoot, sharedPaths.specRel),
    `${JSON.stringify(input.spec, null, 2)}\n`,
    "utf8",
  );

  const orderedRenders = [...input.assetRenders].sort(
    (a, b) => a.asset.orderIndex - b.asset.orderIndex,
  );

  const assets = orderedRenders.map((r) => {
    const paths = resolveSocialPostsRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion,
      assetId: r.asset.assetId,
    });
    writeFileSync(path.join(input.repoRoot, paths.htmlRel), r.html, "utf8");
    copyFileSync(r.pngAbsolutePath, path.join(input.repoRoot, paths.pngRel));
    copyFileSync(r.pdfAbsolutePath, path.join(input.repoRoot, paths.pdfRel));
    const caption = captionByAssetId.get(r.asset.assetId)!;
    const artifact: SocialPostAssetArtifact = {
      assetId: r.asset.assetId,
      orderIndex: r.asset.orderIndex,
      roleAngle: r.asset.roleAngle,
      authorizedPurpose: r.asset.authorizedPurpose,
      captionId: caption.captionId,
      plateId: r.asset.plateId,
      widthPx: r.asset.canvas.widthPx,
      heightPx: r.asset.canvas.heightPx,
      pngRelativePath: paths.pngRel,
      pdfRelativePath: paths.pdfRel,
      htmlRelativePath: paths.htmlRel,
      pngContentSha256: sha256File(path.join(input.repoRoot, paths.pngRel)),
      pdfContentSha256: sha256File(path.join(input.repoRoot, paths.pdfRel)),
      assetSpecFingerprint: fingerprintSocialPostAssetSpec(r.asset),
      overflowOk: r.overflowOk,
      overflowDetail: r.overflowDetail,
      individualQaOk: r.individualQaOk,
    };
    return artifact;
  }) as unknown as SocialPostsQuad<SocialPostAssetArtifact>;

  const captions = [...input.captions].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  ) as unknown as SocialPostsQuad<SocialPostCaption>;
  const postingOrder = [...input.postingOrder].sort(
    (a, b) => a.position - b.position,
  ) as unknown as SocialPostsQuad<SocialPostingOrderEntry>;

  writeFileSync(
    path.join(input.repoRoot, sharedPaths.captionsRel),
    `${JSON.stringify(
      {
        packageId: SOCIAL_POSTS_PROOF_PACKAGE_ID,
        skuId: input.truth.skuId,
        campaignId: input.truth.campaignId,
        campaignSetRenderVersion: renderVersion,
        platformLabel: input.truth.platformLabel,
        captionSource: "studio_written_from_campaign_truth",
        captions,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  writeFileSync(
    path.join(input.repoRoot, sharedPaths.postingOrderRel),
    `${JSON.stringify(
      {
        packageId: SOCIAL_POSTS_PROOF_PACKAGE_ID,
        skuId: input.truth.skuId,
        campaignId: input.truth.campaignId,
        campaignSetRenderVersion: renderVersion,
        platformLabel: input.truth.platformLabel,
        postingOrder,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const captionLines = captions.map(
    (c) => `Post ${c.orderIndex} / ${c.assetId} / ${c.captionId}: ${c.text}`,
  );
  writeFileSync(
    path.join(input.repoRoot, sharedPaths.captionsTextRel),
    `${captionLines.join("\n")}\n`,
    "utf8",
  );

  const identity: SocialPostsSetIdentity = {
    packageId: SOCIAL_POSTS_PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    renderId: randomUUID(),
    campaignSetRenderVersion: renderVersion,
    designSpecVersion: SOCIAL_POSTS_DESIGN_SPEC_VERSION,
    sharedSpecFingerprint: fingerprintSocialPostsSharedSpec(input.spec),
    captionSetFingerprint: fingerprintSocialPostCaptions(captions),
    postingOrderFingerprint: fingerprintSocialPostingOrder(postingOrder),
    materialFingerprint: fingerprintSocialPostsMaterials(input.spec),
    rendererVersion: SOCIAL_POSTS_RENDERER_VERSION,
    platformLabel: input.truth.platformLabel,
    designSpecRelativePath: sharedPaths.specRel,
    captionFileRelativePath: sharedPaths.captionsRel,
    captionTextRelativePath: sharedPaths.captionsTextRel,
    postingOrderRelativePath: sharedPaths.postingOrderRel,
    assets,
    captions,
    postingOrder,
    setQaOk: input.setQaOk,
    createdAt: new Date().toISOString(),
    lineageNote:
      "Social-posts campaign set — one whole-set version binds all four posts, their captions, and the posting order; prior vN retained. Canva unused; Make unused; primaryTool still Canva until a separately authorized dispatch package.",
    dispatchWiringScopeNote: input.truth.dispatchWiringScopeNote,
  };

  writeFileSync(
    path.join(input.repoRoot, sharedPaths.identityRel),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(input.repoRoot, input.artifactRootRel, "current-identity.json"),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );

  return identity;
}
