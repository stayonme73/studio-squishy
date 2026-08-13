/**
 * STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-INTAKE-TRUTH-1
 */

import { describe, expect, it } from "vitest";

import { getRouteMapIntakeSchema } from "@/catalog/intake";

import { SOCIAL_POSTS_PROOF_CONTRACT } from "./social-posts-contracts";
import {
  SOCIAL_POSTS_EXACT_COUNT,
  SOCIAL_POSTS_SQUARE_PLATE,
  SOCIAL_POST_ROLE_ANGLES,
} from "./social-posts-types";
import {
  SOCIAL_POSTS_INTAKE_FIELD_IDS,
  SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION,
  assertSocialPostsStructureExecutableForDispatch,
  assignStudioProductionSocialPostMembers,
  hasSocialPostsSetStructureIntakeTruth,
  mapSocialPostsSetStructureFromIntakeAnswers,
  resolveSocialPostsPlatformPlacement,
} from "./social-posts-intake-truth";

describe("social-posts intake truth (INTAKE-TRUTH-1)", () => {
  it("classifies Harbor role angles as proven layouts — not customer contract roles", () => {
    expect(SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION.customerConfigurable).toBe(
      false,
    );
    expect(
      SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION.fixedServiceContractRoles,
    ).toBe(false);
    expect([
      ...SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION.provenMachineLayoutTemplates,
    ]).toEqual([...SOCIAL_POST_ROLE_ANGLES]);
    expect(SOCIAL_POSTS_ROLE_ANGLE_CLASSIFICATION.liveAuthority).toBe(
      "studio_production_layout_assignment",
    );
    expect(SOCIAL_POSTS_PROOF_CONTRACT.liveIntakeSetStructureResolved).toBe(
      true,
    );
    expect(
      SOCIAL_POSTS_PROOF_CONTRACT.roleAnglesAreCustomerIntakeFields,
    ).toBe(false);
    expect(
      SOCIAL_POSTS_PROOF_CONTRACT.roleAnglesAreFixedServiceContract,
    ).toBe(false);
  });

  it("does not add per-post role or plate selects to the catalog schema", () => {
    const schema = getRouteMapIntakeSchema("rtu-social-posts");
    const ids = schema.fields.map((f) => f.id);
    expect(ids).toContain("postsAbout");
    expect(ids).toContain("callToAction");
    expect(ids).toContain("platform");
    expect(ids).not.toContain("post1_role");
    expect(ids).not.toContain("post1_roleAngle");
    expect(ids).not.toContain("socialPost1_roleAngle");
    expect(ids).not.toContain("graphicA_authorizedPurpose");
    expect(ids).not.toContain("agreedPlate");
    for (let i = 1; i <= SOCIAL_POSTS_EXACT_COUNT; i++) {
      expect(ids.some((id) => id.includes(`post${i}_role`))).toBe(false);
    }
  });

  it("maps live chip answers → square×4 + Studio layout templates + durable order", () => {
    const mapped = mapSocialPostsSetStructureFromIntakeAnswers({
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.purposeChoice]: "Promote an offer",
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.actionChoice]: "Book now",
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.platformChoice]: "Instagram Post",
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    expect(mapped.structure.plateId).toBe(SOCIAL_POSTS_SQUARE_PLATE.plateId);
    expect(mapped.structure.canvas).toEqual({ widthPx: 1024, heightPx: 1024 });
    expect(mapped.structure.platformChoice).toBe("Instagram Post");
    expect(mapped.structure.platformLabel).toMatch(/square feed/i);
    expect(mapped.structure.captionSource).toBe(
      "studio_written_from_campaign_truth",
    );
    expect(mapped.structure.roleAngleAuthority).toBe(
      "studio_production_layout_assignment",
    );
    expect(mapped.structure.assets).toHaveLength(4);
    expect(mapped.structure.assets.map((a) => a.orderIndex)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(mapped.structure.assets.map((a) => a.assetId)).toEqual([
      "social-post-1",
      "social-post-2",
      "social-post-3",
      "social-post-4",
    ]);
    expect(mapped.structure.assets.map((a) => a.roleAngle)).toEqual([
      ...SOCIAL_POST_ROLE_ANGLES,
    ]);
    expect(
      assertSocialPostsStructureExecutableForDispatch(mapped.structure).ok,
    ).toBe(true);
    expect(
      hasSocialPostsSetStructureIntakeTruth({
        [SOCIAL_POSTS_INTAKE_FIELD_IDS.purposeChoice]: "Promote an offer",
        [SOCIAL_POSTS_INTAKE_FIELD_IDS.actionChoice]: "Book now",
        [SOCIAL_POSTS_INTAKE_FIELD_IDS.platformChoice]: "Instagram Post",
      }),
    ).toBe(true);
  });

  it("maps awareness purpose without inventing a customer role menu", () => {
    const mapped = mapSocialPostsSetStructureFromIntakeAnswers({
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.purposeChoice]: "Build awareness",
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.actionChoice]: "Learn more",
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.platformChoice]: "Facebook Post",
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.structure.roleAngleAuthority).toBe(
      "studio_production_layout_assignment",
    );
    expect(mapped.structure.roleAngleClassification.customerConfigurable).toBe(
      false,
    );
    expect(mapped.structure.platformLabel).toMatch(/Facebook Post/);
  });

  it("fails closed when platform missing", () => {
    const mapped = mapSocialPostsSetStructureFromIntakeAnswers({
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.purposeChoice]: "Promote an offer",
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.actionChoice]: "Book now",
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("MISSING_REQUIRED_TRUTH");
    expect(mapped.message).toMatch(/platform/i);
  });

  it("fails closed when purpose missing", () => {
    const mapped = mapSocialPostsSetStructureFromIntakeAnswers({
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.actionChoice]: "Book now",
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.platformChoice]: "Instagram Post",
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("MISSING_REQUIRED_TRUTH");
    expect(mapped.message).toMatch(/purpose|postsAbout/i);
  });

  it("rejects smuggled per-post customer role fields (Harbor trap)", () => {
    const mapped = mapSocialPostsSetStructureFromIntakeAnswers({
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.purposeChoice]: "Promote an offer",
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.actionChoice]: "Book now",
      [SOCIAL_POSTS_INTAKE_FIELD_IDS.platformChoice]: "Instagram Post",
      post1_roleAngle: "offer_lead",
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.message).toMatch(/not a customer intake/i);
  });

  it("fail-closes TikTok catalog platform (no silent plate invent)", () => {
    const mapped = mapSocialPostsSetStructureFromIntakeAnswers({
      postsAbout: "Spring special",
      callToAction: "Book now",
      platform: "TikTok",
    });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) return;
    expect(mapped.code).toBe("UNSUPPORTED_PLATE_EXECUTION");
  });

  it("resolves Instagram flattened detail without authorizing portrait execution", () => {
    const placement = resolveSocialPostsPlatformPlacement(
      "Instagram Post — Square or portrait feed graphic",
    );
    expect(placement.ok).toBe(true);
    if (!placement.ok) return;
    expect(placement.platformChoice).toBe("Instagram Post");
    expect(placement.platformLabel).toMatch(/square feed/i);
    expect(placement.platformLabel.toLowerCase()).not.toMatch(/portrait/);
  });

  it("Studio production members are exactly four distinct proven templates", () => {
    const members = assignStudioProductionSocialPostMembers();
    expect(members).toHaveLength(4);
    expect(new Set(members.map((m) => m.roleAngle)).size).toBe(4);
    expect(members.map((m) => m.roleAngle)).toEqual([...SOCIAL_POST_ROLE_ANGLES]);
  });
});
