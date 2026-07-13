import { describe, expect, it } from "vitest";

import { classifyServiceExclusions } from "@/lib/project-builder-exclusion-groups";

describe("classifyServiceExclusions", () => {
  it("routes printing and vendor exclusions to the studio does not offer bucket", () => {
    const result = classifyServiceExclusions([
      "Printing or shipping",
      "Outside freelancers, voice actors, or production vendors",
      "New flyer concept",
    ]);

    expect(result.studioDoesNotProvide).toEqual([
      "Printing or shipping",
      "Outside freelancers, voice actors, or production vendors",
      "New flyer concept",
    ]);
    expect(result.purchasedDeliverableChanges).toEqual([]);
  });

  it("routes purchased-deliverable change language to the correct bucket", () => {
    const result = classifyServiceExclusions([
      "Complete redesign",
      "Additional flyer versions",
      "More than one revision round",
    ]);

    expect(result.studioDoesNotProvide).toEqual(["Additional flyer versions"]);
    expect(result.purchasedDeliverableChanges).toEqual([
      "Complete redesign",
      "More than one revision round",
    ]);
  });
});
