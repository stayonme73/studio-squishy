import { NextResponse } from "next/server";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import { CLIP_CAPTION_PRESENTATION } from "@/lib/studio-clip-repurposing/caption-finish";
import {
  CAPTION_UNIFORM_FIT_PROBE_V1,
  CLIP_CERT_CAPTION_REGRESSION_LINES,
  fitSpeechCaptionsToFrame,
  paintExactTextLine,
  resolveUniformSpeechFontSize,
  speechLineFitsFrame,
} from "@/lib/studio-short-form-video-editing/caption-burn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Preview-only — proves deployed caption uniform fit/paint before hosted clip cert resume. */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stroke = CLIP_CAPTION_PRESENTATION.stroke;
  const paintOptions = {
    bandHeight: CLIP_CAPTION_PRESENTATION.bandHeight,
    background: CLIP_CAPTION_PRESENTATION.background,
  };
  const workDir = mkdtempSync(path.join(tmpdir(), "caption-fit-probe-"));
  const lineResults: Array<{ text: string; ok: boolean; fontSize?: number; detail?: string }> =
    [];

  const combinedCaptions = CLIP_CERT_CAPTION_REGRESSION_LINES.map((text, index) => ({
    start: index * 3,
    end: index * 3 + 3,
    text,
    role: "speech" as const,
  }));
  const combinedResolved = await resolveUniformSpeechFontSize(
    combinedCaptions,
    stroke,
    paintOptions,
  );
  if (!combinedResolved.ok) {
    return NextResponse.json(
      {
        ok: false,
        stamp: CAPTION_UNIFORM_FIT_PROBE_V1,
        stroke,
        combined: { ok: false, detail: combinedResolved.message },
        lines: [],
      },
      { status: 503 },
    );
  }

  for (const text of CLIP_CERT_CAPTION_REGRESSION_LINES) {
    const captions = [{ start: 0, end: 3, text, role: "speech" as const }];
    const resolved = await resolveUniformSpeechFontSize(captions, stroke, paintOptions);
    if (!resolved.ok) {
      lineResults.push({ text, ok: false, detail: resolved.message });
      continue;
    }
    const fontSize = resolved.fontSize;
    const fitted = await fitSpeechCaptionsToFrame(captions, { fontSize, stroke });
    if (!Array.isArray(fitted)) {
      lineResults.push({ text, ok: false, detail: fitted.message });
      continue;
    }
    const parts = fitted.filter((c) => c.role !== "cta");
    let paintOk = true;
    let paintDetail = "";
    for (const [index, caption] of parts.entries()) {
      const fits = await speechLineFitsFrame(caption.text, undefined, fontSize, stroke);
      if (!fits) {
        paintOk = false;
        paintDetail = `fit false at ${fontSize}`;
        break;
      }
      const painted = await paintExactTextLine({
        text: caption.text,
        outputAbsolutePath: path.join(workDir, `${index}.png`),
        width: 1080,
        height: paintOptions.bandHeight,
        fontSize,
        fill: "#ffffff",
        background: paintOptions.background,
        radius: 10,
        stroke,
      });
      if (!painted.ok) {
        paintOk = false;
        paintDetail = painted.message;
        break;
      }
    }
    lineResults.push({
      text,
      ok: paintOk,
      fontSize,
      ...(paintDetail ? { detail: paintDetail } : {}),
    });
  }

  const ok = combinedResolved.ok;
  return NextResponse.json(
    {
      ok,
      stamp: CAPTION_UNIFORM_FIT_PROBE_V1,
      stroke,
      combined: { ok: true, fontSize: combinedResolved.fontSize },
      lines: lineResults,
    },
    { status: ok ? 200 : 503 },
  );
}
