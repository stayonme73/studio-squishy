/**
 * List durable Supabase objects under one clip directory (no secrets in output).
 */
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campaignId =
  process.argv[2]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const clipId = process.argv[3]?.trim() ?? "c-55-423";

loadEnvLocal(repoRoot);
process.env.VERCEL ??= "1";
process.env.VERCEL_ENV ??= "preview";
process.env.STUDIO_PERSISTENCE_BACKEND ??= "postgres";

const { campaignArtifactStoragePrefix } = await import(
  "../src/lib/campaign-design-artifacts/paths.ts"
);
const supabaseUrl = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_URL?.trim();
const serviceKey = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET?.trim();
const miss = [
  !supabaseUrl && "STUDIO_PERSISTENCE_TEST_SUPABASE_URL",
  !serviceKey && "STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY",
  !bucket && "STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET",
].filter(Boolean);
if (miss.length) {
  console.log(JSON.stringify({ ok: false, missingConfig: miss }, null, 2));
  process.exit(2);
}
const clipPrefix = `${campaignArtifactStoragePrefix(campaignId)}clip-factory/clips/${clipId}/`;

async function listOneLevel(prefix) {
  const baseUrl = supabaseUrl.replace(/\/+$/, "");
  const key = serviceKey;
  const response = await fetch(`${baseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

async function walk(prefix) {
  const rows = [];
  const items = await listOneLevel(prefix);
  for (const item of items ?? []) {
    const name = item.name?.trim();
    if (!name) continue;
    const isFile = Boolean(item.id) || Boolean(item.metadata);
    const full = `${prefix}${name}`.replace(/\/+/g, "/");
    if (isFile) rows.push(full);
    else rows.push(...(await walk(`${prefix}${name}/`.replace(/\/+/g, "/"))));
  }
  return rows;
}

const paths = await walk(clipPrefix);
console.log(
  JSON.stringify(
    {
      ok: true,
      campaignId,
      clipId,
      prefix: clipPrefix,
      objectCount: paths.length,
      paths: paths.sort(),
      hasPaintedWords: paths.some((p) => p.includes("painted-words.json")),
      hasLocalProof: paths.some(
        (p) => p.includes("local-text-proof.mp4") || p.includes("local-proof.mp4"),
      ),
      hasProductionMp4: paths.some((p) => p.endsWith("production.mp4")),
      hasBurnWorkCapPng: paths.some((p) => p.includes("burn-work/") && p.endsWith(".png")),
    },
    null,
    2,
  ),
);
