import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const functionsDir = path.join(dist, "functions");
const handlerFile = path.join(dist, "lib", "wake-runtime.mjs");
const FUNCTION_EXTS = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]);

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

const PARSEABLE_CONFIG =
  /export\s+const\s+config\s*=\s*\{\s*path:\s*["']\/\*["']\s*,\s*rateLimit:\s*\{\s*windowLimit:\s*60\s*,\s*windowSize:\s*60\s*,\s*aggregateBy:\s*\[\s*["']ip["']\s*,\s*["']domain["']\s*\]\s*,?\s*\}\s*,?\s*\}/;

function walk(dir, files = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function callableFunctions(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((full) => statSync(full).isFile() && FUNCTION_EXTS.has(path.extname(full)));
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

const functions = callableFunctions(functionsDir);
const wakeEntry = functions.find((file) => path.basename(file) === "wake.mjs");
const wakeText = wakeEntry ? readFileSync(wakeEntry, "utf8") : "";
const parseableConfig = PARSEABLE_CONFIG.test(wakeText);
const spreadConfig = /rateLimit:\s*\{\s*\.\.\./.test(wakeText);
const reexportedConfig = /export\s*\{[\s\S]*\bconfig\b/.test(wakeText);
const handlerPresent = Boolean(statSync(handlerFile, { throwIfNoEntry: false })?.isFile());

if (functions.length !== 1) {
  hits.push(`callable_functions=${functions.length} expected 1`);
}
if (!wakeEntry) {
  hits.push("missing dist/functions/wake.mjs");
}
if (!parseableConfig) {
  hits.push("wake entry lacks parseable literal export const config");
}
if (spreadConfig) {
  hits.push("wake entry still spreads rateLimit");
}
if (reexportedConfig) {
  hits.push("wake entry re-exports config instead of export const config");
}
if (!handlerPresent) {
  hits.push("missing dist/lib/wake-runtime.mjs");
}

const report = {
  files: files.map((file) => path.relative(root, file)),
  callableFunctions: functions.map((file) => path.relative(root, file)),
  parseableConfig,
  handlerPresent,
  forbiddenHits: hits,
  ok:
    hits.length === 0 &&
    functions.length === 1 &&
    parseableConfig &&
    handlerPresent &&
    Boolean(wakeEntry),
};

writeFileSync(path.join(dist, "inventory.json"), `${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) {
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(
  `wake inventory ok (${report.files.length} files, ${functions.length} function)\n`,
);
