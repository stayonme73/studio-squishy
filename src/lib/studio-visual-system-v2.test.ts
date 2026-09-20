import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { studioVisualSystemV2 } from "@/config/studio-visual-system-v2";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("Studio Visual System V2", () => {
  it("locks the global four-color system and whole-site rule", () => {
    expect(studioVisualSystemV2.pass).toBe("five-screen-shared-glass");
    expect(studioVisualSystemV2.schemaVersion).toBe(22);
    expect(studioVisualSystemV2.type.labelColor).toBe("#8FF5C6");
    expect(studioVisualSystemV2.type.paperScale).toBe(true);
    expect(studioVisualSystemV2.type.ranks).toBe(4);
    expect(studioVisualSystemV2.type.title).toBe("1.25rem");
    expect(studioVisualSystemV2.type.subtitle).toBe("1.125rem");
    expect(studioVisualSystemV2.type.copy).toBe("1rem");
    expect(studioVisualSystemV2.type.small).toBe("0.875rem");
    expect(studioVisualSystemV2.type.pageTitle).toBe("1.25rem");
    expect(studioVisualSystemV2.type.questionTitle).toBe("1.125rem");
    expect(studioVisualSystemV2.type.pageTitle).not.toBe(
      studioVisualSystemV2.type.questionTitle,
    );
    expect(studioVisualSystemV2.type.back).toBe("0.875rem");
    expect(studioVisualSystemV2.type.helper).toBe("1rem");
    expect(studioVisualSystemV2.type.letterJobs).toBe(true);
    expect(studioVisualSystemV2.ownerAccepted).toBe(true);
    expect(studioVisualSystemV2.frozen).toBe(true);
    expect(studioVisualSystemV2.oneGlassStrength).toBe(true);
    expect(studioVisualSystemV2.customerRoot).toBe(".studio-environment-app");
    expect(studioVisualSystemV2.customerChromeRoot).toBe(
      "html:has(.studio-environment-app)",
    );
    expect(studioVisualSystemV2.pressAppliesOutsideAppWrapper).toBe(true);
    expect(studioVisualSystemV2.text).toBe("#FFFFFF");
    expect(studioVisualSystemV2.highlight).toBe("#BFD8F2");
    expect(studioVisualSystemV2.trim).toBe("#C8B59B");
    expect(studioVisualSystemV2.ink).toBe("#20262D");
    expect(studioVisualSystemV2.glassFill).toBe(
      "color-mix(in srgb, #20262d 28%, transparent)",
    );
    expect(studioVisualSystemV2.veilFill).toBe(
      "color-mix(in srgb, #20262d 40%, transparent)",
    );
    expect(studioVisualSystemV2.noDarkGlass).toBe(true);
    expect(studioVisualSystemV2.noSmokedGlass).toBe(false);
    expect(studioVisualSystemV2.noHeavySmoke).toBe(true);
    expect(studioVisualSystemV2.lightSurfaceSmoke).toBe(true);
    expect(studioVisualSystemV2.opacityLocked).toBe(true);
    expect(studioVisualSystemV2.noReadabilityTint).toBe(false);
    expect(studioVisualSystemV2.borderWidth).toBe("2px");
    expect(studioVisualSystemV2.contrastRevision.status).toBe(
      "OWNER_ACCEPTED_STRENGTH",
    );
    expect(studioVisualSystemV2.contrastRevision.samsungRead).toBe("WAY_BETTER");
    expect(studioVisualSystemV2.contrastRevision.veilPct).toBe(40);
    expect(studioVisualSystemV2.contrastRevision.smokePct).toBe(28);
    expect(studioVisualSystemV2.inkIsPrimaryButtonFillOnly).toBe(true);
    expect(studioVisualSystemV2.glassFillStrong).toBe(
      studioVisualSystemV2.glassFill,
    );
    expect(studioVisualSystemV2.threeScreenProofOnly).toBe(false);
    expect(studioVisualSystemV2.problemProofScreens).toEqual([
      "project-record",
      "review-room",
      "studio-board",
      "payment",
      "intake",
    ]);
    expect(studioVisualSystemV2.champagneIsTrimOnly).toBe(true);
    expect(studioVisualSystemV2.noBabyBlueAsText).toBe(true);
    expect(studioVisualSystemV2.noSolidBabyBlueFill).toBe(true);
    expect(studioVisualSystemV2.everyTapNeedsVisiblePress).toBe(true);
    expect(studioVisualSystemV2.pressedFill).toContain("22%");
    expect(studioVisualSystemV2.throughoutMeansWholeSite).toBe(true);
    expect(studioVisualSystemV2.noBackdropBlur).toBe(true);
    expect(studioVisualSystemV2.doNotResumeMobileFromThisPass).toBe(false);
    expect(studioVisualSystemV2.mobileMayResumeFromFinalDelivery).toBe(true);
    expect(studioVisualSystemV2.doNotRedesignAcceptedSurfaces).toBe(true);
    expect(studioVisualSystemV2.type.questionTitle).toBe("1.125rem");
    expect(studioVisualSystemV2.type.face).toBe("Inter");
    expect(studioVisualSystemV2.type.weights).toEqual(["400", "500", "600"]);
  });

  it("is imported after room CSS and contains no frost blur", () => {
    const globals = read("src/app/globals.css");
    const css = read(studioVisualSystemV2.cssFile);
    expect(globals.indexOf("./studio-visual-system-v2.css")).toBeGreaterThan(
      globals.indexOf("./mobile-journey.css"),
    );
    expect(globals.indexOf("./studio-visual-system-v2.css")).toBeGreaterThan(
      globals.indexOf("./studio-kitchen.css"),
    );
    expect(css).toContain("--studio-text: #ffffff");
    expect(css).toContain("--studio-label: #8ff5c6");
    expect(css).toContain(".sb-refund-request__summary");
    expect(css).toContain("Billing leftover green joins the one brighter sage.");
    expect(css).toContain("--studio-type-title: 1.25rem");
    expect(css).toContain("--studio-type-subtitle: 1.125rem");
    expect(css).toContain("--studio-type-copy: 1rem");
    expect(css).toContain("--studio-type-small: 0.875rem");
    expect(css).toContain("--studio-type-page: var(--studio-type-title)");
    expect(css).toContain("--studio-type-back: var(--studio-type-small)");
    expect(css).toContain("--studio-type-helper: var(--studio-type-copy)");
    expect(css).toContain("--studio-type-question: var(--studio-type-subtitle)");
    expect(css).toContain("Paper scale last paint");
    expect(css).toContain("overflow-wrap: break-word");
    expect(css).not.toContain("overflow-wrap: anywhere");
    expect(css).toContain(".utility-topbar__title");
    expect(css).toContain(".sb-project-communication");
    expect(css).toContain("h1[class*=\"question\"], h2[class*=\"title\"]");
    expect(css).toContain("[data-surface=\"studio-plan\"]");
    expect(css).toContain("[data-answer-dock=\"pinned\"]");
    expect(css).toContain("[data-stage=\"opening\"][data-surface=\"tablet\"]:has([data-answer-dock=\"pinned\"])");
    expect(css).toContain("Opening questions: one long page");
    expect(css).toContain("[data-skip-action]");
    expect(css).toContain("[class*=\"btnSkipNow\"]");
    expect(css).toContain("2px solid #d94e2b");
    expect(css).toContain("Skip for now: coral trim, white word");
    expect(css).toContain("[class*=\"speakZone\"]");
    expect(css).toContain("--studio-glass-fill: color-mix(in srgb, #20262d 28%, transparent)");
    expect(css).toContain("--studio-veil-fill: color-mix(in srgb, #20262d 40%, transparent)");
    expect(css).toContain("readability over perfectly clear");
    expect(css).toContain("Opacity locked 2026-09-20: veil 40, smoke 28.");
    expect(css).toContain(".studio-environment-shell__veil");
    expect(css).toContain("background: var(--studio-veil-fill) !important");
    expect(css).toContain("--studio-border-width: 2px");
    expect(css).toContain("border-width: 2px !important");
    expect(css).toContain("--studio-glass-shadow: none");
    expect(css).toContain("--studio-utility-backdrop-tint: transparent");
    expect(css).not.toContain("color-mix(in srgb, #20262d 48%, transparent)");
    expect(css).not.toContain("color-mix(in srgb, #20262d 36%, transparent)");
    expect(css).not.toContain("color-mix(in srgb, #20262d 10%, transparent)");
    expect(css).not.toContain("color-mix(in srgb, #20262d 8%, transparent)");
    expect(css).toContain("backdrop-filter: none !important");
    expect(css).not.toContain("blur(14px)");
    expect(css).not.toContain("blur(12px)");
    expect(css).not.toMatch(/@media \(max-width: 720px\)[\s\S]*--studio-glass-fill: color-mix\(in srgb, #ffffff/);
    expect(css).toContain("color: #ffffff !important");
    expect(css).toContain(".utility-subnav__label");
    expect(css).toContain(".hc-qpg-table");
    expect(css).toContain("Help Center on-this-page links are words, not bubbles.");
    expect(css).toContain(".hc-toc__link");
    expect(css).toContain(".sb-project-communication__item");
    expect(css).toContain(".fs-proof-refs");
    expect(css).toContain(".fs-review-proof");
    expect(css).toContain(".cd-grid");
    expect(css).toContain(".cd-squishy");
    expect(css).toContain("Project Record: facts sit on the page, not a second bubble.");
    expect(css).toContain(".cd-overview__row");
    expect(css).toContain(".cd-timeline__date");
    expect(css).toContain(".cd-information-update__select");
    expect(css).toContain("Information update type must be a usable field");
    expect(css).toContain(".sb-materials-intake__toggle");
    expect(css).toContain(".utility-subnav__item");
    expect(css).toContain("7.85rem");
    expect(css).toContain("--fs-gold: #bfd8f2");
    expect(css).toContain("--cd-gold: #bfd8f2");
    expect(css).toContain(".pay-paper-card");
    expect(css).toContain(".route-map-social-intake__card");
    expect(css).toContain("display: none !important");
    expect(css).toContain(":active");
    expect(css).toContain(
      ':not(:has(:is(button, a, [role="button"], [role="tab"], [type="button"], [type="submit"], .studio-tile, [class*="chip"]:not([class*="chipRow"]), label):active))',
    );
    expect(css).toContain("[class*=\"chipRow\"]");
    expect(css).toContain(
      '[class*="chip"]:not([class*="chipRow"]):not([class*="chipBlock"]):not([class*="chipGroup"]):not([class*="chips"])',
    );
    expect(css).toContain("[data-active-question-cluster]");
    expect(css).toContain("[data-film-family]");
    expect(css).toContain("background: transparent !important");
    expect(css).toContain("html:has(.studio-environment-app) :is(");
    expect(css).toContain("color-mix(in srgb, #bfd8f2 22%, transparent)");
    expect(css).toContain("grid-template-rows: auto auto !important");
    expect(css).toContain("border-bottom: 1px solid #c8b59b !important");
    expect(css).toContain(".sb-materials-glance");
    expect(css).toContain("html:has(.studio-environment-app) .sb-sidebar");
    expect(css).toContain("grid-template-columns: none !important");
    expect(css).toContain("border: none !important");
    expect(css).toContain("padding: var(--sb-tile-padding-y, 1rem) var(--sb-tile-padding-x, 1.05rem) !important");
    expect(css).not.toContain("#fff200");
    expect(read("src/app/mobile-route-fixes.css")).not.toContain("#fff200");
    expect(css).toContain("min-height: min-content !important");
    expect(css).toContain(".fs-page--review .utility-subnav__link--active");
    expect(css).toContain("[data-voice-choice-film] [class*=\"panel\"]::before");
    expect(css).toContain("--studio-utility-backdrop-tint");
    expect(css).toContain("[data-film-family=\"true\"] [data-voice-pref][aria-pressed=\"true\"]");
    expect(css).toContain(":not([data-voice-pref]):not([data-voice-choice-action])");
    expect(css).toContain("[data-voice-pref][aria-pressed=\"true\"]");
    expect(css).toContain("[data-voice-pref]");
    expect(css).toContain("[class*=\"planFactCard\"]");
    expect(css).toContain(":not([data-selected=\"true\"]):not([aria-pressed=\"true\"])");
    expect(css).toContain(":not(:has([data-layout=\"one-tablet\"])) [data-panel=\"checkout\"]");
    expect(css).toContain("[data-panel=\"checkout\"] .co-card");
    expect(css).toContain("Checkout cards sit on Lounge");
    expect(css).toContain("[data-layout=\"one-tablet\"] [data-panel=\"checkout\"] .co-card:not(.owner-qa):not(.owner-qa *)");
    expect(css).toContain("[data-layout=\"one-tablet\"] [data-panel=\"intake\"] .route-map-social-intake__card:not(.owner-qa):not(.owner-qa *)");
    expect(css).toContain("[data-layout=\"one-tablet\"] [data-panel=\"intake\"] .route-map-social-intake__chips:not(.owner-qa):not(.owner-qa *)");
    expect(css).toContain("Materials / intended-use groups sit on Lounge");
    expect(css).toContain("padding: 0 !important");
    expect(css).toContain("[data-layout=\"one-tablet\"] [data-panel=\"intake\"] [data-confirmed=\"true\"]");
    expect(css).toContain("[data-tablet-journey-chrome]");
    expect(css).toContain("[data-layout=\"one-tablet\"] [data-panel=\"intake\"] :is(");
    expect(css).toContain("[data-intake-type-line]");
    expect(css).toContain("[data-intake-type-well]");
    expect(css).toContain("Only Payment received / Services confirmed");
    expect(css).toContain("[data-confirmed=\"true\"]");
    expect(css).toContain("color: #2f6b54 !important");
    expect(css).not.toContain("[data-intake-well]");
    expect(css).not.toContain("Intake: white surface, sage writing");
    expect(css).toContain("0 0 0 1000px #20262d inset");
    expect(css).toContain(":-webkit-autofill");
    expect(css).toContain(".route-map-social-intake__chip--selected");
    expect(css).toContain("[class*=\"jobCard\"][data-selected=\"true\"]");
    expect(css).toContain("color-mix(in srgb, #bfd8f2 48%, transparent)");
    expect(css).toContain("Prices stay one number");
    expect(css).toContain("white-space: nowrap !important");
    expect(css).toContain(".pb-plan-summary__view-scope");
    expect(css).toContain(".pb-plan-summary__policy-toggle");
    expect(css).toContain("Required = coral. Optional = sage");
    expect(css).toContain(".route-map-intake__req");
    expect(css).toContain(".route-map-intake__opt");
    expect(css).toContain("color: #d94e2b !important");
    expect(css).toContain("Intake older-eyes pass");
    expect(css).toContain("Next Step size is the helper size");
    expect(css).toContain(".route-map-social-intake__next-step");
    expect(css).toContain("Actions dock is not a second container around Next Step");
    expect(css).toContain(".route-map-social-intake__actions");
    expect(css).not.toContain("font-size: 1.08rem !important");
    expect(css).not.toContain("font-size: 0.68rem !important");
    expect(css).toContain("font-size: var(--studio-type-copy) !important");
    expect(css).toContain("[data-layout=\"one-tablet\"] :is(");
    expect(css).toContain("[data-panel=\"checkout\"][data-surface=\"page\"]");
    expect(css).toContain("[data-stage=\"checkout\"][data-surface=\"tablet\"]");
    expect(css).toContain("[data-layout=\"one-tablet\"] [data-surface=\"tablet\"]");
    expect(css).toContain("[class*=\"deadlineNote\"]");
    expect(css).toContain("[data-name-question-panel=\"true\"]");
    expect(css).toContain("Review nested windows");
    expect(css).toContain("[class*=\"planDetailsCard\"]");
    expect(css).toContain("[data-plan-actions]");
    expect(css).toContain("[data-stage=\"plan\"][data-surface=\"tablet\"]");
    expect(css).toContain("[data-surface=\"tablet\"][data-stage]:not([data-stage=\"plan\"])");
    expect(css).toContain(":not([data-stage=\"route\"]):not([data-stage=\"services\"]):not([data-stage=\"opening\"]):not([data-stage=\"intake\"])");
    expect(css).toContain("[data-stage=\"opening\"][data-surface=\"tablet\"]");
    expect(css).toContain("Intake nested page");
    expect(css).toContain("[data-stage=\"intake\"][data-surface=\"tablet\"]");
    expect(css).toContain("[data-panel=\"intake\"][data-surface=\"page\"]");
    expect(css).toContain("[data-studio-surface=\"tablet\"]");
    expect(css).toContain("#conversation-room-tablet");
    expect(css).toContain("Best For is the \"this is for\" label");
    expect(css).toContain("[class*=\"jobBestForLabel\"]");
    expect(css).toContain(".pb-drawer__best-for-label");
    expect(css).toContain("Studio Plan amount is the number customers pay");
    expect(css).toContain("[class*=\"planFactValueLarge\"]");
    expect(css).toContain("Checkout review checkbox: white, bigger, readable");
    expect(css).toContain(".pay-acknowledgment__checkbox");
    expect(css).toContain("Required sits on the title");
    expect(css).toContain(".route-map-social-intake__card-copy");
    expect(css).toContain("padding-left: 0.7rem !important");
    expect(css).toContain("[data-stage=\"route\"][data-surface=\"tablet\"]");
    expect(css).toContain("[data-surface=\"tablet\"] [data-surface=\"tablet\"]:not(.owner-qa):not(.owner-qa *)");
    expect(css).toContain("[data-summary-outer-actions] .lobby-entry-film__cta");
    expect(css).toContain("[class*=\"expandToggle\"]");
    expect(css).toContain("[data-pre-checkout-deck-back]");
    expect(css).toContain("[data-plan-details-toggle=\"true\"]");
    expect(css).toContain("Outline hugs the words");
    expect(css).toContain(".pb-plan-summary__card");
    expect(css).toContain("[class*=\"summaryRow\"]");
    expect(css).toContain("[data-step=\"summary\"] [class*=\"summaryRow\"] + [class*=\"summaryRow\"]");
    expect(css).toContain("[class*=\"typeHintOff\"]");
    expect(css).toContain("overflow-wrap: break-word !important");
    expect(css).toContain("[data-surface=\"tablet\"] .studio-tile--standard");
    expect(css).toContain("[class*=\"routeExpand\"].studio-tile--selected");
    expect(css).toContain("[class*=\"routeCard\"]");
    expect(css).toContain("Route tiles are the cards");
    expect(css).toContain("[class*=\"routeRecommendedBadge\"]");
    expect(css).toContain("Suggested starting point is a label");
    expect(css).toContain("[class*=\"routeChoiceNote\"]");
    expect(css).toContain("You can choose a different path — own sentence");
    expect(css).toContain("[class*=\"slideHost\"]");
    expect(css).toContain("[data-surface=\"overlay\"]");
    expect(css).toContain("[data-studio-surface=\"activity-panel\"]");
    expect(css).toContain("[data-layout=\"one-tablet\"] [class*=\"typeLine\"]");
    expect(css).toContain("One type bubble");
    expect(css).toContain(".lobby-entry-film__cta");
    expect(css).not.toMatch(/\[data-layout="one-tablet"\][^{]*\{[^}]*100vw/);
    expect(css).not.toMatch(/:active[^{]*\{[^}]*background:\s*#bfd8f2/i);
    expect(read("src/app/layout.tsx")).toContain("studio-environment-app");
    expect(read("src/app/studio-customer-last-paint.css")).toContain(
      '@import "./studio-visual-system-v2.css"',
    );
    expect(read("src/app/studio-customer-last-paint.css")).toContain(
      '@import "./mobile-route-fixes.css"',
    );
    expect(read("src/app/studio-conversation-room/page.tsx")).toContain(
      'import "../studio-customer-last-paint.css"',
    );
    expect(read("src/app/(studio)/campaign-details/page.tsx")).toContain(
      'import "../../studio-customer-last-paint.css"',
    );
    expect(read("src/app/(studio)/feedback-studio/page.tsx")).toContain(
      'import "../../studio-customer-last-paint.css"',
    );
    expect(read("src/components/dev/LocalVisualSystemInspect.tsx")).toContain(
      "onAuthorizePayment={() => false}",
    );
    expect(read("src/components/dev/LocalVisualSystemInspect.tsx")).toContain(
      "onSaveDraft={() => false}",
    );
  });

  it("keeps three-screen proof CSS as reinforcement, not the only paint", () => {
    const proof = read(studioVisualSystemV2.threeScreenProofCss);
    expect(proof).toContain("data-visual-proof");
    expect(proof).toContain(':not([data-name-question-panel="true"])');
    expect(proof).toContain("[data-plan-details-toggle=\"true\"]");
    expect(proof).toContain("[data-stage=\"checkout\"][data-surface=\"tablet\"]");
    expect(proof).toContain("[data-panel=\"checkout\"][data-surface=\"page\"]");
    expect(proof).toContain("[data-layout=\"one-tablet\"] [data-panel=\"checkout\"]");
    expect(proof).toContain("[data-layout=\"one-tablet\"] [data-panel=\"intake\"]");
    expect(proof).toContain("[data-plan-actions]");
    expect(proof).toContain("[data-stage=\"plan\"][data-surface=\"tablet\"]");
    expect(proof).toContain("[data-stage=\"route\"][data-surface=\"tablet\"]");
    expect(proof).toContain("[data-stage=\"services\"][data-surface=\"tablet\"]");
    expect(proof).toContain("[data-stage=\"opening\"][data-surface=\"tablet\"]");
    expect(proof).toContain("color: #ffffff !important");
    expect(proof).toContain("color-mix(in srgb, #bfd8f2 22%, transparent)");
    expect(proof).toContain("--studio-glass-fill: color-mix(in srgb, #20262d 28%, transparent)");
    expect(proof).toContain("--studio-veil-fill: color-mix(in srgb, #20262d 40%, transparent)");
    expect(proof).not.toContain("color-mix(in srgb, #20262d 48%, transparent)");
    expect(proof).not.toContain("color-mix(in srgb, #20262d 10%, transparent)");
    expect(proof).toContain("backdrop-filter: none !important");
    expect(proof).not.toContain("color-mix(in srgb, #ffffff 8%, transparent)");
    expect(proof).not.toContain("color-mix(in srgb, #ffffff 12%, transparent)");
    expect(read("src/app/(studio)/studio-board/page.tsx")).toContain(
      'import "../../studio-visual-system-three-screen-proof.css"',
    );
    expect(read("src/app/help-center/page.tsx")).toContain(
      'import "../studio-visual-system-three-screen-proof.css"',
    );
    expect(read("src/app/studio-conversation-room/page.tsx")).toContain(
      'import "../studio-visual-system-three-screen-proof.css"',
    );
  });
});
