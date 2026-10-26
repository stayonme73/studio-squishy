/**
 * Print Owner-only away addresses. Does not open the customer site.
 * Home Wi-Fi uses the LAN address. Away from home uses Tailscale.
 */
import { execFileSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIN_PATH = path.join(ROOT, "docs/launch/project-alpha-owner-desk-pin.json");
const PORT = 4177;

function lanAddresses() {
  const found = [];
  const nets = networkInterfaces();
  for (const rows of Object.values(nets)) {
    for (const row of rows || []) {
      if (row.family !== "IPv4" || row.internal) continue;
      if (String(row.address).startsWith("169.254.")) continue;
      found.push(row.address);
    }
  }
  return found;
}

function pin() {
  if (!existsSync(PIN_PATH)) return "not created yet — start the desk once";
  try {
    return JSON.parse(readFileSync(PIN_PATH, "utf8")).pin ?? "missing";
  } catch {
    return "missing";
  }
}

function tailscaleIp() {
  try {
    const raw = execFileSync("tailscale", ["ip", "-4"], {
      encoding: "utf8",
      windowsHide: true,
    }).trim();
    return raw.split(/\s+/)[0] || null;
  } catch {
    return null;
  }
}

process.stdout.write("Owner desk — not the customer site\n");
process.stdout.write(`Laptop:  http://127.0.0.1:${PORT}/\n`);
for (const ip of lanAddresses()) {
  process.stdout.write(`Home Wi-Fi phone: http://${ip}:${PORT}/\n`);
}
const away = tailscaleIp();
if (away) {
  process.stdout.write(`Away phone: http://${away}:${PORT}/\n`);
} else {
  process.stdout.write("Away phone: Tailscale is not signed in on this laptop yet.\n");
}
process.stdout.write(`Owner PIN: ${pin()}\n`);
process.stdout.write("Leave this laptop on. Customers cannot use these addresses without the PIN.\n");
