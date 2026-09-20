import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getJobsForRoad,
  getSelectableRouteMapRoads,
} from "@/config/route-map-v1";

describe("Mobile Conversation Room coherence (MJ-D9)", () => {
  it("does not render questions until Voice On / Voice Off is chosen", () => {
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("const voiceUnset = voiceNarration === null");
    expect(runtime).toContain("voiceUnset || openingAsk ? null");
    expect(runtime).toContain("privacyNote={STUDIO_GUIDE_MIC_PRIVACY_NOTE}");
    expect(runtime).toContain("<VoiceChoiceFilm");
    expect(runtime).not.toContain("voiceChoice={");
    const gate = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
      ),
      "utf8",
    );
    expect(gate).toContain('data-voice-gate="true"');
    expect(gate).not.toContain("StudioWorkspace");
    expect(gate).not.toContain("studio-workspace");
  });

  it("keeps Voice toggle, Speak/Type, and Continue in the opening question cluster", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("answerDock={");
    expect(source).toContain("openingAsk ? (");
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain("answerDock");
    expect(tablet).toContain("modeControls");
    expect(tablet).toContain("styles.answerDock");
    expect(tablet).toContain('data-answer-dock="pinned"');
    expect(tablet).toContain('voiceMode === "on" ? answerDock');
    expect(tablet).toContain("voiceMode !== \"on\"");
    expect(tablet).toContain("answerAccepted");
    expect(tablet).toContain("!answerDock && question.bubbles.length > 0");
  });

  it("makes selected chips visibly distinct even under sticky Samsung hover", () => {
    const css = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/studio-guide-tablet.module.css",
      ),
      "utf8",
    );
    expect(css).toContain(".chip[data-selected=\"true\"]:hover");
    expect(css).toContain("background: var(--mc-denim, #547c92)");
    expect(css).toContain("color: var(--mc-ivory, #f7f4ee)");
    expect(css).toContain(
      '.root[data-step="ask_project_need"] .chipRow',
    );
    expect(css).toContain(
      '.root[data-step="ask_business_name"] .chipRow',
    );
    expect(css).toContain(
      '.root[data-step="ask_deadline"] .chipRow',
    );
    expect(css).toContain(
      '.root[data-step="ask_materials"] .chipRow',
    );
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("[data-skip-action]");
    expect(css).toContain(".btnSkipNow");
    expect(css).toContain('[data-stage="opening"]:has([data-answer-dock="pinned"])');
    const tabletView = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tabletView).toContain('data-skip-action="true"');
    expect(tabletView).toContain("skipAction");
    expect(tabletView).toContain("btnSkipNow");
  });

  it("hides required messaging once a bubble or typed answer is accepted", () => {
    const comm = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx",
      ),
      "utf8",
    );
    expect(comm).toContain("hasAcceptedAnswer");
    expect(comm).toContain("showValidationError");
    expect(comm).toContain("prev.textDraft === next.textDraft");
  });

  it("does not use a redundant OR divider in the Speak/Type question cluster", () => {
    const comm = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx",
      ),
      "utf8",
    );
    expect(comm).not.toContain("answerOr");
    expect(comm).not.toContain(">OR<");
    expect(comm).not.toContain("v.speakSubhint");
    const copy = readFileSync(
      join(process.cwd(), "src/config/conversation-room-guide-v1.ts"),
      "utf8",
    );
    expect(copy).toContain('speakHint: "Tap the mic to speak."');
    expect(copy).toContain('typeHintOff: "Start typing below."');
    expect(copy).toContain(
      'speakHintWithType: "Tap the mic to speak or start typing below."',
    );
    const commPanel = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx",
      ),
      "utf8",
    );
    expect(commPanel).toContain('data-voice-mode={voiceMode}');
    expect(commPanel).toContain('voiceMode === "on"');
    expect(commPanel).toContain('voiceMode === "off"');
    expect(commPanel).toContain("typeHintOff");
    expect(commPanel).toContain("cols={1}");
    expect(commPanel).not.toContain("or start typing below");
  });

  it("does not show This answer is required until Continue validation fails", () => {
    const comm = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx",
      ),
      "utf8",
    );
    expect(comm).toContain("showValidationError && answerRequired && !hasAcceptedAnswer");
    expect(comm).toContain("typeRequiredEmptyHint");
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("showValidationError={Boolean(error)}");
  });

  it("keeps Required as metadata under Voice, not beside the question headline", () => {
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    const askBlock = tablet.slice(tablet.indexOf("{isAsk && question"));
    expect(askBlock.indexOf("{modeControls}")).toBeLessThan(
      askBlock.indexOf("requiredMeta"),
    );
    expect(askBlock.indexOf("requiredMeta")).toBeLessThan(
      askBlock.indexOf("<h1 className={styles.question}>"),
    );
    expect(askBlock).not.toContain("!answerAccepted");
    expect(askBlock).toContain('data-required-meta="true"');
    expect(tablet).not.toContain("questionHeader");
    const css = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/studio-guide-tablet.module.css",
      ),
      "utf8",
    );
    expect(css).toContain(".requiredMeta");
    expect(css).toContain("color: var(--mc-eucalyptus, #456b5a)");
    expect(css).not.toContain("flex: 1 1 12rem");
    expect(css).toContain("font-size: var(--studio-type-page)");
    expect(css).not.toContain("clamp(1.18rem, 4.9vw, 1.45rem)");
  });
});

describe("MJ-D10 Mobile question advance / scroll position", () => {
  it("reveals the new question cluster after Continue without focusing the type field", () => {
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain("CONVERSATION_ROOM_ACTIVE_QUESTION_ID");
    expect(tablet).toContain("revealActiveQuestionCluster");
    expect(tablet).toContain("previousStepRef");
    expect(tablet).toContain('data-active-question-cluster="true"');
    expect(tablet).toContain('data-question-scroll-root="true"');
    expect(tablet).toContain("if (previous === step) return");
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("const nextStep = nextGuideStep(step);");
    expect(runtime).toContain("goToStep(nextStep, nextDraft);");
    expect(runtime).toContain("revealConversationTablet();");
  });
});

