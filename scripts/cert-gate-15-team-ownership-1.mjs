/**
 * GATE-15-TEAM-OWNERSHIP-CERT-1 — File Room task ownership presentation honesty.
 *
 * Env:
 *   CERT_BASE_URL   optional — if unset, script starts `next dev` on CERT_PORT
 *   CERT_PORT       default 3055
 *   CERT_COMMIT     tip recorded in report
 *   SESSION_SECRET  used when starting local server (ephemeral cert value OK)
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = process.env.CERT_PORT || "3055";
const EXTERNAL_BASE = process.env.CERT_BASE_URL || "";
const COMMIT = process.env.CERT_COMMIT || "unspecified";
const OUT = join(process.cwd(), "test-artifacts", "gate-15-team-ownership-1");
const SESSION_SECRET =
  process.env.SESSION_SECRET || "gate-15-cert-ephemeral-not-for-production";

const OWNER_LOGIN = { email: "tagia@local.dev", password: "dev-only" };

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "phone-390", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

/** @type {{ check: string, status: "PASS"|"FAIL"|"BLOCKED"|"LIMIT", detail?: string }[]} */
const results = [];

function push(check, status, detail) {
  results.push({ check, status, detail });
  console.log(`${status.padEnd(14)} ${check}${detail ? ` — ${detail}` : ""}`);
}

function buildCampaign(campaignId) {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Gate 15 Ownership Cert",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Gate 15 presentation honesty",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 50000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 50000,
      lineItems: [
        {
          skuId: "sm-001",
          serviceName: "Social Media Launch Set",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: ["Posts"],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Brand logo and photos"],
          executionResponsibility: "shared",
        },
      ],
      approvedAt: now,
    },
    selectedCampaignOption: "Option A — Bold",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        workingOn: "Gate 15 ownership",
        mainOffer: "Launch",
        primaryApproverName: "Client",
        primaryApproverEmail: "client@local.dev",
      },
      files: [],
      submittedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

async function waitForServer(base, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${base}/api/auth/login`, { method: "GET" });
      if (res.ok || res.status === 405 || res.status === 400) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function startLocalServer() {
  const child = spawn("npx", ["next", "dev", "-p", PORT], {
      cwd: process.cwd(),
      env: { ...process.env, SESSION_SECRET },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    },
  );
  child.stdout?.on("data", () => {});
  child.stderr?.on("data", () => {});
  const base = `http://localhost:${PORT}`;
  const ready = await waitForServer(base);
  if (!ready) {
    child.kill();
    throw new Error(`Local next dev did not become ready on ${base}`);
  }
  return { child, base };
}

async function seedCampaign(base) {
  const campaignId = `gate15-${randomUUID().slice(0, 8)}`;
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(OWNER_LOGIN),
  });
  if (!loginRes.ok) {
    throw new Error(`Owner login failed: ${loginRes.status}`);
  }
  const setCookie = loginRes.headers.getSetCookie?.() ?? [];
  const cookie =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    loginRes.headers.get("set-cookie")?.split(";")[0] ||
    "";

  const patchRes = await fetch(`${base}/api/campaigns/current`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ record: buildCampaign(campaignId) }),
  });
  if (!patchRes.ok) {
    const text = await patchRes.text();
    throw new Error(`Seed campaign failed: ${patchRes.status} ${text.slice(0, 200)}`);
  }

  const tasksRes = await fetch(`${base}/api/campaigns/${campaignId}/tasks`, {
    headers: { Cookie: cookie },
  });
  if (!tasksRes.ok) {
    throw new Error(`Generate tasks failed: ${tasksRes.status}`);
  }
  const tasksJson = await tasksRes.json();
  const tasks = tasksJson.tasks ?? [];
  if (tasks.length === 0) throw new Error("No tasks generated for Gate 15 campaign");

  const claimable =
    tasks.find((task) => task.status === "ready" || task.workflowState === "unstarted") ??
    tasks[0];
  const claimRes = await fetch(`${base}/api/campaigns/${campaignId}/tasks`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      action: "claim",
      taskId: claimable.id,
      from: claimable.workflowState ?? "unstarted",
      claimVersion: claimable.claimedAt ?? null,
    }),
  });
  if (!claimRes.ok) {
    throw new Error(`Claim seed failed: ${claimRes.status}`);
  }

  return { campaignId, cookie, tasks };
}

async function overflowX(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(
      doc.scrollWidth - doc.clientWidth,
      body.scrollWidth - body.clientWidth,
    );
  });
}

