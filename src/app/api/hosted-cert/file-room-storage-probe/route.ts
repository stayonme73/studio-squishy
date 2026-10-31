import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";
import { resolveSupabaseStorageEnv } from "@/lib/file-storage/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Preview-only — round-trip upload/download via the same File Room adapter as customer proofs. */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const env = resolveSupabaseStorageEnv();
    const adapter = createServerFileRoomStorageAdapter();
    const stamp = new Date().toISOString();
    const body = Buffer.from(`studio-file-room-probe:${stamp}`, "utf8");
    const checksumSha256 = createHash("sha256").update(body).digest("hex");
    const scope = {
      clientId: "hosted-cert-storage-probe",
      campaignId: "hosted-cert-storage-probe",
      jobId: "hosted-cert-storage-probe:probe",
      category: "internal_draft" as const,
    };
    const metadata = {
      filename: "file-room-storage-probe.bin",
      contentType: "application/octet-stream",
      sizeBytes: body.byteLength,
      checksumSha256,
      versionLabel: stamp,
      uploadedAt: stamp,
    };
    const stored = await adapter.uploadObject({ scope, metadata, body });
    const download = await adapter.downloadObject({
      storageRef: {
        provider: "supabase_storage",
        connectionStatus: "private_object",
        bucket: stored.bucket ?? env.supabaseStorageBucket,
        objectPath: stored.objectPath,
        visibilityState: "internal-only",
        originalFilename: metadata.filename,
        contentType: metadata.contentType,
        sizeBytes: metadata.sizeBytes,
        checksumSha256,
        uploadedAt: stamp,
        displayLabel: metadata.filename,
      },
    });
    const chunks: Buffer[] = [];
    if (Buffer.isBuffer(download.body)) {
      chunks.push(download.body);
    } else if (download.body instanceof Uint8Array) {
      chunks.push(Buffer.from(download.body));
    } else {
      for await (const chunk of download.body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
    }
    const roundTrip = Buffer.concat(chunks);
    const roundTripSha = createHash("sha256").update(roundTrip).digest("hex");
    const ok = roundTripSha === checksumSha256;

    return NextResponse.json({
      ok,
      bucket: env.supabaseStorageBucket,
      objectPath: stored.objectPath,
      bytes: roundTrip.byteLength,
      sha256: roundTripSha,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "File Room storage probe failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