describe("MJ-D12 Mobile Studio Controls collapsible drawer", () => {
  it("keeps every control and does not key open state to the question", () => {
    const nav = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationNavPanel.tsx",
      ),
      "utf8",
    );
    expect(nav).toContain("useState(false)");
    expect(nav).not.toContain("sessionStorage");
    expect(nav).toContain('data-studio-controls={controlsOpen ? "expanded" : "collapsed"}');
    expect(nav).toContain('data-studio-controls-tab="true"');
    expect(nav).toContain('data-studio-controls="in-review"');
    expect(nav).toContain("Studio Controls");
    expect(nav).toContain("createPortal");
    expect(nav).toContain("useStudioMobileUtility");
    expect(nav).toContain("Help Center");
    expect(nav).toContain("Studio Review");
    expect(nav).toContain('data-studio-review-placement="studio-controls"');
    expect(nav).toContain("id=\"studio-controls-body\"");
    expect(nav.indexOf("useState(false)")).toBeLessThan(
      nav.indexOf("data-studio-controls"),
    );
    expect(nav).not.toMatch(/useState\(false,\s*step/);
    expect(nav).not.toContain("setControlsOpen(true)");
  });

  it("uses Studio Review as the only phone bottom tab and leaves the service list on that height", () => {
    const nav = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationNavPanel.tsx",
      ),
      "utf8",
    );
    expect(nav).toContain('data-studio-controls="in-review"');
    expect(nav).toContain("if (isPhone && mobileUtility)");
    const navCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/conversation-nav-panel.module.css",
      ),
      "utf8",
    );
    expect(navCss).toContain(".drawerTab {");
    expect(navCss).toContain("display: none;");
    expect(navCss).toContain("@media (max-width: 960px)");
    expect(navCss).toContain('data-studio-controls="collapsed"');
    expect(navCss).toContain('data-studio-controls="expanded"');
    expect(navCss).toContain('data-studio-controls="in-review"');
    expect(navCss).toContain("flex-direction: column-reverse");
    expect(navCss).toContain("border-radius: 999px");
    expect(navCss).toContain("-webkit-overflow-scrolling: touch");
    const roomCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-conversation-room.module.css",
      ),
      "utf8",
    );
    const roomPhone = roomCss.slice(roomCss.indexOf("@media (max-width: 960px)"));
    expect(roomPhone).toContain(".sideNav {");
    expect(roomPhone).toContain("display: none");
    expect(roomPhone).toContain("var(--studio-review-mobile-bottom, 3.25rem)");
    expect(roomPhone).not.toContain("max(14rem, 34dvh)");
    expect(roomPhone).not.toContain(
      "var(--studio-controls-tab-h) + var(--studio-review-mobile-tab-h",
    );
  });
});

describe("MJ-D13 Mobile Conversation Room page scroll", () => {
  it("does not make the phone room or opening tablet a competing scrollport", () => {
    const roomCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-conversation-room.module.css",
      ),
      "utf8",
    );
    const roomPhone = roomCss.slice(roomCss.indexOf("@media (max-width: 960px)"));
    expect(roomPhone).toContain("overflow-x: clip");
    expect(roomPhone).toContain("overflow-y: visible");
    expect(roomPhone).not.toContain("overflow-y: auto");
    expect(roomPhone).not.toContain("overflow-x: hidden");
    expect(roomPhone).toContain("MJ-D13");
    const tabletCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/studio-guide-tablet.module.css",
      ),
      "utf8",
    );
    const tabletPhone = tabletCss.slice(
      tabletCss.lastIndexOf("@media (max-width: 960px)"),
    );
    expect(tabletPhone).toContain("overflow: visible");
    expect(tabletPhone).toContain("min-height: auto");
    expect(tabletPhone).toContain('.root[data-stage="route"] .main');
    expect(tabletCss).toContain('.root[data-stage="route"] .main');
    expect(tabletCss).toContain("overflow: hidden");
  });

  it("keeps MJ-D10 Continue reveal and does not rebind it to ordinary scrolling", () => {
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain("revealActiveQuestionCluster");
    expect(tablet).toContain("if (previous === step) return");
    expect(tablet).not.toContain("addEventListener(\"scroll\"");
    expect(tablet).not.toContain("addEventListener(\"touchmove\"");
    const helper = readFileSync(
      join(process.cwd(), "src/lib/studio-conversation-tablet-anchor.ts"),
      "utf8",
    );
    expect(helper).toContain("export function revealActiveQuestionCluster");
    expect(helper).not.toContain("preventDefault");
  });
});

