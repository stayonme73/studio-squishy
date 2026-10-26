import { describe, expect, it } from "vitest";

import { collectSm001NSelectSignals } from "@/lib/studio-design-renderer/sm-001-n-select";

describe("monthly N-lock creative signals", () => {
  it("treats missing copy as absent and does not fill it", () => {
    const signals = collectSm001NSelectSignals({ materials: [] });
    expect(signals.hasOfferFacts).toBe(false);
    expect(signals.hasDateWindow).toBe(false);
    expect(signals.hasExtendedCopy).toBe(false);
    expect(signals.hasSecondaryProofPoint).toBe(false);
    expect(JSON.stringify(signals)).not.toContain('""');
  });
});
