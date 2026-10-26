import { NextResponse } from "next/server";

import {
  answerOwnerDeskSquishy,
  type OwnerDeskSquishyTurn,
} from "@/lib/studio-owner-desk-squishy/answer";
import { kaylaAudioForDeskSay } from "@/lib/studio-owner-desk-squishy/kayla-speech";
import { studioVoiceHostMayUseProvider } from "@/lib/studio-voice-conversation/run-turn";

const ALLOWED_FIELDS = new Set(["question", "turns", "folder"]);
const FOLDER_FIELDS = new Set(["campaignName", "title", "squishySays", "whyReached"]);

function asText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function asTurns(value: unknown): OwnerDeskSquishyTurn[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const role = record.role === "squishy" ? "squishy" : record.role === "owner" ? "owner" : null;
    const text = asText(record.text, 400);
    if (!role || !text) return [];
    return [{ role, text }];
  });
}

/**
 * One question about the open desk folder.
 * Local only. Kayla speaks the checked sentence. The folder record is not forwarded.
 */
export async function POST(request: Request) {
  if (!studioVoiceHostMayUseProvider(request.headers.get("host"))) {
    return NextResponse.json({ error: "Desk speech is local only." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  const extra = Object.keys(body).filter((key) => !ALLOWED_FIELDS.has(key));
  if (extra.length > 0) {
    return NextResponse.json(
      { error: "This desk question does not accept a customer record." },
      { status: 400 },
    );
  }
  const folderRecord =
    body.folder && typeof body.folder === "object" && !Array.isArray(body.folder)
      ? (body.folder as Record<string, unknown>)
      : null;
  if (!folderRecord) {
    return NextResponse.json({ error: "The open folder is required." }, { status: 400 });
  }
  const folderExtra = Object.keys(folderRecord).filter((key) => !FOLDER_FIELDS.has(key));
  if (folderExtra.length > 0) {
    return NextResponse.json(
      { error: "This desk question does not accept a customer record." },
      { status: 400 },
    );
  }
  const folder = {
    campaignName: asText(folderRecord.campaignName, 120),
    title: asText(folderRecord.title, 160),
    squishySays: asText(folderRecord.squishySays, 600),
    whyReached: asText(folderRecord.whyReached, 600),
  };
  if (!folder.squishySays) {
    return NextResponse.json({ error: "This folder has no briefing to answer from." }, { status: 400 });
  }
  const answer = answerOwnerDeskSquishy({
    question: asText(body.question, 400),
    turns: asTurns(body.turns),
    folder,
  });
  const speech = await kaylaAudioForDeskSay(answer.say);
  return NextResponse.json({
    say: answer.say,
    intent: answer.intent,
    speech: speech.ok
      ? {
          provider: "elevenlabs",
          voiceId: speech.voiceId,
          characterCost: speech.characterCost,
          latencyMs: speech.latencyMs,
          audioBase64: speech.audio.toString("base64"),
        }
      : { provider: "text_only", reason: speech.reason },
  });
}
