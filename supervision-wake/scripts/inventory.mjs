import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const forbidden = [
  /src\/app\//,
  /file-room\/incident-command\/page/,
  /sign-in\/page/,
  /owner-console/,
  /from ["']next\//,
  /["']stripe["']/,
  /setInterval\s*\(/,
  /studio-squishy-app-certification/,
];

function walk(dir, files = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const files = walk(dist);
const hits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(text)) {
      hits.push(`${path.relative(root, file)} matches ${pattern}`);
    }
  }
}

const report = {
  files: files.map((file) => path.relative(root, file)),
  forbiddenHits: hits,
  ok: hits.length === 0 && files.some((file) => file.endsWith("wake.mjs")),
};

writeFileSync(path.join(dist, "inventory.json"), `${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) {
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`wake inventory ok (${report.files.length} files)\n`);
