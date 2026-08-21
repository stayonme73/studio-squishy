import { describe, expect, it } from "vitest";

import {
  VIDEO_SAFE_AREA_9X16,
  boxInsideSafeArea,
  sampleTimesForBeat,
} from "./safe-area";

describe("video motion-safety safe area", () => {
  it("keeps Harbor Roast overlay type inside the 9:16 phone-safe rectangle", () => {
    const textBox = { left: 90, top: 1248, right: 990, bottom: 1570 };
    expect(boxInsideSafeArea(textBox, VIDEO_SAFE_AREA_9X16)).toBe(true);
    expect(
      boxInsideSafeArea({ left: 10, top: 1248, right: 1070, bottom: 1910 }),
    ).toBe(false);
  });

  it("samples beat start, quarters, and end", () => {
    const times = sampleTimesForBeat(4.644, 9.59);
    expect(times).toHaveLength(5);
    expect(times[0]).toBeGreaterThanOrEqual(4.644);
    expect(times[4]).toBeLessThanOrEqual(9.59);
  });
});
