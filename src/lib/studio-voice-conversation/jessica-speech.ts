/**
 * Studio Voice speech — Jessica only.
 * Isolated from kitchen voice deliverables and Eleven Music.
 * Kayla is not used here.
 */

import { readElevenLabsApiKey } from "@/lib/studio-kitchen-production/voice-production/elevenlabs/config";

import { checkStudioVoiceReply, claimsForApprovedSentence } from "./check-reply";
import { buildStudioVoiceFactsCard } from "./facts-card";
import { containsPersonalData } from "./run-turn";

export const STUDIO_VOICE_JESSICA_ID = "cgSgspJ2msm6clMCkdW9";
export const STUDIO_VOICE_JESSICA_MODEL = "eleven_multilingual_v2";
export const STUDIO_VOICE_JESSICA_OUTPUT = "mp3_44100_128";

/** Starter allowance observed on this account. Not a new purchase. */
export const STUDIO_VOICE_MONTHLY_CREDITS = 40_000;

const SPEAK_LIMIT = 2000;

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;

const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"] as const;

/** Dollars already present in a checked reply, spoken so $199 is not heard as 119. */
export function speakableMoney(text: string): string {
  return text.replace(/\$(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{1,2}))?/g, (_match, whole: string, fraction?: string) => {
    const dollars = Number(whole.replace(/,/g, ""));
    const cents = fraction ? Number(fraction.padEnd(2, "0")) : 0;
    if (!Number.isFinite(dollars) || dollars > 999) return _match;
    const dollarWords = cardWords(dollars);
    const dollarLabel = dollars === 1 ? "dollar" : "dollars";
    if (!cents) return `${dollarWords} ${dollarLabel}`;
    const centWords = cardWords(cents);
    const centLabel = cents === 1 ? "cent" : "cents";
    return `${dollarWords} ${dollarLabel} and ${centWords} ${centLabel}`;
  });
}

function cardWords(value: number): string {
  if (value < 20) return ONES[value] ?? String(value);
  if (value < 100) {
    const ten = Math.floor(value / 10);
    const one = value % 10;
    return one ? `${TENS[ten]}-${ONES[one]}` : TENS[ten];
  }
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const head = `${ONES[hundreds]} hundred`;
  return rest ? `${head} ${cardWords(rest)}` : head;
}

export type JessicaSpeech =
  | {
      ok: true;
      audio: Buffer;
      characterCost: number | null;
      latencyMs: number;
      voiceId: typeof STUDIO_VOICE_JESSICA_ID;
      modelId: typeof STUDIO_VOICE_JESSICA_MODEL;
    }
  | { ok: false; reason: string };

export function estimateStudioVoiceConversationCost(input: {
  replies: number;
  creditsPerReply: number;
  monthlyCredits?: number;
}): { credits: number; shareOfMonthlyAllowance: number } {
  const monthly = input.monthlyCredits ?? STUDIO_VOICE_MONTHLY_CREDITS;
  const credits = Math.max(0, input.replies) * Math.max(0, input.creditsPerReply);
  return {
    credits,
    shareOfMonthlyAllowance: monthly > 0 ? credits / monthly : 0,
  };
}

/**
 * Speak one reply only when it still passes the business-fact checker.
 * The customer question is never sent.
 */
export async function jessicaAudioForCheckedSay(
  say: string,
  fetchImpl: typeof fetch = fetch,
): Promise<JessicaSpeech> {
  const text = say.trim();
  if (!text) return { ok: false, reason: "There is nothing to speak." };
  if (text.length > SPEAK_LIMIT) return { ok: false, reason: "The reply is too long to speak." };
  if (containsPersonalData(text)) {
    return { ok: false, reason: "The reply includes private details and will not be sent." };
  }
  const card = buildStudioVoiceFactsCard();
  const checked = checkStudioVoiceReply(
    { say: text, intent: "answer", claims: claimsForApprovedSentence(text, card) },
    card,
  );
  if (!checked.ok) return { ok: false, reason: "The reply did not pass the Studio fact checker." };
  return speakJessica(checked.draft.say, fetchImpl);
}

/** Studio-authored room line. Not a model reply, so it does not go through the price checker. */
export async function jessicaAudioForStudioLine(
  line: string,
  fetchImpl: typeof fetch = fetch,
): Promise<JessicaSpeech> {
  const text = line.trim();
  if (!text) return { ok: false, reason: "There is nothing to speak." };
  if (text.length > SPEAK_LIMIT) return { ok: false, reason: "The line is too long to speak." };
  if (containsPersonalData(text)) {
    return { ok: false, reason: "The line includes private details and will not be sent." };
  }
  return speakJessica(text, fetchImpl);
}

async function speakJessica(text: string, fetchImpl: typeof fetch): Promise<JessicaSpeech> {
  const apiKey = readElevenLabsApiKey();
  if (!apiKey) return { ok: false, reason: "ElevenLabs is not configured." };
  const started = Date.now();
  let response: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetchImpl(
        `https://api.elevenlabs.io/v1/text-to-speech/${STUDIO_VOICE_JESSICA_ID}?output_format=${STUDIO_VOICE_JESSICA_OUTPUT}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: speakableMoney(text),
            model_id: STUDIO_VOICE_JESSICA_MODEL,
          }),
        },
      );
    } catch {
      return { ok: false, reason: "ElevenLabs did not respond." };
    }
    if (response.ok || (response.status !== 429 && response.status !== 503) || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  if (!response) return { ok: false, reason: "ElevenLabs did not respond." };
  const latencyMs = Date.now() - started;
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !/audio|mpeg|octet-stream/.test(contentType)) {
    await response.arrayBuffer().catch(() => undefined);
    return { ok: false, reason: "ElevenLabs did not return audio." };
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.byteLength <= 0) return { ok: false, reason: "ElevenLabs returned empty audio." };
  const costHeader = response.headers.get("character-cost");
  const characterCost = costHeader && Number.isFinite(Number(costHeader)) ? Number(costHeader) : null;
  return {
    ok: true,
    audio,
    characterCost,
    latencyMs,
    voiceId: STUDIO_VOICE_JESSICA_ID,
    modelId: STUDIO_VOICE_JESSICA_MODEL,
  };
}
