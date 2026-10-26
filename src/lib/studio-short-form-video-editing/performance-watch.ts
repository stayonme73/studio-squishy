/**
 * Performance-aware editorial brain. Watches frames + pauses + spoken times.
 * Does not rewrite speech. Does not iterate the transcript selector.
 */

import { execFileSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { recordAnthropicCall } from "@/lib/studio-project-alpha/cost-telemetry";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

const OFFER = studioShortFormVideoEditingBuildV1.offer;
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export const CHECKPOINT_8_CHERRIES_PLAN = {
  openingSourceSeconds: 83.505,
  exitSourceSeconds: 109.785,
  beats: [
    "My favorite word in English is cherries, which means a small fruit that is delicious.",
    "I hope you enjoyed hearing some words and phrases in my language.",
  ],
  ending: "leftover_lesson_signoff",
} as const;

export type PerformancePause = {
  start: number;
  end: number;
  reason: string;
};

export type PerformanceBeat = {
  start: number;
  end: number;
  text: string;
  reason: string;
};

export type PerformanceWatchPlan =
  | {
      ok: true;
      centralIdea: string;
      openingSourceSeconds: number;
      exitSourceSeconds: number;
      spokenBeats: PerformanceBeat[];
      pausesToKeep: PerformancePause[];
      pausesToRemove: PerformancePause[];
      performanceBeatsToLand: Array<{ at: number; reason: string }>;
      dropSignOff: boolean;
      proposedDurationSeconds: number;
      comparedToCheckpoint8: string;
      materiallyBetterThanSentenceStop: boolean;
      watchedFrameSeconds: number[];
      model: string;
      estimatedUsd: number;
      rawModelText: string;
    }
  | {
      ok: false;
      reason:
        | "KEY_ABSENT"
        | "SOURCE_MISSING"
        | "PROVIDER_REJECTED"
        | "INVALID_PLAN"
        | "NOT_BETTER_THAN_SENTENCE_STOP";
      message: string;
      estimatedUsd: number;
      rawModelText?: string;
    };

export function detectSilencePauses(absolutePath: string): Array<{
  start: number;
  end: number;
}> {
  const run = spawnSync(
    "ffmpeg",
    [
      "-i",
      absolutePath,
      "-af",
      "silencedetect=noise=-35dB:d=0.35",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const text = `${run.stderr ?? ""}\n${run.stdout ?? ""}`;
  const starts = [...text.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) =>
    Number(m[1]),
  );
  const ends = [...text.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) =>
    Number(m[1]),
  );
  const pauses: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < Math.min(starts.length, ends.length); i += 1) {
    const start = starts[i]!;
    const end = ends[i]!;
    if (end > start) pauses.push({ start, end });
  }
  return pauses;
}

export function extractWatchFrames(input: {
  sourceAbsolutePath: string;
  outputDirectory: string;
  seconds: readonly number[];
}): Array<{ at: number; absolutePath: string }> {
  mkdirSync(input.outputDirectory, { recursive: true });
  let duration = Number.POSITIVE_INFINITY;
  try {
    const json = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        input.sourceAbsolutePath,
      ],
      { encoding: "utf8" },
    );
    duration = Number(
      (JSON.parse(json) as { format?: { duration?: string } }).format?.duration,
    );
  } catch {
    /* keep all requested stamps */
  }
  const usable = input.seconds.filter(
    (at) =>
      Number.isFinite(at) &&
      at >= 0 &&
      (!Number.isFinite(duration) || at < duration - 0.08),
  );
  return usable.map((at) => {
    const absolutePath = path.join(
      input.outputDirectory,
      `watch-${at.toFixed(2).replace(".", "_")}.jpg`,
    );
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(at),
        "-i",
        input.sourceAbsolutePath,
        "-frames:v",
        "1",
        "-update",
        "1",
        "-vf",
        "scale=540:-2",
        "-q:v",
        "5",
        absolutePath,
      ],
      { stdio: "pipe" },
    );
    return { at, absolutePath };
  });
}

