import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.join(root, "..");
const entry = path.join(root, "src", "netlify-entry.ts");
const outfile = path.join(root, "dist", "functions", "wake.mjs");

mkdirSync(path.dirname(outfile), { recursive: true });
mkdirSync(path.join(root, "dist", "public"), { recursive: true });
writeFileSync(path.join(root, "dist", "public", ".gitkeep"), "");

const result = spawnSync(
  "npx",
  [
    "--yes",
    "esbuild",
    entry,
    "--bundle",
    "--platform=node",
    "--format=esm",
    `--outfile=${outfile}`,
    `--alias:@=${path.join(repo, "src")}`,
    "--packages=bundle",
  ],
  { cwd: repo, encoding: "utf8", shell: true },
);

if (result.status !== 0) {
  process.stderr.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}

process.stdout.write(`wake bundle written to ${path.relative(repo, outfile)}\n`);
