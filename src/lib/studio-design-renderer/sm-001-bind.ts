/**
 * sm-001 Launch Set artifact identity — one whole-set version binds all N posts,
 * their captions, the posting order, and the advisory schedule manifest together.
 * The manifest never mutates underneath an already identified set version.
 */

import { randomUUID } from "crypto";
import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion, sha256Bytes, sha256File } from "./bind";
import { fingerprintSm001Calendar } from "./sm-001-calendar";
import { SM_001_PROOF_PACKAGE_ID } from "./sm-001-fixtures";
import {
  SM_001_DESIGN_SPEC_VERSION,
  SM_001_RENDERER_VERSION,
  SM_001_SQUARE_PLATE,
  type Sm001AssetArtifact,
  type Sm001AssetSpec,
  type Sm001CalendarManifest,
  type Sm001Caption,
  type Sm001PostingOrderEntry,
  type Sm001ProjectTruth,
  type Sm001SetIdentity,
  type Sm001SetSpec,
} from "./sm-001-types";

export function fingerprintSm001SharedSpec(spec: Sm001SetSpec): string {
  return sha256Bytes(
    JSON.stringify({
      specVersion: spec.specVersion,
      skuId: spec.skuId,
      plannedPostCount: spec.plannedPostCount,
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
      layoutTemplates: spec.assets.map((a) => a.layoutTemplate),
    }),
  );
}

export function fingerprintSm001AssetSpec(asset: Sm001AssetSpec): string {
  return sha256Bytes(JSON.stringify(asset));
}

export function fingerprintSm001Materials(spec: Sm001SetSpec): string {
  const parts = spec.materials
    .map((m) => `${m.materialId}:${m.contentSha256}`)
    .sort();
  return sha256Bytes(parts.join("|"));
}

export function fingerprintSm001Captions(
  captions: readonly Sm001Caption[],
): string {
  return sha256Bytes(
    JSON.stringify({
      count: captions.length,
      captions: [...captions]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((c) => ({
          captionId: c.captionId,
          assetId: c.assetId,
          orderIndex: c.orderIndex,
          text: c.text,
        })),
    }),
  );
}

export function fingerprintSm001PostingOrder(
  order: readonly Sm001PostingOrderEntry[],
): string {
  return sha256Bytes(
    JSON.stringify({
      count: order.length,
      order: [...order]
        .sort((a, b) => a.position - b.position)
        .map((e) => `${e.position}:${e.assetId}:${e.captionId}`),
    }),
  );
}

export function resolveSm001RenderPaths(input: {
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
  calendarRel: string;
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
    calendarRel: `${dirRel}/calendar-manifest.json`,
    identityRel: `${dirRel}/artifact-identity.json`,
    qaRel: `${dirRel}/campaign-set.design-qa.json`,
  };
}

export type Sm001AssetRenderInput = {
  asset: Sm001AssetSpec;
  html: string;
  pngAbsolutePath: string;
  pdfAbsolutePath: string;
  overflowOk: boolean;
  overflowDetail: string;
  individualQaOk: boolean;
};

