import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  studioExtrasCustomerCopy,
  studioExtrasSelectionCountLabel,
  studioExtrasV1,
} from "@/config/studio-extras-v1";
import {
  chooseStudioExtra,
  emptyCondensedJourneyDraft,
  isSectionComplete,
  markSectionComplete,
  readCondensedJourneyDraft,
  removeStudioExtra,
  selectedStudioExtras,
  writeCondensedJourneyDraft,
} from "@/lib/studio-customer-journey-condense/draft";
import { validateStudioExtrasSelection } from "@/lib/studio-extras/selection";

describe("Build Your Project two-Extra interface", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the instruction and a live 0, 1, or 2 counter", () => {
    expect(studioExtrasCustomerCopy.builderInstruction).toBe("Choose up to 2 included Extras.");
    expect(studioExtrasSelectionCountLabel(0)).toBe("0 of 2");
    expect(studioExtrasSelectionCountLabel(1)).toBe("1 of 2");
    expect(studioExtrasSelectionCountLabel(2)).toBe("2 of 2");
    expect(studioExtrasSelectionCountLabel(9)).toBe("2 of 2");
    expect(studioExtrasV1.maxSelectionsPerOrder).toBe(2);
  });

  it("keeps unselected Extras unselected at the limit, then restores them when one is removed", () => {
    let draft = emptyCondensedJourneyDraft("clip_repurposing");
    draft = chooseStudioExtra(draft, "review_request_kit", "SELECT");
    draft = chooseStudioExtra(draft, "ad_creative", "SELECT");
    expect(selectedStudioExtras(draft)).toEqual(["review_request_kit", "ad_creative"]);
    expect(draft.support.email_and_text).toBe("");
    expect(draft.support.flyer).toBe("");
    expect(isSectionComplete(draft, "support")).toBe(true);
    expect(chooseStudioExtra(draft, "flyer", "SELECT")).toBe(draft);

    const removed = removeStudioExtra(draft, "ad_creative");
    expect(selectedStudioExtras(removed)).toEqual(["review_request_kit"]);
    expect(removed.support.ad_creative).toBe("");
    expect(removed.support.flyer).toBe("");
    expect(removed.support.email_and_text).not.toBe("SKIP");
    expect(isSectionComplete(removed, "support")).toBe(false);
    const restored = chooseStudioExtra(removed, "flyer", "SELECT");
    expect(selectedStudioExtras(restored)).toEqual(["review_request_kit", "flyer"]);
  });

  it("does not treat an explicit Skip as a selection, and still refuses a third Extra at checkout", () => {
    let draft = emptyCondensedJourneyDraft("clip_repurposing");
    draft = chooseStudioExtra(draft, "flyer", "SKIP");
    draft = chooseStudioExtra(draft, "review_request_kit", "SELECT");
    expect(draft.support.flyer).toBe("SKIP");
    expect(selectedStudioExtras(draft)).toEqual(["review_request_kit"]);
    expect(
      validateStudioExtrasSelection("clip_repurposing", ["review_request_kit", "ad_creative", "flyer"]),
    ).toMatchObject({ ok: false, code: "EXTRAS_OVER_LIMIT" });
    expect(validateStudioExtrasSelection("clip_repurposing", ["review_request_kit", "ad_creative"]).ok).toBe(
      true,
    );
  });

  it("keeps the two chosen Extras when the draft is stored and opened again", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
    const chosen = markSectionComplete(
      chooseStudioExtra(
        chooseStudioExtra(emptyCondensedJourneyDraft("clip_repurposing"), "review_request_kit", "SELECT"),
        "flyer",
        "SELECT",
      ),
      "support",
    );
    writeCondensedJourneyDraft(chosen);
    const restored = readCondensedJourneyDraft();
    expect(selectedStudioExtras(restored)).toEqual(["review_request_kit", "flyer"]);
    expect(restored.support.email_and_text).toBe("");
    expect(restored.support.ad_creative).toBe("");
    expect(restored.completedSections).toContain("support");
  });

  it("wires gray-out, removal, the counter, and keyboard focus in the builder", () => {
    const page = readFileSync(
      join(process.cwd(), "src/components/studio-journey/BuildYourProjectPage.tsx"),
      "utf8",
    );
    const css = readFileSync(
      join(process.cwd(), "src/components/studio-journey/studio-journey-condense.css"),
      "utf8",
    );
    const visual = readFileSync(join(process.cwd(), "src/app/studio-visual-system-v2.css"), "utf8");
    expect(page).toContain("studioExtrasCustomerCopy.builderInstruction");
    expect(page).toContain("studioExtrasSelectionCountLabel(selectedExtraIds.length)");
    expect(page).toContain('data-extras-blocked={blocked ? "true" : "false"}');
    expect(page).toContain('data-extras-selected={selected ? "true" : "false"}');
    expect(page).toContain('data-extras-action="remove"');
    expect(page).toContain("aria-pressed={selected}");
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain("disabled={blocked}");
    expect(css).toContain('.studio-journey__support-row[data-extras-blocked="true"]');
    expect(visual).toContain("):focus-visible");
    expect(visual).toContain("outline: 2px solid #8ff5c6 !important;");
  });
});
