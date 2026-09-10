import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MOBILE_VISUAL_MASTER,
  MOBILE_VOICE_CHOICE_OWNER_ACCEPTED,
  MOBILE_NAME_QUESTION_OWNER_ACCEPTED,
  MOBILE_PROJECT_NEED_OWNER_ACCEPTED,
  MOBILE_BUSINESS_NAME_OWNER_ACCEPTED,
  MOBILE_VISUAL_SYSTEM_CHECKPOINT,
  MOBILE_MATERIALS_CONFIRMATION_CHECKPOINT,
  MOBILE_CHOOSE_YOUR_ROUTE_OWNER_ACCEPTED,
  MOBILE_BOARD_TYPOGRAPHY_ROLES,
  mobileCustomerSpinePaletteV1,
} from "@/config/mobile-customer-spine-palette-v1";
import { studioDesignSystem } from "@/config/studio-design-system";
import { studioPalette } from "@/config/studio-palette";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const spineCss = [
  "src/app/mobile-customer-spine-palette.css",
  "src/app/mobile-customer-spine-surfaces.css",
  "src/app/welcome-hall-phase1.css",
  "src/components/studio-conversation-room/studio-workspace.module.css",
  "src/components/studio-conversation-room/voice-choice-film.module.css",
  "src/components/studio-conversation-room/studio-conversation-room.module.css",
  "src/components/studio-conversation-room/voice-preference-controls.module.css",
  "src/components/studio-conversation-room/conversation-nav-panel.module.css",
  "src/components/studio-conversation-room/guide/studio-guide-comm.module.css",
  "src/components/studio-conversation-room/guide/studio-guide-tablet.module.css",
  "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
  "src/components/studio-conversation-room/help-center-panel.module.css",
  "src/components/studio-conversation-room/discovery/discovery-tablet.module.css",
  "src/components/studio-conversation-room/discovery/discovery-question-1.module.css",
  "src/components/studio-conversation-room/conversation-driver-control.module.css",
];

