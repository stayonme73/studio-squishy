/**
 * Minimal DO clip worker HTTP — autonomous dispatch target for Vercel Preview observer.
 * Test only. Bind localhost + reverse proxy or firewall in production use.
 *
 * Usage:
 *   STUDIO_HOSTED_CLIP_WORKER=1 npx tsx scripts/hosted-clip-droplet-worker-http-1.ts [port]
 *
 * POST /run-chunk  { campaignId, scheduleContinuation?, finalizeLaunchMenu? }
 * Header: x-hosted-cert-internal (must match HOSTED_CERT_INTERNAL_CHUNK_KEY)
 */
import { createServer } from "http";
import { existsSync, readFileSync } from "fs";
import path from "path";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import { runHostedClipProductionStep } from "@/lib/studio-hosted-cert/hosted-clip-production-orchestrator";
import { continueHostedCertLaunchMenuChain } from "@/lib/studio-hosted-cert/continue-launch-menu-chain";

const port = Number(process.argv[2] ?? 8787);
const PRODUCTION_DB_REF = "txgzguzlojlhndkbncc";

function loadEnvFile(envPath: string): void {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    process.env[key] ??= t
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

function bootstrapEnv(): void {
  loadEnvFile(
    process.env.STUDIO_HOSTED_CLIP_WORKER_ENV?.trim() ?? "/home/studioadmin/studio/worker.env",
  );
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  process.env.STUDIO_HOSTED_CLIP_WORKER = "1";
  process.env.STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE = "1";
  process.env.STUDIO_PERSISTENCE_BACKEND ??= "postgres";
  process.env.DATABASE_URL ??= process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
  const urls = [process.env.DATABASE_URL, process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL]
    .filter(Boolean)
    .join(" ");
  if (urls.includes(PRODUCTION_DB_REF)) {
    throw new Error("Refusing Production database on clip worker.");
  }
}

function authorized(req: import("http").IncomingMessage): boolean {
  const internal = process.env.HOSTED_CERT_INTERNAL_CHUNK_KEY?.trim();
  if (!internal) return false;
  return req.headers["x-hosted-cert-internal"] === internal;
}

async function runOneChunk(body: {
  campaignId: string;
  scheduleContinuation?: boolean;
  finalizeLaunchMenu?: boolean;
}) {
  const campaignId = body.campaignId.trim();
  const envelope = await readCampaignEnvelope(campaignId);
  const dispatch = envelope?.record.dispatchExecution;
  const record = dispatch?.records?.find((r) => r.skuId === "v2-rtu-clip-repurposing");
  if (!envelope?.record || !record?.executionIdentityReady) {
    throw new Error("no_dispatch_record");
  }

  const step = await withCampaignArtifactProductionWorkspace(campaignId, (repoRoot) =>
    runHostedClipProductionStep({
      repoRoot,
      campaign: envelope.record,
      dispatchRecord: record,
    }),
  );

  // One orchestrator step per HTTP request — Preview observer or droplet-production-drive owns the chain.
  if (step.hookResult?.ok && body.finalizeLaunchMenu !== false) {
    await continueHostedCertLaunchMenuChain(campaignId);
  }

  return {
    ok: true,
    campaignId,
    stage: step.stage,
    continue: step.continue,
    message: step.message,
    hookOk: step.hookResult?.ok ?? null,
    failureCode:
      step.failureCode ??
      (step.hookResult && !step.hookResult.ok ? step.hookResult.failureCode : null) ??
      null,
    skippedDueToLease: step.skippedDueToLease ?? false,
  };
}

bootstrapEnv();
process.env.HOSTED_CLIP_WORKER_URL ??= `http://127.0.0.1:${port}`;

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, worker: "hosted-clip-droplet-worker-http-1" }));
    return;
  }
  if (req.method !== "POST" || req.url !== "/run-chunk") {
    res.writeHead(404);
    res.end();
    return;
  }
  if (!authorized(req)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "chunk_unauthorized" }));
    return;
  }
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    void (async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          campaignId?: string;
          scheduleContinuation?: boolean;
          finalizeLaunchMenu?: boolean;
        };
        if (!body.campaignId?.trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "campaignId_required" }));
          return;
        }
        const result = await runOneChunk(body as { campaignId: string });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (error) {
        const message = error instanceof Error ? error.message : "chunk_failed";
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
    })();
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    JSON.stringify({
      ok: true,
      listening: `127.0.0.1:${port}`,
      health: "/health",
      chunk: "POST /run-chunk",
    }),
  );
});
