/**
 * Studio Coordinator Phase 1 — self-test runner (no UI, no dev server).
 *
 * Usage:
 *   node scripts/run-studio-coordinator-self-test.mjs
 *   npm run test:studio-coordinator-self-test
 */

import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "tmp", "studio-coordinator-self-test");
const REPORT_PATH = path.join(OUT_DIR, "report.txt");

const vitest = spawnSync(
  "npx",
  ["vitest", "run", "src/studio-coordinator/studio-coordinator-self-test.test.ts"],
  {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    env: { ...process.env, FORCE_COLOR: "0" },
  },
);

const combined = [vitest.stdout, vitest.stderr].filter(Boolean).join("\n");
if (combined) process.stdout.write(`${combined}\n`);

await mkdir(OUT_DIR, { recursive: true });
await writeFile(REPORT_PATH, combined || "(no output)", "utf8");

console.log(`Report saved: ${REPORT_PATH}`);

if (vitest.status !== 0) {
  console.error("\nStudio Coordinator self-test FAILED.");
  process.exit(vitest.status ?? 1);
}

console.log("\nStudio Coordinator self-test PASSED.");
process.exit(0);
