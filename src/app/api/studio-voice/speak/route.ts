import { NextResponse } from "next/server";

import { jessicaAudioForStudioLine } from "@/lib/studio-voice-conversation/jessica-speech";
import { studioVoiceHostMayUseProvider } from "@/lib/studio-voice-conversation/run-turn";

const ALLOWED_FIELDS = new Set(["text"]);

/**
 * Speak one Studio-authored Conversation Room line as Jessica.
 * Localhost only. The API key stays on the server.
 * Checked customer replies are spoken by /api/studio-voice/converse, not by resubmitting them here.
 */
export async function POST(request: Request) {
  if (!studioVoiceHostMayUseProvider(request.headers.get("host"))) {
    return NextResponse.json({ error: "Studio Voice speech is local only." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A line is required." }, { status: 400 });
  }
  const extra = Object.keys(body).filter((key) => !ALLOWED_FIELDS.has(key));
  if (extra.length > 0) {
    return NextResponse.json(
      { error: "This speech request does not accept a customer record." },
      { status: 400 },
    );
  }
  const text = typeof body.text === "string" ? body.text : "";
  const speech = await jessicaAudioForStudioLine(text);
  if (!speech.ok) {
    return NextResponse.json({ error: speech.reason, provider: "browser_fallback" }, { status: 503 });
  }
  return new NextResponse(new Uint8Array(speech.audio), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "X-Studio-Voice-Id": speech.voiceId,
      "X-Studio-Character-Cost": String(speech.characterCost ?? ""),
    },
  });
}
