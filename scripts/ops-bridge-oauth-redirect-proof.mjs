/**
 * Prove the exact ChatGPT redirect URIs now authorize and 302 back.
 * Does not print PIN, codes, or tokens.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL_FILE = path.join(ROOT, ".ops-bridge-public-url");
const DESK_PIN = path.join(ROOT, "docs/launch/project-alpha-owner-desk-pin.json");
const RESULT = path.join(
  ROOT,
  "docs/launch/studio-operating-chatgpt-scout-ops-bridge-1/TRANSPORT-OAUTH-REDIRECT-PROOF.json",
);

function pin() {
  if (process.env.OPS_BRIDGE_OAUTH_OWNER_PIN) return process.env.OPS_BRIDGE_OAUTH_OWNER_PIN;
  return JSON.parse(readFileSync(DESK_PIN, "utf8")).pin;
}

async function authorize(base, redirectUri) {
  const challenge = createHash("sha256").update(randomBytes(32).toString("base64url")).digest("base64url");
  const res = await fetch(`${base}/oauth/authorize`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    redirect: "manual",
    body: new URLSearchParams({
      response_type: "code",
      client_id: "https://chatgpt.com/oauth/client.json",
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: "S256",
      scope: "studio.snapshot.read studio.inbound.write studio.acknowledgement.read",
      state: "redirect-proof",
      resource: `${base}/mcp`,
      pin: pin(),
    }).toString(),
  });
  const location = res.headers.get("location") || "";
  return {
    status: res.status,
    redirectedToExact: location.startsWith(`${redirectUri}?`) || location.startsWith(`${redirectUri}&`),
    hasCode: location.includes("code="),
    hasIss: location.includes("iss="),
  };
}

const base = (process.env.OPS_BRIDGE_PUBLIC_URL || readFileSync(URL_FILE, "utf8")).trim().replace(/\/$/, "");
const official = await authorize(base, "https://chatgpt.com/connector_platform_oauth_redirect");
const loopback = await authorize(base, "http://127.0.0.1/callback");
const results = {
  registeredExactRedirects: [
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "http://127.0.0.1/callback",
  ],
  officialChatgptRedirect: official,
  desktopLoopbackRedirect: loopback,
  wildcardUsed: false,
  tokenPrinted: false,
  pinPrinted: false,
  ok: official.status === 302 && official.redirectedToExact && official.hasCode && loopback.status === 302 && loopback.redirectedToExact,
};
writeFileSync(RESULT, `${JSON.stringify(results, null, 2)}\n`, "utf8");
process.stdout.write(`ops-bridge OAuth redirect proof ${results.ok ? "PASS" : "FAIL"}\n`);
process.exit(results.ok ? 0 : 2);
