/**
 * STUDIO-OPERATING-DESIGN-MA-001-INTAKE-TRUTH-1
 */

import { describe, expect, it } from "vitest";

import {
  MA_001_COMPOSITION_CUSTOMER_SCHEMA,
  MA_001_CUSTOMER_KIND_OPTIONS,
  MA_001_MEMBER_CONTENT_INHERITANCE,
  assertMa001CompositionReadyForPayment,
  ma001LiveCompositionFromFlatAnswers,
  mapMa001CompositionFromLiveTruth,
  type Ma001LiveCompositionInput,
} from "@/lib/studio-design-renderer";

function maxMixedInput(
  overrides?: Partial<Ma001LiveCompositionInput>,
): Ma001LiveCompositionInput {
  return {
    lockedPackMemberCount: 4,
    campaignFocus: "Spring Tune-Up + Drain Clear",
    members: [
      {
        kindLabel: "Flyer",
        purpose: "Launch flyer for the spring offer",
      },
      {
        kindLabel: "Business card",
        purpose: "Contact card for Jordan Hale",
      },
      {
        kindLabel: "Service sheet",
        purpose: "Service list handout",
      },
      {
        kindLabel: "Campaign graphic",
        purpose: "Social square campaign graphic",
        agreedFormatLabel: "Square (social / feed)",
      },
    ],
    ...overrides,
  };
}

