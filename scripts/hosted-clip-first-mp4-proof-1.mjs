/**
 * Artifact-only proof: durable production.mp4 exists and begins with ftyp (readable MP4).
 * Usage: node scripts/hosted-clip-first-mp4-proof-1.mjs [campaignId] [clipId]
 */
import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";
import { spawnSync } from "child_process";

import { loadEnvLocal } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campaignId =
  process.argv[2]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const clipId = process.argv[3]?.trim() ?? "c-55-423";

loadEnvLocal(repoRoot);
process.env.VERCEL ??= "1";
process.env.VERCEL_ENV ??= "preview";

const inv = spawnSync("node", ["scripts/hosted-clip-durable-burn-inventory-1.mjs", campaignId, clipId], {
  cwd: repoRoot,
  encoding: "utf8",
});
const inventory = JSON.parse(inv.stdout || "{}");
const prodPath = (inventory.paths ?? []).find((p) => p.endsWith("/production.mp4"));
const localProof = (inventory.paths ?? []).find((p) => p.endsWith("local-text-proof.mp4"));

const supabaseUrl = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_URL?.trim();
const serviceKey = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET?.trim();

let mp4Head = null;
let readableMp4 = false;
let localHead = null;
let readableLocal = false;
async function headObject(objectPath) {
  if (!objectPath || !supabaseUrl || !serviceKey || !bucket) return null;
  const encoded = objectPath
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  const url = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${encoded}`;
  const res = await fetch(url, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, range: "bytes=0-15" },
  });
  if (!res.ok && res.status !== 206) return null;
  return Buffer.from(await res.arrayBuffer());
}
if (localProof) {
  const buf = await headObject(localProof);
  if (buf && buf.length >= 8) {
    localHead = buf.toString("hex").slice(0, 24);
    readableLocal = buf.slice(4, 8).toString("ascii") === "ftyp";
  }
}
if (prodPath && supabaseUrl && serviceKey && bucket) {
  const encoded = prodPath
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  const url = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${encoded}`;
  const res = await fetch(url, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, range: "bytes=0-15" },
  });
  if (res.ok || res.status === 206) {
    const buf = Buffer.from(await res.arrayBuffer());
    mp4Head = buf.toString("hex").slice(0, 24);
    readableMp4 = buf.length >= 8 && buf.slice(4, 8).toString("ascii") === "ftyp";
  }
}

const report = {
  verifiedAt: new Date().toISOString(),
  campaignId,
  clipId,
  hasProductionMp4: Boolean(prodPath),
  productionObjectPath: prodPath ?? null,
  hasLocalTextProof: Boolean(localProof),
  localProofObjectPath: localProof ?? null,
  localMp4HeadHex: localHead,
  readableLocalTextProof: readableLocal,
  mp4HeadHex: mp4Head,
  readableMp4,
  meaningfulArtifactProgress: Boolean(prodPath && readableMp4),
  meaningfulLocalProof: Boolean(localProof && readableLocal),
  inventory,
};

const out = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-FIRST-MP4-PROOF-1-LATEST.json",
);
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.meaningfulArtifactProgress ? 0 : 5);
