import { readFile } from "fs/promises";
import path from "path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  return readFile(envPath, "utf8").then((raw) => {
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

async function main() {
  await loadEnvLocal().catch(() => undefined);

  const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  const situation =
    process.argv[2] ??
    "Customer bought an $11 bottle of lotion. The bottle arrived leaking.";

  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    console.error("FAIL: ANTHROPIC_API_KEY is empty in .env.local");
    process.exit(1);
  }

  console.log(`POST ${baseUrl}/api/decision-learner/predict`);
  const response = await fetch(`${baseUrl}/api/decision-learner/predict`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ situation }),
  });

  const payload = await response.json();
  console.log(`HTTP ${response.status}`);
  console.log(JSON.stringify(payload, null, 2));

  if (!response.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
