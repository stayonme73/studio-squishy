import { describe, expect, it } from "vitest";

import { getRouteMapIntakeSchema, ROUTE_MAP_INTAKE_SCHEMAS } from "@/catalog/intake";
import {
  buildMaterialsPathAnswer,
  INTAKE_MATERIALS_HAVE_NOW,
  INTAKE_MATERIALS_NONE_YET,
  INTAKE_MATERIALS_PROVIDE_LATER,
  isMaterialsPathAnswerComplete,
  parseMaterialsPathAnswer,
} from "@/lib/route-map-intake-materials";

describe("route-map-intake-materials", () => {
  it("round-trips availability and description answers", () => {
    expect(buildMaterialsPathAnswer(INTAKE_MATERIALS_NONE_YET, "ignored")).toBe(
      INTAKE_MATERIALS_NONE_YET,
    );
    expect(buildMaterialsPathAnswer(INTAKE_MATERIALS_PROVIDE_LATER, "")).toBe(
      INTAKE_MATERIALS_PROVIDE_LATER,
    );
    expect(buildMaterialsPathAnswer(INTAKE_MATERIALS_HAVE_NOW, " logo.png ")).toBe("logo.png");
    expect(buildMaterialsPathAnswer(INTAKE_MATERIALS_HAVE_NOW, "")).toBe(
      INTAKE_MATERIALS_HAVE_NOW,
    );
    expect(buildMaterialsPathAnswer(INTAKE_MATERIALS_HAVE_NOW, "   ")).toBe(
      INTAKE_MATERIALS_HAVE_NOW,
    );

    expect(parseMaterialsPathAnswer(INTAKE_MATERIALS_NONE_YET)).toEqual({
      availability: INTAKE_MATERIALS_NONE_YET,
      detail: "",
    });
    expect(parseMaterialsPathAnswer(INTAKE_MATERIALS_HAVE_NOW)).toEqual({
      availability: INTAKE_MATERIALS_HAVE_NOW,
      detail: "",
    });
    expect(parseMaterialsPathAnswer("logo.png")).toEqual({
      availability: INTAKE_MATERIALS_HAVE_NOW,
      detail: "logo.png",
    });
  });

  it("treats describe-now as incomplete until detail is present", () => {
    expect(
      isMaterialsPathAnswerComplete(INTAKE_MATERIALS_HAVE_NOW, "", true),
    ).toBe(false);
    expect(
      isMaterialsPathAnswerComplete(INTAKE_MATERIALS_HAVE_NOW, "logo.png", true),
    ).toBe(true);
    expect(isMaterialsPathAnswerComplete(INTAKE_MATERIALS_NONE_YET, "", true)).toBe(true);
  });

  it("marks materials/footage/brand fields with role=materials on active RTU schemas", () => {
    for (const type of [
      "rtu-flyer",
      "rtu-menu",
      "rtu-service-sheet",
      "rtu-promotion-graphics",
      "rtu-email-kit",
      "rtu-short-video",
      "rtu-business-card",
    ] as const) {
      const schema = getRouteMapIntakeSchema(type);
      const materialsFields = schema.fields.filter((field) => field.role === "materials");
      expect(materialsFields.length).toBeGreaterThan(0);
      for (const field of materialsFields) {
        expect(field.hint?.toLowerCase()).toContain("not uploaded");
        expect(field.label.toLowerCase()).not.toContain("upload");
      }
    }
  });
});

describe("Social Posts catalog schema vs live custom UI (Package 3 F2)", () => {
  it("documents intentional divergence: catalog schema is not the live Social Posts form", () => {
    const catalog = ROUTE_MAP_INTAKE_SCHEMAS["rtu-social-posts"];
    expect(catalog.type).toBe("rtu-social-posts");
    expect(catalog.fields.some((field) => field.id === "postsAbout")).toBe(true);
    // Live UI uses SocialPostsIntakeForm when job.intakeType === "rtu-social-posts".
    // Guard: do not assume catalog field ids drive that custom UI.
    const liveCustomChoiceKeys = [
      "socialPostsPurposeChoice",
      "socialPostsActionChoice",
      "socialPostsPlatformChoice",
      "socialPostsMaterialsChoices",
    ];
    for (const key of liveCustomChoiceKeys) {
      expect(catalog.fields.some((field) => field.id === key)).toBe(false);
    }
  });
});
