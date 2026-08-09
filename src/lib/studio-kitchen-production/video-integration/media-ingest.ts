/**
 * Deliver Studio-local fixture assets to Shotstack via Ingest signed upload.
 * Avoids permanent public customer hosting. Fixture paths only.
 *
 * Flow (first-party docs):
 * POST /ingest/{env}/upload → signed URL + source id
 * PUT file bytes to signed URL
 * GET /ingest/{env}/sources/{id} until status=ready → source URL for Edit API
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import {
  readShotstackApiKey,
  readShotstackEnv,
  shotstackIngestBaseUrl,
} from "./config";
import type {
  AssetUrlMap,
  ShotstackFetch,
  ShotstackIngestUploadResult,
  ShotstackWorkPacket,
} from "./types";

function contentTypeForPath(rel: string): string {
  const lower = rel.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sha256FileAbs(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

export async function shotstackUploadLocalFile(input: {
  absolutePath: string;
  apiKey?: string;
  fetchImpl?: ShotstackFetch;
  envName?: "stage" | "v1";
  pollAttempts?: number;
  pollDelayMs?: number;
}): Promise<ShotstackIngestUploadResult> {
  const envName = input.envName ?? readShotstackEnv();
  const apiKey = input.apiKey ?? readShotstackApiKey(process.env, envName);
  if (!apiKey) {
    return {
      ok: false,
      code: "credentials_absent",
      message: "SHOTSTACK_API_KEY absent for ingest upload",
    };
  }
  if (!existsSync(input.absolutePath)) {
    return {
      ok: false,
      code: "ingest_failed",
      message: `Local file missing: ${input.absolutePath}`,
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const ingestBase = shotstackIngestBaseUrl(envName);
  const bytes = readFileSync(input.absolutePath);
  const contentType = contentTypeForPath(input.absolutePath);

  try {
    const initRes = await fetchImpl(`${ingestBase}/upload`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });
    if (!initRes.ok) {
      return {
        ok: false,
        code: "ingest_failed",
        message: `Ingest upload init HTTP ${initRes.status}`,
      };
    }
    const initJson = (await initRes.json()) as {
      data?: { id?: string; attributes?: { id?: string; url?: string } };
    };
    const sourceId = initJson.data?.id ?? initJson.data?.attributes?.id;
    const signedUrl = initJson.data?.attributes?.url;
    if (!sourceId || !signedUrl) {
      return {
        ok: false,
        code: "ingest_failed",
        message: "Ingest upload init missing id/url",
      };
    }

    const putRes = await fetchImpl(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: bytes,
    });
    if (!putRes.ok) {
      return {
        ok: false,
        code: "ingest_failed",
        message: `Signed PUT failed HTTP ${putRes.status}`,
      };
    }

    const pollAttempts = input.pollAttempts ?? 30;
    const pollDelayMs = input.pollDelayMs ?? 2000;
    for (let i = 0; i < pollAttempts; i++) {
      await sleep(pollDelayMs);
      const statusRes = await fetchImpl(
        `${ingestBase}/sources/${encodeURIComponent(sourceId)}`,
        { headers: { "x-api-key": apiKey, Accept: "application/json" } },
      );
      if (!statusRes.ok) continue;
      const statusJson = (await statusRes.json()) as {
        data?: {
          attributes?: { status?: string; source?: string; url?: string };
        };
      };
      const status = statusJson.data?.attributes?.status;
      const sourceUrl =
        statusJson.data?.attributes?.source ?? statusJson.data?.attributes?.url;
      if (status === "ready" && sourceUrl) {
        return { ok: true, sourceId, sourceUrl };
      }
      if (status === "failed") {
        return {
          ok: false,
          code: "ingest_failed",
          message: `Ingest source ${sourceId} failed`,
        };
      }
    }
    return {
      ok: false,
      code: "ingest_timeout",
      message: `Ingest source ${sourceId} timed out waiting for ready`,
    };
  } catch (e) {
    return {
      ok: false,
      code: "provider_network_failure",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Upload all scene images + certified voice for a packet.
 * Preserves SHA identity by hashing local files before upload.
 */
export async function deliverPacketAssets(input: {
  repoRoot: string;
  packet: ShotstackWorkPacket;
  apiKey?: string;
  fetchImpl?: ShotstackFetch;
  envName?: "stage" | "v1";
}): Promise<
  | {
      ok: true;
      assetUrls: AssetUrlMap;
      sourceAssetHashes: Record<string, string>;
      ingestSourceIds: Record<string, string>;
    }
  | { ok: false; message: string; code: string }
> {
  const hashes: Record<string, string> = {};
  const urls = new Map<string, string>();
  const sourceIds: Record<string, string> = {};

  const paths = [
    ...input.packet.scenes.map((s) => s.relativePath),
    input.packet.voiceArtifact.relativePath,
  ];

  for (const rel of paths) {
    const abs = path.join(input.repoRoot, rel);
    if (!existsSync(abs)) {
      return { ok: false, code: "missing_local_asset", message: `Missing ${rel}` };
    }
    const hash = sha256FileAbs(abs);
    hashes[rel] = hash;

    if (rel === input.packet.voiceArtifact.relativePath) {
      if (hash !== input.packet.voiceArtifact.contentSha256) {
        return {
          ok: false,
          code: "voice_hash_mismatch",
          message: `Voice SHA mismatch for ${rel}`,
        };
      }
    }

    const uploaded = await shotstackUploadLocalFile({
      absolutePath: abs,
      apiKey: input.apiKey,
      fetchImpl: input.fetchImpl,
      envName: input.envName,
    });
    if (!uploaded.ok) {
      return {
        ok: false,
        code: uploaded.code,
        message: `${rel}: ${uploaded.message}`,
      };
    }
    urls.set(rel, uploaded.sourceUrl);
    sourceIds[rel] = uploaded.sourceId;
  }

  return {
    ok: true,
    assetUrls: urls,
    sourceAssetHashes: hashes,
    ingestSourceIds: sourceIds,
  };
}

export const MEDIA_DELIVERY_TRUTH = {
  mechanism: "shotstack_ingest_signed_upload",
  description:
    "Local Studio fixture files are uploaded via Shotstack Ingest signed URLs (stage/v1). Shotstack hosts temporary source URLs for Edit API fetch. No permanent public Studio CDN is created. No customer PII filenames. Secrets never embedded in asset URLs by Studio.",
  firstPartyDocs: [
    "https://shotstack.io/docs/guide/ingesting-footage/sources/",
    "https://shotstack.io/docs/api/",
  ],
} as const;
