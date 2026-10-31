import { existsSync } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { studioStaticDesignCompositionV1 } from "@/config/studio-static-design-composition-v1";
import { launchDesignRendererChromium } from "@/lib/studio-design-renderer/launch-chromium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Preview-only disposable cert probe — not customer-facing. */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const repoRoot = process.cwd();
  const fontChecks = studioStaticDesignCompositionV1.fonts.faces.map((face) => {
    const rel = path.join(
      studioStaticDesignCompositionV1.fonts.directoryRelative,
      face.fileName,
    );
    const abs = path.join(repoRoot, rel);
    return { rel: rel.replace(/\\/g, "/"), exists: existsSync(abs) };
  });

  let chromium: { ok: boolean; message: string };
  try {
    const browser = await launchDesignRendererChromium();
    await browser.close();
    chromium = { ok: true, message: "launch_and_close_ok" };
  } catch (error) {
    chromium = {
      ok: false,
      message: error instanceof Error ? error.message : "chromium_launch_failed",
    };
  }

  return NextResponse.json({
    at: new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeVersion: process.version,
    repoRoot,
    fonts: fontChecks,
    chromium,
    footageRuntimeProbe: "/api/hosted-cert/footage-runtime-probe",
  });
}
