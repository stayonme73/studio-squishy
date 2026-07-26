/**
 * CR-4R corrected interaction proof.
 * - Targets Session strip controls only (ConversationNavPanel).
 * - Catalogs every "Return to Lobby" instance before acting.
 * - No force:true. No clicking hidden/duplicate controls.
 * - Reachability: control must be in the viewport, or inside a visible
 *   Session scroll region a customer can naturally use.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://127.0.0.1:3014";
const OUT = join(process.cwd(), "test-artifacts", "cr4r-interaction-proof");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { id: "desktop-1440", width: 1440, height: 900 },
  { id: "phone-390", width: 390, height: 844 },
  { id: "phone-360", width: 360, height: 800 },
];

const results = [];
function push(check, ok, detail = "") {
  results.push({ check, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${check}${detail ? ` — ${detail}` : ""}`);
}

async function installSpeechProbe(page) {
  await page.addInitScript(() => {
    window.__cr4SpeechCalls = 0;
    const synth = window.speechSynthesis;
    if (!synth?.speak) return;
    const orig = synth.speak.bind(synth);
    synth.speak = (u) => {
      window.__cr4SpeechCalls = (window.__cr4SpeechCalls || 0) + 1;
      return orig(u);
    };
  });
}

async function clearState(page) {
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

async function seedServices(page) {
  await page.evaluate(() => {
    const location = "conversation-room-stage:services";
    const draft = {
      version: 1,
      status: "working_draft",
      editable: true,
      updatedAt: new Date().toISOString(),
      revision: 2,
      cursor: { conversationLocation: location, flowStep: "services" },
      attribution: [],
      slices: {
        currentConversationLocation: location,
        discoveryAnswers: {
          preferredName: "Cert",
          projectNeed: "Flyer",
          businessName: "Cafe",
          requestedDeadline: "",
          deadlineStatus: "not_requested",
          existingMaterialsNote: "",
          confirmedAt: "2026-07-26T12:00:00.000Z",
        },
        customerSelectedRoute: {
          roadId: "i20",
          selectedAt: "2026-07-26T12:01:00.000Z",
        },
        selectedServices: [
          {
            jobId: "v2-rtu-flyer",
            roadId: "i20",
            addedAt: "2026-07-26T12:02:00.000Z",
          },
        ],
      },
    };
    localStorage.setItem(
      "studio-squishy:working-draft:v1",
      JSON.stringify(draft),
    );
    sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
  });
}

/** Catalog every Return to Lobby control — Session strip is authoritative. */
async function catalogLobbyButtons(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")].filter((b) =>
      /Return to Lobby/i.test(b.textContent || ""),
    );
    return buttons.map((el, index) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      const inSessionStrip = !!el.closest(
        '[aria-label="Studio control strip"]',
      );
      const inStudioSection = !!el.closest('[aria-label="Studio"]');
      const inDiscoveryTablet = !!el.closest(
        "[data-discovery-tablet], [data-studio-surface='tablet']",
      );
      return {
        index,
        accessibleName: (el.textContent || "").replace(/\s+/g, " ").trim(),
        inSessionStrip,
        inStudioSection,
        inDiscoveryTablet,
        id: el.id || null,
        visible:
          st.visibility !== "hidden" &&
          st.display !== "none" &&
          Number(st.opacity) > 0 &&
          r.width > 0 &&
          r.height > 0,
        box: {
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          top: r.top,
          bottom: r.bottom,
        },
        pointerEvents: st.pointerEvents,
      };
    });
  });
}

/**
 * Customer reachability for a Session control.
 * Accepts: fully in viewport with clear hit target, OR inside the visible
 * Studio control strip (ConversationNavPanel) when that strip scrolls.
 * Rejects: covered by scrim/activity panel, or clipped with no visible
 * scrollable Session strip.
 */
