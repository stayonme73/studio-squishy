/**
 * Builder QA: Studio Board refund control is collapsed, not removed.
 * Phone + desktop. Does not submit a refund. Does not remint Maya. Does not merge.
 *
 * Usage: node scripts/mobile-board-refund-collapse-qa.mjs
 * Requires HTTPS Studio on localhost:3000.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const PAID_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

function loadSessionSecret() {
  const raw = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("SESSION_SECRET=")) continue;
    return line.slice("SESSION_SECRET=".length).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("SESSION_SECRET is not configured");
}

function mintSessionCookie(user, currentCampaignId) {
  const payload = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    currentCampaignId,
    clientCampaignIds: user.clientCampaignIds ?? [],
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    issuedAt: Date.now(),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadPart = Buffer.from(payloadJson).toString("base64url");
  const signature = createHmac("sha256", loadSessionSecret())
    .update(payloadJson)
    .digest("base64url");
  return `${payloadPart}.${signature}`;
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function signInCustomerOne(context) {
  const login = await context.request.post(`${BASE}/api/auth/local-customer-one`, {
    timeout: 30000,
  });
  const loginBody = await login.json();
  if (!login.ok() || !loginBody?.user?.id) {
    throw new Error("Customer-One fixture login failed");
  }
  const token = mintSessionCookie(loginBody.user, PAID_ID);
  await context.addCookies([
    {
      name: "studio_session",
      value: token,
      url: BASE,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

async function inspectRefund(page) {
  const summary = page.locator("[data-refund-disclosure] > summary").first();
  await summary.waitFor({ state: "visible", timeout: 20000 });
  const review = page.getByRole("button", { name: "Request refund review" });
  const policy = page.getByRole("link", {
    name: /Refund\/Cancellation Policy/i,
  });
  const collapsed = {
    summary: (await summary.innerText()).replace(/\s+/g, " ").trim(),
    reviewVisible: await review.isVisible().catch(() => false),
    policyVisible: await policy.isVisible().catch(() => false),
    refundRequestBillboard: /REFUND REQUEST/.test(await page.locator("body").innerText()),
    detailsOpen: await page.locator("[data-refund-disclosure]").evaluate((el) =>
      el instanceof HTMLDetailsElement ? el.open : false,
    ),
  };
  await summary.click();
  await review.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  const expanded = {
    reviewVisible: await review.isVisible().catch(() => false),
    policyVisible: await policy.isVisible().catch(() => false),
    policyHref: await policy.getAttribute("href").catch(() => null),
    eligibility: await page
      .locator(".sb-refund-request__eligibility")
      .innerText()
      .catch(() => ""),
    detailsOpen: await page.locator("[data-refund-disclosure]").evaluate((el) =>
      el instanceof HTMLDetailsElement ? el.open : false,
    ),
  };
  return { collapsed, expanded };
}

async function runViewport(browser, label, viewport) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    ...viewport,
  });
  await signInCustomerOne(context);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${BASE}/studio-board`, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector("[data-refund-disclosure]", { timeout: 20000 });
  const proofs = [];
  proofs.push(await shot(page, `refund-collapse-${label}-01-collapsed.png`));
  const result = await inspectRefund(page);
  proofs.push(await shot(page, `refund-collapse-${label}-02-expanded.png`));
  await context.close();
  return { label, proofs, ...result };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { ok: false, phone: null, desktop: null };

  try {
    report.phone = await runViewport(browser, "phone", {
      viewport: { width: 360, height: 780 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    report.desktop = await runViewport(browser, "desktop", {
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });

    for (const pass of [report.phone, report.desktop]) {
      if (pass.collapsed.detailsOpen) {
        throw new Error(`${pass.label}: refund disclosure was open by default`);
      }
      if (pass.collapsed.reviewVisible) {
        throw new Error(`${pass.label}: Request refund review was visible while collapsed`);
      }
      if (pass.collapsed.refundRequestBillboard) {
        throw new Error(`${pass.label}: REFUND REQUEST billboard is still on the Board`);
      }
      if (!/Billing & cancellation/i.test(pass.collapsed.summary)) {
        throw new Error(`${pass.label}: collapsed summary is not Billing & cancellation`);
      }
      if (!pass.expanded.detailsOpen || !pass.expanded.reviewVisible) {
        throw new Error(`${pass.label}: expanded state is missing Request refund review`);
      }
      if (!pass.expanded.policyVisible || !/policy-refund-policy/.test(pass.expanded.policyHref || "")) {
        throw new Error(`${pass.label}: Help Center refund policy link is missing`);
      }
      if (!/may be limited|may request cancellation/i.test(pass.expanded.eligibility)) {
        throw new Error(`${pass.label}: stage eligibility copy is missing`);
      }
    }

    report.ok = true;
    await writeFile(
      path.join(OUT, "refund-collapse-qa.json"),
      JSON.stringify(report, null, 2),
    );
    console.log("PASS refund collapse UX");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("FAIL refund collapse UX");
  console.error(error);
  process.exit(1);
});
