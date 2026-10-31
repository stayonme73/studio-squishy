/**
 * Upload a verified local MP4 to durable local-text-proof.mp4 (recovery bootstrap only).
 * Usage: node scripts/hosted-clip-upload-local-text-proof-1.mjs <absoluteOrRepoRelativeMp4> [campaignId] [clipId]
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcArg = process.argv[2]?.trim();
const campaignId =
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const clipId = process.argv[4]?.trim() ?? "c-55-423";

if (!srcArg) {
  console.error(
    "Usage: node scripts/hosted-clip-upload-local-text-proof-1.mjs <mp4Path> [campaignId] [clipId]",
  );
  process.exit(2);
}

const src = path.isAbsolute(srcArg) ? srcArg : path.join(repoRoot, srcArg);
if (!existsSync(src)) {
  console.error(JSON.stringify({ ok: false, message: "source_missing", src }));
  process.exit(3);
}

loadEnvLocal(repoRoot);
const { campaignArtifactStoragePrefix } = await import(
  "../src/lib/campaign-design-artifacts/paths.ts"
);

const bytes = readFileSync(src);
const head = bytes.subarray(4, 8).toString("ascii");
if (head !== "ftyp") {
  console.error(JSON.stringify({ ok: false, message: "not_playable_mp4", head }));
  process.exit(4);
}

const supabaseUrl = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_URL?.trim();
const serviceKey = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET?.trim();
const objectPath = `${campaignArtifactStoragePrefix(campaignId)}clip-factory/clips/${clipId}/local-text-proof.mp4`;

const baseUrl = supabaseUrl.replace(/\/+$/, "");
const url = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath
  .split("/")
  .map(encodeURIComponent)
  .join("/")}`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "video/mp4",
    "x-upsert": "true",
  },
  body: bytes,
});

const report = {
  ok: res.ok,
  status: res.status,
  campaignId,
  clipId,
  objectPath,
  bytes: bytes.length,
  ftyp: true,
};
if (!res.ok) report.body = (await res.text()).slice(0, 400);
console.log(JSON.stringify(report, null, 2));
process.exit(res.ok ? 0 : 5);
