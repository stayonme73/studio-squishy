import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isAnotherCustomersLocalProjectDenial } from "@/lib/studio-board-stale-local-project";

describe("stale local project on the Board", () => {
  it("hides only another customer's refusal and leaves the owner's denial alone", () => {
    expect(isAnotherCustomersLocalProjectDenial("wrong_owner")).toBe(true);
    expect(isAnotherCustomersLocalProjectDenial("email_unverified")).toBe(false);
    expect(isAnotherCustomersLocalProjectDenial("claim_proof_required")).toBe(false);
    expect(isAnotherCustomersLocalProjectDenial(null)).toBe(false);
  });

  it("does not clear stored project state when the Board hides that project", () => {
    const source = readFileSync(
      new URL("./use-current-campaign.ts", import.meta.url),
      "utf8",
    );
    const hideBranches = source.match(
      /isAnotherCustomersLocalProjectDenial\(claim[\s\S]{0,220}/g,
    );
    expect(hideBranches).toHaveLength(2);
    for (const branch of hideBranches ?? []) {
      expect(branch).toContain('setAccessState("local-unavailable")');
      expect(branch).not.toContain("clearCampaignState");
    }
  });
});