describe("MJ-D14 Mobile Review Together / Route page coherence", () => {
  it("lets Review Together and Choose Your Route share one document scroller", () => {
    const workspace = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-workspace.module.css",
      ),
      "utf8",
    );
    const phoneWs = workspace.slice(workspace.lastIndexOf("@media (max-width: 960px)"));
    expect(phoneWs).toContain("min-height: 0");
    expect(phoneWs).not.toContain("min(72dvh, 36rem)");
    expect(phoneWs).not.toContain("min(64dvh, 28rem)");
    const roomCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-conversation-room.module.css",
      ),
      "utf8",
    );
    const roomPhone = roomCss.slice(roomCss.indexOf("@media (max-width: 960px)"));
    expect(roomPhone).toContain("--tablet-width: 100%");
    expect(roomPhone).toContain("overflow-anchor: none");
    const tabletCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/studio-guide-tablet.module.css",
      ),
      "utf8",
    );
    const tabletPhone = tabletCss.slice(
      tabletCss.lastIndexOf("@media (max-width: 960px)"),
    );
    expect(tabletPhone).toContain('.root[data-stage="route"] .main');
    expect(tabletPhone).toContain("overflow: visible");
    expect(tabletPhone).toContain("height: auto");
    const panelCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
      ),
      "utf8",
    );
    expect(panelCss).toContain('.sheet[data-surface="tablet"] .mapFigure');
    expect(panelCss).toContain("flex: 0 0 auto");
  });

  it("clips Let’s Review Together sideways overflow without a room Y scrollport", () => {
    const roomCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-conversation-room.module.css",
      ),
      "utf8",
    );
    const roomPhone = roomCss.slice(roomCss.indexOf("@media (max-width: 960px)"));
    expect(roomPhone).toContain("overflow-x: clip");
    expect(roomPhone).toContain("overflow-y: visible");
    expect(roomPhone).toContain("overscroll-behavior-x: none");
    expect(roomCss).not.toContain("transform: scale(1.04)");
    const mobile = readFileSync(
      join(process.cwd(), "src/app/mobile-journey.css"),
      "utf8",
    );
    expect(mobile).toContain('html:has([data-layout="one-tablet"])');
    expect(mobile).toContain("overflow-x: clip");
  });

  it("reveals the new stage once and does not open the service sheet from scroll", () => {
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain("revealConversationStage");
    expect(tablet).toContain('stage === "services"');
    expect(tablet).toContain("if (isAsk) return");
    expect(tablet).toContain("revealActiveQuestionCluster");
    const nav = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationNavPanel.tsx",
      ),
      "utf8",
    );
    expect(nav).toContain("useSamsungTapActivate");
    expect(nav).toContain("drawerActivate");
    const activate = readFileSync(
      join(process.cwd(), "src/lib/studio-samsung-activate.ts"),
      "utf8",
    );
    expect(activate).toContain("export function useSamsungTapActivate");
    expect(activate).toContain("pointerup");
    expect(activate).toContain("TAP_SLOP_PX");
  });
});

describe("MJ-D15 — materials bubble vs optional details", () => {
  it("writes every selected materials chip into the extras field", () => {
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    const multiStart = runtime.indexOf('if (question.bubbleMode === "multi")');
    expect(multiStart).toBeGreaterThan(-1);
    const multiBlock = runtime.slice(
      multiStart,
      runtime.indexOf("setSelectedBubbles([bubble])", multiStart),
    );
    expect(multiBlock).toContain("return;");
    expect(multiBlock).toContain("writeTextDraft(next.join(\", \"))");
  });

  it("keeps materials details optional and does not narrate chip selection", () => {
    const config = readFileSync(
      join(process.cwd(), "src/config/conversation-room-guide-v1.ts"),
      "utf8",
    );
    expect(config).toContain("materialsDetailsHint");
    expect(config).toContain(
      "You can add extra details about your materials here. This is optional.",
    );
    expect(config).toContain('placeholder: "Add extra details"');
    expect(config).not.toContain(
      "Add any extra details about your materials. This is optional.",
    );
    expect(config).not.toContain("The Studio recorded");
    expect(config).not.toContain("recordedMaterialsSelection");
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).not.toContain("data-recorded-choice");
    expect(tablet).not.toContain("The Studio recorded");
    expect(tablet).not.toContain("recordedMaterialsSelection");
    expect(tablet).not.toContain("materialsDetailsHint");
    expect(tablet).not.toContain("writeTextDraft");
  });

  it("puts the summary confirmation on locked Lounge glass without tablet scaffolding", () => {
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("const summaryConfirm =");
    expect(runtime).toContain("phonePlanStage");
    expect(runtime).toContain("phoneCheckoutStage");
    const questionGlassBlock = runtime.slice(
      runtime.indexOf("const questionGlass ="),
      runtime.indexOf("const summaryConfirm ="),
    );
    expect(questionGlassBlock).toContain('step === "summary"');
    expect(questionGlassBlock).toContain('step === "confirmed"');
    const tabletView = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tabletView).toContain("SamsungDenimCta");
    expect(tabletView).toContain("{v.confirmLabel}");
    expect(tabletView).toContain("{v.correctLabel}");
    expect(tabletView).toContain("styles.summaryOuterActions");
    expect(tabletView).toContain("styles.summaryLine");
    expect(tabletView).toContain("{v.summaryIntroLead}");
    expect(tabletView).toContain("{v.summaryIntroAsk}");
    expect(tabletView).toContain("SamsungDenimCta");
    expect(tabletView).toContain("styles.btnCorrect");
    const tabletCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/studio-guide-tablet.module.css",
      ),
      "utf8",
    );
    expect(tabletCss).toContain('.root[data-step="summary"] .question');
    expect(tabletCss).toContain(".summaryLine");
    expect(tabletCss).toContain(".summaryOuterActions");
    expect(tabletCss).toContain("white-space: nowrap");
    expect(tabletCss).toContain('.root[data-step="summary"] .summaryRow dt');
    expect(tabletCss).toContain(".root[data-step=\"summary\"] .summaryRow + .summaryRow");
    expect(tabletCss).toContain("border-top: 1px solid #c8b59b");
    expect(tabletCss).toContain(".btnCorrect");
    expect(tabletCss).toContain("var(--mc-coral, #d94e2b)");
    const workspaceCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-workspace.module.css",
      ),
      "utf8",
    );
    expect(workspaceCss).toContain(
      '.frame[data-name-question="true"]:has([data-step="summary"])',
    );
    expect(workspaceCss).toContain(
      '.frame[data-name-question="true"]:has([data-stage="opening"]) .nameQuestionPanel',
    );
    expect(workspaceCss).toContain(
      '.frame[data-name-question="true"]:has([data-step="summary"]) .nameQuestionPanel',
    );
    expect(workspaceCss).toContain(
      '.frame[data-name-question="true"]:has([data-stage="plan"]) .nameQuestionPanel',
    );
    expect(workspaceCss).toContain("margin-bottom: 2.15rem");
    expect(workspaceCss).toContain("--studio-review-mobile-bottom");
    expect(tabletCss).toContain("\n.deadlineNote {");
    expect(tabletCss).toContain("overflow-x: clip");
    const deadlineNoteBlock = tabletCss.slice(
      tabletCss.indexOf("\n.deadlineNote {"),
      tabletCss.indexOf("\n.summaryRow dt {"),
    );
    expect(deadlineNoteBlock).toContain("border: none");
    expect(deadlineNoteBlock).toContain("border-radius: 0");
    expect(deadlineNoteBlock).toContain("background: transparent");
    expect(deadlineNoteBlock).not.toContain("border-radius: 0.65rem");
    expect(tabletCss).not.toContain("#355C7D");
    expect(tabletCss).not.toContain("#2C3E50");
    const room = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/StudioConversationRoom.tsx",
      ),
      "utf8",
    );
    expect(room).toContain("hidePhoneScaffolding");
    expect(room).toContain("data-phone-quiet-chrome");
    expect(room).toContain("nameQuestion || hidePhoneScaffolding");
    expect(runtime).toContain("openingAlreadySaved");
    expect(runtime).toContain('step === "confirmed"');
    expect(tabletView).toContain('step === "summary" || step === "confirmed"');
    expect(tabletView).not.toContain("confirmedSavedBadge");
  });

  it("keeps Choose Your Route as select-then-continue without tablet scaffolding", () => {
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    const preview = runtime.slice(
      runtime.indexOf("function handlePreviewRoad"),
      runtime.indexOf("function handleConfirmRoad"),
    );
    expect(preview).toContain("setPreviewRoadId(roadId)");
    expect(preview).not.toContain('openPanel("route")');
    expect(runtime).toContain('const routeChoose = stage === "route"');
    expect(runtime).toContain("voiceNarration != null");
    expect(runtime).toContain("phonePlanStage");
    const chooser = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationRouteChoose.tsx",
      ),
      "utf8",
    );
    expect(chooser).toContain("topControls");
    expect(chooser).toContain('className="lobby-entry-film__cta"');
    expect(chooser).toContain("data-route-continue");
    expect(chooser).toContain("Select this route.");
    expect(chooser).toContain("studioTileClass.standardLight");
    expect(chooser).toContain("studioTileClass.selectedActive");
    expect(chooser).not.toContain("Open route details.");
    expect(chooser).not.toContain("{compact ? confirmRow : null}");
    expect(chooser).toContain("{confirmRow}");
    expect(chooser).toContain("recommendedRoadId === road.id");
    const panelCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
      ),
      "utf8",
    );
    expect(panelCss).toContain(
      '.sheet[data-surface="tablet"] .routeExpand[data-expanded="true"]',
    );
    expect(panelCss).toContain("Selected state is the tile border");
    expect(panelCss).not.toContain("box-shadow: inset 0 0 0 2px #547c92");
    expect(panelCss).toContain(
      '.sheet[data-surface="tablet"] .routeExpand[data-recommended="true"]',
    );
    expect(panelCss).toContain(".sheet[data-surface=\"tablet\"] .routeArrow");
    expect(panelCss).toContain("display: none");
    const tabletRoute = panelCss.slice(
      panelCss.indexOf('.sheet[data-surface="tablet"] .routeExpand {'),
      panelCss.indexOf(".sheet[data-surface=\"tablet\"] .routeLabel"),
    );
    expect(tabletRoute).not.toContain("--mc-card");
    expect(tabletRoute).not.toContain("#547c92 10%");
    expect(tabletRoute).not.toContain("--mc-chip-selected");
  });
});

