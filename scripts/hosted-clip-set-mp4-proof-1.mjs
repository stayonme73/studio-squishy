/**
 * Verify production.mp4 (ftyp) for every clip in the factory set.
 * Usage: node scripts/hosted-clip-set-mp4-proof-1.mjs [campaignId] [clipId ...]
 */
import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";
import { spawnSync } from "child_process";

import { loadEnvLocal } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campaignId =
  process.argv[2]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const clipIds = process.argv.slice(3).filter(Boolean);
const defaultClips = ["c-17-127", "c-55-423", "c-82-641"];
const targets = clipIds.length ? clipIds : defaultClips;

loadEnvLocal(repoRoot);
process.env.VERCEL ??= "1";
process.env.VERCEL_ENV ??= "preview";

const supabaseUrl = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_URL?.trim();
const serviceKey = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET?.trim();

async function headFtyp(objectPath) {
  if (!objectPath || !supabaseUrl || !serviceKey || !bucket) return { ok: false };
  const encoded = objectPath
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  const url = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${encoded}`;
  const res = await fetch(url, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, range: "bytes=0-15" },
  });
  if (!res.ok && res.status !== 206) return { ok: false, status: res.status };
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    ok: buf.length >= 8 && buf.slice(4, 8).toString("ascii") === "ftyp",
    headHex: buf.toString("hex").slice(0, 24),
  };
}

const clips = [];
for (const clipId of targets) {
  const inv = spawnSync(
    "node",
    ["scripts/hosted-clip-durable-burn-inventory-1.mjs", campaignId, clipId],
    { cwd: repoRoot, encoding: "utf8" },
  );
  let parsed = {};
  try {
    parsed = JSON.parse(inv.stdout || "{}");
  } catch {
    parsed = { ok: false };
  }
  const prodPath = (parsed.paths ?? []).find((p) => p.endsWith("/production.mp4"));
  const localPath = (parsed.paths ?? []).find((p) => p.endsWith("local-text-proof.mp4"));
  const prodHead = prodPath ? await headFtyp(prodPath) : { ok: false };
  clips.push({
    clipId,
    hasProductionMp4: Boolean(prodPath),
    productionObjectPath: prodPath ?? null,
    readableProductionMp4: prodHead.ok === true,
    mp4HeadHex: prodHead.headHex ?? null,
    hasLocalTextProof: Boolean(localPath),
  });
}

const report = {
  verifiedAt: new Date().toISOString(),
  campaignId,
  clips,
  allReadableProductionMp4: clips.every((c) => c.readableProductionMp4),
  passCount: clips.filter((c) => c.readableProductionMp4).length,
  expectedCount: clips.length,
};

const out = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-SET-MP4-PROOF-1-LATEST.json",
);
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.allReadableProductionMp4 ? 0 : 5);
