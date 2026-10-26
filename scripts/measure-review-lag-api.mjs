/**
 * Read-only Board → Review API timings. No PATCH. No approve. No send.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const BASE = "https://localhost:3000";
const PAID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const JOB = `${PAID}:v2-rtu-flyer`;

function secret() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith("SESSION_SECRET=")) {
      return line.slice("SESSION_SECRET=".length).trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("SESSION_SECRET is not configured");
}

function mint(user) {
  const payload = JSON.stringify({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    currentCampaignId: PAID,
    clientCampaignIds: user.clientCampaignIds ?? [],
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    issuedAt: Date.now(),
  });
  return `${Buffer.from(payload).toString("base64url")}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}

async function timed(label, url, headers) {
  const t0 = Date.now();
  const res = await fetch(url, { headers });
  const text = await res.text();
  return {
    label,
    status: res.status,
    ms: Date.now() - t0,
    bytes: text.length,
    href: (text.match(/href="(\/[^"]*feedback-studio[^"]*)"/) || [])[1] ?? null,
  };
}

const loginRes = await fetch(`${BASE}/api/auth/local-customer-one`, { method: "POST" });
if (!loginRes.ok) {
  throw new Error(`login ${loginRes.status}`);
}
const login = await loginRes.json();
const headers = { cookie: `studio_session=${mint(login.user)}` };

const board = await timed("board", `${BASE}/studio-board`, headers);
const campaign = await timed("campaign", `${BASE}/api/campaigns/${PAID}`, headers);
const stages = await timed("stages", `${BASE}/api/campaigns/${PAID}/stages`, headers);
const review = await timed(
  "job-review",
  `${BASE}/api/campaigns/${PAID}/jobs/${encodeURIComponent(JOB)}/review`,
  headers,
);
const pageNoId = await timed("review-page", `${BASE}/feedback-studio`, headers);
const pageId = await timed(
  "review-page-jobId",
  `${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB)}`,
  headers,
);
const parallelStarted = Date.now();
const [campaignP, reviewP] = await Promise.all([
  timed("campaign-parallel", `${BASE}/api/campaigns/${PAID}`, headers),
  timed(
    "job-review-parallel",
    `${BASE}/api/campaigns/${PAID}/jobs/${encodeURIComponent(JOB)}/review`,
    headers,
  ),
]);

console.log(
  JSON.stringify(
    {
      boardHref: board.href,
      boardMs: board.ms,
      campaign,
      stages,
      review,
      pageNoId: { status: pageNoId.status, ms: pageNoId.ms },
      pageId: { status: pageId.status, ms: pageId.ms },
      parallelWallMs: Date.now() - parallelStarted,
      parallel: { campaign: campaignP.ms, review: reviewP.ms },
    },
    null,
    2,
  ),
);
