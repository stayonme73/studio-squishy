import { describe, expect, it } from "vitest";

import { punchZoomExtra } from "./visual";

describe("hook punch-in ease", () => {
  it("starts at identity scale and eases instead of jumping", () => {
    expect(punchZoomExtra(0)).toBe(0);
    expect(punchZoomExtra(0.01)).toBeLessThan(0.05);
    expect(punchZoomExtra(0.5)).toBeCloseTo(1);
    expect(punchZoomExtra(1.2)).toBe(1);
    expect(punchZoomExtra(2.2)).toBe(1);
    expect(punchZoomExtra(3)).toBe(1);
  });
});
