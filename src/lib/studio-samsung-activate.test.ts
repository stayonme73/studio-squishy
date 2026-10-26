import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  beginStudioPointerSettle,
  isStudioPointerSettling,
  STUDIO_POINTER_SETTLE_MS,
} from "@/lib/studio-samsung-activate";

describe("shared leftover-tap settle", () => {
  it("swallows pointer and click events until the next screen is idle", () => {
    beginStudioPointerSettle();
    expect(isStudioPointerSettling()).toBe(true);
    expect(STUDIO_POINTER_SETTLE_MS).toBe(450);
    if (typeof window !== "undefined") {
      const click = new Event("click", { bubbles: true, cancelable: true });
      const down = new Event("pointerdown", { bubbles: true, cancelable: true });
      window.dispatchEvent(click);
      window.dispatchEvent(down);
      expect(click.defaultPrevented).toBe(true);
      expect(down.defaultPrevented).toBe(true);
    }
  });
});

describe("useSamsungActivate", () => {
  it("binds a stable native pointerdown and does not skip mouse-emulated taps", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/studio-samsung-activate.ts"),
      "utf8",
    );
    expect(source).toContain('addEventListener("pointerdown"');
    expect(source).toContain("useSamsungTapActivate");
    expect(source).toContain("useSamsungGateActivate");
    expect(source).toContain('addEventListener("touchend"');
    expect(source).toContain("TAP_SLOP_PX");
    expect(source).toContain("consumeGesture");
    expect(source).toContain("if (!lastAt.current) return");
    expect(source).toContain("if (!sawPointerDown.current) return");
    expect(source).toContain("event?.detail === 0");
    expect(source).toContain("beginStudioPointerSettle");
    expect(source).toContain('addEventListener("pointerdown", swallowClick, true)');
    expect(source).toContain("mountedDuringSettle");
    expect(source).toContain("STUDIO_POINTER_SETTLE_MS");
    expect(source).toContain("blockStudioPointerId");
    expect(source).toContain("isBlockedStudioPointerId");
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

describe("Voice Choice Fill it out myself (Samsung tap)", () => {
  it("uses the Let’s Get Started <a> CTA and activates on pointerup/touchend/click without requiring pointerdown", () => {
    const gate = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
      ),
      "utf8",
    );
    expect(gate).toContain("<a");
    expect(gate).toContain("useSamsungGateActivate");
    expect(gate).toContain("data-voice-choice-action={action}");
    expect(gate).toContain('action="off"');
    expect(gate).toContain("voiceChoiceButtonClass(selected)");
    expect(gate).toContain("data-voice-choice-continue");
    expect(gate).toContain("conversationRoomGuideV1.continueLabel");
    expect(gate).toContain("function select(");
    expect(gate).toContain("continueArmedRef");
    expect(gate).toContain("suppressSameGestureFollowUp");
    expect(gate).toContain("beginStudioPointerSettle");
    expect(gate).toContain("StudioPointerSettleShield");
    expect(gate).toContain("continueArmed");
    expect(gate).toContain("pointerEvents");
    expect(gate).not.toContain("onChoose(value);");
    expect(gate).toContain('href="#studio-voice-choice"');
    const activate = readFileSync(
      join(process.cwd(), "src/lib/studio-samsung-activate.ts"),
      "utf8",
    );
    expect(activate).toContain("useSamsungGateActivate");
    expect(activate).toContain('addEventListener("pointerdown"');
    expect(activate).toContain('addEventListener("pointerup"');
    expect(activate).toContain('addEventListener("touchend"');
    expect(activate).toContain("Do not require pointerdown");
    expect(activate).toContain("onPressRef");
    expect(activate).toContain("if (nodeRef.current === node) return");
    expect(activate).toContain("Do not React-setState on pointerdown");
    expect(activate).toContain('addEventListener("pointercancel"');
    expect(activate).toContain("dataset.gatePressed");
    expect(activate).toContain("swallowClick");
    expect(activate).toContain("stopImmediatePropagation");
    expect(activate).not.toContain('addEventListener("pointerup", finish, true)');
    const gateActivate = activate.slice(activate.indexOf("useSamsungGateActivate"));
    expect(gateActivate).not.toContain("if (!sawPointerDown.current) return");
    const css = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/voice-choice-film.module.css",
      ),
      "utf8",
    );
    expect(css).toContain(".panel::before");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("pointer-events: auto");
  });
});

describe("Samsung LAN origin and tap-debug removal", () => {
  it("keeps the current private-network origins and no longer ships the tap-debug HUD", () => {
    const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(nextConfig).toContain(
      'allowedDevOrigins: ["10.1.10.208", "10.179.174.254", "10.126.244.254"]',
    );
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).not.toContain("SamsungTapDebugHud");
    expect(layout).not.toContain("studioTapDebug");
    const runtime = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
      ),
      "utf8",
    );
    expect(runtime).not.toContain("SamsungTapDebugHud");
    const gate = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
      ),
      "utf8",
    );
    expect(gate).not.toContain("noteStudioTapChoose");
    expect(gate).not.toContain("studio-samsung-tap-debug");
    const activate = readFileSync(
      join(process.cwd(), "src/lib/studio-samsung-activate.ts"),
      "utf8",
    );
    expect(activate).not.toContain("emitStudioTapDebug");
    expect(activate).not.toContain("studio-samsung-tap-debug");
    const beginNew = readFileSync(
      join(process.cwd(), "src/app/lobby-entry/begin-new/route.ts"),
      "utf8",
    );
    expect(beginNew).not.toContain("withStudioTapDebugQuery");
    expect(existsSync(join(process.cwd(), "src/lib/studio-samsung-tap-debug.ts"))).toBe(
      false,
    );
    expect(
      existsSync(
        join(
          process.cwd(),
          "src/components/studio-conversation-room/SamsungTapDebugHud.tsx",
        ),
      ),
    ).toBe(false);
  });
});
