/**
 * Subprocess worker for sync Postgres lane claims (Owner desk sync APIs on Vercel).
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { runOperation } from "./lib/postgres-lane-claims-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

async function main() {
  const [inPath, outPath] = process.argv.slice(2);
  if (!inPath || !outPath) {
    process.stderr.write("Usage: node postgres-lane-claim-worker.mjs <in.json> <out.json>\n");
    process.exit(2);
  }
  const { operation, payload } = JSON.parse(readFileSync(inPath, "utf8"));
  process.chdir(repoRoot);

  try {
    const result = await runOperation(operation, payload ?? {});
    writeFileSync(outPath, JSON.stringify({ ok: true, result }), "utf8");
  } catch (error) {
    writeFileSync(
      outPath,
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      "utf8",
    );
    process.exit(1);
  }
}

main();
