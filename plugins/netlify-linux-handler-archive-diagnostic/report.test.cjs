"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const { readZipEntries } = require("./read-zip-entries.cjs");
const { reportZip, LIMIT_BYTES } = require("./report.cjs");

test("readZipEntries reports uncompressed totals from a real zip", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handler-diag-"));
  const payload = path.join(dir, "hello.txt");
  const zipPath = path.join(dir, "___netlify-server-handler.zip");
  fs.writeFileSync(payload, "hello-diagnostic");
  const py = process.platform === "win32" ? "py" : "python3";
  execFileSync(py, [
    "-c",
    "import zipfile, sys; zipfile.ZipFile(sys.argv[1],'w').write(sys.argv[2],'docs/launch/hello.txt')",
    zipPath,
    payload,
  ]);
  const entries = readZipEntries(zipPath);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name.replace(/\\/g, "/"), "docs/launch/hello.txt");
  assert.equal(entries[0].uncompressed, Buffer.byteLength("hello-diagnostic"));
  const report = reportZip(zipPath, dir);
  assert.equal(report.entry_count, 1);
  assert.equal(report.present.docs.present, true);
  assert.equal(report.present[".git"].present, false);
  assert.equal(report.present.playwright.present, false);
  assert.equal(report.exceeds_45mb, report.zip_bytes > LIMIT_BYTES);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("reportZip flags .git packfiles as present", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "handler-diag-git-"));
  const payload = path.join(dir, "pack");
  const zipPath = path.join(dir, "___netlify-server-handler.zip");
  fs.writeFileSync(payload, "not-a-real-pack");
  const py = process.platform === "win32" ? "py" : "python3";
  execFileSync(py, [
    "-c",
    "import zipfile, sys; zipfile.ZipFile(sys.argv[1],'w').write(sys.argv[2],'.git/objects/pack/pack')",
    zipPath,
    payload,
  ]);
  const report = reportZip(zipPath, dir);
  assert.equal(report.present[".git"].present, true);
  fs.rmSync(dir, { recursive: true, force: true });
});
