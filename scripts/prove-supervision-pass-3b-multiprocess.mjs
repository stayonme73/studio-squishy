/**
 * Two OS processes compete for one sweep claim against a shared engine.
 * Deterministic adapter proof only. Not live Supabase. Not launch certification.
 *
 * The claim server runs in a child process so workers can spawnSync without
 * blocking the HTTP event loop.
 */
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { writeSync } from "node:fs";
import { fileURLToPath } from "node:url";

const KEY = "supervision-test-service-role";
const self = fileURLToPath(import.meta.url);

function cleanEnv(extra) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && key !== "NODE_OPTIONS") env[key] = value;
  }
  return { ...env, ...extra };
}

if (process.env.P3B_ROLE === "server") {
  let claim = null;
  function tryClaim(body) {
    const now = Date.parse(body.p_at);
    if (claim && Date.parse(claim.expiresAt) > now && claim.holder !== body.p_holder) {
      return { claimed: false, claim };
    }
    claim = {
      claimId: body.p_claim_id,
      claimedAt: body.p_at,
      holder: body.p_holder,
      expiresAt: new Date(now + Number(body.p_ttl_ms)).toISOString(),
    };
    return { claimed: true, claim };
  }

  const server = createServer((req, res) => {
    const auth = req.headers.authorization ?? "";
    const apiKey = String(req.headers.apikey ?? "");
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (token !== KEY || apiKey !== KEY) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Service role required. Browser keys are not accepted." }));
      return;
    }
    if (req.method === "POST" && String(req.url ?? "").includes("/rpc/supervision_try_claim_sweep")) {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(tryClaim(body)));
      });
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end("{}");
  });

  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    writeSync(1, `READY ${port}\n`);
  });
} else {
  const server = spawn(process.execPath, [self], {
    env: cleanEnv({ P3B_ROLE: "server" }),
    execArgv: [],
    windowsHide: true,
  });

  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.kill();
      reject(new Error("claim server did not become ready"));
    }, 8_000);
    let ready = false;
    let buf = "";
    server.stdout.setEncoding("utf8");
    server.stdout.on("data", (chunk) => {
      buf += chunk;
      const match = buf.match(/READY (\d+)/);
      if (match) {
        ready = true;
        clearTimeout(timer);
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    });
    server.stderr.setEncoding("utf8");
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
    server.on("exit", (code) => {
      if (!ready) {
        clearTimeout(timer);
        reject(new Error(`claim server exited ${code}`));
      }
    });
  });

  const worker = `
const http = require('http');
const url = new URL(process.env.P3B_URL + '/rest/v1/rpc/supervision_try_claim_sweep');
const body = JSON.stringify({
  p_claim_id: process.env.P3B_CLAIM,
  p_holder: process.env.P3B_HOLDER,
  p_at: '2026-08-23T16:00:00.000Z',
  p_ttl_ms: 10000,
});
const req = http.request({
  hostname: url.hostname,
  port: url.port,
  path: url.pathname,
  method: 'POST',
  headers: {
    apikey: process.env.P3B_KEY,
    Authorization: 'Bearer ' + process.env.P3B_KEY,
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  },
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { process.stdout.write(data); });
});
req.on('error', (err) => { process.stderr.write(String(err.message || err)); process.exit(1); });
req.end(body);
`;

  function runHolder(holder, claimId) {
    return spawnSync(process.execPath, ["-e", worker], {
      encoding: "utf8",
      env: cleanEnv({
        P3B_URL: url,
        P3B_KEY: KEY,
        P3B_CLAIM: claimId,
        P3B_HOLDER: holder,
      }),
      timeout: 8_000,
      execArgv: [],
      windowsHide: true,
    });
  }

  try {
    const first = runHolder("holder-a", "claim-a");
    const second = runHolder("holder-b", "claim-b");
    if (first.status !== 0) {
      process.stderr.write(first.stderr || first.error?.message || "process A failed\n");
      process.exit(1);
    }
    if (second.status !== 0) {
      process.stderr.write(second.stderr || second.error?.message || "process B failed\n");
      process.exit(1);
    }
    const processA = JSON.parse(first.stdout);
    const processB = JSON.parse(second.stdout);
    process.stdout.write(
      `${JSON.stringify({
        processAClaimed: processA.claimed === true,
        processBClaimed: processB.claimed === true,
        bothWon: processA.claimed === true && processB.claimed === true,
        classification: "deterministic-adapter-proof-not-live-production",
      })}\n`,
    );
  } finally {
    server.kill();
  }
}
