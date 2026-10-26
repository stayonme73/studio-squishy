import { describe, expect, it } from "vitest";

import type { MaterialRelatedId } from "@/lib/materials/types";
import { SHORT_FORM_DOOR_PACKAGE_ID } from "@/lib/studio-dispatch/short-form-door-facts";

describe("material related ids", () => {
  it("keeps the short-form package id as a related material id", () => {
    const relatedId: MaterialRelatedId = SHORT_FORM_DOOR_PACKAGE_ID;
    expect(relatedId).toBe("short_form_video_editing");
  });
});
