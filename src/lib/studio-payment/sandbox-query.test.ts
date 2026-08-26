import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CONVERSATION_ROOM_SANDBOX_HREF,
  searchHasStudioPaymentSandbox,
  withStudioPaymentSandboxQuery,
} from "./sandbox-query";

describe("studio payment sandbox query", () => {
  it("detects the explicit local-cert flag", () => {
    expect(searchHasStudioPaymentSandbox("?studioPaymentSandbox=1")).toBe(true);
    expect(searchHasStudioPaymentSandbox("studioPaymentSandbox=1")).toBe(true);
    expect(searchHasStudioPaymentSandbox("?foo=1")).toBe(false);
    expect(searchHasStudioPaymentSandbox("")).toBe(false);
    expect(searchHasStudioPaymentSandbox(null)).toBe(false);
  });

  it("appends the flag only when the source already opted in", () => {
    expect(
      withStudioPaymentSandboxQuery(
        "/studio-conversation-room",
        "?studioPaymentSandbox=1",
      ),
    ).toBe("/studio-conversation-room?studioPaymentSandbox=1");
    expect(
      withStudioPaymentSandboxQuery("/lobby-entry/begin-new", "?studioPaymentSandbox=1"),
    ).toBe("/lobby-entry/begin-new?studioPaymentSandbox=1");
    expect(
      withStudioPaymentSandboxQuery("/studio-conversation-room", ""),
    ).toBe("/studio-conversation-room");
  });

  it("does not treat other query values as the sandbox opt-in", () => {
    expect(
      withStudioPaymentSandboxQuery(
        "/studio-conversation-room",
        "?studioPaymentSandbox=true",
      ),
    ).toBe("/studio-conversation-room");
  });

  it("exports the Conversation Room sandbox href used by Lobby handoff", () => {
    expect(CONVERSATION_ROOM_SANDBOX_HREF).toBe(
      "/studio-conversation-room?studioPaymentSandbox=1",
    );
  });

  it("keeps lobbyEntry=reset and the sandbox flag on Lobby return", () => {
    expect(
      withStudioPaymentSandboxQuery(
        "/studio-lobby?lobbyEntry=reset",
        "?studioPaymentSandbox=1",
      ),
    ).toBe("/studio-lobby?lobbyEntry=reset&studioPaymentSandbox=1");
  });

  it("Conversation Room Close conversation uses hard Lobby assign, not router.push", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("window.location.assign");
    expect(source).toContain("withStudioPaymentSandboxQuery");
    expect(source).toContain("result.lobbyRoute");
    expect(source).not.toContain("router.push(result.lobbyRoute)");
    expect(source).not.toContain("useRouter");
  });

  it("Conversation Room remount restores stored answers instead of wiping them", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("loadGuideDraft()");
    expect(source).toContain("latestGuideDraft");
    expect(source).toContain("guideHasReviewableAnswers");
    expect(source).not.toContain("isConversationJourneyComplete()");
    expect(source).not.toContain("clearCompletedConversationLocalState()");
    expect(source).toContain("handleReviewAnswers");
    expect(source).toContain("goToStep(\"summary\", latest");
    expect(source).toContain("revealConversationTablet");
    expect(source).not.toContain("guideHasReviewableAnswers(loadGuideDraft())");
  });

  it("places Studio Review in Studio Controls instead of a floating Conversation Room pill", () => {
    const css = readFileSync(join(process.cwd(), "src/app/owner-qa.css"), "utf8");
    expect(css).toContain("body:has([data-layout=\"one-tablet\"]) .owner-qa");
    expect(css).toContain("display: none !important");
    expect(css).not.toContain("top: 42vh");
    const nav = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationNavPanel.tsx",
      ),
      "utf8",
    );
    expect(nav).toContain('data-studio-review-placement="studio-controls"');
    expect(nav).toContain("Studio Review");
    expect(nav).toContain("<StudioReviewControl />");
    expect(nav.indexOf("<StudioReviewControl />")).toBeGreaterThan(
      nav.indexOf("Help Center"),
    );
    expect(nav).toContain("CONVERSATION_ROOM_TABLET_HREF");
    expect(nav).toContain('data-session-action="review-answers"');
    expect(nav).toContain('data-session-action="change-answer"');
    expect(nav).toContain("addEventListener(\"pointerup\"");
    expect(nav).toContain("reviewActivate.ref");
    expect(nav).toContain("onClick={reviewActivate.onClick}");
  });

  it("typed-only tablet questions do not duplicate Continue on the tablet", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("typedAnswerDockHint");
    expect(source).toContain("question.bubbles.length > 0");
    expect(source).toContain('data-tablet-continue="true"');
  });

  it("phone Choose-your-services sheet uses an explicit height so job cards can scroll", () => {
    const css = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-conversation-room.module.css",
      ),
      "utf8",
    );
    expect(css).toContain(
      "height: calc(100dvh - min(38dvh, 20rem) - max(14rem, 34dvh))",
    );
    expect(css).toContain(
      "height: calc(100dvh - min(10dvh, 4.5rem) - max(14rem, 34dvh))",
    );
    expect(css).toContain('.slideHost[data-panel="builder"]');
    expect(css).not.toContain(
      "max-height: calc(100dvh - min(38dvh, 20rem) - max(14rem, 34dvh))",
    );
    const panel = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
      ),
      "utf8",
    );
    expect(panel).toContain("-webkit-overflow-scrolling: touch");
    expect(panel).toContain("min-height: 12rem");
  });
});
