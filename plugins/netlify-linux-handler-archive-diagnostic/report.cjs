"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readZipEntries } = require("./read-zip-entries.cjs");

const LIMIT_BYTES = 45 * 1024 * 1024;
const HANDLER_ZIP_NAME = "___netlify-server-handler.zip";

function mb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function sanitizeRel(abs, cwd) {
  const rel = path.relative(cwd, abs);
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
    return rel.split(path.sep).join("/");
  }
  return path.basename(abs);
}

function sanitizeEntryName(name) {
  return name
    .replace(/\\/g, "/")
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
      "<uuid>",
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<email>");
}

function isDirPath(posixName, dir) {
  const n = posixName.replace(/\\/g, "/");
  return n === dir || n.startsWith(`${dir}/`) || n.includes(`/${dir}/`);
}

function isSrcTree(posixName) {
  const n = posixName.replace(/\\/g, "/");
  return n === "src" || n.startsWith("src/") || n.includes("/src/");
}

function isNativeSharp(posixName) {
  const n = posixName.replace(/\\/g, "/").toLowerCase();
  if (n.includes("sharp-wasm32")) return false;
  return (
    n.includes("sharp-libvips") ||
    n.includes("sharp-linux") ||
    n.includes("sharp-win32") ||
    n.includes("sharp-darwin") ||
    n.includes("sharp/vendor/") ||
    (n.includes("sharp") && n.endsWith(".node"))
  );
}

function bucket(entries, pred) {
  let files = 0;
  let uncompressed = 0;
  for (const entry of entries) {
    if (!pred(entry.name.replace(/\\/g, "/"))) continue;
    files += 1;
    uncompressed += entry.uncompressed;
  }
  return {
    present: files > 0,
    files,
    uncompressed_bytes: uncompressed,
    uncompressed: mb(uncompressed),
  };
}

function collectZips(root) {
  const found = [];
  if (!root || !fs.existsSync(root)) return found;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let names;
    try {
      names = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of names) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else if (ent.isFile() && ent.name.endsWith(".zip")) {
        found.push(full);
      }
    }
  }
  return found;
}

function reportZip(zipPath, cwd) {
  const zipBytes = fs.statSync(zipPath).size;
  const entries = readZipEntries(zipPath);
  const uncompressed = entries.reduce((sum, entry) => sum + entry.uncompressed, 0);
  const posix = (name) => name.replace(/\\/g, "/");

  const largest = [...entries]
    .sort((a, b) => b.uncompressed - a.uncompressed)
    .slice(0, 25)
    .map((entry) => ({
      uncompressed: mb(entry.uncompressed),
      uncompressed_bytes: entry.uncompressed,
      compressed_bytes: entry.compressed,
      path: sanitizeEntryName(entry.name),
    }));

  return {
    zip_rel: sanitizeRel(zipPath, cwd),
    zip_bytes: zipBytes,
    zip_size: mb(zipBytes),
    uncompressed_bytes: uncompressed,
    uncompressed_size: mb(uncompressed),
    entry_count: entries.length,
    exceeds_45mb: zipBytes > LIMIT_BYTES,
    present: {
      ".netlify": bucket(entries, (n) => isDirPath(n, ".netlify")),
      playwright: bucket(entries, (n) => /playwright/i.test(n)),
      "native_sharp_or_libvips": bucket(entries, isNativeSharp),
      "sharp_wasm32": bucket(entries, (n) => n.toLowerCase().includes("sharp-wasm32")),
      docs: bucket(entries, (n) => isDirPath(n, "docs")),
      public: bucket(entries, (n) => isDirPath(n, "public")),
      data: bucket(entries, (n) => isDirPath(n, "data")),
      src: bucket(entries, isSrcTree),
      archive: bucket(entries, (n) => isDirPath(n, "archive") || isDirPath(n, "src/archive")),
      tmp: bucket(entries, (n) => isDirPath(n, "tmp") || isDirPath(n, "tmp-tile-crops")),
    },
    largest,
    env_filenames_in_zip: entries
      .map((entry) => posix(entry.name).split("/").pop() || "")
      .filter((base) => base === ".env" || base.startsWith(".env."))
      .filter((name, i, all) => all.indexOf(name) === i),
  };
}

async function reportHandlerArchive({ constants = {}, fail }) {
  const cwd = process.cwd();
  const searchRoots = [
    constants.FUNCTIONS_DIST,
    path.join(cwd, ".netlify", "functions"),
  ].filter(Boolean);

  const zips = [];
  const seen = new Set();
  for (const root of searchRoots) {
    for (const zip of collectZips(root)) {
      const key = path.resolve(zip);
      if (seen.has(key)) continue;
      seen.add(key);
      zips.push(zip);
    }
  }

  const handlerZips = zips.filter((zip) => path.basename(zip) === HANDLER_ZIP_NAME);
  const otherZips = zips.filter((zip) => path.basename(zip) !== HANDLER_ZIP_NAME);

  const payload = {
    diagnostic: "netlify-linux-handler-archive-diagnostic",
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    functions_dist: constants.FUNCTIONS_DIST
      ? sanitizeRel(constants.FUNCTIONS_DIST, cwd)
      : "(unset)",
    handler_zip_count: handlerZips.length,
    other_function_zip_names: otherZips.map((zip) => path.basename(zip)),
    archives: handlerZips.map((zip) => reportZip(zip, cwd)),
  };

  console.log("[handler-archive-diagnostic]");
  console.log(JSON.stringify(payload, null, 2));

  if (handlerZips.length === 0) {
    fail(
      "Handler archive diagnostic: ___netlify-server-handler.zip was not found after Functions bundling. Refusing to upload.",
    );
    return payload;
  }

  const over = payload.archives.filter((archive) => archive.zip_bytes > LIMIT_BYTES);
  if (over.length > 0) {
    const sizes = over.map((archive) => `${archive.zip_rel}=${archive.zip_bytes} bytes`).join("; ");
    fail(
      `Handler archive diagnostic: ___netlify-server-handler.zip exceeds 45 MB (${sizes}). Stopping before upload.`,
    );
  }
  return payload;
}

module.exports = {
  LIMIT_BYTES,
  reportHandlerArchive,
  reportZip,
};
