import { describe, expect, it } from "vitest";

import { SHORT_FORM_DOOR_PACKAGE_ID } from "@/lib/studio-dispatch/short-form-door-facts";

describe("short-form door package id", () => {
  it("stays the current package id", () => {
    expect(SHORT_FORM_DOOR_PACKAGE_ID).toBe("short_form_video_editing");
  });
});
