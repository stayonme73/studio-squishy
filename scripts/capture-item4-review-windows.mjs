/**
 * Item #4 only. Isolated. Review page: one Conversation surface, no nested windows.
 * Does not remint Maya. Does not reset the live phone draft.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(
  root,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
mkdirSync(out, { recursive: true });
const BASE = process.argv[2] || "https://localhost:3000";
const now = new Date().toISOString();

const opening = {
  preferredName: "Tagia",
  projectNeed: "Marketing materials",
  businessName: "The Studio",
  requestedDeadline: "Within 2 weeks",
  deadlineStatus: "unconfirmed",
  existingMaterialsNote: "Nothing yet",
  confirmedAt: null,
};

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 360, height: 800 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
await page.addInitScript(
  ({ draft, guide }) => {
    localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
    localStorage.setItem(
      "studio-guide:capture-draft:v1",
      JSON.stringify({ schemaVersion: 1, ...guide, source: "lobby-guide-conversation" }),
    );
    sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
    sessionStorage.setItem("studio-guide:ui-step:v1", "summary");
  },
  {
    draft: {
      version: 1,
      status: "working_draft",
      editable: true,
      updatedAt: now,
      revision: 4,
      cursor: {
        conversationLocation: "conversation-room-stage:opening",
        flowStep: "opening",
      },
      attribution: [],
      slices: {
        discoveryAnswers: opening,
        currentConversationLocation: "conversation-room-stage:opening",
      },
    },
    guide: opening,
  },
);
await page.goto(`${BASE}/studio-conversation-room?gstep=summary&studioPaymentSandbox=1`, {
  waitUntil: "commit",
  timeout: 60000,
});
await page.waitForTimeout(1400);
const film = page.locator("[data-voice-choice-film]");
if (await film.count()) {
  const fill = page.locator('[data-voice-choice-action="off"]').first();
  if (await fill.count()) {
    await fill.dispatchEvent("pointerdown");
    await fill.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
}
await page.waitForSelector("text=understood", { timeout: 15000 });

const facts = await page.evaluate(() => {
  const tablet = document.querySelector("[data-surface='tablet']");
  const panel = document.querySelector("[data-name-question-panel='true']");
  const note = Array.from(document.querySelectorAll("p")).find((node) =>
    /recorded your requested/i.test(node.textContent || ""),
  );
  const correct = Array.from(document.querySelectorAll("button")).find((node) =>
    /correct something/i.test(node.textContent || ""),
  );
  const champagne = (color) => {
    const value = color.replace(/\s+/g, "");
    return /#c8b59b/i.test(color) || value.includes("200,181,155") || value.includes("200, 181, 155");
  };
  const styleOf = (node) => (node ? getComputedStyle(node) : null);
  const tabletStyle = styleOf(tablet);
  const panelStyle = styleOf(panel);
  const noteStyle = styleOf(note);
  const nestedWindows = Array.from(
    document.querySelectorAll(
      "[data-layout='one-tablet'] [data-surface='tablet'] * , [data-name-question-panel='true']",
    ),
  )
    .map((node) => {
      const style = getComputedStyle(node);
      const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
      const width = Number.parseFloat(style.borderTopWidth) || 0;
      const hasFill =
        style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        style.backgroundColor !== "transparent";
      const looksLikeWindow =
        radius > 4 &&
        (width > 0 || hasFill) &&
        node !== tablet &&
        !node.matches(
          "button, a, input, textarea, [class*='chip'], [class*='cta'], [role='button']",
        );
      return looksLikeWindow
        ? {
            tag: node.tagName,
            className: String(node.className).slice(0, 80),
            radius,
            border: style.borderTopWidth,
            bg: style.backgroundColor,
          }
        : null;
    })
    .filter(Boolean);
  const confirmControl = Array.from(
    document.querySelectorAll("button, a[role='button']"),
  ).find((node) => /yes.*correct/i.test(node.textContent || ""));
  const back = Array.from(document.querySelectorAll("button, a")).find((node) =>
    /previous question/i.test(node.textContent || ""),
  );
  const headingLines = Array.from(
    document.querySelectorAll("[data-surface='tablet'] h1 span"),
  ).map((node) => ({
    text: node.textContent?.trim(),
    nowrap: getComputedStyle(node).whiteSpace === "nowrap",
    height: Math.round(node.getBoundingClientRect().height),
  }));
  const tabletBox = tablet?.getBoundingClientRect();
  const backBox = back?.getBoundingClientRect();
  const actionsOutside =
    Boolean(correct) &&
    Boolean(confirmControl) &&
    !tablet?.contains(correct) &&
    !tablet?.contains(confirmControl);
  return {
    heading: /understood/i.test(document.body.innerText),
    headingLines,
    actionsOutside,
    backGap: tabletBox && backBox ? Math.round(backBox.top - tabletBox.top) : null,
    noteText: note?.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) ?? null,
    tabletBorder: tabletStyle?.borderTopWidth,
    tabletColor: tabletStyle?.borderTopColor,
    tabletChampagne: tabletStyle ? champagne(tabletStyle.borderTopColor) : false,
    tabletRadius: tabletStyle?.borderTopLeftRadius,
    panelRadius: panelStyle?.borderTopLeftRadius,
    panelPadding: panelStyle?.paddingTop,
    panelBorder: panelStyle?.borderTopWidth,
    noteBorder: noteStyle?.borderTopWidth,
    noteRadius: noteStyle?.borderTopLeftRadius,
    noteBg: noteStyle?.backgroundColor,
    correctPresent: Boolean(correct),
    confirmPresent: Boolean(confirmControl),
    correctVisible:
      correct != null &&
      correct.getBoundingClientRect().bottom <= window.innerHeight + 1 &&
      correct.getBoundingClientRect().top >= 0,
    nestedWindows,
  };
});

const tablet = page.locator("[data-surface='tablet']").first();
await page.screenshot({
  path: path.join(out, "item4-review-windows-fold.jpg"),
  type: "jpeg",
  quality: 82,
});
if (await tablet.count()) {
  await tablet.screenshot({
    path: path.join(out, "item4-review-windows-tablet.jpg"),
    type: "jpeg",
    quality: 82,
  });
}

const confirm = page.getByRole("button", { name: /yes.*correct/i }).first();
if (await confirm.count()) {
  await confirm.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
}
const afterScroll = await page.evaluate(() => {
  const confirm = Array.from(document.querySelectorAll("button, a[role='button']")).find(
    (node) => /yes.*correct/i.test(node.textContent || ""),
  );
  const box = confirm?.getBoundingClientRect();
  return {
    confirmVisible:
      box != null && box.bottom <= window.innerHeight + 2 && box.top >= 0,
    confirmTop: box ? Math.round(box.top) : null,
  };
});
await page.screenshot({
  path: path.join(out, "item4-review-windows-actions.jpg"),
  type: "jpeg",
  quality: 82,
});

const report = { ...facts, afterScroll };
writeFileSync(path.join(out, "item4-review-windows-facts.json"), JSON.stringify(report, null, 2));
await browser.close();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (!facts.heading) throw new Error("review heading missing");
if (!facts.tabletChampagne) throw new Error("tablet lost champagne trim");
if (facts.panelRadius !== "0px") throw new Error(`panel still rounded: ${facts.panelRadius}`);
if (facts.panelPadding !== "0px") throw new Error(`panel still padded: ${facts.panelPadding}`);
if (facts.noteBorder !== "0px") throw new Error(`deadline note still boxed: ${facts.noteBorder}`);
if (facts.noteRadius !== "0px") throw new Error(`deadline note still rounded: ${facts.noteRadius}`);
if (facts.nestedWindows.length) {
  throw new Error(`nested windows remain: ${JSON.stringify(facts.nestedWindows)}`);
}
if (!facts.correctPresent || !facts.confirmPresent) {
  throw new Error("Correct / Yes this is correct missing");
}
if (!facts.actionsOutside) {
  throw new Error("Correct / Yes are still inside the inner tablet");
}
if (facts.headingLines?.length !== 2) {
  throw new Error(`heading is not two lines: ${JSON.stringify(facts.headingLines)}`);
}
if (facts.headingLines.some((line) => !line.nowrap)) {
  throw new Error("heading lines are wrapping");
}
if (facts.backGap == null || facts.backGap < 8) {
  throw new Error(`Back is still flush to the top: ${facts.backGap}`);
}
if (!afterScroll.confirmVisible) {
  throw new Error("Yes this is correct not reachable by scroll");
}
