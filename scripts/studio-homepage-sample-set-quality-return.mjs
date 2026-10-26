/**
 * Machine entry when Quality returns the What We Create 8-sample set.
 * Raises one Owner Console packet. Does not put plates on Page 1.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  qualityMayRaise,
  raiseSampleSetOwnerMatter,
  readTray,
  writeTray,
} from "./studio-homepage-sample-set-owner-console.mjs";
import { writeProductionReceipt } from "./owner-production-receipt.mjs";

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

const next = raiseSampleSetOwnerMatter(readTray(), packet);
writeTray(next);
writeProductionReceipt({
  packetId: "studio-homepage-what-we-create-sample-set",
  label: "What We Create sample set",
  state: "COMPLETE",
  detail: "Complete. The packet is back on your desk for Approve, Reject, or Send Back.",
});

execFileSync(
  process.execPath,
  [
    path.join(ROOT, "scripts/work-heartbeat-pulse.mjs"),
    "--waiting-owner",
    "--package",
    "STUDIO-HOMEPAGE-WHAT-WE-CREATE-SAMPLE-SET-1",
    "--task",
    "What We Create sample set waiting on Owner",
    "--action",
    "Review the 8 samples together on the Owner Console. Approve, Reject, or Send Back.",
  ],
  { cwd: ROOT, stdio: "inherit", windowsHide: true },
);
process.stdout.write(
  "What We Create sample set is on the existing Owner Console. Scout did not bring files.\n",
);
