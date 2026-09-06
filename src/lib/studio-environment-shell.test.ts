import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MOBILE_VISUAL_MASTER } from "@/config/mobile-customer-spine-palette-v1";
import {
  STUDIO_ENVIRONMENT_SHELL_STATUS,
  studioEnvironmentShellV1,
} from "@/config/studio-environment-shell-v1";
import { studioCustomerTileSystemV1 } from "@/config/studio-customer-tile-system-v1";
import { welcomeHallScene } from "@/config/welcome-hall-scene";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Studio Environment Shell V1", () => {
  it("locks the Let’s Get Started Gold Master recipe", () => {
    expect(STUDIO_ENVIRONMENT_SHELL_STATUS).toBe("APPROVED_NOT_FROZEN");
    expect(studioEnvironmentShellV1.goldMaster).toBe(
      "lets-get-started-samsung",
    );
    expect(studioEnvironmentShellV1.asset).toBe(welcomeHallScene.src);
    expect(studioEnvironmentShellV1.phoneCrop).toBe("16% 42%");
    expect(studioEnvironmentShellV1.desktopCrop).toBe("50% 50%");
    expect(studioEnvironmentShellV1.veilFilter).toBe("blur(2px)");
    expect(studioEnvironmentShellV1.contentGlassFilter).toBe(
      MOBILE_VISUAL_MASTER.glassFilterLiteral,
    );
    expect(studioEnvironmentShellV1.doNotPutFullScreenFrostAboveControls).toBe(
      true,
    );
    expect(studioEnvironmentShellV1.doNotImplementSliding).toBe(true);
    expect(studioEnvironmentShellV1.preserveStep2Tiles).toBe(true);
    expect(studioEnvironmentShellV1.plateSize).toBe("100lvh / 100lvw");
    expect(studioEnvironmentShellV1.sharedFrostFill).toContain("22%");
  });

  it("mounts once in the root layout", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain("StudioEnvironmentShell");
    expect(layout).toContain("studio-environment-app");
    expect(layout).not.toContain("slide");
    expect(read("src/app/globals.css")).toContain(
      'import "./studio-environment-shell.css"',
    );
    const css = read("src/app/studio-environment-shell.css");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("object-position: 50% 50%");
    expect(css).toContain("object-position: 16% 42%");
    expect(css).toContain("filter: blur(2px)");
    expect(css).toContain("100lvh");
    expect(css).toContain("100lvw");
    expect(css).toContain("studio-environment-shell__frost");
    expect(css).not.toContain("blur(14px) saturate(1.04) brightness(1.1)");
    expect(css).toContain("Retired moving environmental frost");
  });

  it("stops Conversation Room and Voice Choice from painting a second Lounge", () => {
    const room = read(
      "src/components/studio-conversation-room/studio-conversation-room.module.css",
    );
    expect(room).not.toContain("studio-lobby-lounge.png");
    expect(room).toContain("isolation: auto");
    expect(room).toContain(".room::before,");
    expect(room).toContain("content: none");
    const film = read(
      "src/components/studio-conversation-room/voice-choice-film.module.css",
    );
    expect(film).not.toContain("studio-lobby-lounge.png");
    const voice = read(
      "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
    );
    expect(voice).not.toContain("styles.plate");
    expect(voice).not.toContain("styles.veil");
  });

  it("disables the utility mural painter without restyling page content", () => {
    const css = read("src/app/studio-environment-shell.css");
    expect(css).toContain(".studio-utility-backdrop::before");
    expect(css).toContain("display: none !important");
    expect(css).toContain(".lobby-entry-film__scrim");
    expect(css).toContain("main:has(.welcome-hall-phase1)");
    expect(css).toContain(".co-scene");
    expect(css).toContain(".bds-scene__backdrop");
    expect(
      studioCustomerTileSystemV1.approvedLockedSurfaces.step2ChooseYourServices
        .status,
    ).toBe("FROZEN_OWNER_ACCEPTED");
  });
});
