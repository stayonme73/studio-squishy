import { readFileSync } from "fs";

const text = readFileSync(".env.local", "utf8");
const keys = [
  "DEEPGRAM_API_KEY",
  "SHOTSTACK_API_KEY",
  "SHOTSTACK_PRODUCTION_API_KEY",
  "SHOTSTACK_ENV",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
];
for (const key of keys) {
  const line = text.split(/\r?\n/).find((row) => row.startsWith(`${key}=`));
  if (!line) {
    console.log(`${key}:absent`);
    continue;
  }
  const value = line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
  if (key === "SHOTSTACK_ENV" || key === "ANTHROPIC_MODEL") {
    console.log(`${key}:${value || "empty"}`);
    continue;
  }
  console.log(value ? `${key}:present:${value.length}` : `${key}:empty`);
}
