#!/usr/bin/env node
/**
 * Package 3 certification runner — executes live store/API orchestration journeys.
 *
 * Usage: node scripts/run-package3-certification.mjs
 */
import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "src/lib/project-change/package3-certification.test.ts"],
  { stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
