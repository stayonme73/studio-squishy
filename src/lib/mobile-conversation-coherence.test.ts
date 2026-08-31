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
    expect(runtime).not.toContain("voiceChoice");
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
    expect(tablet).toContain("answerAccepted");
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
    expect(copy).toContain(
      'speakHint: "Tap the mic to speak or start typing below."',
    );
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
    expect(css).toContain("clamp(1.18rem, 4.9vw, 1.45rem)");
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
  it("does not copy multi-select bubbles into the details field", () => {
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
    expect(multiBlock).not.toContain("writeTextDraft");
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
    expect(tablet).toContain("materialsDetailsHint");
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
    expect(tabletCss).toContain('.root[data-step="summary"] .summaryRow dt');
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
    expect(workspaceCss).toContain("margin-bottom: 2.15rem");
    expect(workspaceCss).toContain("--studio-review-mobile-bottom");
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
    expect(runtime).toContain("(servicesStage && !isPhone)");
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
    expect(panelCss).toContain("box-shadow: inset 0 0 0 2px #547c92");
    expect(panelCss).toContain(
      '.sheet[data-surface="tablet"] .routeExpand[data-recommended="true"]',
    );
    expect(panelCss).toContain(".sheet[data-surface=\"tablet\"] .routeArrow");
    expect(panelCss).toContain("display: none");
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
    expect(gate).toContain('addEventListener("pointerdown"');
    expect(gate).toContain('addEventListener("click"');
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
    expect(runtime).toContain("disarmBubblesForSameGesture");
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
    expect(phoneWsGlass).toContain(':has([data-stage="services"]) .nameQuestionFrost');
    expect(phoneWsGlass).toContain("var(--mc-ivory, #f7f4ee) 36%, transparent");
    expect(phoneWsGlass).toContain("blur(28px)");
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
    const plan = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationStudioPlanTablet.tsx",
      ),
      "utf8",
    );
    expect(plan).toContain("studioPlanDetailsToggle");
    expect(plan).toContain("studioPlanEditServicesLabel");
    expect(plan).toContain("data-plan-actions");
    expect(plan).toContain("extrasInPlace");
    expect(plan).toContain("topControls");
    const checkout = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationCheckoutPanel.tsx",
      ),
      "utf8",
    );
    expect(checkout).toContain("phonePage");
    expect(checkout).toContain("compactPaymentHonesty={phonePage}");
    expect(checkout).toContain("if (phonePage) return");
    expect(checkout).toContain("v.checkoutLead");
    expect(checkout).toContain("phonePage ? null : (");
    expect(checkout).toContain("v.checkoutScopeDisclosure");
  });
});
