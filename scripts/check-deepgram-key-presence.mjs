import { readFileSync } from "fs";

const text = readFileSync(".env.local", "utf8");
const line = text.split(/\r?\n/).find((row) => row.startsWith("DEEPGRAM_API_KEY="));
if (!line) {
  console.log("DEEPGRAM_API_KEY:absent");
  process.exit(0);
}
const value = line.slice("DEEPGRAM_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
console.log(value ? `DEEPGRAM_API_KEY:present:${value.length}` : "DEEPGRAM_API_KEY:empty");