export function parsePerformanceWatchPlan(
  raw: string,
  watchedFrameSeconds: readonly number[],
  leftoverStart = CHECKPOINT_8_CHERRIES_PLAN.exitSourceSeconds - 2,
): Omit<Extract<PerformanceWatchPlan, { ok: true }>, "model" | "estimatedUsd" | "rawModelText"> | null {
  const fenced = raw.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? raw.trim();
  try {
    const parsed = JSON.parse(candidate) as {
      centralIdea?: unknown;
      openingSourceSeconds?: unknown;
      exitSourceSeconds?: unknown;
      spokenBeats?: unknown;
      pausesToKeep?: unknown;
      pausesToRemove?: unknown;
      performanceBeatsToLand?: unknown;
      dropSignOff?: unknown;
      proposedDurationSeconds?: unknown;
      comparedToCheckpoint8?: unknown;
      materiallyBetterThanSentenceStop?: unknown;
    };
    if (
      typeof parsed.centralIdea !== "string" ||
      typeof parsed.openingSourceSeconds !== "number" ||
      typeof parsed.exitSourceSeconds !== "number" ||
      typeof parsed.proposedDurationSeconds !== "number" ||
      typeof parsed.comparedToCheckpoint8 !== "string" ||
      parsed.dropSignOff !== true ||
      parsed.materiallyBetterThanSentenceStop !== true
    ) {
      return null;
    }
    const opening = parsed.openingSourceSeconds;
    const exit = parsed.exitSourceSeconds;
    if (exit <= opening) return null;
    const duration = Number((exit - opening).toFixed(3));
    if (
      duration < OFFER.outputMinSeconds ||
      duration > OFFER.outputMaxSeconds + 0.25
    ) {
      return null;
    }
    if (exit > leftoverStart) {
      return null;
    }
    const spokenBeats = Array.isArray(parsed.spokenBeats)
      ? parsed.spokenBeats.filter(isBeat)
      : [];
    if (!spokenBeats.length) return null;
    if (
      spokenBeats.some((beat) => /hope you enjoyed/i.test(beat.text))
    ) {
      return null;
    }
    const land = Array.isArray(parsed.performanceBeatsToLand)
      ? parsed.performanceBeatsToLand.filter(isLand)
      : [];
    if (!land.length) return null;
    const cited = land.some((row) =>
      watchedFrameSeconds.some((at) => Math.abs(at - row.at) <= 2.5),
    );
    if (!cited) return null;

    return {
      ok: true,
      centralIdea: parsed.centralIdea,
      openingSourceSeconds: opening,
      exitSourceSeconds: exit,
      spokenBeats,
      pausesToKeep: Array.isArray(parsed.pausesToKeep)
        ? parsed.pausesToKeep.filter(isPause)
        : [],
      pausesToRemove: Array.isArray(parsed.pausesToRemove)
        ? parsed.pausesToRemove.filter(isPause)
        : [],
      performanceBeatsToLand: land,
      dropSignOff: true,
      proposedDurationSeconds: duration,
      comparedToCheckpoint8: parsed.comparedToCheckpoint8,
      materiallyBetterThanSentenceStop: true,
      watchedFrameSeconds: [...watchedFrameSeconds],
    };
  } catch {
    return null;
  }
}

function isBeat(value: unknown): value is PerformanceBeat {
  if (!value || typeof value !== "object") return false;
  const row = value as PerformanceBeat;
  return (
    typeof row.start === "number" &&
    typeof row.end === "number" &&
    typeof row.text === "string" &&
    typeof row.reason === "string" &&
    row.text.trim().length > 0
  );
}

function isPause(value: unknown): value is PerformancePause {
  if (!value || typeof value !== "object") return false;
  const row = value as PerformancePause;
  return (
    typeof row.start === "number" &&
    typeof row.end === "number" &&
    typeof row.reason === "string"
  );
}

function isLand(value: unknown): value is { at: number; reason: string } {
  if (!value || typeof value !== "object") return false;
  const row = value as { at: number; reason: string };
  return typeof row.at === "number" && typeof row.reason === "string";
}

export type SpokenPerformanceMap = {
  idea: string;
  beats: Array<{ start: number; end: number; text: string }>;
  leftover?: { start: number; end: number; text: string };
};

