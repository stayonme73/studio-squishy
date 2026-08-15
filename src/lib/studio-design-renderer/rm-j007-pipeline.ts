/**
 * RM-J007 Reference-Guided Promotion Update composer — PROOF-1.
 * Canva OFF · Owner routine NONE · 1-member recreation package.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";

import { nextRenderVersion, sha256File } from "./bind";
import { persistRmJ007PackageArtifacts } from "./rm-j007-bind";
import { validateRmJ007PackageComposition } from "./rm-j007-contracts";
import { fingerprintRmJ007Package } from "./rm-j007-fingerprint";
import {
  RM_J007_PROOF_ARTIFACT_ROOT,
  RM_J007_PROOF_PACKAGE_ID,
} from "./rm-j007-fixtures";
import { evaluateRmJ007PackageQa } from "./rm-j007-package-qa";
import { buildRmJ007UpdateHtml } from "./rm-j007-render";
import { captureFlyerExports } from "./capture";
import {
  RM_J007_HONESTY_LINE,
  RM_J007_UPDATE_PLATE,
  type RmJ007ArtifactRef,
  type RmJ007MemberResult,
  type RmJ007OutputMode,
  type RmJ007PackageIdentity,
  type RmJ007PackagePipelineResult,
  type RmJ007UpdateProjectTruth,
} from "./rm-j007-types";

function fail(
  mode: RmJ007OutputMode,
  code: Extract<RmJ007PackagePipelineResult, { ok: false }>["failureCode"],
  message: string,
): RmJ007PackagePipelineResult {
  return {
    ok: false,
    verdict: "RM_J007_UPDATE_PROOF_FAIL",
    failureCode: code,
    message,
    outputMode: mode,
  };
}

function readCurrentIdentity(
  repoRoot: string,
  artifactRootRel: string,
): RmJ007PackageIdentity | null {
  const p = path.join(repoRoot, artifactRootRel, "current-identity.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as RmJ007PackageIdentity;
  } catch {
    return null;
  }
}

async function produceUpdatedPromotionMember(input: {
  repoRoot: string;
  truth: RmJ007UpdateProjectTruth;
  memberDirRel: string;
  versionDirRel: string;
}): Promise<
  | { ok: true; member: RmJ007MemberResult }
  | { ok: false; failureCode: string; message: string }
> {
  const { repoRoot, truth, memberDirRel, versionDirRel } = input;
  const planned = truth.plannedMembers[0]!;
  mkdirSync(path.join(repoRoot, memberDirRel), { recursive: true });
  mkdirSync(path.join(repoRoot, versionDirRel), { recursive: true });

  const ref = truth.referenceMaterial;
  if (!ref) {
    return {
      ok: false,
      failureCode: "MISSING_REFERENCE",
      message: "MISSING_REFERENCE: reference required to produce member",
    };
  }
  const refAbs = path.join(repoRoot, ref.relativePath);
  if (!existsSync(refAbs)) {
    return {
      ok: false,
      failureCode: "MISSING_REFERENCE",
      message: `MISSING_REFERENCE: ${ref.relativePath}`,
    };
  }

  // Copy reference into version dir as before.
  const beforeRel = `${versionDirRel}/reference-before.png`;
  const beforeAbs = path.join(repoRoot, beforeRel);
  if (ref.mime === "png" || ref.mime === "jpeg") {
    copyFileSync(refAbs, beforeAbs);
  } else {
    // PDF: keep a stub marker file noting the reference path for the change record.
    writeFileSync(
      beforeAbs.replace(/\.png$/, ".reference-note.txt"),
      `PDF reference at ${ref.relativePath}\n`,
      "utf8",
    );
    // Still write a minimal placeholder PNG for QA path expectations when mime is pdf —
    // prefer copying if a sibling png exists; otherwise fail closed for visual capture path.
    const siblingPng = ref.relativePath.replace(/\.pdf$/i, ".png");
    const siblingAbs = path.join(repoRoot, siblingPng);
    if (existsSync(siblingAbs)) {
      copyFileSync(siblingAbs, beforeAbs);
    } else {
      return {
        ok: false,
        failureCode: "UNSUPPORTED_REFERENCE_MIME",
        message:
          "UNSUPPORTED_REFERENCE_MIME: PDF reference requires an accompanying raster preview for recreation proof",
      };
    }
  }

  const htmlBuilt = buildRmJ007UpdateHtml({ repoRoot, truth });
  if (!htmlBuilt.ok) {
    return {
      ok: false,
      failureCode: "MISSING_REFERENCE",
      message: htmlBuilt.message,
    };
  }

  const htmlRel = `${memberDirRel}/updated-promotion.html`;
  const pngRel = `${memberDirRel}/updated-promotion.png`;
  const pdfRel = `${memberDirRel}/updated-promotion.pdf`;
  const htmlAbs = path.join(repoRoot, htmlRel);
  const pngAbs = path.join(repoRoot, pngRel);
  const pdfAbs = path.join(repoRoot, pdfRel);
  writeFileSync(htmlAbs, htmlBuilt.html, "utf8");

  // Also write after PNG/PDF at version root for visual review convenience.
  const afterPngRel = `${versionDirRel}/after.png`;
  const afterPdfRel = `${versionDirRel}/after.pdf`;
  const afterPngAbs = path.join(repoRoot, afterPngRel);
  const afterPdfAbs = path.join(repoRoot, afterPdfRel);

  let capture;
  try {
    capture = await captureFlyerExports({
      htmlAbsolutePath: htmlAbs,
      pngAbsolutePath: pngAbs,
      pdfAbsolutePath: pdfAbs,
      widthPx: RM_J007_UPDATE_PLATE.widthPx,
      heightPx: RM_J007_UPDATE_PLATE.heightPx,
    });
  } catch (err) {
    return {
      ok: false,
      failureCode: "CAPTURE_FAIL",
      message: `CAPTURE_FAIL: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (!capture.overflowOk) {
    return {
      ok: false,
      failureCode: "CAPTURE_FAIL",
      message: `CAPTURE_FAIL: overflow ${capture.overflowDetail}`,
    };
  }

  copyFileSync(pngAbs, afterPngAbs);
  copyFileSync(pdfAbs, afterPdfAbs);

  const changeRequestRel = `${versionDirRel}/change-request.json`;
  const changeRequest = {
    whatChange: truth.whatChange,
    newInfo: truth.newInfo,
    boundedChanges: truth.boundedChanges,
    itemIdentity: truth.itemIdentity,
    whereLive: truth.whereLive,
    referenceMaterial: {
      materialId: ref.materialId,
      relativePath: ref.relativePath,
      contentSha256: ref.contentSha256,
      mime: ref.mime,
    },
    acceptRecreationLimits: true,
    redesignRequested: false,
    honesty: RM_J007_HONESTY_LINE,
  };
  writeFileSync(
    path.join(repoRoot, changeRequestRel),
    `${JSON.stringify(changeRequest, null, 2)}\n`,
    "utf8",
  );

  const artifacts: RmJ007ArtifactRef[] = [
    {
      role: "update_html",
      relativePath: htmlRel,
      contentSha256: sha256File(htmlAbs),
    },
    {
      role: "update_png",
      relativePath: pngRel,
      contentSha256: sha256File(pngAbs),
    },
    {
      role: "update_pdf",
      relativePath: pdfRel,
      contentSha256: sha256File(pdfAbs),
    },
    {
      role: "after_png",
      relativePath: afterPngRel,
      contentSha256: sha256File(afterPngAbs),
    },
    {
      role: "after_pdf",
      relativePath: afterPdfRel,
      contentSha256: sha256File(afterPdfAbs),
    },
    {
      role: "reference_before_png",
      relativePath: beforeRel,
      contentSha256: sha256File(beforeAbs),
    },
    {
      role: "change_request_json",
      relativePath: changeRequestRel,
      contentSha256: sha256File(path.join(repoRoot, changeRequestRel)),
    },
  ];

  return {
    ok: true,
    member: {
      memberId: planned.memberId,
      kind: planned.kind,
      order: planned.order,
      memberPurpose: planned.memberPurpose,
      agreedPlateId: planned.agreedPlateId,
      producerQaOk: true,
      artifacts,
      plateHonestyNote: RM_J007_HONESTY_LINE,
    },
  };
}

export async function runRmJ007PackageComposerPipeline(input: {
  repoRoot: string;
  truth: RmJ007UpdateProjectTruth;
  artifactRootRel?: string;
  outputMode?: RmJ007OutputMode;
}): Promise<RmJ007PackagePipelineResult> {
  const mode = input.outputMode ?? "proof";
  const artifactRootRel = input.artifactRootRel ?? RM_J007_PROOF_ARTIFACT_ROOT;
  const { truth, repoRoot } = input;

  const composition = validateRmJ007PackageComposition(truth);
  if (!composition.ok) {
    const code = composition.code as Extract<
      RmJ007PackagePipelineResult,
      { ok: false }
    >["failureCode"];
    return fail(mode, code, composition.message);
  }

  const packageFingerprint = fingerprintRmJ007Package(truth);
  const current = readCurrentIdentity(repoRoot, artifactRootRel);
  if (
    current &&
    current.packageFingerprint === packageFingerprint &&
    current.packageQaOk &&
    current.lockedPackageMemberCount === truth.lockedPackageMemberCount &&
    current.itemIdentity === truth.itemIdentity
  ) {
    return {
      ok: true,
      verdict: "ALREADY_RENDERED",
      invocationOutcome: "ALREADY_RENDERED",
      identity: current,
      outputMode: mode,
    };
  }

  const packageRenderVersion = nextRenderVersion(repoRoot, artifactRootRel);
  const versionDirRel = `${artifactRootRel}/renders/v${packageRenderVersion}`;
  mkdirSync(path.join(repoRoot, versionDirRel), { recursive: true });

  const planned = truth.plannedMembers[0]!;
  const memberDirRel = `${versionDirRel}/members/${planned.memberId}`;
  const produced = await produceUpdatedPromotionMember({
    repoRoot,
    truth,
    memberDirRel,
    versionDirRel,
  });
  if (!produced.ok) {
    return fail(
      mode,
      produced.failureCode as Extract<
        RmJ007PackagePipelineResult,
        { ok: false }
      >["failureCode"],
      produced.message,
    );
  }

  const members: RmJ007MemberResult[] = [produced.member];
  const packageQa = evaluateRmJ007PackageQa({
    repoRoot,
    truth,
    members,
    canvaUsed: false,
  });
  if (!packageQa.ok) {
    return fail(mode, "PACKAGE_QA_FAIL", packageQa.message);
  }

  const identity = persistRmJ007PackageArtifacts({
    repoRoot,
    truth,
    artifactRootRel,
    members,
    packageFingerprint,
    packageQaOk: true,
    packageRenderVersion,
  });

  writeFileSync(
    path.join(repoRoot, versionDirRel, "package.design-qa.json"),
    `${JSON.stringify(
      {
        packageId: RM_J007_PROOF_PACKAGE_ID,
        lockedPackageMemberCount: 1,
        packageQaOk: true,
        ownerRoutine: "NONE",
        canvaUsed: false,
        remapAuthorized: true,
        fulfillmentMode: "recreation",
        acceptRecreationLimits: true,
        redesignRequested: false,
        honesty: RM_J007_HONESTY_LINE,
        members: members.map((m) => ({
          memberId: m.memberId,
          producerQaOk: m.producerQaOk,
          artifactCount: m.artifacts.length,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    ok: true,
    verdict: "RM_J007_UPDATE_PROOF_PASS",
    invocationOutcome: "RENDERED",
    identity,
    outputMode: mode,
  };
}

export async function runRmJ007PackageProofPipeline(input: {
  repoRoot: string;
  truth: RmJ007UpdateProjectTruth;
  artifactRootRel?: string;
}): Promise<RmJ007PackagePipelineResult> {
  return runRmJ007PackageComposerPipeline({
    ...input,
    outputMode: "proof",
  });
}
