import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const guideDir = join(process.cwd(), "src/components/studio-guide");

describe("mobile Guide readiness (Samsung Failure #3)", () => {
  it("SSR boot shell renders the first input and Continue — not an indefinite opening message", () => {
    const src = readFileSync(join(guideDir, "GuideSsrBootShell.tsx"), "utf8");
    expect(src).toContain('name="ganswer"');
    expect(src).toContain('type="submit"');
    expect(src).toContain("data-studio-guide-has-input");
    expect(src).not.toMatch(/>\s*Opening your conversation/);
  });

  it("client panel does not gate the field on bootReady / scrim / autofocus readiness", () => {
    const src = readFileSync(join(guideDir, "GuideConversationPanel.tsx"), "utf8");
    expect(src).not.toContain("bootReady");
    expect(src).toContain("if (!open) return null");
    expect(src).toContain("no readiness / scrim / focus gate");
    expect(src).not.toMatch(/if\s*\([^)]*scrimDismissArmed[^)]*\)\s*return\s+null/);
  });

  it("Lobby Guide overlay does not import Next useSearchParams", () => {
    const src = readFileSync(join(guideDir, "LobbyGuideOverlay.tsx"), "utf8");
    expect(src).toContain("initialOpen");
    expect(src).not.toContain("from \"next/navigation\"");
    expect(src).not.toMatch(/import\s*\{[^}]*useSearchParams/);
  });
});
