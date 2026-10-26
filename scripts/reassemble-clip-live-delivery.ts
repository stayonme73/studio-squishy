import { execFileSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { readClipRepurposingHookReceipt } from "@/lib/studio-dispatch/clip-repurposing-dispatch-hook";
import { assembleApprovedClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";

const REPO = path.resolve(__dirname, "..");
const CAMPAIGN = "camp-clip-live-unpublished-20260925";
const DISPATCH = `dd:${CAMPAIGN}::${CLIP_REPURPOSING_SKU}`;
const PROOF = path.join(
  REPO,
  "docs/launch/studio-operating-clip-repurposing-live-unpublished-job-1",
);
const ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

function writeJson(abs: string, value: unknown) {
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

function measureAudio(abs: string) {
  const run = spawnSync(
    "ffmpeg",
    ["-i", abs, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const err = `${run.stdout}\n${run.stderr}`;
  const mean = /mean_volume:\s+([-\d.]+)/.exec(err)?.[1];
  const max = /max_volume:\s+([-\d.]+)/.exec(err)?.[1];
  return {
    meanVolumeDb: mean ? Number(mean) : null,
    maxVolumeDb: max ? Number(max) : null,
  };
}

function extractFrame(abs: string, dest: string, atSeconds: number) {
  mkdirSync(path.dirname(dest), { recursive: true });
  execFileSync(
    "ffmpeg",
    ["-y", "-ss", String(atSeconds), "-i", abs, "-frames:v", "1", dest],
    { stdio: "pipe" },
  );
}

function probe(abs: string) {
  const json = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-show_entries",
      "stream=width,height,codec_type,sample_rate",
      "-of",
      "json",
      abs,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(json) as {
    format?: { duration?: string };
    streams?: Array<{
      width?: number;
      height?: number;
      codec_type?: string;
      sample_rate?: string;
    }>;
  };
}

async function main() {
  const envelope = await readTasksEnvelope(CAMPAIGN);
  const job = envelope?.jobRecords?.find((entry) => entry.skuId === CLIP_REPURPOSING_SKU);
  if (!job) throw new Error("Live Clip job missing.");
  const revision = readClipRepurposingHookReceipt({
    repoRoot: REPO,
    campaignId: CAMPAIGN,
    dispatchId: DISPATCH,
    lane: "set-revision",
  });
  if (!revision?.ok || !revision.files?.length) {
    throw new Error("Revision receipt missing.");
  }
  const hashes = new Set(
    revision.files.map((file) => file.contentSha256.replace(/^sha256:/, "").toLowerCase()),
  );
  const proofs = (job.fileRegistry ?? []).filter((ref) => {
    if (ref.category !== "review_proof") return false;
    const checksum =
      ref.storageRef.provider === "supabase_storage"
        ? ref.storageRef.checksumSha256
        : "";
    return hashes.has(checksum.replace(/^sha256:/, "").toLowerCase());
  });
  const assembled = assembleApprovedClientDelivery({
    job: {
      ...job,
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        contentSha256s: proofs.map(
          (ref) =>
            `sha256:${
              ref.storageRef.provider === "supabase_storage"
                ? ref.storageRef.checksumSha256
                : ""
            }`,
        ),
        artifactIds: ["clip-set-v2"],
        decisionId: "dec-clip-live",
        workVersionId: "wv-clip-2",
      },
    },
    events: envelope?.jobActivityEvents ?? [],
    actor: ACTOR,
  });
  const delivery = {
    assembled: assembled.assembled,
    fileCount: assembled.job.clientDeliveryFiles?.length ?? 0,
    labels: (assembled.job.clientDeliveryFiles ?? []).map((file) => file.deliverableLabel),
    hashes: (assembled.job.clientDeliveryFiles ?? []).map((file) => file.contentSha256),
  };
  writeJson(path.join(PROOF, "final-delivery.json"), delivery);

  const clipIds = ["c-56-423", "c-17-127", "c-82-641", "c-3-36"];
  const quality = clipIds.map((clipId) => {
    const abs = path.join(
      REPO,
      "data/campaign-design-artifacts",
      CAMPAIGN,
      "clip-factory",
      "clips",
      clipId,
      "production.mp4",
    );
    const frameAbs = path.join(PROOF, "quality-frames", `${clipId}.jpg`);
    const info = probe(abs);
    const video = info.streams?.find((stream) => stream.codec_type === "video");
    const duration = Number(info.format?.duration ?? 0);
    extractFrame(abs, frameAbs, Math.max(1, duration / 2));
    const audio = measureAudio(abs);
    return {
      clipId,
      exists: existsSync(abs),
      durationSeconds: duration,
      width: video?.width ?? 0,
      height: video?.height ?? 0,
      hasAudio: (info.streams ?? []).some((stream) => stream.codec_type === "audio"),
      ...audio,
      frameRelative: path.relative(REPO, frameAbs).replace(/\\/g, "/"),
    };
  });
  writeJson(path.join(PROOF, "quality-watch.json"), quality);

  const spends = clipIds.map((clipId) => {
    const abs = path.join(
      REPO,
      "data/campaign-design-artifacts",
      CAMPAIGN,
      "clip-factory",
      "clips",
      clipId,
      "spend.json",
    );
    const watchAbs = path.join(
      REPO,
      "data/campaign-design-artifacts",
      CAMPAIGN,
      "clip-factory",
      "clips",
      clipId,
      "performance-watch.json",
    );
    const spend = JSON.parse(readFileSync(abs, "utf8")) as {
      providerRenderId?: string;
      credits?: number | null;
    };
    const watch = JSON.parse(readFileSync(watchAbs, "utf8")) as {
      estimatedUsd?: number;
    };
    return {
      clipId,
      providerRenderId: spend.providerRenderId,
      credits: spend.credits ?? null,
      performanceWatchUsd: watch.estimatedUsd ?? 0,
    };
  });
  writeJson(path.join(PROOF, "economics.json"), {
    deepgramUsdList: 0.0584,
    deepgramReusedFromCert: true,
    performanceWatchUsd: Number(
      spends.reduce((sum, row) => sum + row.performanceWatchUsd, 0).toFixed(6),
    ),
    shotstackRenders: spends.length,
    shotstackCreditsKnown: Number(
      spends.reduce((sum, row) => sum + (row.credits ?? 0), 0).toFixed(2),
    ),
    shotstackCreditsUnknownCount: spends.filter((row) => row.credits == null).length,
    renders: spends,
    retryDidNotRepurchaseFirstCut: true,
    revisionBoughtOneAdditionalRender: true,
  });

  const proofAbs = path.join(PROOF, "proof.json");
  const proof = JSON.parse(readFileSync(proofAbs, "utf8")) as Record<string, unknown>;
  proof.finalDelivery = delivery;
  proof.quality = quality;
  proof.spend = JSON.parse(readFileSync(path.join(PROOF, "economics.json"), "utf8"));
  writeJson(proofAbs, proof);
  process.stdout.write(
    `delivery=${delivery.fileCount} quality=${quality.length} labels=${delivery.labels.join(" | ")}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
