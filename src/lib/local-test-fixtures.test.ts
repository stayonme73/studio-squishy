import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import {
  LOCAL_TEST_FIXTURE_PATH,
  localTestFixturesCopy,
} from "@/lib/local-test-fixtures-copy";

describe("local test fixture surfaces", () => {
  it("is available in development and test only", () => {
    expect(
      isLocalAuthFixtureAvailable({
        env: { NODE_ENV: "development" } as NodeJS.ProcessEnv,
      }),
    ).toBe(true);
    expect(
      isLocalAuthFixtureAvailable({
        env: { NODE_ENV: "production" } as NodeJS.ProcessEnv,
      }),
    ).toBe(false);
  });

  it("Board fixture control uses Samsung same-tab navigation, not Next Link click", () => {
    const scene = readFileSync(
      join(process.cwd(), "src/components/studio-board/StudioBoardScene.tsx"),
      "utf8",
    );
    const control = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-board/LocalTestFixtureBoardControl.tsx",
      ),
      "utf8",
    );
    expect(scene).toContain("showLocalTestFixture");
    expect(scene).toContain("{showLocalTestFixture ? <LocalTestFixtureBoardControl /> : null}");
    expect(scene).toContain("sb-header-v3");
    expect(control).toContain("useSamsungGateActivate");
    expect(control).toContain("window.location.assign(LOCAL_TEST_FIXTURE_PATH)");
    expect(control).toContain(LOCAL_TEST_FIXTURE_PATH);
    expect(control).toContain("localTestFixturesCopy.boardButton");
    expect(control).not.toContain("from \"next/link\"");
    expect(control).not.toContain("NEXT_PUBLIC_");
  });

  it("Studio Board page gates the control from the local-only helper", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/(studio)/studio-board/page.tsx"),
      "utf8",
    );
    expect(source).toContain("isLocalAuthFixtureAvailable()");
    expect(source).toContain("showLocalTestFixture={isLocalAuthFixtureAvailable()}");
    expect(source).not.toContain("NEXT_PUBLIC_");
  });

  it("fixture page 404s in production before rendering files", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/local-test-fixtures/page.tsx"),
      "utf8",
    );
    const gate = source.indexOf("isLocalAuthFixtureAvailable()");
    const notFoundCall = source.indexOf("notFound()");
    expect(gate).toBeGreaterThan(-1);
    expect(notFoundCall).toBeGreaterThan(gate);
    expect(source).toContain("StudioMobileLoungeShell");
    expect(source).toContain("studio-tile--standard");
    expect(source).toContain("local-test-fixture-page");
    expect(readFileSync(
      join(process.cwd(), "src/components/shared/StudioMobileLoungeShell.tsx"),
      "utf8",
    )).toContain("data-mobile-customer-spine");
    expect(source).toContain("LOCAL_TEST_FIXTURE_PREVIEW_PATH");
    expect(source).toContain("LocalTestFixturePageActions");
    expect(source).not.toContain("from \"next/link\"");
    expect(source).not.toContain("NEXT_PUBLIC_");
    const actions = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-board/LocalTestFixturePageActions.tsx",
      ),
      "utf8",
    );
    expect(actions).toContain("useSamsungGateActivate");
    expect(actions).toContain("lobby-entry-film__cta");
    expect(actions).not.toContain("utility-btn--primary");
    expect(actions).toContain("deliverLocalTestFixtureToPhone");
    expect(actions).toContain("prefetchLocalTestFixture");
    expect(actions).not.toContain("LOCAL_TEST_FIXTURE_DOWNLOAD_PATH");
    expect(actions).toContain('window.location.assign("/studio-board")');
    const save = readFileSync(
      join(process.cwd(), "src/lib/local-test-fixture-save.ts"),
      "utf8",
    );
    expect(save).toContain("LOCAL_TEST_FIXTURE_PREVIEW_PATH");
    expect(save).toContain("createObjectURL");
    expect(save).toContain("payload.blobUrl");
    expect(save).toContain('link.download = LOCAL_TEST_FIXTURE_FILENAME');
    expect(save).not.toContain("canShare");
    expect(save).not.toContain("navigator.share");
    expect(save).not.toContain(".share({");
    expect(save).not.toContain("LOCAL_TEST_FIXTURE_DOWNLOAD_PATH");
  });

  it("download route 404s before reading the file when unavailable", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/app/api/local-test-fixtures/pine-petal-ordinary-mark/route.ts",
      ),
      "utf8",
    );
    const gate = source.indexOf("isLocalAuthFixtureAvailable()");
    const readFile = source.indexOf("readFile(");
    expect(gate).toBeGreaterThan(-1);
    expect(readFile).toBeGreaterThan(gate);
    expect(source).toContain('Content-Type": "image/png"');
    expect(source).toContain("Content-Length");
    expect(source).toContain("[local-test-fixture-download]");
    expect(source).toContain("downloadManager");
    expect(localTestFixturesCopy.boardButton).toBe("Save Studio fixture file");
    expect(
      readFileSync(
        join(process.cwd(), "src/app/mobile-customer-spine-surfaces.css"),
        "utf8",
      ),
    ).toContain(".local-test-fixture-page");
  });
});