async function assessSessionReachability(page, controlSelector) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return { ok: false, reason: "missing-control", mode: "missing" };

    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const fullyInViewport =
      r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= vw;

    const strip = el.closest('[aria-label="Studio control strip"]');
    const navWrap = el.closest('[data-studio-surface="navigation"]');
    const scrollRoot = strip || navWrap;
    const srBox = scrollRoot?.getBoundingClientRect();
    const srStyle = scrollRoot ? getComputedStyle(scrollRoot) : null;
    const wrapStyle = navWrap ? getComputedStyle(navWrap) : null;
    const wrapBox = navWrap?.getBoundingClientRect();
    const stripOnScreen =
      !!srBox && srBox.bottom > 0 && srBox.top < vh && srBox.height > 40;
    const wrapOnScreen =
      !!wrapBox &&
      wrapBox.bottom > 0 &&
      wrapBox.top < vh &&
      wrapBox.height > 40;
    const stripScrollable =
      !!scrollRoot &&
      !!srStyle &&
      ["auto", "scroll"].includes(srStyle.overflowY || srStyle.overflow) &&
      scrollRoot.scrollHeight > scrollRoot.clientHeight + 4;
    const wrapScrollable =
      !!navWrap &&
      !!wrapStyle &&
      ["auto", "scroll"].includes(wrapStyle.overflowY || wrapStyle.overflow) &&
      navWrap.scrollHeight > navWrap.clientHeight + 4;
    const wrapFixed = wrapStyle?.position === "fixed";
    const stripFixed = srStyle?.position === "fixed";

    const sampleY = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
    const sampleX = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
    const inClip =
      !!srBox &&
      r.top < srBox.bottom &&
      r.bottom > srBox.top &&
      r.left < srBox.right &&
      r.right > srBox.left;
    const hit =
      fullyInViewport || (stripOnScreen && inClip)
        ? document.elementFromPoint(sampleX, sampleY)
        : null;
    const hitIsSelfOrChild = !!(hit && (hit === el || el.contains(hit)));
    const hitLabel = hit
      ? {
          tag: hit.tagName,
          aria: hit.getAttribute("aria-label"),
          id: hit.id || null,
          text: (hit.textContent || "").trim().slice(0, 48),
        }
      : null;

    const room = document.querySelector(
      '[aria-label="Studio Conversation Room"]',
    );
    const slideOpen = room?.getAttribute("data-slide-open") === "true";
    const scrim = document.querySelector(
      '[aria-label="Close activity panel"]',
    );
    const scrimBox = scrim?.getBoundingClientRect();
    const scrimCoversControl =
      !!scrimBox &&
      r.left < scrimBox.right &&
      r.right > scrimBox.left &&
      r.top < scrimBox.bottom &&
      r.bottom > scrimBox.top &&
      sampleX >= scrimBox.left;

    let ok = false;
    let mode = "unreachable";
    let reason = "";

    if (scrimCoversControl && hitLabel?.aria === "Close activity panel") {
      ok = false;
      mode = "scrim-shield";
      reason = "Activity scrim covers Session control";
    } else if (fullyInViewport && (hitIsSelfOrChild || !hit)) {
      ok = true;
      mode = "in-viewport-direct";
      reason = "Session control visible in viewport";
    } else if (stripOnScreen && stripScrollable) {
      ok = true;
      mode = "visible-session-strip-scroll";
      reason =
        "Studio control strip is on-screen and scrollable; Session controls live in that strip";
    } else if (wrapOnScreen && wrapFixed) {
      ok = true;
      mode = "fixed-session-band";
      reason =
        wrapScrollable || stripScrollable
          ? "Session strip pinned in reserved mobile band; internal scroll OK"
          : "Session strip pinned in reserved mobile band and on-screen";
    } else if (stripOnScreen && stripFixed) {
      ok = true;
      mode = "fixed-session-band";
      reason = "Session strip pinned in reserved mobile band";
    } else {
      ok = false;
      mode = "hidden-or-shielded";
      reason = `not reachable (inViewport=${fullyInViewport}; stripOnScreen=${stripOnScreen}; stripScrollable=${stripScrollable}; hit=${hitLabel?.aria || hitLabel?.tag || "none"})`;
    }

    return {
      ok,
      mode,
      reason,
      fullyInViewport,
      hitIsSelfOrChild,
      hitLabel,
      slideOpen,
      scrimCoversControl,
      strip: scrollRoot
        ? {
            aria: scrollRoot.getAttribute("aria-label"),
            surface: scrollRoot.getAttribute("data-studio-surface"),
            position: srStyle?.position,
            onScreen: stripOnScreen,
            scrollable: stripScrollable,
            fixed: stripFixed,
            scrollHeight: scrollRoot.scrollHeight,
            clientHeight: scrollRoot.clientHeight,
            box: {
              top: srBox.top,
              bottom: srBox.bottom,
              height: srBox.height,
            },
            wrapFixed,
            wrapOnScreen,
            wrapScrollable,
          }
        : null,
      controlBox: { top: r.top, bottom: r.bottom, height: r.height },
    };
  }, controlSelector);
}

