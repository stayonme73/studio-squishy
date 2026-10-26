import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("studio guide mic activate contract", () => {
  it("calls the zero-argument tap handler", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideCommPanel.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("micActivate.onClick();");
    expect(source).not.toContain("micActivate.onClick(event)");
  });
});
