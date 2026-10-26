/**
 * Cedar & Stone — generate the two authorised visual assets.
 *
 * Owner authorisation 2026-09-15: both assets, $0.42 expected, $1.25 worst case.
 *
 * This runner does not compose prompts. It reads the exact payloads out of the
 * spend-gate report the Owner authorised and sends those, so what is billed is what
 * was approved rather than something regenerated afterwards.
 *
 * Refuses to spend twice: an existing asset is left alone unless --force.
 *
 * Usage: node scripts/cedar-stone-generate-visuals.mjs [--force]
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const PKG = "studio-operating-static-design-composition-rebuild-1";
const ARTIFACTS = path.join(REPO, "docs", "launch", PKG, "artifacts", "cedar-stone");
const GATE = path.join(ARTIFACTS, "image-generation-spend-gate.json");
const FORCE = process.argv.includes("--force");

function loadEnvLocal() {
  const envPath = path.join(REPO, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

/**
 * The leak guard, applied again at the moment of spending. The gate already checked
 * it, but a prompt that reaches a provider is the last place a customer fact can
 * still be recalled, so it is checked here too rather than trusted.
 */
function assertNoFactLeak(prompt, facts) {
  const hay = prompt.toLowerCase();
  for (const fact of facts) {
    const token = String(fact.value ?? "").trim().toLowerCase();
    if (token.length < 4) continue;
    if (hay.includes(token)) {
      throw new Error(`FACT_LEAK:${fact.factId}`);
    }
  }
  if (/\$\d|\(\d{3}\)|\.com\b|https?:/i.test(prompt)) {
    throw new Error("FACT_SHAPED_TOKEN_IN_PROMPT");
  }
}

function fileNameFor(elementId) {
  return `${elementId}-generated.png`;
}

async function main() {
  loadEnvLocal();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.error("OPENAI_API_KEY not configured. Nothing was sent.");
    process.exit(1);
  }
  if (!existsSync(GATE)) {
    console.error(`Spend gate report missing at ${GATE}. Nothing was sent.`);
    process.exit(1);
  }
  const gate = JSON.parse(readFileSync(GATE, "utf8"));
  if (gate.allPromptsFactLeakFree !== true) {
    console.error("Gate report does not certify the prompts fact-leak-free.");
    process.exit(1);
  }

  mkdirSync(ARTIFACTS, { recursive: true });
  const records = [];
  let spentUsd = 0;

  for (const request of gate.requests) {
    const elementId = request.slot.elementId;
    const outPath = path.join(ARTIFACTS, fileNameFor(elementId));
    if (existsSync(outPath) && !FORCE) {
      console.log(`skip ${elementId}: already generated at ${outPath}`);
      records.push({ elementId, skipped: true, relativePath: path.relative(REPO, outPath) });
      continue;
    }
    assertNoFactLeak(request.prompt, gate.factsOutsideImageLayer);

    const started = Date.now();
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        size: request.size,
        quality: request.quality,
        n: request.n,
      }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      console.error(`${elementId} FAILED http ${response.status}: ${detail}`);
      process.exit(1);
    }
    const payload = await response.json();
    let bytes = null;
    if (payload.data?.[0]?.b64_json) {
      bytes = Buffer.from(payload.data[0].b64_json, "base64");
    } else if (payload.data?.[0]?.url) {
      const download = await fetch(payload.data[0].url);
      if (!download.ok) {
        console.error(`${elementId} download failed ${download.status}`);
        process.exit(1);
      }
      bytes = Buffer.from(await download.arrayBuffer());
    }
    if (!bytes || bytes.length < 1000) {
      console.error(`${elementId} returned no usable image`);
      process.exit(1);
    }
    writeFileSync(outPath, bytes);
    spentUsd += request.cost.totalUsd;
    const record = {
      elementId,
      relativePath: path.posix.join(
        "docs/launch",
        PKG,
        "artifacts/cedar-stone",
        fileNameFor(elementId),
      ),
      model: request.model,
      size: request.size,
      quality: request.quality,
      promptSha256: createHash("sha256").update(request.prompt).digest("hex"),
      contentSha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      httpStatus: response.status,
      elapsedMs: Date.now() - started,
      reportedUsage: payload.usage ?? null,
      estimatedUsd: request.cost.totalUsd,
      skipped: false,
    };
    records.push(record);
    console.log(
      `generated ${elementId} ${request.size} ${(bytes.length / 1024).toFixed(0)}KB ` +
        `sha ${record.contentSha256.slice(0, 12)} est $${request.cost.totalUsd.toFixed(4)}`,
    );
  }

  const summary = {
    authorisedBy: "Owner (Tagia) 2026-09-15",
    authorisation: "both assets; $0.42 expected, $1.25 worst case",
    gateReport: path.posix.join(
      "docs/launch",
      PKG,
      "artifacts/cedar-stone/image-generation-spend-gate.json",
    ),
    generatedAt: new Date().toISOString(),
    estimatedSpendUsd: Number(spentUsd.toFixed(4)),
    attempts: 1,
    records,
  };
  writeFileSync(
    path.join(ARTIFACTS, "generation-record.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  console.log(`\nestimated spend this run: $${summary.estimatedSpendUsd.toFixed(4)}`);
}

await main();
