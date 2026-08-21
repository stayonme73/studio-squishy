/**
 * End-to-end Shotstack integration pipeline for a single work packet.
 * Does not auto-resubmit renders in a credit-burning loop.
 */

import { randomUUID } from "crypto";

import {
  bindShotstackArtifact,
  writeArtifactBindingManifest,
  writeRenderJobManifest,
} from "./bind";
import {
  shotstackDownloadMp4,
  shotstackPollUntilDone,
  shotstackSubmitRender,
} from "./client";
import { readShotstackApiKey } from "./config";
import { deliverPacketAssets } from "./media-ingest";
import { buildShotstackEditPayload, hashShotstackRequest } from "./payload";
import type {
  ShotstackFetch,
  ShotstackOutputArtifactRecord,
  ShotstackRenderJobRecord,
  ShotstackWorkPacket,
} from "./types";
import {
  assertShotstackPacketAssetsExist,
  gateShotstackWorkPacket,
} from "./work-packet";

export type ShotstackPipelineResult =
  | {
      ok: true;
      verdict: "SHOTSTACK_INTEGRATION_STEP_OK";
      job: ShotstackRenderJobRecord;
      artifact: ShotstackOutputArtifactRecord;
      jobManifestRel: string;
      artifactManifestRel: string;
    }
  | {
      ok: false;
      verdict:
        | "CREDENTIALS_BLOCKED"
        | "PACKET_INVALID"
        | "INGEST_FAILED"
        | "SUBMIT_FAILED"
        | "RENDER_FAILED"
        | "DOWNLOAD_FAILED"
        | "BIND_FAILED";
      message: string;
      job?: Partial<ShotstackRenderJobRecord>;
    };

export async function runShotstackWorkPacketPipeline(input: {
  repoRoot: string;
  packet: ShotstackWorkPacket;
  apiKey?: string;
  fetchImpl?: ShotstackFetch;
  envName?: "stage" | "v1";
  /** Injected asset URLs skip ingest (tests). */
  assetUrlsOverride?: Map<string, string>;
  sourceHashesOverride?: Record<string, string>;
  pollMaxAttempts?: number;
  pollDelayMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}): Promise<ShotstackPipelineResult> {
  const envName =
    input.envName ?? input.packet.requiredShotstackEnv ?? undefined;
  const apiKey =
    input.apiKey ??
    readShotstackApiKey(
      process.env,
      envName ?? undefined,
    );
  if (!apiKey && !input.assetUrlsOverride) {
    return {
      ok: false,
      verdict: "CREDENTIALS_BLOCKED",
      message:
        (envName ?? "stage") === "v1"
          ? "SHOTSTACK_PRODUCTION_API_KEY missing for Production (v1). Owner must add Production key to .env.local — do not paste into chat. Do not purchase unless separately authorized."
          : "SHOTSTACK_API_KEY missing. Owner must add stage key to .env.local — do not paste into chat.",
    };
  }

  const gate = gateShotstackWorkPacket(input.packet);
  if (!gate.ok) {
    return {
      ok: false,
      verdict: "PACKET_INVALID",
      message: gate.findings.join("; "),
    };
  }

  const assets = assertShotstackPacketAssetsExist(input.repoRoot, input.packet);
  if (!assets.ok) {
    return {
      ok: false,
      verdict: "PACKET_INVALID",
      message: `Missing assets: ${assets.missing.join(", ")}`,
    };
  }

  let assetUrls = input.assetUrlsOverride;
  let sourceAssetHashes = input.sourceHashesOverride ?? {};

  if (!assetUrls) {
    const delivered = await deliverPacketAssets({
      repoRoot: input.repoRoot,
      packet: input.packet,
      apiKey,
      fetchImpl: input.fetchImpl,
      envName,
    });
    if (!delivered.ok) {
      return {
        ok: false,
        verdict:
          delivered.code === "credentials_absent"
            ? "CREDENTIALS_BLOCKED"
            : "INGEST_FAILED",
        message: delivered.message,
      };
    }
    assetUrls = delivered.assetUrls as Map<string, string>;
    sourceAssetHashes = delivered.sourceAssetHashes;
  }

  const built = buildShotstackEditPayload(input.packet, assetUrls);
  if (!built.ok) {
    return {
      ok: false,
      verdict: "PACKET_INVALID",
      message: built.findings.join("; "),
    };
  }

  const requestHash = hashShotstackRequest(built.payload);
  const submittedAt = new Date().toISOString();
  const jobId = randomUUID();

  const submit = await shotstackSubmitRender(built.payload, {
    apiKey,
    fetchImpl: input.fetchImpl,
    envName,
  });

  if (!submit.ok) {
    return {
      ok: false,
      verdict:
        submit.code === "credentials_absent"
          ? "CREDENTIALS_BLOCKED"
          : "SUBMIT_FAILED",
      message: submit.message,
      job: {
        jobId,
        provider: "shotstack",
        status: "failed",
        submittedAt,
        failureCode: submit.code,
        failureMessage: submit.message,
        requestHash,
      },
    };
  }

  const poll = await shotstackPollUntilDone(submit.providerRenderId, {
    apiKey,
    fetchImpl: input.fetchImpl,
    envName,
    maxAttempts: input.pollMaxAttempts,
    delayMs: input.pollDelayMs,
    sleepFn: input.sleepFn,
  });

  if (!poll.ok) {
    return {
      ok: false,
      verdict: "RENDER_FAILED",
      message: poll.message,
    };
  }

  if (poll.status === "timed_out") {
    const job: ShotstackRenderJobRecord = baseJob({
      jobId,
      packet: input.packet,
      providerRenderId: submit.providerRenderId,
      requestHash,
      submittedAt,
      status: "timed_out",
      sourceAssetHashes,
      failureCode: "timed_out",
      failureMessage: poll.error,
    });
    writeRenderJobManifest(input.repoRoot, job, input.packet.exportRelativePath);
    return { ok: false, verdict: "RENDER_FAILED", message: poll.error ?? "timed_out", job };
  }

  if (poll.status === "failed" || !poll.outputUrl) {
    const job: ShotstackRenderJobRecord = baseJob({
      jobId,
      packet: input.packet,
      providerRenderId: submit.providerRenderId,
      requestHash,
      submittedAt,
      status: "failed",
      sourceAssetHashes,
      failureCode: "render_failed",
      failureMessage: poll.error ?? "Render failed without output URL",
      credits: poll.credits,
      completedAt: poll.completedAt,
    });
    writeRenderJobManifest(input.repoRoot, job, input.packet.exportRelativePath);
    return {
      ok: false,
      verdict: "RENDER_FAILED",
      message: job.failureMessage ?? "render_failed",
      job,
    };
  }

  const download = await shotstackDownloadMp4(poll.outputUrl, {
    fetchImpl: input.fetchImpl,
  });
  if (!download.ok) {
    const job: ShotstackRenderJobRecord = baseJob({
      jobId,
      packet: input.packet,
      providerRenderId: submit.providerRenderId,
      requestHash,
      submittedAt,
      status: "download_failed",
      sourceAssetHashes,
      outputUrl: poll.outputUrl,
      failureCode: download.code,
      failureMessage: download.message,
      credits: poll.credits,
      completedAt: poll.completedAt,
    });
    writeRenderJobManifest(input.repoRoot, job, input.packet.exportRelativePath);
    return {
      ok: false,
      verdict: "DOWNLOAD_FAILED",
      message: download.message,
      job,
    };
  }

  const job: ShotstackRenderJobRecord = baseJob({
    jobId,
    packet: input.packet,
    providerRenderId: submit.providerRenderId,
    requestHash,
    submittedAt,
    status: "done",
    sourceAssetHashes,
    outputUrl: poll.outputUrl,
    credits: poll.credits,
    completedAt: poll.completedAt ?? new Date().toISOString(),
  });

  const bound = bindShotstackArtifact({
    repoRoot: input.repoRoot,
    packet: input.packet,
    job,
    bytes: download.bytes,
  });
  if (!bound.ok) {
    writeRenderJobManifest(input.repoRoot, job, input.packet.exportRelativePath);
    return {
      ok: false,
      verdict: "BIND_FAILED",
      message: `${bound.error}: ${bound.findings.join("; ")}`,
      job,
    };
  }

  const jobManifestRel = writeRenderJobManifest(
    input.repoRoot,
    job,
    input.packet.exportRelativePath,
  );
  const artifactManifestRel = writeArtifactBindingManifest(
    input.repoRoot,
    bound.artifact,
  );

  return {
    ok: true,
    verdict: "SHOTSTACK_INTEGRATION_STEP_OK",
    job,
    artifact: bound.artifact,
    jobManifestRel,
    artifactManifestRel,
  };
}

