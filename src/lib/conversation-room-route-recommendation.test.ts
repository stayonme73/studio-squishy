import { describe, expect, it } from "vitest";

import { recommendRouteFromProjectNeed } from "@/config/conversation-room-route-recommendation-v1";

describe("recommendRouteFromProjectNeed", () => {
  it("maps Business setup to Get My Business Started (i75)", () => {
    expect(recommendRouteFromProjectNeed("Business setup")).toBe("i75");
  });

  it("maps Branding or logo to i75", () => {
    expect(recommendRouteFromProjectNeed("Branding or logo")).toBe("i75");
  });

  it("maps marketing / social needs to Promote Something Now (i20)", () => {
    expect(recommendRouteFromProjectNeed("Marketing materials")).toBe("i20");
    expect(recommendRouteFromProjectNeed("Social media graphics")).toBe("i20");
  });

  it("maps update language to Update What I Already Have", () => {
    expect(recommendRouteFromProjectNeed("Update something existing")).toBe(
      "update",
    );
  });

  it("does not force a route for Not sure yet", () => {
    expect(recommendRouteFromProjectNeed("Not sure yet")).toBeNull();
    expect(recommendRouteFromProjectNeed("Something else")).toBeNull();
    expect(recommendRouteFromProjectNeed("")).toBeNull();
  });
});