describe("MJ-D16 — Voice Off must not start the microphone", () => {
  it("disarms listening after the first-entry gate until the same gesture ends", () => {
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("suppressSameGestureFollowUp");
    expect(runtime).toContain("listenArmedRef.current = false");
    expect(runtime).toContain("if (!listenArmedRef.current)");
    expect(runtime).toContain("allowMicrophone={listenArmed}");
    expect(runtime).toContain("stopConversationDictation()");
    const gate = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
      ),
      "utf8",
    );
    expect(gate).toContain("useSamsungGateActivate");
    expect(gate).toContain("<a");
    expect(gate).toContain('action="off"');
    expect(gate).toContain("voiceChoiceButtonClass(selected)");
    expect(gate).toContain("lobby-entry-film__cta");
    expect(gate).toContain('href="#studio-voice-choice"');
    const activate = readFileSync(
      join(process.cwd(), "src/lib/studio-samsung-activate.ts"),
      "utf8",
    );
    expect(activate).toContain("useSamsungGateActivate");
    expect(activate).toContain('addEventListener("pointerdown"');
    expect(activate).toContain('addEventListener("pointerup"');
    expect(activate).toContain('addEventListener("touchend"');
    expect(activate).toContain('addEventListener("click"');
    expect(activate).toContain("if (nodeRef.current === node) return");
    expect(activate).toContain("Do not React-setState on pointerdown");
    expect(activate).toContain("swallowClick");
    expect(activate).toContain("stopImmediatePropagation");
    expect(activate).not.toContain('addEventListener("pointerup", finish, true)');
    const comm = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx",
      ),
      "utf8",
    );
    expect(comm).toContain("allowMicrophone");
    expect(comm).toContain("!allowMicrophone && !listening");
  });
});

describe("MJ-D18 — stale bubble selection must not carry forward", () => {
  it("clears chips on Continue and ignores leftover gesture taps", () => {
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("beginStudioPointerSettle");
    expect(runtime).toContain("disarmBubblesForSameGesture");
    expect(runtime).toContain("disarmContinueForSameGesture");
    expect(runtime).toContain("if (!continueArmedRef.current) return");
    expect(runtime).toContain("if (!bubbleArmedRef.current) return");
    expect(runtime).toContain("restoreSelection");
    expect(runtime).toContain("visibleBubblesForStoredAnswer");
    expect(runtime).toContain("writeTextDraft(restore ? fieldValueForStep(nextDraft, next) : \"\")");
    expect(runtime).toContain("BUBBLE_REARM_MS");
  });

  it("keys chips to the current question and consumes Continue’s leftover click", () => {
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain("key={`${question.step}:${bubble}`}");
    expect(tablet).toContain("tabletContinue ? { consumeGesture: true }");
    const comm = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx",
      ),
      "utf8",
    );
    expect(comm).toContain("consumeGesture: true");
    const activate = readFileSync(
      join(process.cwd(), "src/lib/studio-samsung-activate.ts"),
      "utf8",
    );
    expect(activate).toContain("if (!lastAt.current) return");
  });
});

