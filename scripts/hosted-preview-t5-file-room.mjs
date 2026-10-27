/**
 * STUDIO-HOSTED-PREVIEW-SHARP-FIX-FINAL-CLOSEOUT — hosted Preview T5 (Test only).
 * Legitimate Preview signup + login session (server-issued studio_session).
 * Usage: node scripts/hosted-preview-t5-file-room.mjs <dpl_...> <preview-origin>
 */
import { createHash } from "crypto";
import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const deploymentId = process.argv[2]?.trim();
const previewOrigin = process.argv[3]?.replace(/\/+$/, "");
if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error(
    "Usage: node scripts/hosted-preview-t5-file-room.mjs <dpl_...> <https://preview-host.vercel.app>",
  );
  process.exit(2);
}

const TEST_PASSWORD = "ScoutT5!preview9";

for (const line of readFileSync(path.join(repoRoot, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  process.env[t.slice(0, eq).trim()] = v;
}

const tmp = path.join(tmpdir(), "studio-hosted-preview-t5");
mkdirSync(tmp, { recursive: true });

function parseHttpResponse(outBuf) {
  const out = Buffer.isBuffer(outBuf) ? outBuf : Buffer.from(String(outBuf ?? ""), "latin1");
  let httpIdx = -1;
  const marker = Buffer.from("HTTP/");
  for (let i = out.length - marker.length; i >= 0; i -= 1) {
    if (out.subarray(i, i + marker.length).equals(marker)) {
      httpIdx = i;
      break;
    }
  }
  const responseBuf = httpIdx >= 0 ? out.subarray(httpIdx) : out;
  const headerEnd = responseBuf.indexOf("\r\n\r\n");
  const headerBuf = headerEnd >= 0 ? responseBuf.subarray(0, headerEnd) : responseBuf;
  const bodyBuf = headerEnd >= 0 ? responseBuf.subarray(headerEnd + 4) : Buffer.alloc(0);
  const headers = headerBuf.toString("utf8");
  const statusMatches = [...headers.matchAll(/^HTTP\/[\d.]+ (\d+)/gm)];
  const status = statusMatches.length
    ? Number(statusMatches[statusMatches.length - 1][1])
    : 0;
  const setCookies = [...headers.matchAll(/^set-cookie:\s*([^\r\n]+)/gim)].map((m) =>
    m[1].split(";")[0].trim(),
  );
  return { status, headers, bodyBuf, bodyText: bodyBuf.toString("utf8"), setCookies };
}

function mergeSessionCookies(setCookies, prior) {
  const jar = new Map();
  if (prior) {
    for (const part of prior.split(";")) {
      const trimmed = part.trim();
      const eq = trimmed.indexOf("=");
      if (eq > 0) jar.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
  }
  for (const pair of setCookies) {
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  if (!jar.has("studio_session")) return prior ?? null;
  return `studio_session=${jar.get("studio_session")}`;
}

function vercelCurl(route, { method = "GET", body, cookie } = {}) {
  const args = [
    "vercel",
    "curl",
    route,
    "--deployment",
    deploymentId,
    "-i",
  ];
  if (method !== "GET") {
    args.push("-X", method);
  }
  if (body) {
    const bodyPath = path.join(tmp, `body-${randomBytes(4).toString("hex")}.json`);
    writeFileSync(bodyPath, JSON.stringify(body), "utf8");
    args.push("-H", "Content-Type: application/json", "--data-binary", `@${bodyPath}`);
  }
  if (cookie) {
    const cookiePath = path.join(tmp, `cookie-${randomBytes(4).toString("hex")}.txt`);
    writeFileSync(cookiePath, cookie.replace(/^Cookie:\s*/i, ""), "utf8");
    args.push("-H", `Cookie: ${readFileSync(cookiePath, "utf8").trim()}`);
  }
  const r = spawnSync("npx", args, {
    cwd: repoRoot,
    shell: false,
    maxBuffer: 24 * 1024 * 1024,
  });
  const parsed = parseHttpResponse(r.stdout);
  const sessionCookie = mergeSessionCookies(parsed.setCookies, cookie);
  return { ...parsed, cookie: sessionCookie };
}

function parseJsonUser(bodyText) {
  const jsonStart = bodyText.indexOf("{");
  const parsed = JSON.parse(bodyText.slice(jsonStart >= 0 ? jsonStart : 0));
  return parsed.user;
}

function registerClient(label) {
  const email = `scout-hosted-t5-${label}-${randomBytes(4).toString("hex")}@example.com`;
  const signup = vercelCurl("/api/auth/signup", {
    method: "POST",
    body: {
      email,
      password: TEST_PASSWORD,
      displayName: `Scout Hosted T5 ${label}`,
    },
  });
  if (signup.status !== 200) {
    console.error("signup_failed", label, signup.status, signup.bodyText.slice(0, 400));
    process.exit(1);
  }
  const login = vercelCurl("/api/auth/login", {
    method: "POST",
    body: { email, password: TEST_PASSWORD },
  });
  if (login.status !== 200) {
    console.error("login_failed", label, login.status, login.bodyText.slice(0, 400));
    process.exit(1);
  }
  let user;
  try {
    user = parseJsonUser(login.bodyText);
  } catch {
    console.error("login_user_parse_failed", login.bodyText.slice(0, 400));
    process.exit(1);
  }
  if (!user?.id || !login.cookie?.startsWith("studio_session=")) {
    console.error("login_missing_session", label);
    process.exit(1);
  }
  return { user, email, cookie: login.cookie };
}

const ownerClient = registerClient("owner");
const strangerClient = registerClient("stranger");
const campaignId = `disposable-hosted-t5-${randomBytes(4).toString("hex")}`;
const fixtureOut = path.join(tmp, "t5-fixture.json");

const seedEnv = {
  ...process.env,
  HOSTED_T5_SEED: "1",
  HOSTED_T5_CAMPAIGN_ID: campaignId,
  HOSTED_T5_CLIENT_USER_ID: ownerClient.user.id,
  HOSTED_T5_OUT: fixtureOut,
};
const seedRun = spawnSync(
  "npx",
  ["vitest", "run", "src/lib/studio-durable-persistence/hosted-preview-t5-fixture.test.ts"],
  { cwd: repoRoot, encoding: "utf8", shell: false, env: seedEnv },
);
if (seedRun.status !== 0) {
  console.error("seed_failed", seedRun.stdout, seedRun.stderr);
  process.exit(1);
}
const fixture = JSON.parse(readFileSync(fixtureOut, "utf8"));
const downloadPath = `/api/file-room/files/${encodeURIComponent(fixture.fileId)}/download`;

const sessionProbe = vercelCurl("/api/campaigns/current", { cookie: ownerClient.cookie });
console.log("session_probe_status", sessionProbe.status);
if (sessionProbe.status === 401) {
  console.error("owner_session_not_accepted_on_preview", sessionProbe.bodyText.slice(0, 200));
  process.exit(1);
}

const authorized = vercelCurl(downloadPath, { cookie: ownerClient.cookie });
console.log("authorized_status", authorized.status);
if (authorized.status !== 200) {
  console.error("authorized_body", authorized.bodyText.slice(0, 300));
  process.exit(1);
}
const authorizedSha = createHash("sha256").update(authorized.bodyBuf).digest("hex");
if (authorizedSha !== fixture.expectedSha256) {
  console.error("byte_mismatch", { expected: fixture.expectedSha256, got: authorizedSha });
  process.exit(1);
}

const denied = vercelCurl(downloadPath, { cookie: strangerClient.cookie });
console.log("stranger_status", denied.status);
if (denied.status !== 403) {
  console.error("stranger_body", denied.bodyText.slice(0, 300));
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    deploymentId,
    campaignId,
    fileId: fixture.fileId,
    authorizedStatus: authorized.status,
    strangerStatus: denied.status,
    sha256: authorizedSha,
    sessionPath: "signup_then_login",
  }),
);
