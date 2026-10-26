import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("conversation activity panel package-name prop", () => {
  it("does not pass intakePackageName into ConversationActivityPanel", () => {
    const runtime = source("src/components/studio-conversation-room/ConversationRoomRuntime.tsx");
    const panel = source(
      "src/components/studio-conversation-room/guide/ConversationActivityPanel.tsx",
    );
    const activityAt = runtime.indexOf("<ConversationActivityPanel");
    const tabletAt = runtime.indexOf("<StudioGuideTabletView");
    const nameAt = runtime.indexOf("intakePackageName");
    expect(activityAt).toBeGreaterThan(-1);
    expect(tabletAt).toBeGreaterThan(activityAt);
    expect(nameAt).toBeGreaterThan(tabletAt);
    expect(runtime.match(/intakePackageName/g)).toHaveLength(1);
    expect(panel).not.toContain("intakePackageName");
  });

  it("keeps the package name on the intake tablet heading", () => {
    const tablet = source(
      "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
    );
    expect(tablet).toContain("intakePackageName?: string | null");
    expect(tablet).toContain("{intakePackageName || v.intakeTabletTitle}");
    expect(tablet).toContain("{intakePackageName ? (");
    expect(tablet).toContain("Project Intake");
  });
});
