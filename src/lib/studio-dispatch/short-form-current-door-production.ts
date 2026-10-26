/**
 * Produce one current-door Short-Form candidate set.
 * Reuses the existing audio cleanup, transcript, edit, caption burn, cover, and guide.
 * Does not invent a call to action and does not run independent QA.
 */

import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { SOURCE_AUDIO_CUSTOMER_NOTICE } from "@/config/studio-source-audio-preflight-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { studioShortFormCurrentDoorContractV1 } from "@/config/studio-short-form-current-door-contract-v1";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { storageVisibilityStateForCategory } from "@/lib/file-storage/paths";
import { getOrInitializeMaterials, writeMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { certifyCustomerMaterialUpload } from "@/lib/studio-customer-content-intake/certify-upload";
import { planStandaloneSpeechRange } from "@/lib/studio-short-form-content-pack/editorial-completeness";
import { finishFootageAudio } from "@/lib/studio-short-form-video-editing/audio-finish";
import { assembleBurnedShort, exactWords } from "@/lib/studio-short-form-video-editing/caption-burn";
import { buildEditDecisionList, SHORT_FORM_CAPTION_PRESENTATION } from "@/lib/studio-short-form-video-editing/edl";
import { evaluateFootageProbe } from "@/lib/studio-short-form-video-editing/gates";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { probeFootageSource } from "@/lib/studio-short-form-video-editing/probe";
import { transcribeFootageFile } from "@/lib/studio-short-form-video-editing/transcribe";
import {
  attachSourceAudioAcknowledgement,
} from "@/lib/studio-source-audio-preflight/acknowledgement";
import {
  prepareCustomerSourceAudio,
  sourceAudioWorkDirectory,
} from "@/lib/studio-source-audio-preflight/prepare";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";

import { mapFootageEditingJobTruthFromJob } from "./map-footage-editing-job-truth";
import { writeCurrentDoorPresentationFiles } from "./short-form-current-door-packaging";
import { SHORT_FORM_DOOR_PACKAGE_ID } from "./short-form-door-facts";

const CONTRACT = studioShortFormCurrentDoorContractV1;
const SHORT_FORM_SOURCE_FILE = "short-form-production-proof-01.mp4";
const SHORT_FORM_LOCAL_BUCKET = "studio-files-local";

export function buildShortFormCustomerSourceItem(input: {
  campaignId: string;
  rightsSentence: string;
  bytes: Buffer;
  checksumSha256: string;
  objectPath: string;
  evaluatedAt: string;
}):
  | {
      ok: true;
      item: CampaignMaterialItem;
      productionCleared: boolean;
      blockReason: string | null;
    }
  | { ok: false; message: string } {
  const basis = /own/i.test(input.rightsSentence)
    ? "customer_owns"
    : "customer_has_permission";
  const certified = certifyCustomerMaterialUpload({
    category: "photo-video",
    bytes: input.bytes,
    fileName: SHORT_FORM_SOURCE_FILE,
    mimeType: "video/mp4",
    checksumSha256: input.checksumSha256,
    evaluatedAt: input.evaluatedAt,
    rightsInput: { useAuthorizationBasis: basis },
  });
  if (!certified.certification) {
    return {
      ok: false,
      message: certified.ok
        ? "The Studio could not certify this recording."
        : certified.error,
    };
  }
  const certification = certified.certification;
  const item: CampaignMaterialItem = {
    id: "condensed-short-source-1",
    category: "photo-video",
    requirementLevel: "required",
    reviewStatus: "submitted",
    contentKind: "file-metadata",
    label: "Selected clip 1",
    reason: "Short-Form Video Editing",
    relatedServiceIds: [SHORT_FORM_DOOR_PACKAGE_ID],
    uploadStatus: "stored",
    submittedAt: input.evaluatedAt,
    fileName: SHORT_FORM_SOURCE_FILE,
    storageRef: {
      provider: "supabase_storage",
      connectionStatus: "private_object",
      bucket: SHORT_FORM_LOCAL_BUCKET,
      objectPath: input.objectPath,
      visibilityState: storageVisibilityStateForCategory("client_material"),
      originalFilename: SHORT_FORM_SOURCE_FILE,
      contentType: "video/mp4",
      sizeBytes: input.bytes.byteLength,
      checksumSha256: input.checksumSha256,
      uploadedAt: input.evaluatedAt,
    },
    useAuthorization: {
      basis,
      attestedAt: input.evaluatedAt,
      statement: input.rightsSentence,
    },
    contentCertification: certification,
  };
  return {
    ok: true,
    item,
    productionCleared: certification.productionCleared,
    blockReason: certification.productionBlockReason,
  };
}

export type ShortFormCandidateResult =
  | {
      ok: true;
      campaignId: string;
      videoRelativePath: string;
      coverRelativePath: string;
      postCaptionRelativePath: string;
      postingGuideRelativePath: string;
      durationSeconds: number;
      width: number;
      height: number;
      spokenIdea: string;
      cta: "none";
      cleanupPassesAttempted: number;
      cleanupKept: boolean;
    }
  | { ok: false; message: string };

function ffprobeDisplay(absolutePath: string): {
  durationSeconds: number;
  codedWidth: number;
  codedHeight: number;
  rotation: number;
} {
  const json = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:stream_side_data=rotation:format=duration",
      "-of",
      "json",
      absolutePath,
    ],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(json) as {
    streams?: Array<{
      width?: number;
      height?: number;
      side_data_list?: Array<{ rotation?: number }>;
    }>;
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  return {
    durationSeconds: Number(parsed.format?.duration ?? 0),
    codedWidth: Number(stream?.width ?? 0),
    codedHeight: Number(stream?.height ?? 0),
    rotation: Number(stream?.side_data_list?.find((row) => row.rotation != null)?.rotation ?? 0),
  };
}

function bakeDisplayUpright(sourceAbsolutePath: string, destAbsolutePath: string): void {
  mkdirSync(path.dirname(destAbsolutePath), { recursive: true });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      sourceAbsolutePath,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      destAbsolutePath,
    ],
    { stdio: "pipe" },
  );
}

