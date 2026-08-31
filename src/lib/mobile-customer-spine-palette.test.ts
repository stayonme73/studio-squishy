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
    expect(film).toContain('url("/welcome-hall/studio-lobby-lounge.png")');
    expect(film).toContain("16% 42%");
    expect(film).toContain("color-mix(in srgb, #2e2b28 18%, transparent)");
    expect(film).toContain("backdrop-filter: blur(2px)");
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
        "if (!ready || !projectDraft || voiceNarration === null)",
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
    expect(component).toContain("lobby-entry-film__cta");
    expect(component).not.toContain("StudioWorkspace");
    expect(MOBILE_VISUAL_MASTER.denim).toBe("#547C92");
    expect(MOBILE_VISUAL_MASTER.ivory).toBe("#F7F4EE");
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.status).toBe("OWNER_ACCEPTED");
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.heading).toBe(
      "How would you like to continue?",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.ctaClass).toBe(
      "lobby-entry-film__cta",
    );
    expect(read("src/config/studio-voice-preference-v1.ts")).toContain(
      'howToContinue: "How would you like to continue?"',
    );
    expect(film).toContain("gap: 1.2rem");
    expect(film).toContain("min-height: 3.25rem");
    expect(component).not.toContain("href=");
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
