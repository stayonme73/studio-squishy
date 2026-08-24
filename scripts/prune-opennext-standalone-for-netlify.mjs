/**
 * OpenNext copies `.next/standalone` into ___netlify-server-handler, then
 * zip-it-and-ship-it archives that directory. NFT excludes alone do not
 * remove junctions / native optional binaries Next still drops in standalone.
 *
 * Keep Launch Tracker markdown, compiled `.next/server`, wasm sharp, and
 * required Next runtime. Do not print env file contents.
 */
import { existsSync, lstatSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

const KEEP_LAUNCH_LIST = join(
  "docs",
  "launch",
  "STUDIO-MASTER-LAUNCH-LIST.md",
);

function bytesOf(path) {
  try {
    const st = lstatSync(path);
    if (st.isSymbolicLink() || st.isFile()) return st.size;
    if (!st.isDirectory()) return 0;
  } catch {
    return 0;
  }
  let total = 0;
  const stack = [path];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync(cur);
    } catch {
      continue;
    }
    for (const name of entries) {
      const p = join(cur, name);
      let st;
      try {
        st = lstatSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(p);
      else total += st.size;
    }
  }
  return total;
}

function rmPath(path) {
  if (!existsSync(path)) return 0;
  const n = bytesOf(path);
  rmSync(path, { recursive: true, force: true });
  return n;
}

function walkDirs(dir, visit) {
  if (!existsSync(dir)) return;
  let st;
  try {
    st = lstatSync(dir);
  } catch {
    return;
  }
  if (st.isSymbolicLink() || !st.isDirectory()) {
    visit(dir);
    return;
  }
  visit(dir);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    walkDirs(join(dir, name), visit);
  }
}

if (!existsSync(standalone)) {
  console.log("prune-opennext-standalone: no .next/standalone (skip)");
  process.exit(0);
}

const before = bytesOf(standalone);
let removed = 0;
const notes = [];

function take(label, path) {
  if (!existsSync(path)) return;
  const n = rmPath(path);
  removed += n;
  notes.push(`${label}: ${(n / 1048576).toFixed(2)} MB`);
}

take(
  "data/file-room-objects (gitignored binaries)",
  join(standalone, "data", "file-room-objects"),
);
take("src (compiled into .next/server)", join(standalone, "src"));
take("package-lock.json", join(standalone, "package-lock.json"));
take("certificates", join(standalone, "certificates"));
take(".cursor", join(standalone, ".cursor"));
take(".netlify (prior Netlify cache/plugins traced into standalone)", join(standalone, ".netlify"));

walkDirs(standalone, (path) => {
  const rel = relative(standalone, path).replace(/\\/g, "/");
  const base = rel.split("/").pop() ?? "";
  if (
    base === "playwright" ||
    base === "playwright-core" ||
    base.startsWith("playwright-")
  ) {
    take(rel, path);
    return;
  }
  if (
    /^sharp-(libvips-)?(linux|win32|darwin|wasm32musl)/.test(base) ||
    /^sharp-libvips-/.test(base) ||
    /^sharp-(linux|win32|darwin)/.test(base)
  ) {
    if (base.startsWith("sharp-wasm32") && !base.includes("musl")) return;
    take(rel, path);
  }
});

const keepList = join(standalone, KEEP_LAUNCH_LIST);
if (!existsSync(keepList) || !statSync(keepList).isFile()) {
  console.error(
    `prune-opennext-standalone: missing required ${KEEP_LAUNCH_LIST}`,
  );
  process.exit(1);
}

const after = bytesOf(standalone);
console.log("prune-opennext-standalone:");
for (const note of notes) console.log("  -", note);
console.log(
  `  standalone ${((before) / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB (removed ${(removed / 1048576).toFixed(2)} MB)`,
);