export async function watchPerformanceForEdit(input: {
  sourceAbsolutePath: string;
  frameDirectory: string;
  apiKey?: string | null;
  fetchImpl?: typeof fetch;
  spokenMap?: SpokenPerformanceMap;
}): Promise<PerformanceWatchPlan> {
  const apiKey = input.apiKey?.trim() ?? "";
  if (!apiKey) {
    return {
      ok: false,
      reason: "KEY_ABSENT",
      message: "ANTHROPIC_API_KEY absent. No new vendor was purchased.",
      estimatedUsd: 0,
    };
  }
  if (!existsSync(input.sourceAbsolutePath)) {
    return {
      ok: false,
      reason: "SOURCE_MISSING",
      message: "Performance-watch source missing.",
      estimatedUsd: 0,
    };
  }

  const spoken =
    input.spokenMap ??
    ({
      idea: "favorite English word is cherries",
      beats: [
        {
          start: 83.505,
          end: 90.15,
          text: "My favorite word in English is cherries,",
        },
        {
          start: 93.43,
          end: 100.665,
          text: "which means a small fruit that is delicious.",
        },
      ],
      leftover: {
        start: 102.745,
        end: 109.785,
        text: "I hope you enjoyed hearing some words and phrases in my language.",
      },
    } satisfies SpokenPerformanceMap);
  const ideaStart = spoken.beats[0]?.start ?? 83.5;
  const ideaEnd = spoken.beats[spoken.beats.length - 1]?.end ?? 100.7;
  const leftoverEnd = spoken.leftover?.end ?? ideaEnd + 8;
  const watchSeconds = [
    Number((ideaStart - 1.3).toFixed(1)),
    Number((ideaStart + 1.9).toFixed(1)),
    Number((ideaStart + 5.3).toFixed(1)),
    Number((ideaStart + 6.6).toFixed(1)),
    Number((ideaStart + 8.3).toFixed(1)),
    Number((ideaStart + 10.0).toFixed(1)),
    Number((ideaStart + 12.9).toFixed(1)),
    Number((ideaEnd - 0.5).toFixed(1)),
    Number((ideaEnd + 0.8).toFixed(1)),
    Number(((spoken.leftover?.start ?? leftoverEnd) + 3.4).toFixed(1)),
  ];
  const frames = extractWatchFrames({
    sourceAbsolutePath: input.sourceAbsolutePath,
    outputDirectory: input.frameDirectory,
    seconds: watchSeconds,
  });
  const pauses = detectSilencePauses(input.sourceAbsolutePath).filter(
    (pause) => pause.start >= 78 && pause.end <= 114,
  );

  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const system = `You are a short-form editor watching one talking-head performance.
Use the still frames, detected pauses, and spoken times together. Judge delivery, not only the words.
You may NOT rewrite speech, invent dialogue, invent reaction shots, invent a CTA, invent B-roll, add stock, add music, or invent a hook the speaker never said.
Answer as an editor: where the speaker becomes interesting, where energy is, where to enter, which pause should breathe, where the thought lands, where the short should end, which trailing material weakens the ending, and whether a cut would interrupt emphasis or facial movement.
Return ONLY JSON:
{"centralIdea":"...","openingSourceSeconds":0,"exitSourceSeconds":0,"spokenBeats":[{"start":0,"end":0,"text":"verbatim spoken words only","reason":"why, citing a watched frame time and what the face or pause is doing"}],"pausesToKeep":[{"start":0,"end":0,"reason":"..."}],"pausesToRemove":[{"start":0,"end":0,"reason":"..."}],"performanceBeatsToLand":[{"at":0,"reason":"what you see or hear at a watched frame"}],"dropSignOff":true,"proposedDurationSeconds":0,"comparedToCheckpoint8":"one sentence","materiallyBetterThanSentenceStop":true}
If you cannot see a performance reason in the frames, say so in comparedToCheckpoint8 and set materiallyBetterThanSentenceStop to false.`;

  const userText = [
    `Watched frames (source seconds): ${watchSeconds.join(", ")}`,
    `Detected pauses near the chosen idea: ${JSON.stringify(pauses)}`,
    `Chosen idea: ${spoken.idea}`,
    "Spoken map (do not replace the idea with biography or greeting):",
    ...spoken.beats.map(
      (beat) =>
        `${beat.start.toFixed(3)}-${beat.end.toFixed(3)}: "${beat.text}"`,
    ),
    spoken.leftover
      ? `${spoken.leftover.start.toFixed(3)}-${spoken.leftover.end.toFixed(3)} leftover trailing: "${spoken.leftover.text}"`
      : "No leftover sentence mapped after the idea.",
    "Checkpoint 8 on this source kept the idea plus leftover goodbye as one 18s cut.",
    "Produce a performance-aware plan for this same idea. Duration 15-30s. Cite watched frame times.",
  ].join("\n");

  const content: Array<Record<string, unknown>> = frames.flatMap((frame) => [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: readFileSync(frame.absolutePath).toString("base64"),
      },
    },
    {
      type: "text",
      text: `Frame at ${frame.at.toFixed(1)}s`,
    },
  ]);
  content.push({ type: "text", text: userText });

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2200,
      temperature: 0,
      system,
      messages: [{ role: "user", content }],
    }),
  });
  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  const record = recordAnthropicCall({
    model,
    purpose: "creative_reasoning",
    httpStatus: response.status,
    usage: data.usage,
  });
  if (!response.ok) {
    return {
      ok: false,
      reason: "PROVIDER_REJECTED",
      message: `Performance-watch model HTTP ${response.status}`,
      estimatedUsd: record.costUsd,
      rawModelText: JSON.stringify(data).slice(0, 2000),
    };
  }
  const text = data.content?.find((row) => row.type === "text")?.text ?? "";
  const leftoverStart =
    spoken.leftover?.start ?? CHECKPOINT_8_CHERRIES_PLAN.exitSourceSeconds - 2;
  const plan = parsePerformanceWatchPlan(text, watchSeconds, leftoverStart);
  if (!plan) {
    return {
      ok: false,
      reason: "NOT_BETTER_THAN_SENTENCE_STOP",
      message:
        "Existing multimodal model did not return a performance ending better than Checkpoint 8's leftover goodbye.",
      estimatedUsd: record.costUsd,
      rawModelText: text,
    };
  }
  return {
    ...plan,
    model,
    estimatedUsd: record.costUsd,
    rawModelText: text,
  };
}

export function writePerformanceWatchProof(input: {
  repoRoot: string;
  plan: PerformanceWatchPlan;
}): string {
  const rel =
    "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/performance-watch-plan.json";
  const abs = path.join(input.repoRoot, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(input.plan, null, 2)}\n`);
  return rel;
}
