import { writeFileSync, mkdirSync } from "fs";
import path from "path";

import { persistLandingPageArtifact, assertV1Preserved } from "./bind";
import {
  LANDING_PUBLISH_OWNER_SETUP,
  netlifyCredentialPresence,
  publishLandingPageHtml,
  writePublishBlockerRecord,
} from "./publish";
import { runLandingPageMachineQa } from "./qa";
import { renderLandingPageHtml } from "./render";
import { runResponsiveViewportChecks } from "./responsive";
import type { LandingPageWorkPacket } from "./types";
import { validateLandingPageWorkPacket } from "./validate";

export type LandingPipelineResult = {
  ok: boolean;
  verdict:
    | "LANDING_PAGE_GENERATION_OK"
    | "LANDING_PAGE_PRODUCTION_PARTIAL_PUBLISH_BLOCKER"
    | "LANDING_PAGE_PRODUCTION_PROVEN"
    | "PACKET_INVALID"
    | "QA_FAILED"
    | "RESPONSIVE_FAILED";
  packet: LandingPageWorkPacket;
  artifactRelativePath?: string;
  artifactSha256?: string;
  publicUrl?: string;
  deploymentId?: string;
  publishBlocked?: boolean;
  ownerSetup?: typeof LANDING_PUBLISH_OWNER_SETUP;
  machineQaOk?: boolean;
  responsiveOk?: boolean;
  message?: string;
};

export async function runLandingPageProductionPipeline(input: {
  repoRoot: string;
  packet: LandingPageWorkPacket;
  skipPublishAttempt?: boolean;
  skipResponsive?: boolean;
}): Promise<LandingPipelineResult> {
  const validation = validateLandingPageWorkPacket(
    input.repoRoot,
    input.packet,
  );
  if (!validation.ok) {
    return {
      ok: false,
      verdict: "PACKET_INVALID",
      packet: input.packet,
      message: validation.findings.join("; "),
    };
  }

  if (input.packet.preserveV1RelativePath) {
    const preserved = assertV1Preserved(input.repoRoot, input.packet);
    if (!preserved.ok) {
      return {
        ok: false,
        verdict: "PACKET_INVALID",
        packet: input.packet,
        message: `v1_not_preserved: ${preserved.detail}`,
      };
    }
  }

  const { html, definition } = await renderLandingPageHtml(
    input.repoRoot,
    input.packet,
  );
  const artifact = persistLandingPageArtifact({
    repoRoot: input.repoRoot,
    packet: input.packet,
    definition,
    html,
  });

  const qa = runLandingPageMachineQa({
    repoRoot: input.repoRoot,
    packet: input.packet,
    definition,
    artifact,
    html,
  });
  const qaPath = artifact.relativePath.replace(/\.html$/i, ".machine-qa.json");
  mkdirSync(path.dirname(path.join(input.repoRoot, qaPath)), { recursive: true });
  writeFileSync(
    path.join(input.repoRoot, qaPath),
    `${JSON.stringify(qa, null, 2)}\n`,
  );

  if (!qa.ok) {
    return {
      ok: false,
      verdict: "QA_FAILED",
      packet: input.packet,
      artifactRelativePath: artifact.relativePath,
      artifactSha256: artifact.contentSha256,
      machineQaOk: false,
      message: qa.checks.filter((c) => !c.ok).map((c) => c.id).join(", "),
    };
  }

  let responsiveOk = true;
  if (!input.skipResponsive) {
    const responsive = await runResponsiveViewportChecks({
      repoRoot: input.repoRoot,
      htmlRelativePath: artifact.relativePath,
    });
    const respPath = artifact.relativePath.replace(
      /\.html$/i,
      ".responsive-qa.json",
    );
    writeFileSync(
      path.join(input.repoRoot, respPath),
      `${JSON.stringify(responsive, null, 2)}\n`,
    );
    responsiveOk = responsive.ok;
    if (!responsive.ok) {
      return {
        ok: false,
        verdict: "RESPONSIVE_FAILED",
        packet: input.packet,
        artifactRelativePath: artifact.relativePath,
        artifactSha256: artifact.contentSha256,
        machineQaOk: true,
        responsiveOk: false,
        message: responsive.checks.filter((c) => !c.ok).map((c) => c.id).join(", "),
      };
    }
  }

  if (input.skipPublishAttempt) {
    return {
      ok: true,
      verdict: "LANDING_PAGE_GENERATION_OK",
      packet: input.packet,
      artifactRelativePath: artifact.relativePath,
      artifactSha256: artifact.contentSha256,
      machineQaOk: true,
      responsiveOk,
      publishBlocked: true,
    };
  }

  const publish = await publishLandingPageHtml({
    html,
    deployMessage: `${input.packet.campaignId}-${input.packet.workPacketVersion}`,
    repoRoot: input.repoRoot,
  });

  const publishPath = artifact.relativePath.replace(
    /\.html$/i,
    ".publish.json",
  );
  if (!publish.ok) {
    writePublishBlockerRecord(input.repoRoot, publishPath, publish);
    return {
      ok: true,
      verdict: "LANDING_PAGE_PRODUCTION_PARTIAL_PUBLISH_BLOCKER",
      packet: input.packet,
      artifactRelativePath: artifact.relativePath,
      artifactSha256: artifact.contentSha256,
      machineQaOk: true,
      responsiveOk,
      publishBlocked: true,
      ownerSetup: publish.ownerSetupRequired
        ? LANDING_PUBLISH_OWNER_SETUP
        : undefined,
      message: publish.message,
    };
  }

  writeFileSync(
    path.join(input.repoRoot, publishPath),
    `${JSON.stringify(publish, null, 2)}\n`,
  );

  return {
    ok: true,
    verdict: "LANDING_PAGE_PRODUCTION_PROVEN",
    packet: input.packet,
    artifactRelativePath: artifact.relativePath,
    artifactSha256: artifact.contentSha256,
    publicUrl: publish.publicUrl,
    deploymentId: publish.deploymentId,
    machineQaOk: true,
    responsiveOk,
    publishBlocked: false,
  };
}

export function landingPublishCredentialSnapshot() {
  return netlifyCredentialPresence();
}
