import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Mobile Studio Review is the one bottom utility tab", () => {
  it("keeps the Welcome Studio Review tab as the shared visual master", () => {
    const tab = read("src/app/studio-review-mobile-tab.css");
    expect(tab).toContain(".studio-review-mobile-tab.owner-qa");
    expect(tab).toContain("color-mix(in srgb, #2e2b28 32%, transparent)");
    expect(tab).toContain("--studio-review-mobile-tab-h: 3.25rem");
    expect(tab).toContain("env(safe-area-inset-bottom, 0px)");
    expect(tab).toContain("color: #f7f4ee");
    expect(tab).toContain("backdrop-filter: blur(14px) saturate(1.04) brightness(1.1)");
    expect(tab).toContain("z-index: 10070");
    expect(tab).toContain("data-studio-controls-in-review");
    const panel = read("src/components/dev/OwnerQaPanel.tsx");
    expect(panel).toContain("studio-review-mobile-tab");
    expect(panel).toContain("StudioMobileControlsSlot");
    expect(panel).toContain("scroll: false");
  });

  it("moves Conversation Room Studio Controls into the Review drawer on phone", () => {
    const nav = read(
      "src/components/studio-conversation-room/ConversationNavPanel.tsx",
    );
    expect(nav).toContain("createPortal");
    expect(nav).toContain('data-studio-controls="in-review"');
    expect(nav).toContain("Ask a question");
    expect(nav).toContain("Save for now");
    expect(nav).toContain("Help Center");
    expect(nav).toContain("Return to Lobby");
    expect(nav).toContain("onStartNew");
    expect(nav).toContain("onCloseConversation");
    expect(nav).toContain("onToggleSummary");
    expect(nav).toContain("onChangeAnswer");
    expect(nav).toContain("onSaveForNow");
    expect(nav).toContain("onOpenHelp");
    expect(nav).toContain("onReturnToLobby");
    expect(nav).toContain("{isPhone ? null : <StudioReviewControl onOpen={closeDrawer} />}");
    expect(nav).toContain("mobileUtility?.closeUtility()");
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain("StudioMobileUtilityProvider");
    expect(layout).toContain("OwnerQaRoot");
    const utility = read("src/components/dev/studio-mobile-utility.tsx");
    expect(utility).toContain("data-studio-controls-in-review");
    expect(utility).toContain("registerControls");
  });

  it("hides the separate phone Studio Controls tab on Conversation Room", () => {
    const room = read(
      "src/components/studio-conversation-room/studio-conversation-room.module.css",
    );
    const phone = room.slice(room.indexOf("@media (max-width: 960px)"));
    expect(phone).toContain(".sideNav {");
    expect(phone).toContain("display: none");
    expect(phone).toContain("padding-bottom: var(--studio-review-mobile-bottom, 3.25rem)");
    expect(phone).not.toContain(
      "var(--studio-controls-tab-h) + var(--studio-review-mobile-tab-h",
    );
    const navCss = read(
      "src/components/studio-conversation-room/conversation-nav-panel.module.css",
    );
    expect(navCss).toContain('data-studio-controls="in-review"');
    expect(navCss).toContain("background: transparent");
  });

  it("keeps the phone Review drawer scrollable and does not restyle Welcome", () => {
    const qa = read("src/app/owner-qa.css");
    expect(qa).toContain(".owner-qa__panel--phone");
    expect(qa).toContain("overflow-y: auto");
    expect(qa).toContain("bottom: var(--studio-review-mobile-bottom, 3.25rem)");
    expect(qa).toContain("-webkit-overflow-scrolling: touch");
    const welcome = read("src/app/welcome-hall-phase1.css");
    expect(welcome).not.toContain("data-studio-controls-in-review");
    const voice = read(
      "src/components/studio-conversation-room/voice-choice-film.module.css",
    );
    expect(voice).not.toContain("data-studio-controls-in-review");
  });
});
