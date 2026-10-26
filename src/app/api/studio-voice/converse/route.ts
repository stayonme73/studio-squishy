import { NextResponse } from "next/server";

import { isApprovedStudioVoiceGuide } from "@/lib/studio-voice-conversation/customer-guidance";
import { jessicaAudioForCheckedSay } from "@/lib/studio-voice-conversation/jessica-speech";
import {
  runStudioVoiceTurn,
  studioVoiceHostMayUseProvider,
} from "@/lib/studio-voice-conversation/run-turn";

const ALLOWED_FIELDS = new Set(["question", "turns", "inputMode"]);

/**
 * Session conversation for Studio Voice.
 * Accepts the customer's question and recent checked replies only.
 * A customer record, payment, or project payload is refused.
 * The model is used from localhost during this synthetic test. It is not a public deployment.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  const extra = Object.keys(body).filter((key) => !ALLOWED_FIELDS.has(key));
  if (extra.length > 0) {
    return NextResponse.json(
      { error: "This conversation does not accept a customer record." },
      { status: 400 },
    );
  }

  const question = typeof body.question === "string" ? body.question : "";
  const inputMode = body.inputMode === "voice" ? "voice" : "text";
  const local = studioVoiceHostMayUseProvider(request.headers.get("host"));
  const result = await runStudioVoiceTurn({
    question,
    turns: body.turns,
    inputMode,
    allowProvider: local,
  });

  const speech = local ? await jessicaAudioForCheckedSay(result.say) : null;
  return NextResponse.json({
    say: result.say,
    turns: result.turns,
    guides: result.guides.filter(isApprovedStudioVoiceGuide),
    source: result.source,
    intent: result.intent,
    speech: speech?.ok
      ? {
          provider: "elevenlabs",
          voiceId: speech.voiceId,
          modelId: speech.modelId,
          characterCost: speech.characterCost,
          latencyMs: speech.latencyMs,
          audioBase64: speech.audio.toString("base64"),
        }
      : {
          provider: "browser_fallback",
          reason: speech?.reason ?? "Studio Voice speech is local only.",
        },
  });
}
