/**
 * Foundation Pass 1 — authenticated Incident Command proof.
 * Reads Owner credentials from the local seed file. Does not print them.
 * Hard-stops in 90 seconds. Does not wait on a browser fill.
 *
 * Usage: node scripts/prove-foundation-pass-1-incident-command.mjs
 */
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const HARD_STOP_MS = 90_000;
const ACTION_TIMEOUT_MS = 20_000;
const OUT_DIR = path.resolve(
  "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/review-evidence",
);
const SEED_PATH = path.resolve("src/lib/auth/studio-users.seed.json");
const OWNER_EMAIL = "tagia@local.dev";
const LIST_PATH = "/file-room/incident-command";
const SECURITY_ID = "inc_fixture_security";

function fail(message) {
  throw new Error(message);
}

async function loadOwnerPassword() {
  const seed = JSON.parse(await readFile(SEED_PATH, "utf8"));
  const owner = seed.find((user) => user.email === OWNER_EMAIL);
  if (!owner?.password) fail("Owner seed identity is missing from the local fixture file.");
  return owner.password;
}

function cookieValue(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function login() {
  const password = await loadOwnerPassword();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: OWNER_EMAIL, password }),
      signal: controller.signal,
    });
  } catch (error) {
    fail(
      `Authenticated login fetch stalled or failed within ${ACTION_TIMEOUT_MS}ms: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) fail(`Owner login failed with HTTP ${res.status}.`);
  const token = cookieValue(res.headers.get("set-cookie") ?? "", "studio_session");
  if (!token) fail("Login succeeded but no studio_session cookie was returned.");
  return token;
}

async function fetchHtml(cookie, urlPath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ACTION_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${BASE}${urlPath}`, {
      headers: { Cookie: `studio_session=${cookie}` },
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (error) {
    fail(
      `GET ${urlPath} stalled or failed within ${ACTION_TIMEOUT_MS}ms: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  } finally {
    clearTimeout(timer);
  }
  if (res.status >= 300 && res.status < 400) {
    fail(`GET ${urlPath} redirected to ${res.headers.get("location") ?? "unknown"} (HTTP ${res.status}).`);
  }
  if (!res.ok) fail(`GET ${urlPath} failed with HTTP ${res.status}.`);
  return res.text();
}

function readable(html) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<!-- -->/g, "");
}

function mustContain(label, html, snippets) {
  const haystack = readable(html);
  const missing = snippets.filter((snippet) => !haystack.includes(snippet));
  if (missing.length) fail(`${label} missing: ${missing.join(" | ")}`);
}

function mustNotContain(label, html, snippets) {
  const haystack = readable(html);
  const present = snippets.filter((snippet) => haystack.includes(snippet));
  if (present.length) fail(`${label} unexpectedly contains: ${present.join(" | ")}`);
}

function firstRoutineHref(listHtml) {
  const articles = listHtml.split("<article");
  for (const article of articles) {
    if (!article.includes("ROUTINE") || article.includes("SECURITY_SUSPECTED")) continue;
    const match = article.match(/href="(\/file-room\/incident-command\/[^"]+)"/);
    if (match) return match[1];
  }
  fail("No ROUTINE incident link was found on Incident Command.");
}

async function screenshot(page, urlPath, fileName) {
  await page.goto(`${BASE}${urlPath}`, {
    waitUntil: "domcontentloaded",
    timeout: ACTION_TIMEOUT_MS,
  });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT_DIR, fileName),
    fullPage: true,
    timeout: ACTION_TIMEOUT_MS,
  });
  console.log(`captured ${fileName}`);
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const cookie = await login();
  console.log("authenticated as tagia@local.dev via seed fixture");

  const listHtml = await fetchHtml(cookie, LIST_PATH);
  await writeFile(path.join(OUT_DIR, "incident-command-list.html"), listHtml, "utf8");
  mustContain("Incident Command list", listHtml, [
    "Incident Command",
    "SECURITY_SUSPECTED",
    "ROUTINE",
    "Maple & Pine Books",
    "Harbor Lantern Co.",
    "Watchkeeper is hidden",
    "NOT_CONNECTED",
  ]);
  mustNotContain("Incident Command list", listHtml, [
    "/squishy/squishy-studio-guide-v1.png",
  ]);

  const routinePath = firstRoutineHref(listHtml);
  const securityPath = `${LIST_PATH}/${SECURITY_ID}`;
  const routineHtml = await fetchHtml(cookie, routinePath);
  const securityHtml = await fetchHtml(cookie, securityPath);
  await writeFile(path.join(OUT_DIR, "incident-command-routine.html"), routineHtml, "utf8");
  await writeFile(path.join(OUT_DIR, "incident-command-security.html"), securityHtml, "utf8");

  mustContain("routine incident", routineHtml, [
    "Maple & Pine Books",
    "Project",
    "Campaign",
    "What happened",
    "Who or what stalled",
    "Current impact",
    "ROUTINE",
  ]);
  if (!readable(routineHtml).includes("/squishy/squishy-studio-guide-v1.png")) {
    fail("routine incident is missing the canonical Watchkeeper image.");
  }
  const routineHasHistory =
    readable(routineHtml).includes("Append-only history") ||
    readable(routineHtml).includes("append-only");
  const routineHasNextCheck =
    readable(routineHtml).includes("Next check") ||
    readable(routineHtml).includes("next check");
  if (!routineHasHistory) fail("routine incident is missing append-only history.");
  if (!routineHasNextCheck) fail("routine incident is missing next-check time.");

  mustContain("security incident", securityHtml, [
    "SECURITY_SUSPECTED",
    "fr-incident-command--critical",
    "Maple & Pine Books",
  ]);
  const securityText = readable(securityHtml);
  if (securityText.includes("/squishy/squishy-studio-guide-v1.png")) {
    fail("security incident unexpectedly shows Squishy.");
  }
  if (!/Watchkeeper is (hidden|not shown|not used)/.test(securityText)) {
    fail("security incident is missing the hidden-Watchkeeper warning.");
  }
  if (!/append-only/i.test(securityText)) {
    fail("security incident is missing append-only history.");
  }
  if (!/next check/i.test(securityText)) {
    fail("security incident is missing next-check time.");
  }
  mustNotContain("security incident", securityHtml, [
    "/squishy/squishy-studio-guide-v1.png",
  ]);

  const browser = await chromium.launch({
    headless: true,
    timeout: ACTION_TIMEOUT_MS,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.addCookies([
      {
        name: "studio_session",
        value: cookie,
        url: BASE,
      },
    ]);
    const page = await context.newPage();
    page.setDefaultTimeout(ACTION_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(ACTION_TIMEOUT_MS);
    await screenshot(page, LIST_PATH, "incident-command-list.png");
    await screenshot(page, routinePath, "incident-command-routine.png");
    await screenshot(page, securityPath, "incident-command-security.png");
  } finally {
    await browser.close();
  }

  await writeFile(
    path.join(OUT_DIR, "proof-summary.json"),
    JSON.stringify(
      {
        status: "PASS",
        identity: OWNER_EMAIL,
        listPath: LIST_PATH,
        routinePath,
        securityPath,
        authPath: "POST /api/auth/login from local seed fixture",
        screenshots: [
          "incident-command-list.png",
          "incident-command-routine.png",
          "incident-command-security.png",
        ],
        notes: [
          "List hides Watchkeeper because a security incident is open.",
          "Routine detail shows canonical Squishy Watchkeeper.",
          "Security detail is critical and does not show Squishy.",
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log("Foundation Pass 1 browser proof PASS");
}

const timeout = setTimeout(() => {
  console.error(`BLOCKED: proof exceeded ${HARD_STOP_MS}ms hard stop.`);
  process.exit(2);
}, HARD_STOP_MS);

run()
  .catch((error) => {
    console.error(`BLOCKED: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  })
  .finally(() => {
    clearTimeout(timeout);
  });
