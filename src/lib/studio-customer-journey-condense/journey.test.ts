import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  builderCopyForPackage,
  clipRepurposingPackageDetail,
  getConvertedPackageDetail,
  packageIdFromSlug,
  shortFormVideoEditingPackageDetail,
  socialAndPromoGraphicsPackageDetail,
  studioCustomerJourneyCondenseV1,
  supportOptionsForPackage,
} from "@/config/studio-customer-journey-condense-v1";
import {
  applyPackageIdentity,
  emptyCondensedJourneyDraft,
  isSectionComplete,
  requiredBuilderReady,
} from "@/lib/studio-customer-journey-condense/draft";
import {
  journeyDraftToIntakeAnswers,
  mergeIntakePreviewIntoDraft,
} from "@/lib/studio-customer-journey-condense/intake-preview";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("STUDIO-CUSTOMER-JOURNEY-CONDENSE-1", () => {
  it("uses one Package Detail shell for all three packages", () => {
    expect(packageIdFromSlug("clip-repurposing")).toBe("clip_repurposing");
    expect(packageIdFromSlug("short-form-video-editing")).toBe("short_form_video_editing");
    expect(packageIdFromSlug("social-promo-graphics")).toBe("social_and_promo_graphics");
    expect(packageIdFromSlug("creative-qa-finish")).toBeNull();
    expect(packageIdFromSlug("campaign-launch-kit")).toBe("campaign_launch_kit");
    expect(getConvertedPackageDetail("clip_repurposing")?.name).toBe("Clip Repurposing");
    expect(getConvertedPackageDetail("short_form_video_editing")?.name).toBe(
      "Short-Form Video Editing",
    );
    expect(getConvertedPackageDetail("social_and_promo_graphics")?.name).toBe(
      "Social & Promo Graphics",
    );
    expect(clipRepurposingPackageDetail.priceDisplay).toBe("$373.75");
    expect(shortFormVideoEditingPackageDetail.priceDisplay).toBe("$186.25");
    expect(socialAndPromoGraphicsPackageDetail.priceDisplay).toBe("$199");
    const clip = JSON.stringify(clipRepurposingPackageDetail).toLowerCase();
    const shortForm = JSON.stringify(shortFormVideoEditingPackageDetail).toLowerCase();
    const social = JSON.stringify(socialAndPromoGraphicsPackageDetail).toLowerCase();
    expect(clip).toContain("15–60");
    expect(clip).toContain("three finished");
    expect(clip).not.toContain("up to 5");
    expect(clip).not.toContain("$549");
    expect(clip).not.toContain("2–60");
    expect(shortForm).toContain("45 seconds");
    expect(shortForm).not.toContain("15–60");
    expect(shortForm).not.toContain("$399");
    expect(social).toContain("1024x1024");
    expect(social).not.toContain("15–60");
    expect(social).not.toContain("$249");
    expect(`${clip}${shortForm}${social}`).not.toContain("spark");
    expect(`${clip}${shortForm}${social}`).not.toContain("momentum");
    expect(`${clip}${shortForm}${social}`).not.toContain("growth");
    expect(read("src/app/package/[packageId]/page.tsx")).toContain("PackageDetailPage");
    expect(read("src/components/studio-journey/PackageDetailCards.tsx")).toContain(
      "pb-drawer-details",
    );
  });

  it("unseals condensed Build Your Project and Review & Pay routes", () => {
    const nextConfig = read("next.config.ts");
    expect(nextConfig).not.toContain(
      '{ source: "/project-builder", destination: "/studio-conversation-room"',
    );
    expect(nextConfig).not.toContain(
      '{ source: "/checkout", destination: "/studio-conversation-room?stage=checkout"',
    );
    expect(read("src/app/project-builder/page.tsx")).toContain("BuildYourProjectPage");
    expect(read("src/app/checkout/page.tsx")).toContain("ReviewAndPayPage");
    expect(read("src/components/studio-journey/BuildYourProjectPage.tsx")).toContain(
      "condensedBuilderSections",
    );
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).toContain("About You");
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).toContain(
      "About Your Project",
    );
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).toContain(
      "Your Materials",
    );
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).not.toContain(
      "Upload Your Files",
    );
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).toContain(
      "You add your actual project files in My Studio after checkout.",
    );
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).toContain(
      "Creative Preferences",
    );
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).toContain(
      "studioExtrasCustomerCopy.builderTitle",
    );
    expect(read("src/components/studio-journey/BuildYourProjectPage.tsx")).not.toContain(
      "studio-journey__chips",
    );
    expect(read("src/components/studio-journey/BuildYourProjectPage.tsx")).toContain(
      "studio-homepage__card-link",
    );
    expect(read("src/components/studio-journey/ReviewAndPayPage.tsx")).toContain(
      'h3 className="pb-drawer-details__heading"',
    );
    expect(read("src/components/studio-journey/ReviewAndPayPage.tsx")).toContain(
      "SecureCheckoutGrid",
    );
    expect(read("src/components/studio-journey/ReviewAndPayPage.tsx")).toContain(
      "reviewWhatsNext",
    );
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).toContain(
      "The Studio uses what you shared on Build Your Project",
    );
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).toContain(
      "You add your project files in My Studio",
    );
    expect(read("src/config/studio-customer-journey-condense-v1.ts")).not.toContain(
      "Project Intake opens",
    );
  });

  it("keeps required builder fields from blocking a half-empty review", () => {
    const empty = emptyCondensedJourneyDraft();
    expect(requiredBuilderReady(empty)).toBe(false);
    const ready = {
      ...empty,
      aboutYou: { name: "Maya", email: "maya@example.com", company: "River" },
      aboutProject: {
        ...empty.aboutProject,
        purpose: "Show the weekly special.",
        qualifyingSource: true,
        intelligible: true,
        rights: true,
        cta: "Book at river.example",
      },
      upload: { materials: "workshop.mp4" },
    };
    expect(isSectionComplete(ready, "about-you")).toBe(true);
    expect(isSectionComplete(ready, "about-project")).toBe(true);
    expect(isSectionComplete(ready, "upload")).toBe(true);
    expect(requiredBuilderReady(ready)).toBe(true);
    const withoutRepeat = {
      ...ready,
      aboutProject: { ...ready.aboutProject, cta: "" },
      upload: { materials: "" },
    };
    expect(isSectionComplete(withoutRepeat, "about-project")).toBe(true);
    expect(isSectionComplete(withoutRepeat, "upload")).toBe(true);
    expect(requiredBuilderReady(withoutRepeat)).toBe(true);
    const purposeOnly = {
      ...empty,
      aboutYou: { name: "Maya", email: "maya@example.com", company: "River" },
      aboutProject: { ...empty.aboutProject, purpose: "Show the weekly special." },
    };
    expect(isSectionComplete(purposeOnly, "about-project")).toBe(true);
    expect(isSectionComplete(purposeOnly, "upload")).toBe(true);
    expect(requiredBuilderReady(purposeOnly)).toBe(true);
    const shortForm = emptyCondensedJourneyDraft("short_form_video_editing");
    const shortReady = {
      ...shortForm,
      aboutYou: { name: "Maya", email: "maya@example.com", company: "River" },
      aboutProject: { ...shortForm.aboutProject, purpose: "Explain the offer." },
    };
    expect(isSectionComplete(shortForm, "about-project")).toBe(false);
    expect(requiredBuilderReady(shortReady)).toBe(true);
    expect(studioCustomerJourneyCondenseV1.routes.myStudio).toBe("/studio-board");
    expect(studioCustomerJourneyCondenseV1.routes.finalDelivery).toBe("/deliverables");
    const help = read("src/config/help-center.ts");
    const policies = read("src/config/policies.ts");
    expect(help).toContain("Start on the Home page");
    expect(help).toContain("add your files in My Studio");
    expect(help).not.toContain("Begin in the Conversation Room");
    expect(policies).toContain("You add the actual files in My Studio");
    const voice = read("src/config/conversation-room-guide-v1.ts");
    expect(voice).toContain("production will begin after the required materials are received");
    expect(voice).not.toContain("Build Your Project already uploaded");
    expect(voice).not.toContain("Upload Your Files");
    expect(policies).toContain(
      "Home → Package Detail → Build Your Project → Review & Pay → Project Intake → My Studio → Final Delivery",
    );
    expect(policies).not.toContain("Lobby → Conversation Room → Payment → Intake");
    expect(policies).not.toContain("complete Intake");
    expect(policies).not.toContain(
      "In the Conversation Room, The Studio suggests a starting route",
    );
    expect(policies).toContain("From the Home page, The Studio shows the packages");
  });

  it("asks package-aware builder questions without leaking Clip into the other states", () => {
    const clip = JSON.stringify(builderCopyForPackage("clip_repurposing"));
    const shortForm = JSON.stringify(builderCopyForPackage("short_form_video_editing"));
    const social = JSON.stringify(builderCopyForPackage("social_and_promo_graphics"));
    expect(clip).toContain("15–60");
    expect(clip).not.toContain("up to 5");
    expect(shortForm).toContain("45 seconds");
    expect(shortForm).not.toContain("15–60");
    expect(shortForm).not.toContain("talking-head");
    expect(social).toContain("offer, promotion, or campaign theme");
    expect(social).not.toContain("talking-head");
    expect(social).not.toContain("15–60");
    expect(social).not.toContain("speaker");
    expect(supportOptionsForPackage("clip_repurposing").map((item) => item.label)).toEqual([
      "Review Request Kit",
      "Email + Text",
      "Ad Creative",
      "Flyer",
    ]);
    expect(supportOptionsForPackage("short_form_video_editing")).toHaveLength(4);
    expect(supportOptionsForPackage("social_and_promo_graphics").map((item) => item.label)).toEqual(
      ["Review Request Kit", "Email + Text", "Flyer", "Menu / Price List"],
    );
    const named = {
      ...emptyCondensedJourneyDraft("clip_repurposing"),
      aboutYou: { name: "Maya Rivera", email: "maya@example.com", company: "River" },
      aboutProject: {
        ...emptyCondensedJourneyDraft().aboutProject,
        purpose: "Clip purpose",
        qualifyingSource: true,
      },
    };
    const switched = applyPackageIdentity(named, "social_and_promo_graphics");
    expect(switched.aboutYou.name).toBe("Maya Rivera");
    expect(switched.aboutProject.purpose).toBe("");
    expect(switched.aboutProject.qualifyingSource).toBe(false);
    expect(switched.packageId).toBe("social_and_promo_graphics");
    expect(switched.support.menu_price_list).toBe("");
    expect(switched.support).not.toHaveProperty("ai_local_visibility");
  });

  it("does not rewrite My Studio or Final Delivery rooms", () => {
    expect(read("src/app/(studio)/deliverables/page.tsx")).not.toContain(
      "ReviewAndPayPage",
    );
    expect(read("src/components/studio-homepage/StudioHomepageLobby.tsx")).toContain(
      'data-package-detail="page"',
    );
    expect(read("src/config/studio-homepage-lobby-rebuild-v1.ts")).toContain(
      "/package/short-form-video-editing",
    );
    expect(read("src/config/studio-homepage-lobby-rebuild-v1.ts")).toContain(
      "/package/social-promo-graphics",
    );
    expect(read("src/config/help-center.ts")).toContain('studioLobby: "Back to Home"');
  });

  it("saves an unpaid intake note and recording check without changing the person", () => {
    const draft = emptyCondensedJourneyDraft("clip_repurposing");
    draft.aboutYou = {
      name: "Studio Inspection",
      email: "inspection@example.com",
      company: "Example Co",
    };
    draft.aboutProject = {
      ...draft.aboutProject,
      purpose: "Show the offer.",
    };
    const source = builderCopyForPackage("clip_repurposing").aboutProject.fields.find(
      (field) => field.name === "qualifyingSource",
    );
    const saved = mergeIntakePreviewIntoDraft(draft, {
      ...journeyDraftToIntakeAnswers(draft),
      "clip_repurposing:context": "Inspection note for the recording.",
      "clip_repurposing:qualifyingSource": source?.label ?? "",
    });
    expect(saved.aboutProject.context).toBe("Inspection note for the recording.");
    expect(saved.aboutProject.qualifyingSource).toBe(true);
    expect(saved.aboutYou).toEqual(draft.aboutYou);
    expect(journeyDraftToIntakeAnswers(saved)["clip_repurposing:context"]).toBe(
      "Inspection note for the recording.",
    );
  });
});
