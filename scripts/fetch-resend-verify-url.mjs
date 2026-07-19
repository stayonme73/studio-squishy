/**
 * Live-cert helper: fetch one Resend message and extract verify URL.
 * Does not print API keys or raw tokens.
 */
import { readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      const name = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return [name, value];
    }),
);

const key = env.RESEND_API_KEY ?? "";
const id = process.argv[2];
if (!id) {
  console.error("usage: node scripts/fetch-resend-verify-url.mjs <messageId>");
  process.exit(1);
}

console.log(`keyPresent=${Boolean(key)} keyLen=${key.length}`);

const res = await fetch(`https://api.resend.com/emails/${id}`, {
  headers: { Authorization: `Bearer ${key}` },
});
const text = await res.text();
console.log(`status=${res.status}`);
if (!res.ok) {
  console.log(`body=${text.slice(0, 400)}`);
  process.exit(1);
}

const body = JSON.parse(text);
console.log(`from=${body.from}`);
console.log(`to=${Array.isArray(body.to) ? body.to.join(",") : body.to}`);
console.log(`subject=${body.subject}`);

const blob = `${body.text ?? ""}\n${body.html ?? ""}`;
const match = blob.match(/https?:\/\/[^\s"'<>]+verify-email[^\s"'<>]*/);
if (!match) {
  console.log(`NO_URL textLen=${String(body.text ?? "").length}`);
  process.exit(1);
}

const url = match[0];
const u = new URL(url);
console.log(`urlHost=${u.host} path=${u.pathname} hasToken=${u.searchParams.has("token")}`);
console.log(
  `localOk=${url.startsWith("http://localhost:3000/verify-email?token=")}`,
);

const out = join(tmpdir(), "studio-verify-url.txt");
writeFileSync(out, url, "utf8");
console.log(`urlSaved=${out}`);
