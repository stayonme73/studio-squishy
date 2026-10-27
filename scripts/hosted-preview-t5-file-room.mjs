/**
 * STUDIO-HOSTED-PREVIEW-SHARP-FIX-FINAL-CLOSEOUT — hosted Preview T5 (Test only).
 * Legitimate Preview signup + login; session via curl cookie jar (-c/-b), not forged tokens.
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

function parseHttpResponse(out) {
  const text = String(out ?? "");
  const httpIdx = text.indexOf("HTTP/");
  const slice = httpIdx >= 0 ? text.slice(httpIdx) : text;
  const headerEnd = slice.indexOf("\r\n\r\n");
  const headers = headerEnd >= 0 ? slice.slice(0, headerEnd) : slice;
  const bodyText = headerEnd >= 0 ? slice.slice(headerEnd + 4) : "";
  const bodyBuf = Buffer.from(bodyText, "latin1");
  const statusMatch = headers.match(/^HTTP\/[\d.]+ (\d+)/m);
  const status = statusMatch ? Number(statusMatch[1]) : 0;
  return { status, headers, bodyBuf, bodyText };
}

function vercelCurl(route, { method = "GET", body, jar } = {}) {
  const args = ["vercel", "curl", route, "--deployment", deploymentId, "-i"];
  if (method !== "GET") {
    args.push("-X", method);
  }
  if (body) {
    const bodyPath = path.join(tmp, `body-${randomBytes(4).toString("hex")}.json`);
    writeFileSync(bodyPath, JSON.stringify(body), "utf8");
    const bodyArg = bodyPath.replace(/\\/g, "/");
    args.push("-H", "Content-Type: application/json", "--data-binary", `@${bodyArg}`);
  }
  if (jar) {
    args.push("-b", jar.replace(/\\/g, "/"), "-c", jar.replace(/\\/g, "/"));
  }
  const r = spawnSync("npx", args, {
    cwd: repoRoot,
    shell: true,
    maxBuffer: 24 * 1024 * 1024,
  });
  return parseHttpResponse(`${r.stdout ?? ""}`);
}

function parseJsonUser(bodyText) {
  const jsonStart = bodyText.indexOf("{");
  return JSON.parse(bodyText.slice(jsonStart >= 0 ? jsonStart : 0)).user;
}

function registerClient(label) {
  const email = `scout-hosted-t5-${label}-${randomBytes(4).toString("hex")}@example.com`;
  const jar = path.join(tmp, `${label}-${randomBytes(4).toString("hex")}.cookies.txt`);
  const signup = vercelCurl("/api/auth/signup", {
    method: "POST",
    jar,
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
    jar,
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
  if (!user?.id) {
    console.error("login_missing_user", label);
    process.exit(1);
  }
  const probe = vercelCurl("/api/campaigns/current", { jar });
  if (probe.status === 401) {
    console.error("session_jar_not_accepted", label);
    process.exit(1);
  }
  return { user, email, jar };
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
  { cwd: repoRoot, encoding: "utf8", shell: true, env: seedEnv },
);
if (seedRun.status !== 0) {
  console.error("seed_failed", seedRun.stdout, seedRun.stderr);
  process.exit(1);
}
const fixture = JSON.parse(readFileSync(fixtureOut, "utf8"));
const downloadPath = `/api/file-room/files/${encodeURIComponent(fixture.fileId)}/download`;

const authorized = vercelCurl(downloadPath, { jar: ownerClient.jar });
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

const denied = vercelCurl(downloadPath, { jar: strangerClient.jar });
console.log("stranger_status", denied.status);
if (denied.status !== 403) {
  console.error("stranger_body", denied.bodyText.slice(0, 300));
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    deploymentId,
    previewOrigin,
    campaignId,
    fileId: fixture.fileId,
    authorizedStatus: authorized.status,
    strangerStatus: denied.status,
    sha256: authorizedSha,
    sessionPath: "signup_login_cookie_jar",
  }),
);
