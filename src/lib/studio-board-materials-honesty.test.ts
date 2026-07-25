import { describe, expect, it } from "vitest";

import { filterReceivedAgainstStillNeeded } from "@/lib/studio-board-materials-honesty";

describe("filterReceivedAgainstStillNeeded", () => {
  it("keeps received items when nothing is still needed", () => {
    const received = [
      { id: "campaign-goal", label: "Campaign goal", value: "Launch" },
      { id: "platform-format", label: "Platform/format", value: "Instagram" },
    ];
    expect(
      filterReceivedAgainstStillNeeded(received, [
        { id: "campaign-message", label: "Campaign goal/message", status: "Received" },
        { id: "platform-format", label: "Platform/format", status: "Received" },
      ]),
    ).toEqual(received);
  });

  it("hides Campaign goal from Received when Campaign goal/message is Still Needed", () => {
    const received = [
      { id: "campaign-goal", label: "Campaign goal", value: "Summer pastry launch" },
      { id: "platform-format", label: "Platform/format", value: "Instagram, Facebook" },
      { id: "destination", label: "Link or destination", value: "Visit the bakery" },
    ];
    const filtered = filterReceivedAgainstStillNeeded(received, [
      { id: "campaign-message", label: "Campaign goal/message", status: "Still Needed" },
      { id: "platform-format", label: "Platform/format", status: "Received" },
      { id: "brand-visuals", label: "Brand/logo/visual references", status: "Still Needed" },
      { id: "destination-cta", label: "Destination link / CTA", status: "Received" },
    ]);
    expect(filtered.map((item) => item.id)).toEqual(["platform-format", "destination"]);
    expect(filtered.some((item) => item.id === "campaign-goal")).toBe(false);
  });

  it("hides brand and wording received rows when those action cards are Still Needed", () => {
    const filtered = filterReceivedAgainstStillNeeded(
      [
        { id: "brand-materials", label: "Brand materials", value: "Teal accent" },
        { id: "exact-wording", label: "Exact wording", value: "Must say sale" },
      ],
      [
        { id: "brand-visuals", label: "Brand/logo/visual references", status: "Still Needed" },
        { id: "required-wording", label: "Required wording/disclosures", status: "Still Needed" },
      ],
    );
    expect(filtered).toEqual([]);
  });
});