async function clickSessionControl(page, roleName) {
  const locator = page
    .locator('[aria-label="Studio control strip"]')
    .getByRole("button", { name: roleName });
  const handle = await locator.elementHandle();
  if (!handle) throw new Error(`missing ${roleName}`);
  /* Scroll only inside the visible Studio control strip — customer gesture. */
  await page.evaluate((el) => {
    const strip = el.closest('[aria-label="Studio control strip"]');
    if (!strip) return;
    const er = el.getBoundingClientRect();
    const sr = strip.getBoundingClientRect();
    if (er.bottom > sr.bottom || er.top < sr.top) {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, handle);
  await locator.click({ timeout: 5000, force: false });
}

async function main() {
  const health = await fetch(BASE).catch((e) => e);
  if (health instanceof Error || !health.ok) {
    push("server health", false, String(health));
    process.exit(2);
  }
  push("server health", true, BASE);

  const browser = await chromium.launch({ headless: true });
  try {
    /* ---- Voice preference at three viewports ---- */
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await installSpeechProbe(page);
      await page.goto(`${BASE}/studio-conversation-room`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await clearState(page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);

      const before = await page.evaluate(() => window.__cr4SpeechCalls || 0);
      push(
        `${vp.id}: no speech before preference`,
        before === 0,
        `calls=${before}`,
      );

      const offBtn = page.getByRole("button", {
        name: /Fill it out myself/i,
      });
      let clickMethod = "failed";
      try {
        await offBtn.first().click({ timeout: 5000, force: false });
        clickMethod = "click";
      } catch {
        clickMethod = "failed";
      }
      push(
        `${vp.id}: Voice Off selectable without overlay intercept`,
        clickMethod === "click",
        `method=${clickMethod}`,
      );
      await page.waitForTimeout(300);
      const pref = await page.evaluate(() =>
        sessionStorage.getItem("studio-voice:narration-preference:v1"),
      );
      push(
        `${vp.id}: Voice Off preference stored`,
        pref === "off",
        `pref=${pref}`,
      );

      const overflow = await page.evaluate(() =>
        Math.max(
          document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          0,
        ),
      );
      push(
        `${vp.id}: no horizontal overflow`,
        overflow <= 1,
        `overflowX=${overflow}`,
      );

      const studioReview = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '[aria-label="Studio control strip"] a, [aria-label="Studio control strip"] button',
          ),
        ).some((el) => /studio review/i.test(el.textContent || "")),
      );
      push(`${vp.id}: no customer Studio Review link`, !studioReview);

      await clearState(page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      const onBtn = page.getByRole("button", {
        name: /Use Voice guidance/i,
      });
      let onMethod = "failed";
      try {
        await onBtn.first().click({ timeout: 5000, force: false });
        onMethod = "click";
      } catch {
        onMethod = "failed";
      }
      await page.waitForTimeout(500);
      const afterOn = await page.evaluate(() => ({
        calls: window.__cr4SpeechCalls || 0,
        pref: sessionStorage.getItem("studio-voice:narration-preference:v1"),
      }));
      push(
        `${vp.id}: Voice On selectable without overlay intercept`,
        onMethod === "click",
        `method=${onMethod}`,
      );
      push(
        `${vp.id}: Voice On stores preference and may speak after selection`,
        afterOn.pref === "on" && afterOn.calls >= 1,
        `pref=${afterOn.pref}; calls=${afterOn.calls}`,
      );

      await page.screenshot({
        path: join(OUT, `${vp.id}-voice.png`),
        fullPage: true,
      });
      await context.close();
    }

    /* ---- Session Help / Lobby at services for each viewport ---- */
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/studio-conversation-room`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await clearState(page);
      await seedServices(page);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(700);

      const stage = await page
        .locator("[data-stage]")
        .first()
        .getAttribute("data-stage");
      push(
        `${vp.id}: services seed stage`,
        stage === "services",
        `data-stage=${stage}`,
      );

      const lobbies = await catalogLobbyButtons(page);
      const sessionLobbies = lobbies.filter((b) => b.inSessionStrip);
      const otherLobbies = lobbies.filter((b) => !b.inSessionStrip);
      push(
        `${vp.id}: exactly one Session Return to Lobby`,
        sessionLobbies.length === 1,
        `session=${sessionLobbies.length}; other=${otherLobbies.length}; total=${lobbies.length}`,
      );
      push(
        `${vp.id}: no visible duplicate non-Session Lobby`,
        otherLobbies.length === 0 || otherLobbies.every((b) => !b.visible),
        JSON.stringify(
          otherLobbies.map((b) => ({
            visible: b.visible,
            inDiscoveryTablet: b.inDiscoveryTablet,
            box: b.box,
          })),
        ),
      );

      await page.evaluate(() => {
        const lobby = [
          ...document.querySelectorAll(
            '[aria-label="Studio control strip"] button',
          ),
        ].find((b) => /Return to Lobby/i.test(b.textContent || ""));
        if (lobby) lobby.setAttribute("data-cr4r-session-lobby", "1");
      });

      const helpReach = await assessSessionReachability(
        page,
        "#studio-control-help",
      );
      const lobbyReach = await assessSessionReachability(
        page,
        "[data-cr4r-session-lobby]",
      );
      push(
        `${vp.id}: Help Center customer-reachable with panel open`,
        helpReach.ok && helpReach.slideOpen,
        `${helpReach.mode}; ${helpReach.reason}; slideOpen=${helpReach.slideOpen}; stripScrollable=${helpReach.strip?.scrollable}; stripOnScreen=${helpReach.strip?.onScreen}`,
      );
      push(
        `${vp.id}: Return to Lobby customer-reachable with panel open`,
        lobbyReach.ok && lobbyReach.slideOpen,
        `${lobbyReach.mode}; ${lobbyReach.reason}; slideOpen=${lobbyReach.slideOpen}; stripScrollable=${lobbyReach.strip?.scrollable}; stripOnScreen=${lobbyReach.strip?.onScreen}`,
      );
      push(
        `${vp.id}: activity scrim does not cover Session strip`,
        !helpReach.scrimCoversControl && !lobbyReach.scrimCoversControl,
        `helpCovered=${helpReach.scrimCoversControl}; lobbyCovered=${lobbyReach.scrimCoversControl}`,
      );

      /* Lobby first — while activity panel still open. */
      let lobbyOk = false;
      let url = page.url();
      try {
        await Promise.all([
          page.waitForURL(/studio-lobby|lobbyEntry=reset/, { timeout: 8000 }),
          clickSessionControl(page, /Return to Lobby/i),
        ]);
        lobbyOk = true;
        url = page.url();
      } catch (err) {
        lobbyOk = false;
        url = page.url();
        push(
          `${vp.id}: Lobby click error`,
          false,
          String(err?.message || err).slice(0, 240),
        );
      }
      push(
        `${vp.id}: Session Return to Lobby navigates`,
        lobbyOk && /lobbyEntry=reset/i.test(url),
        url,
      );

      if (/studio-lobby/i.test(url)) {
        await page.goto(`${BASE}/studio-conversation-room`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(700);
        const restored = await page
          .locator("[data-stage]")
          .first()
          .getAttribute("data-stage");
        push(
          `${vp.id}: re-entry restores services stage`,
          restored === "services",
          `data-stage=${restored}`,
        );
      } else {
        push(
          `${vp.id}: re-entry restores services stage`,
          false,
          "lobby navigation did not complete",
        );
      }

      /* Fresh seed for Help — independent of Lobby navigation. */
      await clearState(page);
      await seedServices(page);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(600);

      let helpOk = false;
      try {
        await clickSessionControl(page, /Help Center/i);
        const dialog = page.getByRole("dialog", { name: /Help Center/i });
        await dialog.waitFor({ state: "visible", timeout: 5000 });
        helpOk = true;
        await dialog.getByRole("button", { name: /^Close$/i }).click();
        await dialog.waitFor({ state: "hidden", timeout: 5000 });
      } catch (err) {
        helpOk = false;
        push(
          `${vp.id}: Help click error`,
          false,
          String(err?.message || err).slice(0, 240),
        );
      }
      const helpStillOpen = await page
        .locator('[data-conversation-help="open"]')
        .count();
      const stageAfterHelp = await page
        .locator("[data-stage]")
        .first()
        .getAttribute("data-stage");
      push(
        `${vp.id}: Help open/close from Session strip`,
        helpOk && helpStillOpen === 0 && stageAfterHelp === "services",
        `helpOpen=${helpStillOpen}; data-stage=${stageAfterHelp}`,
      );

      await page.screenshot({
        path: join(OUT, `${vp.id}-services-session.png`),
        fullPage: true,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  writeFileSync(
    join(OUT, "cr4r-proof.json"),
    JSON.stringify({ base: BASE, results }, null, 2),
  );
  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\nSummary PASS=${results.filter((r) => r.ok).length} FAIL=${failed}`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
