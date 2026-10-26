/**
 * Reports whether ANTHROPIC_API_KEY is present. Never prints the secret.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.log(
    JSON.stringify({
      envFile: "missing",
      keyNamed: false,
      nonEmpty: false,
      prefixClass: "absent",
    }),
  );
  process.exit(0);
}

let keyNamed = false;
let nonEmpty = false;
let prefixClass = "absent";
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  if (trimmed.slice(0, eq).trim() !== "ANTHROPIC_API_KEY") continue;
  keyNamed = true;
  const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  nonEmpty = value.length > 0;
  prefixClass = !nonEmpty
    ? "empty"
    : value.startsWith("sk-ant-")
      ? "anthropic"
      : "non_anthropic_prefix";
}

console.log(
  JSON.stringify({
    envFile: "present",
    keyNamed,
    nonEmpty,
    prefixClass,
  }),
);
