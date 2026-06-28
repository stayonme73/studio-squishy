import { describe, expect, it } from "vitest";

import {
  BUSINESS_OFFER_DELIMITER,
  formatBusinessTileAnswer,
  formatBusinessTileAnswerForDisplay,
  parseBusinessTileAnswer,
} from "@/lib/business-discovery-completion";

describe("parseBusinessTileAnswer", () => {
  it("splits name and offer on the storage delimiter", () => {
    expect(
      parseBusinessTileAnswer(`Tagia Bakery${BUSINESS_OFFER_DELIMITER}Fresh pastries daily`),
    ).toEqual({
      name: "Tagia Bakery",
      offer: "Fresh pastries daily",
    });
  });

  it("strips trailing delimiter junk from legacy values", () => {
    expect(parseBusinessTileAnswer("Tagia Bakery\n---\n")).toEqual({
      name: "Tagia Bakery",
      offer: "",
    });
  });

  it("returns name-only when no delimiter is present", () => {
    expect(parseBusinessTileAnswer("Tagia Bakery")).toEqual({
      name: "Tagia Bakery",
      offer: "",
    });
  });
});

describe("formatBusinessTileAnswer", () => {
  it("omits delimiter until offer is non-empty", () => {
    expect(formatBusinessTileAnswer("Tagia Bakery", "")).toBe("Tagia Bakery");
    expect(formatBusinessTileAnswer("Tagia Bakery", "Fresh pastries daily")).toBe(
      `Tagia Bakery${BUSINESS_OFFER_DELIMITER}Fresh pastries daily`,
    );
  });
});

describe("formatBusinessTileAnswerForDisplay", () => {
  it("renders a clean customer-facing line without storage delimiter", () => {
    expect(
      formatBusinessTileAnswerForDisplay(
        `Tagia Bakery${BUSINESS_OFFER_DELIMITER}Fresh pastries daily`,
      ),
    ).toBe("Tagia Bakery — Fresh pastries daily");
  });

  it("returns name only when offer is missing", () => {
    expect(formatBusinessTileAnswerForDisplay("Tagia Bakery\n---\n")).toBe("Tagia Bakery");
  });
});
