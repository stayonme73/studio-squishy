import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { studioOwnerProductionReceiptV1 as cfg } from "@/config/studio-owner-production-receipt-v1";

describe("Owner production receipt", () => {
  it("locks the four production states on the existing desk", () => {
    expect(cfg.doNotRebuildOwnerConsole).toBe(true);
    expect(cfg.states).toEqual(["RECEIVED", "WORKING", "ISSUE", "COMPLETE"]);
    expect(cfg.refreshMustNotPaintWhiteOverLivePacket).toBe(true);
  });

  it("shows the receipt line and refuses a WHITE paint over a live packet", () => {
    const page = readFileSync(
      path.join(process.cwd(), "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html"),
      "utf8",
    );
    expect(page).toContain('id="production-lane"');
    expect(page).toContain("Received. Production has your decision.");
    expect(page).toContain("Working. The next packet is in the shop.");
    expect(page).toContain("Issue. Production is blocked.");
    expect(page).toContain("Complete. The packet is coming back to your desk.");
    expect(page).toContain("if (!status.workState && !productionState) return");
    expect(page).toContain("productionLive");
  });
});
