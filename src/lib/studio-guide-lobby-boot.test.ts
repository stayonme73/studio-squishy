import { describe, expect, it } from "vitest";

import { buildLobbyGuideBoot } from "@/lib/studio-guide-lobby-boot";

describe("buildLobbyGuideBoot (Samsung Failure #4)", () => {
  it("advances to business-name on first paint after Continue with an answer", () => {
    const boot = buildLobbyGuideBoot(
      {
        guide: "1",
        gr: "room-v8",
        gact: "continue",
        gfrom: "ask_project_need",
        ganswer: "Studio",
      },
      true,
    );

    expect(boot.guideOpen).toBe(true);
    expect(boot.ssrStep).toBe("ask_business_name");
    expect(boot.ssrDraft.projectNeed).toBe("Studio");
    expect(boot.serverHardNav.kind).toBe("advanced");
    if (boot.serverHardNav.kind !== "advanced") return;
    expect(boot.serverHardNav.draft.projectNeed).toBe("Studio");
    expect(boot.serverHardNav.step).toBe("ask_business_name");
  });

  it("keeps earlier answers when Continue carries them into summary", () => {
    const boot = buildLobbyGuideBoot(
      {
        guide: "1",
        gr: "room-v8",
        gact: "continue",
        gfrom: "ask_materials",
        ganswer: "Photos",
        g_need: "Website refresh",
        g_biz: "Studio Co",
        g_deadline: "",
        g_materials: "",
      },
      true,
    );

    expect(boot.ssrStep).toBe("summary");
    expect(boot.ssrDraft.projectNeed).toBe("Website refresh");
    expect(boot.ssrDraft.businessName).toBe("Studio Co");
    expect(boot.ssrDraft.existingMaterialsNote).toBe("Photos");
  });

  it("keeps question 1 and surfaces an error when Continue is empty", () => {
    const boot = buildLobbyGuideBoot(
      {
        guide: "1",
        gact: "continue",
        gfrom: "ask_project_need",
        ganswer: "   ",
      },
      true,
    );

    expect(boot.ssrStep).toBe("ask_project_need");
    expect(boot.ssrFieldError).toMatch(/enter what you are working on/i);
    expect(boot.serverHardNav.kind).toBe("error");
  });

  it("does not open Guide when the feature flag is off", () => {
    const boot = buildLobbyGuideBoot({ guide: "1", ganswer: "Studio" }, false);
    expect(boot.guideOpen).toBe(false);
  });
});