async function runViewport(browser, base, campaignId, _cookieHeader, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await context.newPage();
  const vpId = vp.id;

  try {
    const health = await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
    push(`${vpId}: Server health`, health && health.ok() ? "PASS" : "FAIL", base);

    const loginRes = await page.request.post(`${base}/api/auth/login`, {
      data: OWNER_LOGIN,
    });
    push(
      `${vpId}: Owner login for File Room`,
      loginRes.ok() ? "PASS" : "FAIL",
      `HTTP ${loginRes.status()}`,
    );

    const frRes = await page.goto(`${base}/file-room/${campaignId}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    push(
      `${vpId}: File Room HTTP`,
      frRes && frRes.ok() ? "PASS" : "FAIL",
      `HTTP ${frRes?.status()} url=${page.url()}`,
    );
    await page.waitForTimeout(1200);

    const ownershipNodes = page.locator("[data-fr-task-ownership]");
    const count = await ownershipNodes.count();
    push(
      `${vpId}: File Room shows task ownership lines`,
      count > 0 ? "PASS" : "FAIL",
      `ownershipNodes=${count}`,
    );

    if (count > 0) {
      const roleText = await page.locator("[data-fr-task-responsible-role]").first().innerText();
      const claimText = await page.locator("[data-fr-task-claim-status]").first().innerText();
      push(
        `${vpId}: Responsible role is visible`,
        /Responsible role:/i.test(roleText) ? "PASS" : "FAIL",
        roleText.trim(),
      );
      push(
        `${vpId}: Claim status is never blank`,
        claimText.trim().length > 0 ? "PASS" : "FAIL",
        claimText.trim(),
      );
      push(
        `${vpId}: Unclaimed or Claimed by is explicit`,
        /Unclaimed|Claimed by/i.test(claimText) ? "PASS" : "FAIL",
        claimText.trim(),
      );

      const attrs = await ownershipNodes.evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-fr-task-ownership")),
      );
      const hasUnclaimed = attrs.includes("unclaimed");
      const hasClaimed = attrs.includes("claimed");
      push(
        `${vpId}: At least one Unclaimed task after seed`,
        hasUnclaimed ? "PASS" : "FAIL",
        attrs.join(","),
      );
      push(
        `${vpId}: At least one Claimed task after claim seed`,
        hasClaimed ? "PASS" : "FAIL",
        attrs.join(","),
      );
      if (hasClaimed) {
        const claimedText = await page
          .locator('[data-fr-task-ownership="claimed"] [data-fr-task-claim-status]')
          .first()
          .innerText();
        push(
          `${vpId}: Claimed by name is visible`,
          /Claimed by/i.test(claimedText) ? "PASS" : "FAIL",
          claimedText.trim(),
        );
      }
    }

    const ox = await overflowX(page);
    push(
      `${vpId}: File Room no horizontal overflow`,
      ox <= 1 ? "PASS" : "FAIL",
      `overflowX=${ox}`,
    );
  } finally {
    await context.close();
  }
}

async function main() {
  let child = null;
  let base = EXTERNAL_BASE;
  try {
    if (!base) {
      const started = await startLocalServer();
      child = started.child;
      base = started.base;
      push("Local next dev started for cert", "PASS", base);
    } else {
      push("Using external CERT_BASE_URL", "PASS", base);
    }

    const { campaignId, cookie } = await seedCampaign(base);
    push("Seeded campaign + generated tasks", "PASS", campaignId);

    const browser = await chromium.launch({ headless: true });
    try {
      for (const vp of VIEWPORTS) {
        await runViewport(browser, base, campaignId, cookie, vp);
      }
    } finally {
      await browser.close();
    }

    push(
      "Limits retained (dashboards / trays / SLA / second ledger)",
      "LIMIT",
      "documented V1 boundaries — not Gate #15 failures",
    );
  } catch (error) {
    push("Cert harness", "FAIL", error instanceof Error ? error.message : String(error));
  } finally {
    if (child) {
      child.kill("SIGTERM");
    }
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const limit = results.filter((r) => r.status === "LIMIT").length;
  const report = {
    package: "GATE-15-TEAM-OWNERSHIP-CERT-1",
    commit: COMMIT,
    base,
    pass,
    fail,
    limit,
    results,
  };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(`\nSUMMARY  PASS=${pass} FAIL=${fail} LIMIT=${limit}  commit=${COMMIT}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
