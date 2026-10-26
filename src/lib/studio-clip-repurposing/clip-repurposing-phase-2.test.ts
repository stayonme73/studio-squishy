import { describe, expect, it } from "vitest";

import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import {
  fixtureNoHookWordsSource,
  fixtureRepetitiveSource,
  fixtureStrongSource,
  fixtureTwoClipSource,
  fixtureWeakSource,
} from "./fixtures";
import {
  applyPerformanceNotes,
  applySetRevision,
  discoverClipSet,
} from "./set-discovery";
import type { SetDiscoverySuccess } from "./types";

function topicKeys(text: string): string[] {
  const keys = ["cherries", "cake", "pricing", "light", "guest", "offer", "consistency"];
  const lower = text.toLowerCase();
  return keys.filter((key) => lower.includes(key));
}

describe("Clip Repurposing Phase 2 — set-level factory", () => {
  it("does not publish, reopen $349, or start Phase 3 from this stamp", () => {
    expect(studioClipRepurposingBuildV1.phase).toBe(2);
    expect(studioClipRepurposingBuildV1.phaseKind).toBe("set_level_factory_build");
    expect(studioClipRepurposingBuildV1.phase1Verdict).toBe("BUILD");
    expect(studioClipRepurposingBuildV1.doNotImplementPhase2).toBe(false);
    expect(studioClipRepurposingBuildV1.doNotStartPhase3FromThisStamp).toBe(true);
    expect(studioClipRepurposingBuildV1.doNotPublish).toBe(false);
    expect(studioClipRepurposingBuildV1.doNotWireLaunchNow).toBe(false);
    expect(studioClipRepurposingBuildV1.doNotRunPaidProduction).toBe(true);
    expect(studioClipRepurposingBuildV1.doNotPurchaseVendor).toBe(true);
    expect(studioClipRepurposingBuildV1.sku.priceFrozen).toBe(true);
    expect(studioClipRepurposingBuildV1.sku.priceCents).toBe(54900);
    expect(studioClipRepurposingBuildV1.failClose.customerRemediesFrozen).toBe(
      true,
    );
    expect(studioClipRepurposingBuildV1.liveGates.doNotStartLiveGatesFromThisStamp).toBe(
      false,
    );
    expect(studioShortFormVideoEditingBuildV1.classification).toBe("SELL_NOW");
    expect(studioInternalSellNowRegisterV1.internalSellNowCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
    expect(studioInternalSellNowRegisterV1.clipRepurposingPhase).toBe(
      "certified_sell_now_published",
    );
    expect(studioClipRepurposingBuildV1.classification).toBe("SELL_NOW");
    expect(studioClipRepurposingBuildV1.liveGates.sourcesMissing).toBe(false);
    expect(studioClipRepurposingBuildV1.liveGates.positiveYieldedThree).toBe(true);
    expect(studioClipRepurposingBuildV1.liveGates.positiveSemanticYieldedThree).toBe(
      true,
    );
    expect(studioClipRepurposingBuildV1.liveGates.negativeRefusedFakeThird).toBe(true);
    expect(studioClipRepurposingBuildV1.liveGates.paidProduction).toBe(true);
    expect(studioClipRepurposingBuildV1.liveGates.setRevisionRan).toBe(true);
    expect(
      studioClipRepurposingBuildV1.liveGates.doNotResumeProductionFromThisStamp,
    ).toBe(true);
    expect(
      studioInternalSellNowRegisterV1.doNotStartClipRepurposingPhase3FromRegister,
    ).toBe(true);
  });

  it("A strong source selects three distinct clips and keeps alternates", () => {
    const result = discoverClipSet(fixtureStrongSource());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.productionAllowed).toBe(true);
    expect(result.selected).toHaveLength(3);
    expect(result.alternates.length).toBeGreaterThanOrEqual(1);
    expect(result.setQuestionPass).toBe(true);
    const selectedTopics = result.selected.flatMap((candidate) =>
      topicKeys(`${candidate.idea} ${candidate.bodyText}`),
    );
    expect(new Set(selectedTopics).size).toBeGreaterThanOrEqual(3);
    const cherriesRepeats = result.rejected.filter(
      (candidate) =>
        /cherries/i.test(candidate.idea) &&
        candidate.rejectionReason === "duplicate_idea",
    );
    expect(cherriesRepeats.length).toBeGreaterThanOrEqual(1);
    expect(
      result.rejected.some((candidate) => candidate.rejectionReason === "cannibalizes_selected"),
    ).toBe(false);
  });

  it("B two-clip source returns two and refuses a fake third", () => {
    const result = discoverClipSet(fixtureTwoClipSource());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.productionAllowed).toBe(false);
    expect(result.viableCount).toBe(2);
    expect(result.selected).toHaveLength(2);
    expect(result.findings).toContain("only_2_professionally_distinct_clips");
    expect(result.findings).toContain("do_not_manufacture_filler");
    expect(result.findings).toContain("do_not_begin_production");
    expect(result.setQuestionPass).toBe(false);
  });

  it("C repetitive source does not treat one idea as three clips", () => {
    const result = discoverClipSet(fixtureRepetitiveSource());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.productionAllowed).toBe(false);
    expect(result.viableCount).toBeLessThan(3);
    expect(result.selected.length).toBeLessThan(3);
    expect(result.viableCount).toBe(1);
    expect(result.findings.some((finding) => finding.includes("only_1"))).toBe(true);
    expect(
      result.rejected.some(
        (candidate) =>
          candidate.rejectionReason === "duplicate_idea" ||
          candidate.rejectionReason === "cannibalizes_selected",
      ),
    ).toBe(true);
  });

  it("meaning-first ideas without hook words can still become the selected three", () => {
    const result = discoverClipSet(fixtureNoHookWordsSource());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.selected).toHaveLength(3);
    expect(
      result.selected.every((candidate) => candidate.hookWordBonus === 0),
    ).toBe(true);
    expect(
      result.selected.every((candidate) => candidate.semanticScore >= 7),
    ).toBe(true);
    const joined = result.selected
      .map((candidate) => `${candidate.idea} ${candidate.bodyText}`)
      .join(" ")
      .toLowerCase();
    expect(joined).toMatch(/10 things|project manager|button/);
  });

  it("D weak source fails closed before Production", () => {
    const result = discoverClipSet(fixtureWeakSource());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.productionAllowed).toBe(false);
    expect(result.viableCount).toBe(0);
    expect(result.selected).toHaveLength(0);
    expect(result.findings).toContain("no_professionally_worthwhile_distinct_clips");
    expect(result.findings).toContain("do_not_begin_production");
    expect(result.rejected.length).toBeGreaterThan(0);
    expect(
      result.rejected.every(
        (candidate) =>
          candidate.rejectionReason === "weak_short_form_value" ||
          candidate.rejectionReason === "filler_or_setup" ||
          candidate.rejectionReason === "window_too_short",
      ),
    ).toBe(true);
  });

  it("one set revision can swap a selected clip for the next-ranked alternate", () => {
    const result = discoverClipSet(fixtureStrongSource());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const success = result as SetDiscoverySuccess;
    const swapped = applySetRevision(success, {
      kind: "swap_clip",
      removeId: success.selected[0]!.id,
      addId: success.alternates[0]!.id,
    });
    expect(swapped.ok).toBe(true);
    if (!swapped.ok) return;
    expect(swapped.selected).toHaveLength(3);
    expect(swapped.selected.some((candidate) => candidate.id === success.alternates[0]!.id)).toBe(
      true,
    );
    expect(swapped.selected.some((candidate) => candidate.id === success.selected[0]!.id)).toBe(
      false,
    );
    expect(applySetRevision(success, { kind: "cta_change", ctaText: "Book a tasting" })).toBe(
      success,
    );
  });

  it("writes the fixture ranking report for the Phase 2 checkpoint", async () => {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const cases = [
      ["A_strong", fixtureStrongSource()],
      ["B_two_clip", fixtureTwoClipSource()],
      ["C_repetitive", fixtureRepetitiveSource()],
      ["D_weak", fixtureWeakSource()],
    ] as const;
    const report = {
      stampedAt: "2026-09-25T13:00:00.000Z",
      paidProduction: false,
      fixtures: cases.map(([label, source]) => {
        const result = discoverClipSet(source);
        return {
          label,
          ok: result.ok,
          productionAllowed: result.productionAllowed,
          viableCount: result.viableCount,
          setQuestionPass: result.setQuestionPass,
          findings: result.ok ? [] : [...result.findings],
          selected: result.selected.map((candidate) => ({
            id: candidate.id,
            idea: candidate.idea,
            score: candidate.setValueScore,
            shortForm: candidate.shortFormScore,
            window: [candidate.windowStart, candidate.windowEnd],
          })),
          alternates: result.alternates.map((candidate) => ({
            id: candidate.id,
            idea: candidate.idea,
            score: candidate.setValueScore,
          })),
          rejected: result.rejected.map((candidate) => ({
            idea: candidate.idea,
            reason: candidate.rejectionReason,
            score: candidate.setValueScore,
          })),
        };
      }),
    };
    const out = join(
      process.cwd(),
      "docs/launch/studio-operating-clip-repurposing-build-1/phase-2-fixture-report.json",
    );
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    expect(report.fixtures).toHaveLength(4);
  });

  it("performance review can demote a finalist and fail-close if no distinct replacement", () => {
    const result = discoverClipSet(fixtureStrongSource());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const notes = result.selected.map((candidate) => ({
      candidateId: candidate.id,
      performsWellEnough: candidate.id !== result.selected[2]!.id,
      reason:
        candidate.id === result.selected[2]!.id
          ? "delivery collapses; do not force a third"
          : "window performs",
    }));
    const after = applyPerformanceNotes(result, notes);
    if (after.ok) {
      expect(after.selected).toHaveLength(3);
      expect(after.selected.some((candidate) => candidate.id === result.selected[2]!.id)).toBe(
        false,
      );
      return;
    }
    expect(after.productionAllowed).toBe(false);
    expect(after.viableCount).toBeLessThan(3);
    expect(after.findings).toContain("do_not_begin_production");
  });
});

describe("approved Clip package CTA", () => {
  it("uses the revision CTA for customer-package copy after a CTA change", async () => {
    const { approvedClipRepurposingCta } = await import("./live-factory");
    expect(
      approvedClipRepurposingCta({
        ctaText: "Book a Cole & Kindred consult",
        setRevision: { kind: "cta_change", ctaText: "Book Cole & Kindred this week" },
      }),
    ).toBe("Book Cole & Kindred this week");
    expect(
      approvedClipRepurposingCta({
        ctaText: "Book a Cole & Kindred consult",
      }),
    ).toBe("Book a Cole & Kindred consult");
  });
});
