import { spawnSync } from "child_process";
import { existsSync } from "fs";

import {
  SOURCE_AUDIO_CUSTOMER_NOTICE,
  STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
  studioSourceAudioPreflightV1,
} from "@/config/studio-source-audio-preflight-v1";

import {
  classifyClippingMaterial,
  scanSourceClipping,
} from "./clipping-material";
import type {
  SourceAudioGateResult,
  SourceAudioMeasurement,
} from "./types";

function volumeOf(
  abs: string,
  extraAf?: string,
): { meanVolumeDb: number | null; maxVolumeDb: number | null } {
  const af = extraAf ? `${extraAf},volumedetect` : "volumedetect";
  const run = spawnSync(
    "ffmpeg",
    ["-vn", "-i", abs, "-map", "0:a:0", "-af", af, "-f", "null", "-"],
    {
      encoding: "utf8",
    },
  );
  const text = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  const mean = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  const max = text.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
  return {
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
  };
}

export function measureSourceAudio(absolutePath: string): SourceAudioMeasurement {
  const full = volumeOf(absolutePath);
  const hiss = volumeOf(absolutePath, "highpass=f=4000");
  const speechToHissDb =
    full.meanVolumeDb != null && hiss.meanVolumeDb != null
      ? Number((full.meanVolumeDb - hiss.meanVolumeDb).toFixed(1))
      : null;
  return {
    hasAudio: full.meanVolumeDb != null && full.meanVolumeDb > -90,
    meanVolumeDb: full.meanVolumeDb,
    maxVolumeDb: full.maxVolumeDb,
    hissMeanDb: hiss.meanVolumeDb,
    speechToHissDb,
  };
}

export function evaluateSourceAudioGate(input: {
  sourceAbsolutePath: string;
}): SourceAudioGateResult {
  if (!existsSync(input.sourceAbsolutePath)) {
    return {
      packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
      outcome: "REPLACEMENT_REQUIRED",
      measurement: {
        hasAudio: false,
        meanVolumeDb: null,
        maxVolumeDb: null,
        hissMeanDb: null,
        speechToHissDb: null,
      },
      customerNotice: null,
      reason: "No source file is stored. Upload a talking-head recording.",
    };
  }

  let measurement = measureSourceAudio(input.sourceAbsolutePath);
  if (!measurement.hasAudio || (measurement.meanVolumeDb ?? -90) < -45) {
    return {
      packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
      outcome: "REPLACEMENT_REQUIRED",
      measurement,
      customerNotice: null,
      reason:
        "This recording is too quiet or has no usable speech. Please upload a clearer talking-head.",
    };
  }
  if ((measurement.maxVolumeDb ?? -90) >= 0) {
    const scan = scanSourceClipping(input.sourceAbsolutePath);
    if (!scan) {
      return {
        packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
        outcome: "REPLACEMENT_REQUIRED",
        measurement,
        customerNotice: null,
        reason:
          studioSourceAudioPreflightV1.clippingMaterialGate.customerReason,
      };
    }
    const clipping = classifyClippingMaterial(scan);
    const measured: SourceAudioMeasurement = {
      ...measurement,
      clipping: scan,
      clippingKind: clipping.kind,
    };
    if (clipping.material) {
      return {
        packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
        outcome: "REPLACEMENT_REQUIRED",
        measurement: measured,
        customerNotice: null,
        reason:
          studioSourceAudioPreflightV1.clippingMaterialGate.customerReason,
      };
    }
    measurement = measured;
  }
  if ((measurement.speechToHissDb ?? 99) < 8) {
    return {
      packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
      outcome: "REPLACEMENT_REQUIRED",
      measurement,
      customerNotice: null,
      reason:
        "Background noise is as loud as the speech. The Studio cannot produce its minimum standard from this source.",
    };
  }

  const noticeableHiss =
    (measurement.hissMeanDb ?? -90) > -50 ||
    (measurement.speechToHissDb ?? 99) < 20;
  if (noticeableHiss) {
    return {
      packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
      outcome: "NOTICE_AND_CHOICE",
      measurement,
      customerNotice: SOURCE_AUDIO_CUSTOMER_NOTICE,
      reason: "Noticeable background noise is present. The source is still usable.",
    };
  }

  return {
    packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
    outcome: "PASS",
    measurement,
    customerNotice: null,
    reason: "Source audio is acceptable for production.",
  };
}