export async function produceShortFormCurrentDoorCandidate(input: {
  repoRoot: string;
  campaignId: string;
  sourceAbsolutePath: string;
}): Promise<ShortFormCandidateResult> {
  applyDotenvLocal(input.repoRoot);
  const envelope = await readCampaignEnvelope(input.campaignId);
  const campaign = envelope?.record;
  if (!campaign) return { ok: false, message: "Paid Short-Form project was not found." };
  if (campaign.condensedOffer?.packageId !== SHORT_FORM_DOOR_PACKAGE_ID) {
    return { ok: false, message: "This project is not the current Short-Form Video Editing order." };
  }
  const answers = campaign.routeMapIntake?.answers;
  const cta = readProjectIntakeAnswer(answers, "cta", SHORT_FORM_DOOR_PACKAGE_ID).trim();
  if (cta) return { ok: false, message: "This run expected a blank call to action." };
  const rights = readProjectIntakeAnswer(answers, "rights", SHORT_FORM_DOOR_PACKAGE_ID);
  if (!/own|permission/i.test(rights)) {
    return { ok: false, message: "Rights acknowledgement is not on the paid project." };
  }

  const display = ffprobeDisplay(input.sourceAbsolutePath);
  if (!Number.isFinite(display.durationSeconds) || display.durationSeconds <= 0) {
    return { ok: false, message: "The recording has no readable duration." };
  }
  if (display.durationSeconds > CONTRACT.sourceMaxSeconds) {
    return {
      ok: false,
      message: `The recording is ${display.durationSeconds.toFixed(2)} seconds. This package accepts up to ${CONTRACT.sourceMaxSeconds} seconds.`,
    };
  }
  if (display.durationSeconds < 8) {
    return { ok: false, message: "The recording is shorter than 8 seconds." };
  }
  const swapped = Math.abs(display.rotation) === 90 || Math.abs(display.rotation) === 270;
  const displayWidth = swapped ? display.codedHeight : display.codedWidth;
  const displayHeight = swapped ? display.codedWidth : display.codedHeight;
  if (displayWidth > displayHeight) {
    return {
      ok: false,
      message: "The recording plays as landscape. This package needs a vertical picture.",
    };
  }

  const workRoot = path.join(
    input.repoRoot,
    "data",
    "campaign-design-artifacts",
    input.campaignId,
    "short-form-candidate",
  );
  mkdirSync(workRoot, { recursive: true });
  const uprightAbs = path.join(workRoot, "source-upright.mp4");
  if (swapped) bakeDisplayUpright(input.sourceAbsolutePath, uprightAbs);
  else copyFileSync(input.sourceAbsolutePath, uprightAbs);

  const probe = probeFootageSource(uprightAbs);
  if ("error" in probe) return { ok: false, message: probe.error };
  const probeGate = evaluateFootageProbe(probe);
  if (probeGate) return { ok: false, message: probeGate.message };
  if (probe.durationSeconds > CONTRACT.sourceMaxSeconds) {
    return { ok: false, message: "The upright recording exceeds 45 seconds." };
  }

  const objectPath = `${input.campaignId}/materials/${SHORT_FORM_SOURCE_FILE}`;
  const storedAbs = path.join(input.repoRoot, "data", "file-room-objects", objectPath);
  mkdirSync(path.dirname(storedAbs), { recursive: true });
  copyFileSync(uprightAbs, storedAbs);
  const bytes = readFileSync(storedAbs);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const now = new Date().toISOString();
  const built = buildShortFormCustomerSourceItem({
    campaignId: input.campaignId,
    rightsSentence: rights,
    bytes,
    checksumSha256: sha256,
    objectPath,
    evaluatedAt: now,
  });
  if (!built.ok) return { ok: false, message: built.message };
  const sourceItem = built.item;

  const materials = await getOrInitializeMaterials(input.campaignId, campaign);
  const items = materials.items.some((item) => item.id === sourceItem.id)
    ? materials.items.map((item) => (item.id === sourceItem.id ? { ...item, ...sourceItem } : item))
    : [...materials.items, sourceItem];
  await writeMaterialsEnvelope({ ...materials, items, syncedAt: now });
  if (!built.productionCleared) {
    return {
      ok: false,
      message:
        built.blockReason ??
        "The Studio needs file-specific rights information before production use.",
    };
  }

  const mapped = mapFootageEditingJobTruthFromJob({
    repoRoot: input.repoRoot,
    campaign,
    materials: items,
  });
  if (!mapped.ok || !mapped.currentDoor) {
    return {
      ok: false,
      message: mapped.ok
        ? "The source did not map as the current Short-Form product."
        : mapped.message,
    };
  }
  if (mapped.currentDoor.cta.treatment !== "none" || mapped.currentDoor.sourceCount !== 1) {
    return { ok: false, message: "The job map did not keep one source and a blank call to action." };
  }

  const acknowledged = attachSourceAudioAcknowledgement({
    campaign,
    skuId: SHORT_FORM_VIDEO_EDITING_SKU,
    outcome: "NOTICE_AND_CHOICE",
    customerNotice: SOURCE_AUDIO_CUSTOMER_NOTICE,
  });
  await upsertCampaignRecord(acknowledged, envelope.clientUserId);

  const prepared = prepareCustomerSourceAudio({
    repoRoot: input.repoRoot,
    sourceAbsolutePath: storedAbs,
    sourceRelativePath: `data/file-room-objects/${objectPath}`,
    acknowledgement: acknowledged.sourceAudioPreflight,
    workDirectory: sourceAudioWorkDirectory(input.repoRoot, input.campaignId),
  });
  if (!prepared.ok) return { ok: false, message: prepared.message };

  const transcript = await transcribeFootageFile({
    apiKey: process.env.DEEPGRAM_API_KEY?.trim() || null,
    absolutePath: prepared.sourceAbsolutePath,
  });
  if (!transcript.ok) return { ok: false, message: transcript.message };
  const spokenAll = transcript.words.map((word) => word.punctuatedWord || word.word).join(" ");
  const latinWords = spokenAll.split(/\s+/).filter((word) => /[A-Za-z]/.test(word));
  if (latinWords.length < 8) {
    return { ok: false, message: "The transcript does not contain enough English speech to edit." };
  }

  const range = planStandaloneSpeechRange({
    words: transcript.words,
    minSeconds: CONTRACT.outputMinSeconds,
    maxSeconds: CONTRACT.outputMaxSeconds,
  });
  if (!range.ok) return { ok: false, message: range.message };

  const edl = buildEditDecisionList({
    words: transcript.words,
    intake: {
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      sourceRelativePath: prepared.sourceRelativePath,
      ctaText: "",
      ctaTreatment: "none",
      rightsCleared: true,
      language: "en",
    },
    sourceDurationSeconds: probe.durationSeconds,
    lockContinuousRange: { start: range.start, end: range.end },
  });
  if (!edl.ok) return { ok: false, message: edl.message };

  const audioFinished = path.join(workRoot, "audio-finished.mp4");
  const finished = finishFootageAudio({
    sourceAbsolutePath: prepared.sourceAbsolutePath,
    outputAbsolutePath: audioFinished,
  });
  if (!finished.ok) return { ok: false, message: finished.message };

  const videoAbs = path.join(workRoot, "production.mp4");
  const burned = await assembleBurnedShort({
    sourceAbsolutePath: audioFinished,
    edl,
    workDirectory: path.join(workRoot, "burn-work"),
    outputAbsolutePath: videoAbs,
    approvedCta: "",
    transcriptWordsInRange: exactWords(edl.clips.map((clip) => clip.text).join(" ")),
    captionBackground: SHORT_FORM_CAPTION_PRESENTATION.background,
    captionStroke: SHORT_FORM_CAPTION_PRESENTATION.stroke,
    captionBottomPx: SHORT_FORM_CAPTION_PRESENTATION.bottomPx,
    captionBandHeight: SHORT_FORM_CAPTION_PRESENTATION.bandHeight,
  });
  if (!burned.ok) return { ok: false, message: burned.message };

  const spokenIdea = range.text.replace(/\s+/g, " ").trim();
  const coverAbs = path.join(workRoot, "cover.png");
  const guideAbs = path.join(workRoot, "use-guide.md");
  const presented = await writeCurrentDoorPresentationFiles({
    spokenIdea,
    ctaText: "",
    clipCount: 1,
    clipId: "clip-1",
    setIndex: 1,
    setCount: 1,
    coverAbsolutePath: coverAbs,
    postCaptionAbsolutePath: path.join(workRoot, "post-caption.txt"),
    guideAbsolutePath: guideAbs,
  });
  if (!presented.ok) return { ok: false, message: presented.message };

  const producedProbe = probeFootageSource(videoAbs);
  if ("error" in producedProbe) return { ok: false, message: producedProbe.error };

  const rel = (abs: string) => path.relative(input.repoRoot, abs).replace(/\\/g, "/");
  writeFileSync(
    path.join(workRoot, "manifest.json"),
    `${JSON.stringify(
      {
        campaignId: input.campaignId,
        packageId: CONTRACT.packageId,
        customerFacingName: CONTRACT.customerFacingName,
        cta: "none",
        sourceCount: 1,
        revisionRounds: CONTRACT.revisionRounds,
        cleanupPassesAttempted: prepared.cleanupPassesAttempted,
        cleanupKept: prepared.cleanupKept,
        spokenIdea,
        durationSeconds: producedProbe.durationSeconds,
        width: producedProbe.width,
        height: producedProbe.height,
        video: rel(videoAbs),
        cover: rel(coverAbs),
        postCaption: rel(path.join(workRoot, "post-caption.txt")),
        postingGuide: rel(guideAbs),
        qa: "not_started",
      },
      null,
      2,
    )}\n`,
  );

  return {
    ok: true,
    campaignId: input.campaignId,
    videoRelativePath: rel(videoAbs),
    coverRelativePath: rel(coverAbs),
    postCaptionRelativePath: rel(path.join(workRoot, "post-caption.txt")),
    postingGuideRelativePath: rel(guideAbs),
    durationSeconds: producedProbe.durationSeconds,
    width: producedProbe.width,
    height: producedProbe.height,
    spokenIdea,
    cta: "none",
    cleanupPassesAttempted: prepared.cleanupPassesAttempted,
    cleanupKept: prepared.cleanupKept,
  };
}
