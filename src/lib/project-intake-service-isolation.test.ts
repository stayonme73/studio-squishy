import { describe, expect, it } from "vitest";

import { CONDENSED_PACKAGE_IDS } from "@/config/studio-customer-journey-condense-v1";
import { isProjectIntakePlanReady } from "@/lib/project-intake-completeness";
import {
  FLYER_PRODUCTION_INTAKE_ANSWER_KEYS,
  visibleKeysUseFlyerCorrection,
} from "@/lib/project-intake-flyer-production";
import {
  buildCondensedOfferIntakePlan,
  clipIntakeVisibleGaps,
  kitIntakeVisibleGaps,
  projectIntakeServiceFieldKey,
  projectIntakeSharedContactKey,
  shortFormIntakeVisibleGaps,
  socialIntakeVisibleGaps,
  withSavedIntakeContact,
  type ProjectIntakePlan,
} from "@/lib/project-intake-plan";
import { emptyCondensedJourneyDraft } from "@/lib/studio-customer-journey-condense/draft";
import { mergeIntakePreviewIntoDraft } from "@/lib/studio-customer-journey-condense/intake-preview";

const CONTACT = {
  businessName: "Example Co",
  email: "inspection@example.com",
  purpose: "Show the offer.",
};

const GAP_FOR = {
  clip_repurposing: clipIntakeVisibleGaps,
  short_form_video_editing: shortFormIntakeVisibleGaps,
  social_and_promo_graphics: socialIntakeVisibleGaps,
  campaign_launch_kit: kitIntakeVisibleGaps,
} as const;

function ownAnswers(plan: ProjectIntakePlan, packageId: string) {
  const answers = withSavedIntakeContact({}, packageId, CONTACT);
  for (const section of plan.services) {
    for (const field of section.fields) {
      if (!field.required) continue;
      const key = projectIntakeServiceFieldKey(section.serviceId, field.id);
      answers[key] = field.type === "checkbox" ? field.label : "Inspection answer.";
    }
  }
  return answers;
}

describe("intake rules stay with the service that owns them", () => {
  it("does not apply flyer correction to another service's questions", () => {
    expect(visibleKeysUseFlyerCorrection(FLYER_PRODUCTION_INTAKE_ANSWER_KEYS)).toBe(true);
    expect(visibleKeysUseFlyerCorrection(null)).toBe(false);
    expect(visibleKeysUseFlyerCorrection([])).toBe(false);
    for (const [packageId, gaps] of Object.entries(GAP_FOR)) {
      const open = gaps(null, null);
      expect(open.length).toBeGreaterThan(0);
      expect(visibleKeysUseFlyerCorrection(open)).toBe(false);
      for (const key of open) {
        expect(key.startsWith("shared:") || key.startsWith(`${packageId}:`)).toBe(true);
        expect(key.includes("v2-rtu-flyer")).toBe(false);
        expect(key.endsWith(":mustInclude")).toBe(false);
      }
    }
  });

  it("lets each package continue from its own required fields", () => {
    for (const packageId of CONDENSED_PACKAGE_IDS) {
      const plan = buildCondensedOfferIntakePlan({ packageId, name: packageId });
      const foreign = CONDENSED_PACKAGE_IDS.filter((id) => id !== packageId);
      for (const section of plan.services) {
        expect(section.serviceId).toBe(packageId);
        for (const field of section.fields) {
          expect(field.id).not.toBe("mustInclude");
          expect(field.id).not.toBe("flyerPurpose");
          for (const other of foreign) {
            expect(projectIntakeServiceFieldKey(section.serviceId, field.id).startsWith(`${other}:`)).toBe(
              false,
            );
          }
        }
      }
      const answers = ownAnswers(plan, packageId);
      answers["v2-rtu-flyer:mustInclude"] = "";
      expect(isProjectIntakePlanReady(plan, answers)).toBe(true);
      expect(answers[projectIntakeSharedContactKey("businessName")]).toBe("Example Co");
      expect(answers[projectIntakeServiceFieldKey(packageId, "purpose")]).toBeTruthy();
    }
  });

  it("counts saved contact and leaves another package's note on its own draft", () => {
    for (const [packageId, gaps] of Object.entries(GAP_FOR)) {
      expect(gaps({}, CONTACT)).not.toContain(projectIntakeSharedContactKey("businessName"));
      expect(gaps({}, CONTACT)).not.toContain(projectIntakeSharedContactKey("email"));
      expect(gaps({}, CONTACT)).not.toContain(projectIntakeServiceFieldKey(packageId, "purpose"));
    }
    const social = emptyCondensedJourneyDraft("social_and_promo_graphics");
    social.aboutProject.purpose = "Social purpose.";
    const merged = mergeIntakePreviewIntoDraft(social, {
      "clip_repurposing:purpose": "This clip sentence must not replace the social purpose.",
      "clip_repurposing:context": "This clip note must stay off the social draft.",
      "social_and_promo_graphics:facts": "Logo note for the graphics.",
    });
    expect(merged.aboutProject.purpose).toBe("Social purpose.");
    expect(merged.aboutProject.context).toBe("");
    expect(merged.aboutProject.facts).toBe("Logo note for the graphics.");
  });
});
