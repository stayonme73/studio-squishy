import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONVERSATION_ROOM_ACTIVE_QUESTION_HEADING_ID,
  CONVERSATION_ROOM_ACTIVE_QUESTION_ID,
  CONVERSATION_ROOM_ACTIVE_QUESTION_TOP_ID,
  CONVERSATION_ROOM_TABLET_HREF,
  CONVERSATION_ROOM_TABLET_ID,
  QUESTION_REVEAL_MARGIN_PX,
  clampDocumentScrollTop,
  questionClusterDocumentScrollTop,
} from "./studio-conversation-tablet-anchor";

describe("conversation room tablet anchor", () => {
  it("uses a stable in-page hash Samsung can follow without React click", () => {
    expect(CONVERSATION_ROOM_TABLET_ID).toBe("conversation-room-tablet");
    expect(CONVERSATION_ROOM_TABLET_HREF).toBe("#conversation-room-tablet");
  });
});

describe("MJ-D10 active question reveal", () => {
  it("keeps a stable question-cluster target", () => {
    expect(CONVERSATION_ROOM_ACTIVE_QUESTION_ID).toBe(
      "conversation-room-active-question",
    );
  });

  it("scrolls to the new cluster instead of forcing page top", () => {
    expect(QUESTION_REVEAL_MARGIN_PX).toBe(16);
    expect(questionClusterDocumentScrollTop(480, -220)).toBe(244);
    expect(questionClusterDocumentScrollTop(0, 16)).toBe(0);
    expect(questionClusterDocumentScrollTop(40, -8)).toBe(16);
    expect(questionClusterDocumentScrollTop(900, 580)).toBe(1464);
    expect(clampDocumentScrollTop(1448, 900)).toBe(900);
    expect(clampDocumentScrollTop(1448, 1600)).toBe(1448);
  });

  it("never focuses the type field from the reveal helper", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/studio-conversation-tablet-anchor.ts"),
      "utf8",
    );
    expect(source).toContain("CONVERSATION_ROOM_TABLET_ID");
    expect(source).toContain("CONVERSATION_ROOM_ACTIVE_QUESTION_TOP_ID");
    expect(source).toContain("applyActiveQuestionReveal");
    expect(source).toContain("blurContinueIfFocused");
    expect(source).toContain("questionClusterDocumentScrollTop");
    expect(source).toContain("requestAnimationFrame");
    const helper = source.slice(
      source.indexOf("export function revealActiveQuestionCluster"),
    );
    expect(helper).not.toContain(".focus(");
    expect(helper).not.toContain("studio-guide-type-field");
    expect(helper).not.toContain("scrollTo(0, 0)");
    expect(helper).not.toContain("scrollIntoView");
  });

  it("lands on the Conversation Room tablet header, not the Voice row alone", () => {
    expect(CONVERSATION_ROOM_TABLET_ID).toBe("conversation-room-tablet");
    expect(CONVERSATION_ROOM_ACTIVE_QUESTION_TOP_ID).toBe(
      "conversation-room-active-question-top",
    );
    expect(CONVERSATION_ROOM_ACTIVE_QUESTION_HEADING_ID).toBe(
      "conversation-room-active-question-heading",
    );
    const source = readFileSync(
      join(process.cwd(), "src/lib/studio-conversation-tablet-anchor.ts"),
      "utf8",
    );
    const apply = source.slice(source.indexOf("function applyActiveQuestionReveal"));
    expect(apply).toContain("CONVERSATION_ROOM_TABLET_ID");
    expect(apply).toContain("CONVERSATION_ROOM_ACTIVE_QUESTION_TOP_ID");
    expect(apply).not.toContain("CONVERSATION_ROOM_ACTIVE_QUESTION_HEADING_ID");
    const tablet = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(tablet).toContain("CONVERSATION_ROOM_ACTIVE_QUESTION_TOP_ID");
    expect(tablet).toContain('data-question-reveal-top="true"');
    expect(tablet).toContain("data-question-reveal-pad");
    const css = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/studio-guide-tablet.module.css",
      ),
      "utf8",
    );
    const phone = css.slice(css.lastIndexOf("@media (max-width: 960px)"));
    const pad = phone.slice(phone.indexOf(".questionRevealPad"));
    expect(pad).toContain("height: 2.5rem");
    expect(pad).not.toContain("100dvh");
  });
});
