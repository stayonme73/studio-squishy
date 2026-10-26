/**
 * Capture Lobby hydration console on a phone viewport.
 * Usage: node scripts/lobby-hydration-mismatch-probe.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.STUDIO_PROOF_ORIGIN ?? "https://localhost:3000";

async function probe(label, url, plantSessionSandbox) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      /hydrat|did not match|didn.t match|server rendered|A tree hydrated/i.test(
        text,
      )
    ) {
      logs.push({ type: msg.type(), text: text.slice(0, 2500) });
    }
  });
  page.on("pageerror", (error) => {
    logs.push({ type: "pageerror", text: String(error).slice(0, 1500) });
  });

  if (plantSessionSandbox) {
    await page.addInitScript(() => {
      sessionStorage.setItem("studio-payment:sandbox-opt-in:v1", "1");
    });
  }

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  const href = await page.evaluate(() => {
    const cta = document.querySelector(".lobby-entry-film__cta");
    return {
      url: window.location.href,
      ctaHref: cta?.getAttribute("href") ?? null,
      overlay: Boolean(
        document.querySelector("nextjs-portal, [data-nextjs-dialog]"),
      ),
      overlayText: document.querySelector("nextjs-portal")?.textContent?.slice(0, 800) ?? null,
    };
  });

  await browser.close();
  return { label, url, plantSessionSandbox, href, logs };
}

async function main() {
  const cases = await Promise.all([
    probe("url-sandbox", `${BASE}/studio-lobby?studioPaymentSandbox=1`, false),
    probe("session-only", `${BASE}/studio-lobby`, true),
    probe("clean", `${BASE}/studio-lobby`, false),
  ]);
  console.log(JSON.stringify(cases, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
