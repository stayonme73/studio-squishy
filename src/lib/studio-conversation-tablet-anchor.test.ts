import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONVERSATION_ROOM_ACTIVE_QUESTION_ID,
  CONVERSATION_ROOM_TABLET_HREF,
  CONVERSATION_ROOM_TABLET_ID,
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
    expect(questionClusterDocumentScrollTop(480, -220)).toBe(248);
    expect(questionClusterDocumentScrollTop(0, 16)).toBe(4);
    expect(questionClusterDocumentScrollTop(40, -8)).toBe(20);
  });

  it("never focuses the type field from the reveal helper", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/studio-conversation-tablet-anchor.ts"),
      "utf8",
    );
    const helper = source.slice(
      source.indexOf("export function revealActiveQuestionCluster"),
    );
    expect(helper).not.toContain(".focus(");
    expect(helper).not.toContain("studio-guide-type-field");
    expect(helper).not.toContain("scrollTo(0, 0)");
    expect(helper).toContain('behavior: "auto"');
    expect(helper).toContain('block: "start"');
    expect(helper).toContain("questionClusterDocumentScrollTop");
  });
});
