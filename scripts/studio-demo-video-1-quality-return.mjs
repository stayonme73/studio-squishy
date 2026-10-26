/**
 * Machine entry when Quality returns Video 1.
 * Raises the existing Owner Console item. Does not put the cut on Page 1.
 *
 * Usage:
 *   node scripts/studio-demo-video-1-quality-return.mjs --packet path/to/quality-return.json
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  qualityMayRaise,
  raiseVideo1OwnerMatter,
  readTray,
  stageReturnedMp4,
  writeTray,
} from "./studio-demo-video-1-owner-console.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argValue(flag) {
  const argv = process.argv.slice(2);
  const index = argv.indexOf(flag);
  return index === -1 ? "" : String(argv[index + 1] ?? "");
}

const packetPath = argValue("--packet");
if (!packetPath || !existsSync(packetPath)) {
  process.stderr.write("Quality return packet is required: --packet <json>\n");
  process.exit(1);
}

const packet = JSON.parse(readFileSync(packetPath, "utf8"));
const allowed = qualityMayRaise(packet);
if (!allowed.ok) {
  process.stderr.write(`${allowed.error}\n`);
  process.exit(2);
}

const sourceMp4 = packet.mp4Path
  ? path.resolve(ROOT, packet.mp4Path)
  : "";
stageReturnedMp4(sourceMp4);
const next = raiseVideo1OwnerMatter(readTray(), packet);
writeTray(next);

const pulse = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  [
    "run",
    "work-heartbeat:pulse",
    "--",
    "--waiting-owner",
    "--package",
    "STUDIO-DEMO-VIDEO-1-CLIP-REPURPOSING",
    "--task",
    "Video 1 waiting on Owner",
    "--action",
    "Watch the finished MP4 on the Owner Console. Approve, Reject, or Send Back.",
  ],
  { cwd: ROOT, stdio: "inherit", windowsHide: true },
);

pulse.on("exit", (code) => {
  process.stdout.write("Video 1 is on the existing Owner Console. Scout did not bring files.\n");
  process.exit(code ?? 0);
});