describe("ma-001 intake composition truth (INTAKE-TRUTH-1)", () => {
  it("maps locked 4-member mixed composition with durable IDs and manifest seed", () => {
    const mapped = mapMa001CompositionFromLiveTruth(maxMixedInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    expect(mapped.truth.lockedPackMemberCount).toBe(4);
    expect(mapped.truth.lockedBeforePayment).toBe(true);
    expect(mapped.truth.completenessAuthority).toBe("exact_locked_member_nn");
    expect(mapped.truth.countUnit).toBe("member_identities");
    expect(mapped.truth.plannedPackMembers.map((m) => m.kind)).toEqual([
      "flyer",
      "business_card",
      "service_sheet",
      "promotion_graphic",
    ]);
    expect(mapped.truth.customerKindLabels).toEqual([
      "Flyer",
      "Business card",
      "Service sheet",
      "Campaign graphic",
    ]);
    expect(mapped.truth.plannedPackMembers[0]!.memberId).toBe(
      "pack-member-1-flyer",
    );
    expect(mapped.truth.plannedPackMembers[3]!.agreedPlateId).toBe(
      "cert-square-1024",
    );
    expect(mapped.manifestSeed.status).toBe("composition_locked_pre_payment");
    expect(mapped.manifestSeed.members).toHaveLength(4);
    expect(mapped.manifestSeed.members[1]!.customerKindLabel).toBe(
      "Business card",
    );
    // Internal producer family exists on seed for Machine — not a customer label
    expect(mapped.manifestSeed.members[0]!.producerFamily).toBe("v2-rtu-flyer");
  });

  it("supports N=1..4 structurally", () => {
    for (const n of [1, 2, 3, 4] as const) {
      const members = maxMixedInput().members.slice(0, n);
      const mapped = mapMa001CompositionFromLiveTruth({
        lockedPackMemberCount: n,
        members,
        campaignFocus: "Focus",
      });
      expect(mapped.ok).toBe(true);
      if (mapped.ok) {
        expect(mapped.truth.lockedPackMemberCount).toBe(n);
        expect(mapped.truth.plannedPackMembers).toHaveLength(n);
      }
    }
  });

  it("fail-closed: unsupported kind (Poster) — no closest-match / no flyer substitute", () => {
    const mapped = mapMa001CompositionFromLiveTruth(
      maxMixedInput({
        lockedPackMemberCount: 1,
        members: [{ kindLabel: "Poster", purpose: "Window poster" }],
      }),
    );
    expect(mapped.ok).toBe(false);
    if (!mapped.ok) {
      expect(mapped.code).toBe("UNSUPPORTED_KIND");
      expect(mapped.message).toMatch(/Poster/);
      expect(mapped.message).toMatch(/No closest-match/);
    }
  });

  it("fail-closed: rack card / similar free text", () => {
    for (const label of ["Rack card", "or similar marketing asset", "Brochure set"]) {
      const mapped = mapMa001CompositionFromLiveTruth({
        lockedPackMemberCount: 1,
        members: [{ kindLabel: label, purpose: "x" }],
      });
      expect(mapped.ok).toBe(false);
      if (!mapped.ok) expect(mapped.code).toBe("UNSUPPORTED_KIND");
    }
  });

  it("fail-closed: count mismatch and missing purpose", () => {
    const mismatch = mapMa001CompositionFromLiveTruth({
      lockedPackMemberCount: 3,
      members: maxMixedInput().members.slice(0, 2),
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.code).toBe("MEMBER_COUNT_MISMATCH");

    const noPurpose = mapMa001CompositionFromLiveTruth({
      lockedPackMemberCount: 1,
      members: [{ kindLabel: "Flyer", purpose: "  " }],
    });
    expect(noPurpose.ok).toBe(false);
    if (!noPurpose.ok) expect(noPurpose.code).toBe("MISSING_REQUIRED_TRUTH");
  });

  it("fail-closed: campaign graphic without format; flyer must not invent format", () => {
    const noFormat = mapMa001CompositionFromLiveTruth({
      lockedPackMemberCount: 1,
      members: [
        {
          kindLabel: "Campaign graphic",
          purpose: "Feed graphic",
        },
      ],
    });
    expect(noFormat.ok).toBe(false);
    if (!noFormat.ok) expect(noFormat.code).toBe("MISSING_REQUIRED_TRUTH");

    const flyerFormat = mapMa001CompositionFromLiveTruth({
      lockedPackMemberCount: 1,
      members: [
        {
          kindLabel: "Flyer",
          purpose: "Launch flyer",
          agreedFormatLabel: "Square (social / feed)",
        },
      ],
    });
    expect(flyerFormat.ok).toBe(false);
    if (!flyerFormat.ok) expect(flyerFormat.code).toBe("INVALID_PLATE");
  });

  it("fail-closed: pack-level copywriting fields and ambiguous legacy fields", () => {
    const copy = mapMa001CompositionFromLiveTruth(
      maxMixedInput({ packCaption: "Buy now!" } as Ma001LiveCompositionInput),
    );
    expect(copy.ok).toBe(false);
    if (!copy.ok) expect(copy.code).toBe("FORBIDDEN_PACK_COPY_FIELD");

    const legacy = mapMa001CompositionFromLiveTruth(
      maxMixedInput({ orSimilar: "yes" } as Ma001LiveCompositionInput),
    );
    expect(legacy.ok).toBe(false);
    if (!legacy.ok) expect(legacy.code).toBe("AMBIGUOUS_LEGACY_TRUTH");
  });

  it("payment gate: ma-001 without composition blocks checkout", () => {
    const blocked = assertMa001CompositionReadyForPayment({
      selectedServiceIds: ["ma-001"],
      composition: null,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.blockCheckout).toBe(true);
      expect(blocked.code).toBe("SKU_ONLY_INSUFFICIENT");
    }
  });

  it("payment gate: locked composition allows readiness; other SKUs skip", () => {
    const mapped = mapMa001CompositionFromLiveTruth(maxMixedInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    const ready = assertMa001CompositionReadyForPayment({
      selectedServiceIds: ["ma-001", "sm-001"],
      composition: mapped.truth,
    });
    expect(ready.ok).toBe(true);
    if (ready.ok && ready.applicable) {
      expect(ready.manifestSeed.members).toHaveLength(4);
    }

    const skip = assertMa001CompositionReadyForPayment({
      selectedServiceIds: ["sm-001"],
      composition: null,
    });
    expect(skip.ok).toBe(true);
    if (skip.ok) expect(skip.applicable).toBe(false);
  });

  it("flat answers map to the same composition authority", () => {
    const flat = ma001LiveCompositionFromFlatAnswers({
      lockedPackMemberCount: "2",
      campaignFocus: "Spring offer",
      member1_kind: "Flyer",
      member1_purpose: "Launch flyer",
      member2_kind: "Campaign graphic",
      member2_purpose: "Feed graphic",
      member2_agreedFormat: "Portrait (print / tall)",
    });
    expect("ok" in flat && flat.ok === false).toBe(false);
    const mapped = mapMa001CompositionFromLiveTruth(
      flat as Ma001LiveCompositionInput,
    );
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.plannedPackMembers[1]!.agreedPlateId).toBe(
      "cert-portrait-1024x1536",
    );
  });

  it("customer schema uses plain language — no producer jargon in options", () => {
    expect(MA_001_CUSTOMER_KIND_OPTIONS).toEqual([
      "Flyer",
      "Menu",
      "Service sheet",
      "Business card",
      "Campaign graphic",
    ]);
    expect(MA_001_COMPOSITION_CUSTOMER_SCHEMA.ownerRoutine).toBe("NONE");
    expect(MA_001_COMPOSITION_CUSTOMER_SCHEMA.remapAuthorized).toBe(false);
    expect(MA_001_COMPOSITION_CUSTOMER_SCHEMA.dispatchAuthorized).toBe(false);
    const optionBlob = JSON.stringify(
      MA_001_COMPOSITION_CUSTOMER_SCHEMA.fields.flatMap((f) =>
        "options" in f && f.options ? [...f.options] : [],
      ),
    );
    expect(optionBlob).not.toMatch(/v2-rtu/);
    expect(optionBlob).not.toMatch(/producerFamily/);
    expect(optionBlob).not.toMatch(/promotion_graphic/);
    expect(optionBlob).not.toMatch(/service_sheet/);
  });

  it("member content inheritance forbids pack-level copywriting", () => {
    for (const kind of Object.keys(MA_001_MEMBER_CONTENT_INHERITANCE) as Array<
      keyof typeof MA_001_MEMBER_CONTENT_INHERITANCE
    >) {
      expect(MA_001_MEMBER_CONTENT_INHERITANCE[kind].packLevelCopywriting).toBe(
        false,
      );
    }
    const ok = mapMa001CompositionFromLiveTruth(maxMixedInput());
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(
      ok.manifestSeed.members.every((m) =>
        m.contentInheritanceSource.startsWith("sealed_"),
      ),
    ).toBe(true);
  });
});
