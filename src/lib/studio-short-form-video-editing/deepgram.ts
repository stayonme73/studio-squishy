/**
 * Deepgram batch listen. Customer audio never trains their models.
 * mip_opt_out is not optional on this lane.
 */

import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import type { SpeechWord } from "./types";

const DG = studioShortFormVideoEditingBuildV1.deepgram;

export type DeepgramListenRequest = {
  url: string;
  query: Record<string, string>;
  headers: Record<string, string>;
};

function deepgramQuery(): Record<string, string> {
  return {
    model: DG.model,
    language: DG.language,
    smart_format: "true",
    punctuate: "true",
    utterances: "true",
    mip_opt_out: "true",
  };
}

export function buildDeepgramListenRequest(input: {
  apiKey: string;
  mediaUrl: string;
  mipOptOut?: boolean;
}): DeepgramListenRequest {
  if (!input.apiKey.trim()) {
    throw new Error("DEEPGRAM_API_KEY required");
  }
  if (input.mipOptOut === false) {
    throw new Error(
      "Deepgram mip_opt_out cannot be disabled for customer footage",
    );
  }

  const query = deepgramQuery();
  return {
    url: `${DG.endpoint}?${new URLSearchParams(query).toString()}`,
    query,
    headers: {
      Authorization: `Token ${input.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
}

export function buildDeepgramFileListenRequest(input: {
  apiKey: string;
  contentType?: string;
  mipOptOut?: boolean;
}): DeepgramListenRequest {
  if (!input.apiKey.trim()) {
    throw new Error("DEEPGRAM_API_KEY required");
  }
  if (input.mipOptOut === false) {
    throw new Error(
      "Deepgram mip_opt_out cannot be disabled for customer footage",
    );
  }
  const query = deepgramQuery();
  return {
    url: `${DG.endpoint}?${new URLSearchParams(query).toString()}`,
    query,
    headers: {
      Authorization: `Token ${input.apiKey}`,
      "Content-Type": input.contentType ?? "video/mp4",
      Accept: "application/json",
    },
  };
}

export function assertDeepgramPrivacyLock(request: DeepgramListenRequest): void {
  if (request.query.mip_opt_out !== "true") {
    throw new Error("Deepgram request missing mip_opt_out=true");
  }
  if (!request.url.includes("mip_opt_out=true")) {
    throw new Error("Deepgram URL missing mip_opt_out=true");
  }
}

type DeepgramWord = {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
};

function asWords(words: DeepgramWord[] | undefined): SpeechWord[] {
  return (words ?? [])
    .filter(
      (w) =>
        typeof w.word === "string" &&
        typeof w.start === "number" &&
        typeof w.end === "number" &&
        w.end > w.start,
    )
    .map((w) => ({
      word: w.word!,
      start: w.start!,
      end: w.end!,
      punctuatedWord: w.punctuated_word,
    }));
}

export function summarizeDeepgramPayload(payload: unknown): {
  topKeys: string[];
  resultKeys: string[];
  transcriptLength: number;
  wordCount: number;
  utteranceCount: number;
  duration?: number;
  requestId?: string;
  error?: string;
} {
  const root = payload as {
    err_code?: string;
    err_msg?: string;
    error?: string;
    metadata?: { duration?: number; request_id?: string };
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string; words?: DeepgramWord[] }>;
      }>;
      utterances?: Array<{ words?: DeepgramWord[] }>;
    };
  };
  const alt = root.results?.channels?.[0]?.alternatives?.[0];
  return {
    topKeys: payload && typeof payload === "object" ? Object.keys(payload) : [],
    resultKeys:
      root.results && typeof root.results === "object"
        ? Object.keys(root.results)
        : [],
    transcriptLength: alt?.transcript?.length ?? 0,
    wordCount: alt?.words?.length ?? 0,
    utteranceCount: root.results?.utterances?.length ?? 0,
    duration: root.metadata?.duration,
    requestId: root.metadata?.request_id,
    error: root.err_msg ?? root.err_code ?? root.error,
  };
}

export function parseDeepgramWords(payload: unknown): SpeechWord[] {
  const root = payload as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{ words?: DeepgramWord[] }>;
      }>;
      utterances?: Array<{ words?: DeepgramWord[] }>;
    };
  };
  const fromAlt = asWords(
    root.results?.channels?.[0]?.alternatives?.[0]?.words,
  );
  if (fromAlt.length) return fromAlt;
  const fromUtterances = (root.results?.utterances ?? []).flatMap((u) =>
    asWords(u.words),
  );
  return fromUtterances;
}

export function readDeepgramApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const key = env[DG.envKey]?.trim();
  return key || null;
}
