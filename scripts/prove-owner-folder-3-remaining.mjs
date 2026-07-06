/**
 * Owner Folder 3 remaining — API-first proof (deadline, revision, scope, refund, complaint, heavy lane).
 * Prerequisites: npm run dev on :3000
 *
 * Run: node scripts/prove-owner-folder-3-remaining.mjs
 */
import { execSync } from "node:child_process";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function login(email) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "dev-only" }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error("No session cookie");
  return match[1];
}

async function api(cookie, method, urlPath, body) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      Cookie: `studio_session=${cookie}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function proveExceptionFolder(cookie, campaignId, exceptionId, holdAction, resolveAction) {
  execSync("node scripts/seed-owner-folder-3-remaining.mjs", { stdio: "inherit" });

  const before = await api(cookie, "GET", `/api/campaigns/${campaignId}/tasks`);
  const excBefore = (before.json.exceptionRecords ?? []).find((e) => e.id === exceptionId);
  record(
    `${campaignId} — seed waiting_owner`,
    before.status === 200 && excBefore?.status === "waiting_owner",
    excBefore?.status,
  );

  const hold = await api(cookie, "PATCH", `/api/campaigns/${campaignId}/tasks`, holdAction);
  record(`${campaignId} — hold PATCH`, hold.status === 200, String(hold.status));

  const held = await api(cookie, "GET", `/api/campaigns/${campaignId}/tasks`);
  const excHeld = (held.json.exceptionRecords ?? []).find((e) => e.id === exceptionId);
  record(
    `${campaignId} — off Owner desk after hold`,
    excHeld?.status === "waiting_internal",
    excHeld?.status,
  );

  execSync("node scripts/seed-owner-folder-3-remaining.mjs", { stdio: "inherit" });

  const resolve = await api(cookie, "PATCH", `/api/campaigns/${campaignId}/tasks`, resolveAction);
  record(`${campaignId} — resolve PATCH`, resolve.status === 200, String(resolve.status));

  const after = await api(cookie, "GET", `/api/campaigns/${campaignId}/tasks`);
  const excAfter = (after.json.exceptionRecords ?? []).find((e) => e.id === exceptionId);
  record(
    `${campaignId} — exception resolved`,
    excAfter?.status === "resolved",
    excAfter?.status,
  );
}

async function main() {
  execSync("node scripts/seed-owner-folder-3-remaining.mjs", { stdio: "inherit" });
  const ownerCookie = await login("tagia@local.dev");

  await proveExceptionFolder(
    ownerCookie,
    "owner-deadline-v1",
    "exc-owner-deadline-v1",
    {
      action: "owner_hold_deadline",
      exceptionId: "exc-owner-deadline-v1",
      note: "Need schedule options.",
      ownerNotes: "Hold scheduling.",
    },
    {
      action: "owner_commit_deadline",
      exceptionId: "exc-owner-deadline-v1",
      ownerNotes: "Committed Friday delivery.",
    },
  );

  await proveExceptionFolder(
    ownerCookie,
    "owner-revision-v1",
    "exc-owner-revision-v1",
    {
      action: "owner_hold_revision",
      exceptionId: "exc-owner-revision-v1",
      note: "Need production assessment.",
      ownerNotes: "Internal review.",
    },
    {
      action: "owner_allow_revision",
      exceptionId: "exc-owner-revision-v1",
      ownerNotes: "One extra round approved.",
    },
  );

  await proveExceptionFolder(
    ownerCookie,
    "owner-scope-v1",
    "exc-owner-scope-v1",
    {
      action: "owner_hold_scope_change",
      exceptionId: "exc-owner-scope-v1",
      note: "Need plan analysis.",
      ownerNotes: "Scope review.",
    },
    {
      action: "owner_decline_scope_change",
      exceptionId: "exc-owner-scope-v1",
      ownerNotes: "Not in approved plan.",
    },
  );

  execSync("node scripts/seed-owner-folder-3-remaining.mjs", { stdio: "inherit" });
  const refundBefore = await api(ownerCookie, "GET", `/api/campaigns/owner-refund-v1/tasks`);
  const jobBefore = (refundBefore.json.jobRecords ?? []).find(
    (j) => j.jobId === "owner-refund-v1:sm-001",
  );
  record(
    "owner-refund-v1 — refund eligible",
    jobBefore?.refundEligibleAt && !jobBefore?.refundOwnerDecisionAt,
  );

  const denyRefund = await api(
    ownerCookie,
    "PATCH",
    `/api/campaigns/owner-refund-v1/jobs/${encodeURIComponent("owner-refund-v1:sm-001")}`,
    { action: "owner_deny_refund", ownerNotes: "Preference only." },
  );
  record("owner-refund-v1 — deny PATCH", denyRefund.status === 200, String(denyRefund.status));

  const refundAfter = await api(ownerCookie, "GET", `/api/campaigns/owner-refund-v1/tasks`);
  const jobAfter = (refundAfter.json.jobRecords ?? []).find(
    (j) => j.jobId === "owner-refund-v1:sm-001",
  );
  record(
    "owner-refund-v1 — decision recorded",
    Boolean(jobAfter?.refundOwnerDecisionAt),
    jobAfter?.refundOwnerDecisionAt,
  );

  execSync("node scripts/seed-owner-folder-3-remaining.mjs", { stdio: "inherit" });
  const complaintResolve = await api(ownerCookie, "PATCH", `/api/campaigns/owner-complaint-v1/tasks`, {
    action: "owner_resolve_complaint",
    interactionId: "interaction-owner-complaint-v1",
    clientReply: "Thank you for your patience — here is your project status.",
    ownerNotes: "Resolved with status summary.",
  });
  record(
    "owner-complaint-v1 — resolve PATCH",
    complaintResolve.status === 200,
    String(complaintResolve.status),
  );

  const complaintAfter = await api(ownerCookie, "GET", `/api/campaigns/owner-complaint-v1/tasks`);
  const interaction = (complaintAfter.json.ownerDecisionInteractions ?? []).find(
    (e) => e.id === "interaction-owner-complaint-v1",
  );
  record(
    "owner-complaint-v1 — interaction resolved",
    interaction?.status === "resolved",
    interaction?.status,
  );

  execSync("node scripts/seed-owner-folder-3-remaining.mjs", { stdio: "inherit" });
  const heavyResolve = await api(
    ownerCookie,
    "PATCH",
    `/api/campaigns/owner-heavy-lane-v1/jobs/${encodeURIComponent("owner-heavy-lane-v1:sm-002")}`,
    { action: "owner_resolve_heavy_lane", decision: "wait", ownerNotes: "Active job finishes tomorrow." },
  );
  record(
    "owner-heavy-lane-v1 — resolve PATCH",
    heavyResolve.status === 200,
    String(heavyResolve.status),
  );

  const heavyAfter = await api(ownerCookie, "GET", `/api/campaigns/owner-heavy-lane-v1/tasks`);
  const queuedJob = (heavyAfter.json.jobRecords ?? []).find(
    (j) => j.jobId === "owner-heavy-lane-v1:sm-002",
  );
  record(
    "owner-heavy-lane-v1 — lane decision recorded",
    queuedJob?.heavyLaneOwnerDecision === "wait",
    queuedJob?.heavyLaneOwnerDecision,
  );

  const failed = results.filter((entry) => !entry.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