function baseJob(input: {
  jobId: string;
  packet: ShotstackWorkPacket;
  providerRenderId: string;
  requestHash: string;
  submittedAt: string;
  status: ShotstackRenderJobRecord["status"];
  sourceAssetHashes: Record<string, string>;
  outputUrl?: string;
  failureCode?: string;
  failureMessage?: string;
  credits?: number;
  completedAt?: string;
}): ShotstackRenderJobRecord {
  return {
    jobId: input.jobId,
    provider: "shotstack",
    providerRenderId: input.providerRenderId,
    campaignId: input.packet.campaignId,
    skuId: input.packet.skuId,
    workPacketId: input.packet.workPacketId,
    workPacketVersion: input.packet.workPacketVersion,
    storyboardVersion: input.packet.storyboardVersion,
    scriptVersionId: input.packet.scriptVersionId,
    status: input.status,
    submittedAt: input.submittedAt,
    completedAt: input.completedAt,
    failureCode: input.failureCode,
    failureMessage: input.failureMessage,
    requestHash: input.requestHash,
    outputUrl: input.outputUrl,
    retryCount: 0,
    requestedWidth: input.packet.width,
    requestedHeight: input.packet.height,
    requestedAspect: "9:16",
    requestedDurationTargetSeconds: input.packet.durationTargetSeconds,
    outputFormat: "mp4",
    sourceAssetPaths: [
      ...input.packet.scenes.flatMap((s) =>
        s.overlayRelativePath
          ? [s.relativePath, s.overlayRelativePath]
          : [s.relativePath],
      ),
      input.packet.voiceArtifact.relativePath,
    ],
    sourceAssetHashes: input.sourceAssetHashes,
    voiceArtifactPath: input.packet.voiceArtifact.relativePath,
    voiceArtifactSha256: input.packet.voiceArtifact.contentSha256,
    credits: input.credits,
  };
}
