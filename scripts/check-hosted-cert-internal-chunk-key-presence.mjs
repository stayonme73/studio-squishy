import { readFileSync } from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
let text = "";
try {
  text = readFileSync(envPath, "utf8");
} catch {
  console.log("HOSTED_CERT_INTERNAL_CHUNK_KEY:absent_no_env_local");
  process.exit(2);
}
const line = text.split(/\r?\n/).find((row) => row.startsWith("HOSTED_CERT_INTERNAL_CHUNK_KEY="));
if (!line) {
  console.log("HOSTED_CERT_INTERNAL_CHUNK_KEY:absent");
  process.exit(2);
}
const value = line.slice("HOSTED_CERT_INTERNAL_CHUNK_KEY=".length).trim().replace(/^["']|["']$/g, "");
console.log(
  value
    ? `HOSTED_CERT_INTERNAL_CHUNK_KEY:present:${value.length}`
    : "HOSTED_CERT_INTERNAL_CHUNK_KEY:empty",
);
process.exit(value ? 0 : 2);
