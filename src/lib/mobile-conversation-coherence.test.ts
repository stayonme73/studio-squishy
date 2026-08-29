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
    expect(runtime).toContain("voiceUnset ? (");
    expect(runtime).toContain("privacyNote={STUDIO_GUIDE_MIC_PRIVACY_NOTE}");
    expect(runtime).toContain("voiceUnset || openingAsk ? null");
    const gate = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/VoicePreferenceControls.tsx",
      ),
      "utf8",
    );
    expect(gate).toContain('data-voice-gate="true"');
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
    expect(css).toContain("background: rgba(210, 175, 95, 0.92)");
    expect(css).toContain("color: #1a1510");
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
    expect(css).toContain("color: rgba(210, 175, 95, 0.95)");
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
  it("defaults collapsed, keeps every control, and does not key open state to the question", () => {
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
    expect(nav).toContain("Studio Controls");
    expect(nav).toContain("drawerActivate.ref");
    expect(nav).toContain("onClick={drawerActivate.onClick}");
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

  it("shows a compact phone tab and leaves the service list on the collapsed tab height", () => {
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
    expect(navCss).toContain("flex-direction: column-reverse");
    expect(navCss).toContain("-webkit-overflow-scrolling: touch");
    const roomCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-conversation-room.module.css",
      ),
      "utf8",
    );
    expect(roomCss).toContain("z-index: 122");
    expect(roomCss).toContain(
      "height: calc(100dvh - min(10dvh, 4.5rem) - var(--studio-controls-tab-h))",
    );
    expect(roomCss).not.toContain("max(14rem, 34dvh)");
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
    expect(roomCss).toContain("transform: scale(1.04)");
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

  it("shows the recorded materials choice and keeps details optional", () => {
    const config = readFileSync(
      join(process.cwd(), "src/config/conversation-room-guide-v1.ts"),
      "utf8",
    );
    expect(config).toContain("recordedMaterialsSelection");
    expect(config).toContain("materialsDetailsHint");
    expect(config).toContain(
      "Add any extra details about your materials. This is optional.",
    );
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain('data-recorded-choice="true"');
    expect(tablet).toContain("materialsDetailsHint");
    expect(tablet).not.toContain("writeTextDraft");
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
        "src/components/studio-conversation-room/VoicePreferenceControls.tsx",
      ),
      "utf8",
    );
    expect(gate).toContain("consumeGesture: true");
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
    expect(panel).toContain("data-builder-route-context");
    expect(panel).toContain("data-service-list");
    expect(panel).toContain("servicesBackToRoutesLabel");
    expect(panel).toContain("Close activity panel");
    expect(panel).toContain("PROJECT_BUILDER_V1.totalLabel");
    expect(panel).toContain("PROJECT_BUILDER_V1.selectedCountLabel");
    const css = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
      ),
      "utf8",
    );
    const phone = css.slice(css.indexOf("@media (max-width: 960px)"));
    expect(phone).toContain("MJ-D19");
    expect(phone).toContain(".builderRouteContext");
    expect(phone).toContain(".builderCount");
    expect(phone).toContain("min-height: 12rem");
    expect(phone).toContain("-webkit-overflow-scrolling: touch");
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
    const serviceList = panel.slice(
      panel.indexOf("function ServiceList"),
      panel.indexOf("function LearnMoreView"),
    );
    expect(serviceList).toContain("road.customerLabel");
    expect(serviceList).toContain("getJobsForRoad(roadId)");
    expect(serviceList).not.toContain("if (roadId");
    expect(serviceList).not.toContain("roadId ===");
    expect(panel).toContain("if (panel === \"builder\" && selectedRoadId)");
    expect(panel).toContain("<ServiceList");
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
