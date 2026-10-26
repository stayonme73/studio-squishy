/**
 * Kayla speaks one checked Squishy desk sentence.
 * Not Jessica. Not kitchen voice. Not Eleven Music.
 */

import { readElevenLabsApiKey } from "@/lib/studio-kitchen-production/voice-production/elevenlabs/config";
import { speakableMoney } from "@/lib/studio-voice-conversation/jessica-speech";

import { stripPrivateDetails } from "./answer";

export const SQUISHY_KAYLA_ID = "aTxZrSrp47xsP6Ot4Kgd";
export const SQUISHY_KAYLA_MODEL = "eleven_multilingual_v2";

export type KaylaSpeech =
  | {
      ok: true;
      audio: Buffer;
      characterCost: number | null;
      latencyMs: number;
      voiceId: typeof SQUISHY_KAYLA_ID;
    }
  | { ok: false; reason: string };

export async function kaylaAudioForDeskSay(
  say: string,
  fetchImpl: typeof fetch = fetch,
): Promise<KaylaSpeech> {
  const text = stripPrivateDetails(say);
  if (!text) return { ok: false, reason: "There is nothing safe to speak." };
  if (text.length > 1200) return { ok: false, reason: "The reply is too long to speak." };
  const apiKey = readElevenLabsApiKey();
  if (!apiKey) return { ok: false, reason: "ElevenLabs is not configured." };
  const started = Date.now();
  let response: Response;
  try {
    response = await fetchImpl(
      `https://api.elevenlabs.io/v1/text-to-speech/${SQUISHY_KAYLA_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: speakableMoney(text),
          model_id: SQUISHY_KAYLA_MODEL,
        }),
      },
    );
  } catch {
    return { ok: false, reason: "ElevenLabs did not respond." };
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !/audio|mpeg|octet-stream/.test(contentType)) {
    return { ok: false, reason: "ElevenLabs did not return audio." };
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.byteLength <= 0) return { ok: false, reason: "ElevenLabs returned empty audio." };
  const costHeader = response.headers.get("character-cost");
  return {
    ok: true,
    audio,
    characterCost: costHeader && Number.isFinite(Number(costHeader)) ? Number(costHeader) : null,
    latencyMs: Date.now() - started,
    voiceId: SQUISHY_KAYLA_ID,
  };
}