describe("MJ-D19 Mobile Choose Your Services hierarchy", () => {
  it("compacts phone chrome without changing the job-list scroller or Studio Controls", () => {
    const panel = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationActivityPanel.tsx",
      ),
      "utf8",
    );
    expect(panel).toContain("<ConversationServiceList");
    expect(panel).toContain("onClose={onClose}");
    expect(panel).toContain("onBackToRoutes={onBackToRoutes}");
    const serviceList = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationServiceList.tsx",
      ),
      "utf8",
    );
    expect(serviceList).toContain("data-builder-route-context");
    expect(serviceList).toContain("data-service-list");
    expect(serviceList).toContain('data-tablet-journey-chrome="true"');
    expect(serviceList).toContain("topControls");
    expect(serviceList).toContain("servicesBackToRoutesLabel");
    expect(serviceList).toContain("Close activity panel");
    expect(serviceList).toContain("PROJECT_BUILDER_V1.totalLabel");
    expect(serviceList).toContain("PROJECT_BUILDER_V1.selectedCountLabel");
    expect(serviceList).toContain('dataAttr="review-plan"');
    const denim = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/SamsungDenimCta.tsx",
      ),
      "utf8",
    );
    expect(denim).toContain("data-review-studio-plan");
    const css = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
      ),
      "utf8",
    );
    expect(css).toContain("/* Light mint trim");
    expect(css).toContain("2.5px solid");
    expect(css).toContain("var(--mc-eucalyptus, #456b5a) 42%");
    expect(css).toContain(
      '.sheet[data-panel="builder"][data-surface="page"] .jobCard:not([data-selected="true"])',
    );
    expect(css).toContain("var(--mc-ivory, #f7f4ee) 32%, transparent");
    expect(css).toContain(
      '.sheet[data-panel="builder"][data-surface="page"] .builderFooter',
    );
    const phoneFooter = css.slice(
      css.indexOf(
        '.sheet[data-panel="builder"][data-surface="page"] .builderFooter',
      ),
    );
    expect(phoneFooter).toContain("background: transparent");
    expect(phoneFooter).toContain("border-top: none");
    expect(phoneFooter).toContain("position: static");
    expect(phoneFooter).toContain("align-self: flex-end");
    expect(phoneFooter).toContain("width: auto");
    const workspaceGlass = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-workspace.module.css",
      ),
      "utf8",
    );
    const phoneWsGlass = workspaceGlass.slice(
      workspaceGlass.lastIndexOf("@media (max-width: 960px)"),
    );
    expect(phoneWsGlass).not.toContain(':has([data-stage="services"]) .nameQuestionFrost');
    expect(phoneWsGlass).not.toContain(':has([data-stage="plan"]) .nameQuestionFrost');
    expect(phoneWsGlass).toContain(':has([data-stage="services"]) .nameQuestionPanel::before');
    expect(phoneWsGlass).toContain(':has([data-stage="plan"]) .nameQuestionPanel::before');
    expect(phoneWsGlass).not.toContain("var(--mc-ivory, #f7f4ee) 36%, transparent");
    expect(phoneWsGlass).not.toContain("blur(28px)");
    expect(phoneWsGlass).toContain(':has([data-stage="checkout"]) .nameQuestionPanel,');
    expect(phoneWsGlass).toContain(':has([data-stage="intake"]) .nameQuestionPanel {');
    expect(phoneWsGlass).toContain(':has([data-stage="services"]) .nameQuestionPanel,');
    const servicesCard = phoneWsGlass.slice(
      phoneWsGlass.indexOf(':has([data-stage="checkout"]) .nameQuestionPanel,'),
      phoneWsGlass.indexOf(
        ':has([data-stage="services"]) .nameQuestionPanel::before',
      ),
    );
    expect(servicesCard).toContain("overflow-y: auto");
    expect(servicesCard).toContain("max-height: calc(");
    expect(servicesCard).toContain('[data-stage="services"]');
    expect(phoneWsGlass).toContain(
      '.frame[data-name-question="true"] .nameQuestionPanel {',
    );
    const allStagePanel = phoneWsGlass.slice(
      phoneWsGlass.indexOf(
        '.frame[data-name-question="true"] .nameQuestionPanel {',
      ),
      phoneWsGlass.indexOf(':has([data-stage="checkout"]) .nameQuestionPanel,'),
    );
    expect(allStagePanel).toContain("overflow-y: auto");
    expect(allStagePanel).toContain("max-height: calc(");
    expect(phoneWsGlass).not.toContain(
      ':has([data-route-confirm="true"]) .nameQuestionPanel',
    );
    const planFrostPanel = phoneWsGlass.slice(
      phoneWsGlass.indexOf(
        ':has([data-stage="plan"]) .nameQuestionPanel {',
      ),
      phoneWsGlass.indexOf(
        ':has([data-stage="plan"]) .nameQuestionPanel::before',
      ),
    );
    expect(planFrostPanel).toContain("background: transparent");
    expect(planFrostPanel).not.toContain("overflow: visible");
    const workspaceTsx = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/StudioWorkspace.tsx",
      ),
      "utf8",
    );
    expect(workspaceTsx).toContain("nameQuestionFrost");
    const phone = css.slice(css.indexOf("@media (max-width: 960px)"));
    expect(phone).toContain("MJ-D19");
    expect(phone).toContain(".builderRouteContext");
    expect(phone).toContain(".builderCount");
    expect(phone).toContain("min-height: 12rem");
    expect(phone).toContain("-webkit-overflow-scrolling: touch");
    expect(phone).toContain("padding-bottom: 5.75rem");
    const room = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-conversation-room.module.css",
      ),
      "utf8",
    );
    const roomPhone = room.slice(room.indexOf("@media (max-width: 960px)"));
    expect(roomPhone).toContain('.slideHost[data-panel="builder"]');
    expect(roomPhone).toContain("width: 100%");
    expect(roomPhone).toContain("max-width: 100%");
    const nav = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationNavPanel.tsx",
      ),
      "utf8",
    );
    expect(nav).toContain("Studio Controls");
  });

  it("uses one ServiceList + the same phone CSS for every selectable Launch Now route", () => {
    const roads = getSelectableRouteMapRoads();
    expect(roads.map((road) => road.id)).toEqual([
      "i75",
      "i20",
      "update",
      "random-exit",
    ]);
    expect(roads.map((road) => road.customerLabel)).toEqual([
      "Get My Business Started",
      "Promote Something Now",
      "Update What I Already Have",
      "I Know What I Need",
    ]);
    expect(roads.every((road) => road.selectable)).toBe(true);
    for (const road of roads) {
      expect(getJobsForRoad(road.id).length).toBeGreaterThan(0);
    }
    const panel = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationActivityPanel.tsx",
      ),
      "utf8",
    );
    const serviceList = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationServiceList.tsx",
      ),
      "utf8",
    );
    expect(serviceList).toContain("road.customerLabel");
    expect(serviceList).toContain("getJobsForRoad(roadId)");
    expect(serviceList).not.toContain("if (roadId");
    expect(serviceList).not.toContain("roadId ===");
    expect(panel).toContain("if (panel === \"builder\" && selectedRoadId)");
    expect(panel).toContain("<ConversationServiceList");
    const css = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
      ),
      "utf8",
    );
    const phone = css.slice(css.indexOf("@media (max-width: 960px)"));
    expect(phone).not.toContain("i75");
    expect(phone).not.toContain("i20");
    expect(phone).not.toContain("random-exit");
    expect(phone).not.toContain("[data-road]");
  });
});

