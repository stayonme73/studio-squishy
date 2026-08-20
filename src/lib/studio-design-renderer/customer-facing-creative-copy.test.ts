/**
 * Negative tests — customer art must never contain machine language.
 */

import { describe, expect, it } from "vitest";

import {
  FORBIDDEN_CUSTOMER_ART_FRAGMENTS,
  INTERNAL_FIELD_LEAK_PATTERNS,
  assertNoInternalLeakInCustomerText,
  curatedCustomerBodyFromMustInclude,
  isInternalProductionChromeText,
  stripCustomerFacingCta,
  stripProductionMetadataFromMustInclude,
} from "./customer-facing-creative-copy";
import {
  assertNoTextLayerCollisions,
  evaluateTextLayerCollisions,
} from "./text-layer-collision";

const VOICE_BRIEF =
  "I really don't want this to look like one of those loud fitness challenges. My customers are mostly women in their thirties through fifties.";

describe("customer-facing-creative-copy", () => {
  it("strips voice brief and MISSING FACT from mustInclude so they cannot appear in customer body", () => {
    const raw = [
      "Rooted & Ready Wellness Studio",
      "Fall Reset — six-week wellness program.",
      "Price: $297.",
      `Style / Voice brief (authoritative): ${VOICE_BRIEF}`,
      "Calm, grown-up wellness. No neon.",
      "MISSING FACT — enrollment/booking method not provided yet. Do not invent a booking link.",
      "Style: warm neutrals, botanical calm.",
    ].join("\n");

    const stripped = stripProductionMetadataFromMustInclude(raw, {
      voiceBriefExact: VOICE_BRIEF,
    });
    expect(stripped).toContain("Fall Reset");
    expect(stripped).toContain("$297");
    expect(stripped).not.toMatch(/Voice brief/i);
    expect(stripped).not.toContain(VOICE_BRIEF);
    expect(stripped).not.toMatch(/MISSING FACT/i);
    expect(stripped).not.toMatch(/Style:/i);

    const body = curatedCustomerBodyFromMustInclude(raw, {
      voiceBriefExact: VOICE_BRIEF,
    });
    expect(body).not.toContain(VOICE_BRIEF);
    expect(body).not.toMatch(/MISSING FACT/i);
    expect(() => assertNoInternalLeakInCustomerText(body)).not.toThrow();
  });

  it("strips Destination: from CTA while keeping the destination value", () => {
    expect(
      stripCustomerFacingCta(
        "Book now — Destination: (804) 555-0142 · cedarlane.example/book-tuneup",
      ),
    ).toBe("Book now — (804) 555-0142 · cedarlane.example/book-tuneup");
    expect(stripCustomerFacingCta("Destination: https://example.com")).toBe(
      "https://example.com",
    );
    expect(stripCustomerFacingCta("Enroll in Fall Reset")).toBe(
      "Enroll in Fall Reset",
    );
  });

  it("detects purpose / role / plate chrome as internal production text", () => {
    expect(
      isInternalProductionChromeText(
        "Post 1 of 4 · Instagram — Offer lead · offer_lead",
      ),
    ).toBe(true);
    expect(isInternalProductionChromeText("offer_lead")).toBe(true);
    expect(isInternalProductionChromeText("Social — Square (1024×1024)")).toBe(
      true,
    );
    expect(isInternalProductionChromeText("square feed")).toBe(true);
    expect(isInternalProductionChromeText("Intake Fact")).toBe(true);
    expect(isInternalProductionChromeText("Promote an offer")).toBe(true);
    expect(
      isInternalProductionChromeText("Fall Reset — six-week wellness program"),
    ).toBe(false);
  });

  it("forbids common internal field fragments from leaking into customer art", () => {
    for (const fragment of FORBIDDEN_CUSTOMER_ART_FRAGMENTS) {
      expect(() =>
        assertNoInternalLeakInCustomerText(`Customer copy with ${fragment} leaked`),
      ).toThrow(/INTERNAL_FIELD_LEAK/);
    }
    expect(INTERNAL_FIELD_LEAK_PATTERNS.length).toBeGreaterThan(5);
    expect(() =>
      assertNoInternalLeakInCustomerText(
        "Book Fall Reset — $297 — rootedandready.example/fall-reset",
      ),
    ).not.toThrow();
  });
});

describe("text-layer-collision", () => {
  it("fails closed with COLLISION when text AABBs overlap", () => {
    const result = evaluateTextLayerCollisions([
      {
        id: "a",
        x: 40,
        y: 100,
        width: 400,
        fontSizePx: 32,
        lineHeight: 1.2,
        content: "Headline one",
      },
      {
        id: "b",
        x: 60,
        y: 110,
        width: 400,
        fontSizePx: 28,
        lineHeight: 1.2,
        content: "Overlapping headline two",
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("COLLISION");
      expect(result.message).toMatch(/OVERLAP/i);
    }
    expect(() =>
      assertNoTextLayerCollisions([
        {
          id: "a",
          x: 40,
          y: 100,
          width: 400,
          fontSizePx: 32,
          lineHeight: 1.2,
          content: "Top",
        },
        {
          id: "b",
          x: 40,
          y: 400,
          width: 400,
          fontSizePx: 24,
          lineHeight: 1.2,
          content: "Far below",
        },
      ]),
    ).not.toThrow();
  });
});
