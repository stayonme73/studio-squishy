import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("useSamsungActivate", () => {
  it("binds a stable native pointerdown and does not skip mouse-emulated taps", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/studio-samsung-activate.ts"),
      "utf8",
    );
    expect(source).toContain('addEventListener("pointerdown"');
    expect(source).toContain("useSamsungTapActivate");
    expect(source).toContain("TAP_SLOP_PX");
    expect(source).toContain("consumeGesture");
    expect(source).toContain("if (!lastAt.current) return");
    expect(source).toContain("event?.detail === 0");
    expect(source).toContain("RefCallback");
    expect(source).not.toContain('pointerType === "mouse"');
    expect(source).not.toContain("useLayoutEffect");
  });
});

describe("tablet glass hit targets (MJ-D8)", () => {
  it("does not disable pointer events on the question layer beside Voice preference", () => {
    const css = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/studio-workspace.module.css",
      ),
      "utf8",
    );
    expect(css).not.toContain(".hostSurface > *:not(:only-child):last-child *");
    expect(css).toContain("pointer-events: auto");
    const lastChildBlock = css.slice(
      css.indexOf(".hostSurface > *:not(:only-child):last-child {"),
    );
    expect(lastChildBlock).not.toMatch(
      /\.hostSurface > \*:not\(:only-child\):last-child \{[^}]*pointer-events:\s*none/,
    );
  });
});