describe("Mobile Your project so far + Choose Your Services shell", () => {
  it("keeps desktop Your-project-so-far overlay and skips the phone confirmation stop", () => {
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain("phoneCheckoutPage");
    expect(tablet).toContain("phoneIntakePage");
    const desktopServices = tablet.slice(
      tablet.indexOf("{isServicesStage && !phoneLayout ? ("),
      tablet.indexOf("{isCheckoutStage && !phoneLayout ? ("),
    );
    expect(desktopServices).toContain("{modeControls}");
    expect(desktopServices).toContain("SamsungDenimCta");
    expect(desktopServices).toContain("{v.servicesTabletOpenPanelCta}");
    expect(desktopServices).toContain("{v.servicesChangeRouteCta}");
    expect(tablet).toContain("phonePage");
    expect(tablet).not.toContain("data-surface=\"route-confirm\"");
    expect(tablet).not.toContain("{v.routeConfirmContinueCta}");
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("const servicesStage = stage === \"services\"");
    expect(runtime).toContain("phoneCheckoutStage");
    expect(runtime).toContain("phoneIntakeStage");
    expect(runtime).not.toContain("setMobileRouteConfirm");
    const changeRoute = runtime.slice(
      runtime.indexOf("function handleChangeRoute"),
      runtime.indexOf("function handleLooksGoodPlan"),
    );
    expect(changeRoute).toContain('setStageAndPersist("route")');
    expect(changeRoute).toContain("closeActivityPanel()");
    const closePanel = runtime.slice(
      runtime.indexOf("function closeActivityPanel"),
      runtime.indexOf("function handlePreviewRoad"),
    );
    expect(closePanel).toContain('setActivePanel("none")');
    expect(closePanel).not.toContain("setStageAndPersist");
    const selectRoad = runtime.slice(
      runtime.indexOf("function handleSelectRoad"),
      runtime.indexOf("const previousStageRef"),
    );
    expect(selectRoad).toContain("readPhoneLayout()");
    expect(selectRoad).toContain("closeActivityPanel()");
    expect(selectRoad).not.toContain("setMobileRouteConfirm");
    expect(selectRoad).toContain('openPanel("builder")');
    const editPlan = runtime.slice(
      runtime.indexOf("function handleEditPlan"),
      runtime.indexOf("function handleChangeRoute"),
    );
    expect(editPlan).toContain('setStageAndPersist("services")');
  });
});