export function persistSm001SetArtifacts(input: {
  repoRoot: string;
  truth: Sm001ProjectTruth;
  spec: Sm001SetSpec;
  artifactRootRel: string;
  assetRenders: readonly Sm001AssetRenderInput[];
  captions: readonly Sm001Caption[];
  postingOrder: readonly Sm001PostingOrderEntry[];
  calendar: Sm001CalendarManifest;
  setQaOk: boolean;
}): Sm001SetIdentity {
  const n = input.truth.plannedPostCount;

  if (input.spec.plannedPostCount !== n) {
    throw new Error(
      `COUNT_MISMATCH: spec plannedPostCount ${input.spec.plannedPostCount} does not match locked ${n}`,
    );
  }
  if (input.assetRenders.length !== n) {
    throw new Error(
      `PARTIAL_SET_FAILURE: persist requires exactly ${n} post renders, received ${input.assetRenders.length}`,
    );
  }
  if (input.captions.length !== n) {
    throw new Error(
      `CAPTION_FAILURE: persist requires exactly ${n} captions, received ${input.captions.length}`,
    );
  }
  if (input.postingOrder.length !== n) {
    throw new Error(
      `ORDER_FAILURE: persist requires exactly ${n} posting-order entries, received ${input.postingOrder.length}`,
    );
  }
  if (input.calendar.entries.length !== n) {
    throw new Error(
      `CALENDAR_FAILURE: persist requires exactly ${n} schedule entries, received ${input.calendar.entries.length}`,
    );
  }
  if (input.calendar.plannedPostCount !== n) {
    throw new Error(
      `COUNT_MISMATCH: schedule manifest plannedPostCount ${input.calendar.plannedPostCount} does not match locked ${n}`,
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
  const orderByAssetId = new Map(
    input.postingOrder.map((e) => [e.assetId, e] as const),
  );
  const calendarByAssetId = new Map(
    input.calendar.entries.map((e) => [e.assetId, e] as const),
  );
  for (const render of input.assetRenders) {
    if (!orderByAssetId.has(render.asset.assetId)) {
      throw new Error(
        `ORDER_FAILURE: post ${render.asset.assetId} is missing from the posting order`,
      );
    }
    if (!calendarByAssetId.has(render.asset.assetId)) {
      throw new Error(
        `CALENDAR_FAILURE: post ${render.asset.assetId} has no schedule entry`,
      );
    }
  }

  const renderVersion = nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const sharedPaths = resolveSm001RenderPaths({
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

  const pngByAssetId: Record<string, string> = {};
  const assets: Sm001AssetArtifact[] = orderedRenders.map((r) => {
    const paths = resolveSm001RenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion,
      assetId: r.asset.assetId,
    });
    writeFileSync(path.join(input.repoRoot, paths.htmlRel), r.html, "utf8");
    copyFileSync(r.pngAbsolutePath, path.join(input.repoRoot, paths.pngRel));
    copyFileSync(r.pdfAbsolutePath, path.join(input.repoRoot, paths.pdfRel));
    pngByAssetId[r.asset.assetId] = paths.pngRel;
    const caption = captionByAssetId.get(r.asset.assetId)!;
    return {
      assetId: r.asset.assetId,
      orderIndex: r.asset.orderIndex,
      layoutTemplate: r.asset.layoutTemplate,
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
      assetSpecFingerprint: fingerprintSm001AssetSpec(r.asset),
      overflowOk: r.overflowOk,
      overflowDetail: r.overflowDetail,
      individualQaOk: r.individualQaOk,
    };
  });

  const captions = [...input.captions].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const postingOrder = [...input.postingOrder].sort(
    (a, b) => a.position - b.position,
  );

  /** Whole-set version stamped on the manifest — never a silent in-place edit. */
  const calendar: Sm001CalendarManifest = {
    ...input.calendar,
    campaignSetRenderVersion: renderVersion,
    entries: [...input.calendar.entries]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((entry) => ({
        ...entry,
        setVersion: renderVersion,
        artifactPngRelativePath:
          pngByAssetId[entry.assetId] ?? entry.artifactPngRelativePath,
      })),
  };

  writeFileSync(
    path.join(input.repoRoot, sharedPaths.captionsRel),
    `${JSON.stringify(
      {
        packageId: SM_001_PROOF_PACKAGE_ID,
        skuId: input.truth.skuId,
        campaignId: input.truth.campaignId,
        plannedPostCount: n,
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
        packageId: SM_001_PROOF_PACKAGE_ID,
        skuId: input.truth.skuId,
        campaignId: input.truth.campaignId,
        plannedPostCount: n,
        campaignSetRenderVersion: renderVersion,
        platformLabel: input.truth.platformLabel,
        postingOrder,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  writeFileSync(
    path.join(input.repoRoot, sharedPaths.calendarRel),
    `${JSON.stringify(
      {
        packageId: SM_001_PROOF_PACKAGE_ID,
        skuId: input.truth.skuId,
        campaignId: input.truth.campaignId,
        plannedPostCount: n,
        campaignSetRenderVersion: renderVersion,
        scheduleSource: "studio_advisory_within_campaign_timing_constraints",
        manifest: calendar,
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

  const identity: Sm001SetIdentity = {
    packageId: SM_001_PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    renderId: randomUUID(),
    plannedPostCount: n,
    plannedPostCountSelection: input.truth.plannedPostCountSelection,
    campaignSetRenderVersion: renderVersion,
    designSpecVersion: SM_001_DESIGN_SPEC_VERSION,
    sharedSpecFingerprint: fingerprintSm001SharedSpec(input.spec),
    captionSetFingerprint: fingerprintSm001Captions(captions),
    postingOrderFingerprint: fingerprintSm001PostingOrder(postingOrder),
    calendarFingerprint: fingerprintSm001Calendar(calendar),
    materialFingerprint: fingerprintSm001Materials(input.spec),
    rendererVersion: SM_001_RENDERER_VERSION,
    platformLabel: input.truth.platformLabel,
    designSpecRelativePath: sharedPaths.specRel,
    captionFileRelativePath: sharedPaths.captionsRel,
    captionTextRelativePath: sharedPaths.captionsTextRel,
    postingOrderRelativePath: sharedPaths.postingOrderRel,
    calendarRelativePath: sharedPaths.calendarRel,
    assets,
    captions,
    postingOrder,
    calendar,
    setQaOk: input.setQaOk,
    createdAt: new Date().toISOString(),
    lineageNote:
      "sm-001 Launch Set — one whole-set version binds all plannedPostCount posts, their captions, the posting order, and the advisory schedule manifest; prior vN retained. plannedPostCount was selected before execution and is never reduced to match what passed QA. Canva is not on the fulfillment spine for this SKU; Make unused.",
    proofScopeNote: input.truth.proofScopeNote,
    executablePlate: {
      plateId: SM_001_SQUARE_PLATE.plateId,
      widthPx: SM_001_SQUARE_PLATE.widthPx,
      heightPx: SM_001_SQUARE_PLATE.heightPx,
      note: "Square-only executable plate for this proof. Portrait/TikTok variants are not authorized; the product contract plate remains deferred.",
    },
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