describe("Mobile customer-spine palette (scoped)", () => {
  it("locks the Welcome VISUAL_MASTER values", () => {
    expect(MOBILE_VISUAL_MASTER).toEqual({
      loungeSrc: "/welcome-hall/studio-lobby-lounge.png",
      phoneCropX: "16%",
      phoneCropY: "42%",
      veilInkOpacityPct: 18,
      glassIvoryPct: 68,
      glassCreamPct: 32,
      glassOpacityPct: 46,
      glassStrongOpacityPct: 58,
      glassFilterLiteral: "blur(14px) saturate(1.04) brightness(1.1)",
      glassBorderDenimPct: 32,
      denim: "#547C92",
      eucalyptus: "#456B5A",
      ivory: "#F7F4EE",
      cream: "#EBE2D4",
      ink: "#2E2B28",
    });
    expect(mobileCustomerSpinePaletteV1.denim).toBe("#547C92");
    const css = read("src/app/mobile-customer-spine-palette.css");
    expect(css).toContain("[data-mobile-customer-spine]");
    expect(css).toContain("--mc-denim: #547c92");
    expect(css).toContain("var(--mc-ivory) 68%, var(--mc-cream) 32%) 46%");
    expect(css).toContain("30%) 58%");
    expect(css).toContain("--lounge-crop-phone: 16% 42%");
    expect(css).toContain("--lounge-frost-strong: var(--mc-glass)");
    expect(css).not.toContain("--mc-glass-filter");
  });

  it("does not mutate protected global token roots", () => {
    expect(studioDesignSystem.colors.denim).toBe("#2C3E50");
    expect(studioPalette.denimBlue).toBe("#2C3E50");
    expect(studioPalette.burntOrange).toBe("#CC5500");
    const board = read("src/app/board-family.css");
    expect(board).toContain("--studio-denim: #2c3e50");
    expect(read("src/config/studio-design-system.ts")).toContain(
      'denim: "#2C3E50"',
    );
    const surfaces = read("src/app/mobile-customer-spine-surfaces.css");
    expect(surfaces).toContain("@media (max-width: 1024px)");
    expect(surfaces).toContain("[data-mobile-customer-spine]");
    expect(surfaces).toContain("--pay-herb-gold: #547c92");
    expect(surfaces).toContain(".utility-card");
    expect(surfaces).toContain(":has(.fs-room)");
    expect(surfaces).toContain(".studio-utility-scene--studio-board .sb-sidebar");
    expect(surfaces).toContain("32%) 46%");
    expect(surfaces).toContain("blur(14px) saturate(1.04) brightness(1.1)");
    expect(surfaces).toContain("background: #547c92 !important");
    expect(surfaces).toContain("color: #f7f4ee !important");
    expect(surfaces).toContain(".sb-project-communication__submit:not(:disabled)");
    expect(surfaces).toContain(".sb-refund-request__submit:not(:disabled)");
    expect(surfaces).toContain("background: #f7c900 !important");
    expect(surfaces).toContain("var(--mc-ink, #2e2b28)");
    expect(surfaces).toContain(".utility-btn--primary:disabled");
    expect(surfaces).toContain("opacity: 1 !important");
    expect(surfaces).toContain("mix-blend-mode: normal");
    expect(surfaces).toContain(".sb-local-test-fixture__eyebrow");
    expect(surfaces).toContain(".sb-header-v3__title");
    expect(surfaces).toContain(
      ".sb-local-test-fixture__button[data-gate-pressed=\"true\"]",
    );
    expect(surfaces).not.toContain(".sb-local-test-fixture__button-fill");
    expect(surfaces).not.toContain("inset 0 0 0 100vmax #547c92");
    expect(surfaces).not.toContain("88%, #456b5a 12%");
    const routeFixes = read("src/app/mobile-route-fixes.css");
    expect(routeFixes).toContain("background-color: #547c92 !important");
    expect(routeFixes).toContain("background-color: #f7c900 !important");
    expect(routeFixes).not.toContain("linear-gradient(#f7c900, #f7c900)");
    expect(routeFixes).not.toContain("inset 0 0 0 100vmax #f7c900");
    expect(routeFixes).not.toContain("inset 0 0 0 100vmax #547c92");
    expect(routeFixes).toContain(".sb-local-test-fixture__button");
    expect(routeFixes).toContain(".sb-header-v3__title");
    expect(routeFixes).toContain('[data-gate-pressed="true"]');
    expect(routeFixes).toContain("color-mix(in srgb, #f7f4ee 68%, #ebe2d4 32%) 46%");
    expect(routeFixes).toContain("blur(14px) saturate(1.04) brightness(1.1) !important");
    expect(routeFixes).toContain("color-mix(in srgb, #547c92 40%, #f7f4ee)");
    expect(routeFixes).not.toContain("rgba(247, 244, 238, 0.9)");
    const shell = read("src/app/studio-environment-shell.css");
    expect(shell).not.toContain(
      "html:has(.studio-utility-scene--studio-board) .studio-environment-shell__frost",
    );
    expect(read("src/components/studio-board/StudioBoardProjectCommunicationSection.tsx")).toContain(
      'className="sb-project-communication__submit"',
    );
    expect(read("src/components/studio-board/StudioBoardProjectCommunicationSection.tsx")).not.toContain(
      "lobby-entry-film__cta sb-project-communication__submit",
    );
    expect(read("src/components/studio-board/StudioBoardRefundRequestSection.tsx")).toContain(
      'className="sb-refund-request__submit"',
    );
    expect(read("src/components/studio-board/StudioBoardRefundRequestSection.tsx")).not.toContain(
      "lobby-entry-film__cta sb-refund-request__submit",
    );
    expect(read("src/app/(studio)/studio-board/page.tsx")).toContain(
      'import "../../mobile-route-fixes.css"',
    );
    expect(surfaces).toContain(".sb-refund-request__optional");
    expect(read("src/components/studio-board/StudioBoardRefundRequestSection.tsx")).toContain(
      "sb-refund-request__optional",
    );
    expect(read("src/config/refund-request-customer-v1.ts")).toContain(
      'detailsLabel: "Supporting details (optional)"',
    );
  });

  it("locks one mobile Studio Board typography hierarchy", () => {
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.doNotUndoGlass).toBe(true);
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.doNotBeginReviewRoom).toBe(true);
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.doNotBeginAnotherBoardStylingPass).toBe(true);
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.status).toBe("OWNER_ACCEPTED");
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.ownerAcceptedAt).toBe("2026-09-10");
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.page.role).toBe("A");
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.card.color).toBe("eucalyptus");
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.sub.color).toBe("denim");
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.field.size).toBe("0.875rem");
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.field.color).toBe("eucalyptus");
    expect(MOBILE_BOARD_TYPOGRAPHY_ROLES.value.size).toBe("1rem");
    const palette = read("src/app/mobile-customer-spine-palette.css");
    expect(palette).toContain("--mc-board-type-page: 1.5rem");
    expect(palette).toContain("--mc-board-type-field: 0.875rem");
    expect(palette).toContain("--mc-board-color-field: var(--mc-eucalyptus)");
    expect(palette).toContain("--mc-board-color-sub: var(--mc-denim)");
    const routeFixes = read("src/app/mobile-route-fixes.css");
    expect(routeFixes).toContain("LAST PAINT — mobile Studio Board typography roles (A–G)");
    expect(routeFixes).toContain(".sb-visibility-continuity__row dt");
    expect(routeFixes).toContain(".sb-project-snapshot__heading");
    expect(routeFixes).toContain(".sb-journey__step--current .sb-journey__detail");
    expect(routeFixes).toContain(".sb-progress-panel__update-date");
    expect(routeFixes).toContain(".sb-journey__marker--current");
    expect(routeFixes).toContain("visibility: hidden");
    expect(routeFixes).toContain("background: #f7f4ee !important");
    expect(routeFixes).toContain(".sb-nav .sb-sign-out");
    expect(routeFixes).toContain("background-color: #b6c4c9 !important");
    expect(routeFixes).toContain("justify-self: start");
    expect(routeFixes).toContain("--sb-help-nav-width");
    expect(routeFixes).toContain("min-height: 2.5rem");
    expect(routeFixes).toContain(".sb-sign-out__control");
    expect(routeFixes).toContain("height: 100lvh");
    expect(routeFixes).toContain("transform: none");
    expect(read("src/components/studio-board/StudioBoardScene.tsx")).toContain(
      "--sb-help-nav-width",
    );
    expect(routeFixes).toContain("position: absolute");
    expect(routeFixes).toContain("opacity: 0");
    expect(read("src/components/auth/CustomerSignOutButton.tsx")).toContain(
      'className="sb-sign-out__control"',
    );
    expect(read("src/components/auth/CustomerSignOutButton.tsx")).toContain(
      'className="sb-nav__icon"',
    );
    expect(read("src/components/auth/CustomerSignOutButton.tsx")).toContain("aria-label");
    expect(routeFixes).toContain("var(--mc-coral, #d94e2b)");
    expect(routeFixes).toContain(".sb-visibility-continuity__notes");
    expect(routeFixes).toContain("text-transform: none");
    expect(routeFixes.indexOf(".sb-visibility-continuity__row dt")).toBeGreaterThan(
      routeFixes.indexOf("LAST PAINT — mobile Studio Board typography roles (A–G)"),
    );
  });

  it("scopes the palette across the Mobile customer spine", () => {
    expect(read("src/components/studio-conversation-room/StudioConversationRoom.tsx")).toContain(
      "data-mobile-customer-spine",
    );
    expect(read("src/components/entrance/WelcomeHallWelcomeScene.tsx")).toContain(
      "data-mobile-customer-spine",
    );
    expect(read("src/components/entrance/StudioLobbyEntryFilm.tsx")).toContain(
      "data-mobile-customer-spine",
    );
    expect(read("src/components/shared/UtilityPageFrame.tsx")).toContain(
      "data-mobile-customer-spine",
    );
    expect(read("src/app/(studio)/studio-board/page.tsx")).toContain(
      "data-mobile-customer-spine",
    );
    expect(read("src/app/(studio)/feedback-studio/page.tsx")).toContain(
      "data-mobile-customer-spine",
    );
    expect(read("src/app/help-center/page.tsx")).toContain("data-mobile-customer-spine");
    expect(read("src/app/sign-in/page.tsx")).toContain("StudioMobileLoungeShell");
    expect(read("src/app/sign-up/page.tsx")).toContain("StudioMobileLoungeShell");
    expect(read("src/app/local-test-fixtures/page.tsx")).toContain(
      "StudioMobileLoungeShell",
    );
    expect(read("src/app/account-handoff/page.tsx")).toContain(
      "StudioMobileLoungeShell",
    );
    expect(read("src/app/(studio)/campaign-details/page.tsx")).toContain(
      "data-mobile-customer-spine",
    );
    expect(read("src/components/shared/StudioMobileLoungeShell.tsx")).toContain(
      "data-mobile-customer-spine",
    );
    expect(read("src/app/globals.css")).toContain(
      'import "./mobile-customer-spine-palette.css"',
    );
    expect(read("src/app/globals.css")).toContain(
      'import "./studio-customer-tile-system.css"',
    );
    expect(read("src/app/globals.css")).toContain(
      'import "./mobile-customer-spine-surfaces.css"',
    );
  });

  it("removes black/gold/navy customer identity from live spine CSS", () => {
    const joined = spineCss.map(read).join("\n");
    expect(joined).not.toContain("#d4b56a");
    expect(joined).not.toContain("#c7a64a");
    expect(joined).not.toContain("rgba(28, 32, 40");
    expect(joined).not.toContain("rgba(18, 22, 30");
    expect(joined).not.toContain("rgba(14, 17, 22");
    expect(joined).not.toContain("rgba(28, 34, 44");
    expect(joined).not.toContain("#2f5d4a");
    expect(joined).not.toContain("#2C3E50");
    expect(joined).not.toContain("#CC5500");
    expect(joined).not.toContain("#355c7d");
    expect(joined).not.toContain("#355C7D");
    expect(joined).not.toContain("#2e2d2b");
    expect(joined).not.toContain("88%, #000 12%");
    expect(joined).not.toContain("f7f4ee 92%, #547c92 8%) 78%");
    expect(joined).not.toContain("var(--mc-glass-filter)");
    expect(read("src/components/studio-conversation-room/studio-workspace.module.css")).toContain(
      "background: var(--mc-glass)",
    );
    expect(read("src/components/studio-conversation-room/conversation-nav-panel.module.css")).toContain(
      "background: var(--mc-glass",
    );
  });

  it("composes Welcome as one palette screen", () => {
    const film = read("src/app/welcome-hall-phase1.css");
    expect(film).toContain("--lobby-entry-gold: var(--mc-denim, #547c92)");
    expect(film).toContain("--lobby-entry-ink: #f7f4ee");
    expect(film).toContain("-webkit-text-fill-color: var(--mc-denim, #547c92)");
    expect(film).toContain("background: var(--mc-denim, #547c92)");
    expect(film).not.toContain(
      "background: color-mix(in srgb, var(--mc-denim, #547c92) 88%, #000 12%)",
    );
    const phone = film.slice(film.indexOf("@media (max-width: 720px)"));
    expect(phone).toContain("gap: 1rem");
    expect(phone).not.toContain("drop the person icons");
    const qa = read("src/app/owner-qa.css");
    const reviewTab = read("src/app/studio-review-mobile-tab.css");
    expect(qa).not.toContain("top: calc(0.65rem + env(safe-area-inset-top, 0px))");
    expect(qa).not.toContain("body:has(.welcome-hall-phase1) .owner-qa");
    expect(qa).not.toContain("body:has([data-voice-choice-film]) .owner-qa");
    expect(reviewTab).toContain(".studio-review-mobile-tab.owner-qa");
    expect(reviewTab).toContain("position: fixed");
    expect(reviewTab).toContain("border-radius: 1.05rem 1.05rem 0 0");
    expect(reviewTab).toContain("color: #f7f4ee");
    expect(reviewTab).toContain("blur(14px) saturate(1.04) brightness(1.1)");
    expect(read("src/components/dev/OwnerQaPanel.tsx")).toContain(
      "studio-review-mobile-tab",
    );
    expect(read("src/app/globals.css")).toContain(
      'import "./studio-review-mobile-tab.css"',
    );
    expect(qa).not.toContain("var(--board-family-field, #f3ede3) 92%");
    expect(qa).not.toContain("#f7f4ee 58%, #ebe2d4 42%");
  });

  it("keeps the approved lighter Welcome glass as master", () => {
    const film = read("src/app/welcome-hall-phase1.css");
    expect(film).toContain("#f7f4ee 68%, #ebe2d4 32%) 46%");
    expect(film).toContain("blur(14px) saturate(1.04) brightness(1.1)");
    expect(film).not.toContain("brightness(1.02)");
    expect(film).not.toContain("color-mix(in srgb, var(--welcome-frost-mix) 70%, transparent)");
    expect(read("src/app/mobile-customer-spine-palette.css")).toContain("--mc-denim: #547c92");
  });

  it("rebuilds Voice Choice as a Welcome-master film, not tablet chrome", () => {
    const film = read(
      "src/components/studio-conversation-room/voice-choice-film.module.css",
    );
    expect(film).not.toContain('url("/welcome-hall/studio-lobby-lounge.png")');
    expect(film).not.toContain("background-image:");
    expect(film).toContain("background: transparent");
    expect(film).toContain("#f7f4ee 68%, #ebe2d4 32%) 46%");
    expect(film).toContain("blur(14px) saturate(1.04) brightness(1.1)");
    expect(film).toContain("#547c92 32%, #f7f4ee");
    expect(film).toContain("color: #f7f4ee");
    expect(film).not.toContain("#355c7d");
    expect(film).not.toContain("#2c3e50");
    expect(film).not.toContain("isolation: isolate");
    expect(film).not.toContain("#121416");
    expect(film).not.toContain("#050607");
    expect(film).not.toContain("rgba(0, 0, 0, 0.45)");
    expect(film).not.toContain("--mc-glass-strong");
    expect(film).not.toContain("#f7c900");
    const runtime = read(
      "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
    );
    expect(runtime).toContain("<VoiceChoiceFilm");
    expect(runtime).not.toContain("voiceChoice={");
    const gateReturn = runtime.slice(
      runtime.indexOf(
        "if (!ready || !projectDraft || voiceNarration === null || reviewingVoiceChoice)",
      ),
      runtime.indexOf("const selectedRoute"),
    );
    expect(gateReturn).toContain("<VoiceChoiceFilm");
    expect(gateReturn).not.toContain("StudioConversationRoom");
    expect(gateReturn).not.toContain("StudioWorkspace");
    const component = read(
      "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
    );
    expect(component).toContain('data-voice-choice-film="true"');
    expect(component).toContain("voiceChoiceButtonClass(selected)");
    expect(component).toContain("lobby-entry-film__cta");
    expect(component).not.toContain("StudioWorkspace");
    expect(MOBILE_VISUAL_MASTER.denim).toBe("#547C92");
    expect(MOBILE_VISUAL_MASTER.ivory).toBe("#F7F4EE");
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.status).toBe("OWNER_ACCEPTED");
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.heading).toBe(
      "How would you like to continue?",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.unselectedChoiceClass).toBe(
      "lobby-entry-film__cta",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.selectedChoiceClass).toBe(
      "lobby-entry-film__cta",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.buttonHierarchyCorrectedAt).toBe(
      "2026-09-06",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.buttonSystemStatus).toBe(
      "FUNCTION_PASS",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.samsungFillItOutMyselfStatus).toBe(
      "PASS",
    );
    expect(
      MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.samsungFillItOutMyselfOwnerAcceptedAt,
    ).toBe("2026-09-06");
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.selectedColorVisualStatus).toBe(
      "WELCOME_CTA_FAMILY",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.doNotAddInspectionDelay).toBe(
      true,
    );
    expect(read("src/config/studio-voice-preference-v1.ts")).toContain(
      'howToContinue: "How would you like to continue?"',
    );
    expect(film).toContain("gap: 1.2rem");
    expect(film).toContain("min-height: 3.25rem");
    expect(component).toContain("<a");
    expect(component).toContain("useSamsungGateActivate");
    expect(component).toContain('href="#studio-voice-choice"');
    expect(component).toContain("OWNER ACCEPTED 2026-08-29");
    expect(film).toContain("OWNER ACCEPTED 2026-08-29");
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.visualMaster).toBe(
      "MOBILE_VISUAL_MASTER",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.freezeFiles).toEqual([
      "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
      "src/components/studio-conversation-room/voice-choice-film.module.css",
    ]);
    expect(read("src/app/studio-review-mobile-tab.css")).toContain(
      ".studio-review-mobile-tab",
    );
    expect(
      existsSync(join(root, MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.proofPng)),
    ).toBe(true);
    const workspace = read(
      "src/components/studio-conversation-room/studio-workspace.module.css",
    );
    const loungeLight = workspace.slice(
      workspace.indexOf(".frame[data-lounge-light=\"true\"],"),
    );
    expect(loungeLight).toContain(
      "0 24px 64px color-mix(in srgb, #547c92 12%, transparent)",
    );
    expect(loungeLight.slice(0, 500)).not.toContain("rgba(0, 0, 0, 0.45)");
  });

  it("keeps one Lounge plate across the phone customer path", () => {
    const shell = read("src/app/studio-environment-shell.css");
    expect(shell).toContain("object-position: 16% 42%");
    expect(shell).toContain("object-position: 50% 50%");
    expect(shell).toContain("color-mix(in srgb, #2e2b28 18%, transparent)");
    expect(shell).toContain("filter: blur(2px)");
    expect(read("src/app/layout.tsx")).toContain("<StudioEnvironmentShell");
    const room = read(
      "src/components/studio-conversation-room/studio-conversation-room.module.css",
    );
    expect(room).not.toContain('url("/welcome-hall/studio-lobby-lounge.png")');
    expect(room).toContain("isolation: auto");
    expect(room).toContain("background-color: transparent");
    const workspace = read(
      "src/components/studio-conversation-room/studio-workspace.module.css",
    );
    expect(workspace).not.toContain("blur(28px)");
    expect(workspace).not.toContain(
      ':has([data-stage="services"]) .nameQuestionFrost',
    );
    expect(workspace).toContain(
      ':has([data-stage="services"]) .nameQuestionPanel::before',
    );
    expect(workspace).toContain(
      ':has([data-stage="services"]) .nameQuestionPanel,',
    );
  });

  it("scopes the name question to Voice Choice glass without tablet chrome", () => {
    const workspace = read(
      "src/components/studio-conversation-room/StudioWorkspace.tsx",
    );
    expect(workspace).toContain('from "@/components/studio-conversation-room/voice-choice-film.module.css"');
    expect(workspace).toContain("voiceFilm.panel");
    expect(workspace).toContain('data-name-question-panel="true"');
    expect(workspace).toContain("nameQuestion ? (");
    expect(workspace).toContain("styles.notch");
    const runtime = read(
      "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
    );
    expect(runtime).toContain("nameQuestion={questionGlass}");
    expect(runtime).toContain('step === "ask_preferred_name"');
    expect(runtime).toContain("step === \"ask_project_need\"");
    expect(runtime).toContain("step === \"ask_business_name\"");
    expect(runtime).toContain("step === \"ask_deadline\"");
    expect(runtime).toContain("step === \"ask_materials\"");
    expect(runtime).toContain("step === \"summary\"");
    expect(runtime).toContain('stage === "route"');
    expect(runtime).toContain("phonePlanStage");
    expect(runtime).toContain("phoneCheckoutStage");
    expect(runtime).toContain('stage === "services"');
    expect(runtime).toContain("(servicesStage && !isPhone)");
    expect(runtime).toContain("phonePlanStage");
    expect(runtime).toContain(
      'stage === "opening" && step === "summary" && !correcting',
    );
    expect(runtime).toContain("filmFamily={questionGlass}");
    expect(runtime).toContain("nameQuestion={questionGlass}");
    const film = read(
      "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
    );
    expect(film).toContain("OWNER ACCEPTED 2026-08-29");
    expect(film).not.toContain("nameQuestion");
    const comm = read(
      "src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx",
    );
    expect(comm).toContain("lobby-entry-film__cta");
    expect(comm).toContain("nameQuestion ? (");
    const voice = read(
      "src/components/studio-conversation-room/VoicePreferenceControls.tsx",
    );
    expect(voice).toContain("lobby-entry-film__cta");
    expect(voice).toContain("filmFamily");
    const tablet = read(
      "src/components/studio-conversation-room/guide/studio-guide-tablet.module.css",
    );
    expect(tablet).toContain('.root[data-step="ask_preferred_name"] .eyebrow');
    expect(tablet).toContain('.root[data-step="ask_project_need"] .eyebrow');
    expect(tablet).toContain('.root[data-step="ask_business_name"] .eyebrow');
    expect(tablet).toContain('.root[data-step="ask_deadline"] .eyebrow');
    expect(tablet).toContain('.root[data-step="ask_materials"] .eyebrow');
    expect(tablet).toContain('.root[data-step="summary"] .eyebrow');
    expect(tablet).toContain("lobby-entry-film__cta");
    expect(tablet).toContain(
      '.root[data-step="ask_preferred_name"] .questionRevealPad',
    );
    const workspaceCss = read(
      "src/components/studio-conversation-room/studio-workspace.module.css",
    );
    expect(workspaceCss).toContain(".nameQuestionPanel {");
    expect(workspaceCss).toContain("height: auto");
    expect(workspaceCss).toContain(
      '.frame[data-name-question="true"] .nameQuestionPanel',
    );
    const voiceCss = read(
      "src/components/studio-conversation-room/voice-preference-controls.module.css",
    );
    expect(voiceCss).toContain("min-height: 2.6rem");
    expect(voiceCss).toContain("color: #2e2b28");
    expect(voiceCss).toContain("border: 2px solid #547c92");
    expect(voiceCss).not.toContain(
      "color: color-mix(in srgb, #f7f4ee 72%, transparent)",
    );
    const navCss = read(
      "src/components/studio-conversation-room/conversation-nav-panel.module.css",
    );
    expect(navCss).toContain("border-radius: 999px");
    expect(navCss).not.toContain(
      "height: var(--studio-controls-tab-h, 3.25rem)",
    );
    const roomCss = read(
      "src/components/studio-conversation-room/studio-conversation-room.module.css",
    );
    expect(roomCss).toContain(".sideNav {");
    expect(roomCss).toContain(
      '.room[data-name-question="true"] .sideRail',
    );
    expect(roomCss).toContain(
      '.room[data-name-question="true"] .presenceBelow',
    );
    expect(roomCss).toContain(
      '.room[data-phone-quiet-chrome="true"] .sideRail',
    );
    expect(roomCss).toContain(
      '.room[data-phone-quiet-chrome="true"] .presenceBelow',
    );
    expect(roomCss).toContain(
      '.room[data-phone-quiet-chrome="true"] .surfaceCaption',
    );
    expect(read("src/components/studio-conversation-room/StudioConversationRoom.tsx")).toContain(
      "data-phone-quiet-chrome",
    );
    expect(read("src/app/studio-review-mobile-tab.css")).toContain(
      ".studio-review-mobile-tab.owner-qa::before",
    );
    expect(read("src/components/studio-conversation-room/StudioConversationRoom.tsx")).toContain(
      "{nameQuestion ? null : (",
    );
    expect(tablet).toContain('.root[data-step="ask_project_need"] .chip');
    expect(tablet).toContain('.root[data-step="ask_business_name"] .chip');
    expect(tablet).toContain('.root[data-step="ask_deadline"] .chip');
    expect(tablet).toContain('.root[data-step="ask_materials"] .chip');
    expect(tablet).toContain("background: transparent");
    expect(tablet).toContain("background: #f7c900");
    expect(tablet).toContain("color: #2e2b28");
    expect(tablet).toContain("border: 2px solid #547c92");
    expect(navCss).toContain("background: transparent");
    expect(navCss).not.toMatch(
      /\.drawerTab \{[^}]*background: var\(--mc-glass/,
    );
    const globals = read("src/app/globals.css");
    expect(globals).toContain(
      "var(--studio-review-mobile-bottom, 3.25rem) + 0.55rem",
    );
    const commCss = read(
      "src/components/studio-conversation-room/guide/studio-guide-comm.module.css",
    );
    expect(commCss).toContain(
      "color: color-mix(in srgb, #f7f4ee 32%, #2e2b28)",
    );
    expect(read("src/app/studio-review-mobile-tab.css")).toContain(
      "position: fixed",
    );
    expect(MOBILE_NAME_QUESTION_OWNER_ACCEPTED.status).toBe("OWNER_ACCEPTED");
    expect(MOBILE_NAME_QUESTION_OWNER_ACCEPTED.step).toBe("ask_preferred_name");
    expect(
      existsSync(join(root, MOBILE_NAME_QUESTION_OWNER_ACCEPTED.proofPng)),
    ).toBe(true);
    expect(MOBILE_VISUAL_SYSTEM_CHECKPOINT.nameQuestion).toBe("OWNER_ACCEPTED");
    expect(MOBILE_VISUAL_SYSTEM_CHECKPOINT.projectNeed).toBe("OWNER_ACCEPTED");
    expect(MOBILE_VISUAL_SYSTEM_CHECKPOINT.businessName).toBe("OWNER_ACCEPTED");
    expect(MOBILE_VISUAL_SYSTEM_CHECKPOINT.nextScreen).toBe("services");
    expect(MOBILE_VISUAL_SYSTEM_CHECKPOINT.reuseLockedComponents).toBe(true);
    expect(MOBILE_MATERIALS_CONFIRMATION_CHECKPOINT.materialsQuestion).toBe(
      "OWNER_ACCEPTED",
    );
    expect(MOBILE_MATERIALS_CONFIRMATION_CHECKPOINT.summaryConfirmation).toBe(
      "OWNER_ACCEPTED",
    );
    expect(MOBILE_MATERIALS_CONFIRMATION_CHECKPOINT.denimCta).toBe("#547C92");
    expect(MOBILE_MATERIALS_CONFIRMATION_CHECKPOINT.coralCorrectCta).toBe(
      "#D94E2B",
    );
    expect(MOBILE_MATERIALS_CONFIRMATION_CHECKPOINT.nextAction).toBe(
      "tap-yes-this-is-correct",
    );
    expect(
      existsSync(join(root, MOBILE_MATERIALS_CONFIRMATION_CHECKPOINT.checkpointDoc)),
    ).toBe(true);
    expect(MOBILE_CHOOSE_YOUR_ROUTE_OWNER_ACCEPTED.status).toBe("OWNER_ACCEPTED");
    expect(MOBILE_CHOOSE_YOUR_ROUTE_OWNER_ACCEPTED.stage).toBe("route");
    expect(MOBILE_CHOOSE_YOUR_ROUTE_OWNER_ACCEPTED.cardsSelectOnly).toBe(true);
    expect(MOBILE_CHOOSE_YOUR_ROUTE_OWNER_ACCEPTED.nextScreen).toBe("services");
    expect(
      existsSync(join(root, MOBILE_CHOOSE_YOUR_ROUTE_OWNER_ACCEPTED.proofPng)),
    ).toBe(true);
    expect(
      existsSync(join(root, MOBILE_CHOOSE_YOUR_ROUTE_OWNER_ACCEPTED.checkpointDoc)),
    ).toBe(true);
    expect(MOBILE_PROJECT_NEED_OWNER_ACCEPTED.step).toBe("ask_project_need");
    expect(MOBILE_BUSINESS_NAME_OWNER_ACCEPTED.step).toBe("ask_business_name");
    expect(
      existsSync(join(root, MOBILE_PROJECT_NEED_OWNER_ACCEPTED.proofPng)),
    ).toBe(true);
    expect(
      existsSync(join(root, MOBILE_BUSINESS_NAME_OWNER_ACCEPTED.proofPng)),
    ).toBe(true);
    expect(read("src/app/studio-review-mobile-tab.css")).toContain(
      "env(safe-area-inset-bottom, 0px)",
    );
  });
});