describe("Mobile route → services → plan navigation simplification", () => {
  it("restores single-tap Denim without changing chip leftover-click guards", () => {
    const denim = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/SamsungDenimCta.tsx",
      ),
      "utf8",
    );
    expect(denim).toContain("useSamsungTapActivate");
    expect(denim).toContain('href="#studio-action"');
    expect(denim).toContain("event.preventDefault()");
    const activate = readFileSync(
      join(process.cwd(), "src/lib/studio-samsung-activate.ts"),
      "utf8",
    );
    expect(activate).toContain("if (!lastAt.current) return");
    expect(activate).toContain("if (!sawPointerDown.current) return");
    const route = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationRouteChoose.tsx",
      ),
      "utf8",
    );
    expect(route).toContain("useSamsungActivate");
    expect(route).not.toContain("useSamsungTapActivate");
  });

  it("does not auto-open the builder overlay on phone and keeps desktop overlay", () => {
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("if (readPhoneLayout()) return");
    expect(runtime).toContain('openPanel("builder")');
    expect(runtime).toContain("phoneHidesBuilderOverlay");
    expect(runtime).toContain("phoneHidesCheckoutOverlay");
    expect(runtime).toContain("phoneHidesIntakeOverlay");
    expect(runtime).toContain("presentCheckoutSurface");
    expect(runtime).not.toContain("onContinueToServices");
    const reviewPlan = runtime.slice(
      runtime.indexOf("function handleReviewStudioPlan"),
      runtime.indexOf("function handleEditPlan"),
    );
    expect(reviewPlan).toContain('setStageAndPersist("plan")');
    expect(reviewPlan).toContain("disarmCheckoutAdvanceForSameGesture");
    const looksGood = runtime.slice(
      runtime.indexOf("function handleLooksGoodPlan"),
      runtime.indexOf("function authorizeCheckoutPayment"),
    );
    expect(looksGood).toContain("if (!checkoutAdvanceArmedRef.current) return");
    expect(looksGood).toContain('setStageAndPersist("checkout")');
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain("extrasInPlace={phoneLayout}");
    expect(tablet).toContain("hideActions={phoneLayout}");
    expect(tablet).toContain("ConversationStudioPlanActions");
    const plan = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationStudioPlanTablet.tsx",
      ),
      "utf8",
    );
    expect(plan).toContain("studioPlanDetailsToggle");
    expect(plan).not.toContain("studioPlanDetailsOpenHint");
    expect(plan).not.toContain("planDetailsMark");
    expect(plan).toContain('data-plan-details-toggle="true"');
    expect(plan).toContain("useSamsungTapActivate");
    expect(plan).not.toContain("scrollIntoView");
    expect(plan).toContain("studioPlanEditServicesLabel");
    expect(plan).toContain("data-plan-actions");
    expect(plan).toContain("extrasInPlace");
    expect(plan).toContain("topControls");
    expect(plan).toContain("studioTileClass.standardLight");
    expect(plan).toContain("studioTileClass.supportingQuiet");
    expect(plan).toContain("studioTileClass.secondaryAction");
    const planCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/studio-guide-tablet.module.css",
      ),
      "utf8",
    );
    expect(planCss).toContain(".planTablet .eyebrow");
    expect(planCss).toContain(".planTablet .question");
    expect(planCss).toContain("font-size: var(--studio-type-page)");
    expect(planCss).toContain("font-size: 1.12rem");
    expect(planCss).toContain("font-size: 1.22rem");
    expect(planCss).toContain(
      "color-mix(in srgb, var(--mc-ink, #2e2b28) 88%, transparent)",
    );
    expect(planCss).toContain("--studio-tile-quiet-border");
    expect(planCss).toContain("--studio-action-secondary-fill");
    expect(planCss).toContain("color: var(--mc-denim, #547c92)");
    const planShell = planCss.slice(
      planCss.indexOf(".planTablet {"),
      planCss.indexOf(".planTabletHeader {"),
    );
    expect(planShell).toContain("overflow: visible");
    expect(planShell).not.toContain("overflow: hidden");
    const planFacts = planCss.slice(
      planCss.indexOf(".planVoiceFacts {"),
      planCss.indexOf(".planFactCard {"),
    );
    expect(planFacts).toContain("overflow: visible");
    expect(planFacts).not.toContain("overflow: auto");
    const tileCss = readFileSync(
      join(process.cwd(), "src/app/studio-customer-tile-system.css"),
      "utf8",
    );
    expect(tileCss).toContain(
      "color-mix(in srgb, color-mix(in srgb, #f7f4ee 68%, #ebe2d4 32%) 46%, transparent)",
    );
    expect(tileCss).toContain("blur(14px) saturate(1.04) brightness(1.1)");
    expect(tileCss).toContain("inset 0 1px 0 rgba(255, 255, 255, 0.35)");
    expect(tileCss).toContain(".studio-tile--quiet");
    expect(tileCss).toContain("color-mix(in srgb, #f7f4ee 40%, transparent)");
    expect(planCss).not.toContain("clamp(1.75rem, 5.5cqi, 2.25rem)");
    expect(planCss).not.toContain("rgba(220, 216, 208, 0.9)");
    const checkout = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationCheckoutPanel.tsx",
      ),
      "utf8",
    );
    expect(checkout).toContain("phonePage");
    expect(checkout).toContain("studioTileClass.standardLight");
    expect(checkout).toContain("studioTileClass.standardDense");
    expect(checkout).toContain("styles.checkoutPageSurface");
    expect(checkout).toContain('data-checkout-surface={phonePage ? "page-content" : "host"}');
    expect(checkout).toContain("compactPaymentHonesty={phonePage}");
    expect(checkout).toContain("if (phonePage)");
    expect(checkout).toContain("resetConversationStageScroll()");
    expect(checkout).toContain("v.checkoutLead");
    expect(checkout).toContain("phonePage ? null : (");
    expect(checkout).toContain("v.checkoutScopeDisclosure");
    expect(checkout).toContain("SamsungDeckBack");
    expect(checkout).toContain("v.checkoutBackToPlanLabel");
    expect(planCss).toContain(".summaryOuterActions .lobby-entry-film__cta");
    expect(planCss).toContain("justify-content: center");
    const activityCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
      ),
      "utf8",
    );
    expect(activityCss).toContain("object-fit: contain");
    expect(activityCss).toContain("padding: 0.85rem 0.7rem 0.9rem");
    expect(activityCss).toContain(".sheet[data-panel=\"builder\"][data-surface=\"page\"] .eyebrow");
    expect(readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationServiceList.tsx",
      ),
      "utf8",
    )).not.toContain("servicesStepLabel");
    expect(readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationStudioPlanTablet.tsx",
      ),
      "utf8",
    )).not.toContain("studioPlanStepLabel");
    expect(activityCss).toContain(".expandToggle");
    expect(activityCss).toContain("padding: 0.65rem 1.1rem");
    expect(activityCss).toContain(".routeConfirmRow .lobby-entry-film__cta");
    const pageSurface = activityCss.slice(
      activityCss.indexOf(".checkoutPageSurface {"),
      activityCss.indexOf(".checkoutPageSurface :global(.pay-shell)"),
    );
    expect(pageSurface).toContain("overflow: visible");
    expect(pageSurface).not.toContain("overflow: auto");
    expect(activityCss).toContain(
      ".checkoutPageSurface :global(.co-card) {",
    );
    expect(activityCss).toContain("background: transparent");
    const intakePanel = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationIntakePanel.tsx",
      ),
      "utf8",
    );
    expect(intakePanel).toContain("phonePage = false");
    expect(intakePanel).toContain("phonePage ? null : (");
    expect(intakePanel).toContain("paidAcknowledgment");
    expect(intakePanel).toContain("intakePaidAckItem");
    expect(intakePanel).toContain('data-confirmed={item.confirmed ? "true" : "false"}');
    expect(intakePanel).not.toContain("data-intake-well");
    const intakeTablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(intakeTablet).toContain("intakeTabletStatus?.paymentReceived");
    expect(intakeTablet).toContain("intakeTabletStatus?.servicesConfirmed");
    expect(readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    )).toContain("readCurrentCampaignHydrated()?.paymentReceivedAt");
    expect(readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    )).toContain('writeTextDraft(next.join(", "))');
    expect(intakePanel).toContain('data-surface={phonePage ? "page" : "overlay"}');
    expect(intakePanel).toContain("phoneLayout={phonePage}");
    const intakeForm = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ProjectIntakeMultiServiceForm.tsx",
      ),
      "utf8",
    );
    expect(intakeForm).toContain('data-intake-layout={phoneLayout ? "phone" : "desktop"}');
    expect(intakeForm).toContain("route-map-social-intake__card-head");
    expect(intakeForm).toContain('data-selected={selected ? "true" : "false"}');
    expect(intakeForm).toContain("questions answered");
    expect(intakeForm).toContain("route-map-social-intake__next-step");
    expect(intakeForm).not.toContain(
      "Complete the required questions to continue.",
    );
    expect(intakeForm).toContain("PHONE_MATERIALS_HINT");
    expect(intakeForm).toContain('data-intake-action="draft"');
    expect(intakeForm).toContain('autoComplete="off"');
    expect(intakeForm).toContain("paintKey");
    expect(intakeForm).toContain("unlockBrowserPaint");
    expect(intakeForm).toContain("siw-");
    expect(intakeForm).toContain("data-intake-type-line");
    expect(intakeForm).toContain("intakeTypeWell");
    expect(intakeForm).not.toContain("route-map-social-intake__compact-field");
    expect(activityCss).toContain(".intakeTypeWell");
    expect(activityCss).toContain(".intakeTypeLine");
    const phoneIntakeCss = activityCss.slice(
      activityCss.indexOf(
        '.sheet[data-panel="intake"][data-surface="page"]',
      ),
    );
    expect(phoneIntakeCss).toContain(
      ":global(.route-map-social-intake__card-head)",
    );
    expect(phoneIntakeCss).toContain("flex-direction: column");
    expect(phoneIntakeCss).toContain("grid-template-columns: none");
    expect(phoneIntakeCss).toContain(
      "background: color-mix(in srgb, var(--mc-ivory, #f7f4ee) 72%, transparent)",
    );
    expect(phoneIntakeCss).toContain(
      ":global(.route-map-social-intake__chip--selected)",
    );
    expect(phoneIntakeCss).toContain("background: color-mix(in srgb, #bfd8f2 22%, transparent)");
    expect(phoneIntakeCss).toContain('aria-pressed="true"');
    expect(phoneIntakeCss).toContain(
      ":global(.route-map-secondary-btn):not(:disabled)",
    );
    expect(phoneIntakeCss).toContain(
      ":global(.route-map-primary-btn):disabled",
    );
    expect(phoneIntakeCss).toContain("gap: 0.85rem");
    expect(phoneIntakeCss).toContain(":global(.route-map-social-intake__chips)");
    expect(phoneIntakeCss).toContain("background: transparent");
    expect(phoneIntakeCss).toContain("padding: 0.75rem 0.85rem");
    expect(phoneIntakeCss).toContain(".checkoutScopeDisclosure");
    expect(activityCss).toContain("[data-tablet-journey-chrome]");
    expect(activityCss).toContain("gap: 0.75rem");
    expect(activityCss).toContain(".intakePaidAck");
    expect(activityCss).toContain("gap: 0.85rem");
    expect(activityCss).toContain(".intakePaidAckItem[data-confirmed=\"true\"]");
    expect(activityCss).toContain("rgba(46, 120, 80, 0.28)");
    expect(activityCss).toContain("color: #ffffff");
  });
});

