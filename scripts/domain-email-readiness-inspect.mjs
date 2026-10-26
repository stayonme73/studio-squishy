/**
 * Domain + branded-email readiness inspector.
 * Prints presence / public DNS only. Never prints secret values.
 * Does not send email.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const DOMAIN = "thestudiocompany7.com";

function classifyPresence(value) {
  return String(value ?? "").trim() ? "present" : "missing";
}

function fromLooksBranded(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return "missing";
  if (v.includes("thestudiocompany7.com")) return "uses_thestudiocompany7";
  if (v.includes("resend.dev")) return "uses_resend_dev";
  if (v.includes("@")) return "uses_other_domain";
  return "present_unparseable";
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return null;
  const out = {};
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[line.slice(0, idx).trim()] = val;
  }
  return out;
}

function lookup(type, name = DOMAIN) {
  try {
    const out = execFileSync("nslookup", ["-type=" + type, name], {
      encoding: "utf8",
      timeout: 15000,
    });
    return out.replace(/\r/g, "").trim();
  } catch (error) {
    const text = `${error.stdout || ""}\n${error.stderr || error.message || ""}`;
    return text.replace(/\r/g, "").trim() || "lookup_failed";
  }
}

const envFiles = [".env.local", ".env", ".env.production", ".env.production.local"];
const envReport = {};
for (const name of envFiles) {
  const parsed = parseEnvFile(resolve(process.cwd(), name));
  if (!parsed) {
    envReport[name] = { exists: false };
    continue;
  }
  envReport[name] = {
    exists: true,
    RESEND_API_KEY: classifyPresence(parsed.RESEND_API_KEY),
    TRANSACTIONAL_EMAIL_FROM: fromLooksBranded(parsed.TRANSACTIONAL_EMAIL_FROM),
    TRANSACTIONAL_EMAIL_REPLY_TO: fromLooksBranded(parsed.TRANSACTIONAL_EMAIL_REPLY_TO),
    TRANSACTIONAL_EMAIL_PROVIDER: parsed.TRANSACTIONAL_EMAIL_PROVIDER?.trim() || "unset",
    NEXT_PUBLIC_SITE_URL_HOST: parsed.NEXT_PUBLIC_SITE_URL
      ? (() => {
          try {
            return new URL(parsed.NEXT_PUBLIC_SITE_URL).host;
          } catch {
            return "unparseable";
          }
        })()
      : "unset",
  };
}

const dns = {
  ns: lookup("NS"),
  soa: lookup("SOA"),
  a: lookup("A"),
  aaaa: lookup("AAAA"),
  mx: lookup("MX"),
  txt: lookup("TXT"),
  dmarc: lookup("TXT", `_dmarc.${DOMAIN}`),
  www: lookup("CNAME", `www.${DOMAIN}`),
};

console.log(
  JSON.stringify(
    {
      domain: DOMAIN,
      env: envReport,
      process: {
        RESEND_API_KEY: classifyPresence(process.env.RESEND_API_KEY),
        TRANSACTIONAL_EMAIL_FROM: fromLooksBranded(process.env.TRANSACTIONAL_EMAIL_FROM),
        TRANSACTIONAL_EMAIL_REPLY_TO: fromLooksBranded(
          process.env.TRANSACTIONAL_EMAIL_REPLY_TO,
        ),
      },
      dns,
    },
    null,
    2,
  ),
);