describe("Conversation journey chrome — Back then Voice through Intake", () => {
  it("keeps Back above Voice On/Off on route, plan, services, checkout, and intake", () => {
    const route = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationRouteChoose.tsx",
      ),
      "utf8",
    );
    expect(route.indexOf("onDeckBack && deckBackLabel")).toBeLessThan(
      route.indexOf("{topControls}"),
    );
    const plan = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationStudioPlanTablet.tsx",
      ),
      "utf8",
    );
    expect(plan.indexOf("onDeckBack && deckBackLabel")).toBeLessThan(
      plan.indexOf("{topControls}"),
    );
    const services = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationServiceList.tsx",
      ),
      "utf8",
    );
    expect(services.indexOf("servicesBackToRouteLabel")).toBeLessThan(
      services.indexOf("{topControls}"),
    );
    const checkout = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationCheckoutPanel.tsx",
      ),
      "utf8",
    );
    expect(checkout).toContain("topControls");
    expect(checkout.indexOf("checkoutBackToPlanLabel")).toBeLessThan(
      checkout.indexOf("{topControls}"),
    );
    const intake = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationIntakePanel.tsx",
      ),
      "utf8",
    );
    expect(intake).toContain("deckBackLabel");
    expect(intake).toContain("onDeckBack");
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).toContain("intakeBackToCheckoutLabel");
    expect(runtime).toContain('stage === "checkout"');
    expect(runtime).toContain('stage === "intake"');
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain("renderGuideQuestionTitle");
    const summary = tablet.slice(tablet.indexOf("{isSummary && !correcting"));
    expect(summary.indexOf("{modeControls}")).toBeLessThan(
      summary.indexOf("summaryIntroLead"),
    );
  });
});
