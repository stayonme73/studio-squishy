import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  homepageAbout,
  homepageContact,
  homepageDemo,
  homepageFaq,
  homepageForbiddenCopy,
  homepageHero,
  homepageHowItWorks,
  homepageNavInformational,
  homepagePackages,
  homepageWhatWeCreate,
  studioHomepageLobbyRebuildV1,
} from "@/config/studio-homepage-lobby-rebuild-v1";
import { homepageStudioVoiceTour } from "@/components/studio-homepage/HomepageStudioVoice";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("STUDIO-HOMEPAGE-LOBBY-REBUILD-1", () => {
  it("keeps Page 1 in the production Lobby routes", () => {
    const root = read("src/app/page.tsx");
    const lobby = read("src/app/studio-lobby/page.tsx");
    expect(root).toContain("StudioHomepageLobbyRoute");
    expect(lobby).toContain("StudioHomepageLobbyRoute");
    expect(root).not.toContain("WelcomeHallStaticScene");
    expect(lobby).not.toContain("WelcomeHallStaticScene");
    expect(studioHomepageLobbyRebuildV1.productionCodebase).toBe(true);
    expect(studioHomepageLobbyRebuildV1.noSeparatePrototype).toBe(true);
    expect(studioHomepageLobbyRebuildV1.pageOnly).toBe("home_lobby");
  });

  it("uses approved copy and does not invent prices, intake, or growth claims", () => {
    const page = read("src/components/studio-homepage/StudioHomepageLobby.tsx");
    expect(page).toContain("homepageHero.headline");
    expect(homepageHero.headline).toBe("Creative support for busy businesses.");
    expect(homepageHero.choosePackage).toBe("Choose a Package");
    expect(homepageHero.choosePackageHref).toBe("#packages");
    expect(homepageNavInformational.map((item) => item.label)).toEqual([
      "Home",
      "What We Do",
      "Our Work",
      "How It Works",
      "About",
      "FAQ",
      "Contact",
    ]);
    expect(homepageNavInformational.find((item) => item.id === "what-we-do")?.href).toBe(
      "#our-work",
    );
    expect(homepageNavInformational.find((item) => item.id === "our-work")?.href).toBe(
      "#packages",
    );
    expect(page).toContain('aria-current="page"');
    expect(page).not.toContain('href="#top"');
    expect(homepagePackages.prompt).toBe(
      "Choose the package that best fits what you need.",
    );
    expect(homepageHowItWorks.steps.map((step) => step.title)).toEqual([
      "Choose what you need",
      "Tell us about your project",
      "Review & pay",
      "Provide your materials",
      "We create & deliver",
    ]);
    expect(homepageHowItWorks.steps[1]?.copy).toBe(
      "Share the information and preferences we need.",
    );
    expect(homepageHowItWorks.steps[3]?.copy).toContain("After checkout");
    expect(page).not.toContain("Get Started");
    expect(page).not.toContain("Explore Packages");
    expect(homepageHero.seeWhatWeCreateHref).toBe("#our-work");
    expect(studioHomepageLobbyRebuildV1.myStudioHref).toBe("/studio-board");
    expect(studioHomepageLobbyRebuildV1.helpHref).toBe(
      "/help-center?from=studio-lobby",
    );
    expect(homepagePackages.items).toHaveLength(4);
    expect(homepagePackages.eyebrow).toBe("Our Four Packages");
    expect(homepagePackages.items.map((item) => item.name)).toEqual([
      "Clip Repurposing",
      "Short-Form Video Editing",
      "Social & Promo Graphics",
      "Campaign Launch Kit",
    ]);
    expect(homepageWhatWeCreate.clarifier).toBe(
      "Examples of work The Studio can create. Current packages are below.",
    );
    expect(page).toContain("homepageWhatWeCreate.clarifier");
    expect(studioHomepageLobbyRebuildV1.studioVoiceEmailHref).toBe(
      "mailto:thestudio7273@gmail.com",
    );
    expect(homepageWhatWeCreate.items).toHaveLength(8);
    expect(homepageWhatWeCreate.items[0]).toMatchObject({
      id: "long-to-short",
      tilePreview:
        "/studio-homepage/what-we-create/long-to-short-hero.jpg?v=hero-20261016",
    });
    expect(
      homepageWhatWeCreate.items.every(
        (item) => "tilePreview" in item && Boolean(item.tilePreview),
      ),
    ).toBe(true);
    expect(homepageFaq.items).toHaveLength(8);
    expect(homepageAbout.paragraphs.join(" ")).toContain(
      "Work with The Studio from wherever your business is.",
    );
    expect(page).toContain("HomepageStudioVoice");
    expect(page).toContain("openHomepageStudioVoice");
    expect(page).not.toContain("homepageVoice.shortLabel");
    const voice = read("src/components/studio-homepage/HomepageStudioVoice.tsx");
    expect(voice).toContain("playStudioVoice");
    expect(voice).toContain("withoutRoomPreference: true");
    expect(voice).toContain("Welcome. ${STUDIO_VOICE_DISCLOSURE}");
    expect(homepageStudioVoiceTour.map((step) => step.id)).toEqual([
      "our-work",
      "our-work",
      "packages",
      "package-clip-repurposing",
      "package-short-form-video-editing",
      "package-social-and-promo-graphics",
      "package-campaign-launch-kit",
      "how-it-works",
      "faq",
      "contact",
    ]);
    expect(homepageStudioVoiceTour[0]?.text).toBe(
      "Come see what we can create for your business.",
    );
    expect(homepageStudioVoiceTour[0]?.showcaseClicks).toBeUndefined();
    expect(homepageStudioVoiceTour[1]?.showcaseClicks).toBe(4);
    expect(homepageStudioVoiceTour.map((step) => step.id)).not.toContain("about");
    expect(homepageStudioVoiceTour.find((step) => step.id === "faq")?.text).toContain(
      "Quick answers to common questions.",
    );
    expect(homepageStudioVoiceTour.find((step) => step.id === "faq")?.text).not.toContain(
      "Frequently Asked Questions",
    );
    expect(
      homepageStudioVoiceTour
        .filter((step) => step.pointAt)
        .map((step) => step.scrollTarget),
    ).toEqual(["packages", "packages", "packages", "packages"]);
    expect(homepageStudioVoiceTour.at(-1)?.text).toContain("email The Studio");
    expect(homepageStudioVoiceTour.at(-1)?.text).toContain("Help Center");
    expect(homepageStudioVoiceTour.at(-1)?.text).not.toContain("Ask Studio Voice");
    const css = read("src/components/studio-homepage/studio-homepage-lobby.css");
    expect(css).toMatch(/\.studio-homepage__voice-panel\s*\{[^}]*position:\s*relative/);
    expect(css).not.toMatch(/\.studio-homepage__voice-panel\s*\{[^}]*position:\s*fixed/);
    expect(page).not.toContain("setStudioVoiceInvite");
    expect(page).not.toContain("window.location.assign");
    expect(page).not.toContain("studioHomepageLobbyRebuildV1.studioVoiceHref");
    expect(page).not.toContain("/studio-conversation-room?stage=intake");
    expect(page).not.toContain('href="/checkout"');
    expect(page).not.toContain('href="/intake"');
    expect(page).toContain('data-package-detail="page"');
    expect(page).not.toContain('data-package-detail="pending"');
    expect(homepagePackages.items.every((item) => "detailHref" in item)).toBe(true);
    expect(page).toContain("homepageDemo.playLabel");
    expect(page).toContain("homepageDemo.src");
    expect(page).toContain("homepageDemo.poster");
    expect(page).toContain("homepageDemo.approved");
    expect(page).toContain("studio-homepage__demo-modal");
    expect(page).toContain("studio-homepage__demo-open");
    expect(page).toContain("studio-homepage__demo-poster");
    expect(page).toContain("openDemoModal");
    expect(page).toContain("flushSync");
    expect(page).toContain("video.play(");
    expect(page).not.toContain("autoPlay");
    expect(page).toContain("studio-homepage__tile-open");
    expect(page).toContain("allowBackdropCloseRef");
    expect(page).toContain('role="dialog"');
    expect(page).toContain("Escape");
    const inlineStage = page.slice(
      page.indexOf("studio-homepage__demo-stage"),
      page.indexOf("studio-homepage__demo-caption"),
    );
    expect(inlineStage).toContain("homepageDemo.poster");
    expect(inlineStage).toContain("homepageDemo.playLabel");
    expect(inlineStage).not.toContain("<video");
    const homepageCss = read("src/components/studio-homepage/studio-homepage-lobby.css");
    expect(homepageCss).toContain("object-fit: contain");
    const tilePreviewCss = homepageCss.slice(
      homepageCss.indexOf(".studio-homepage__tile-preview"),
      homepageCss.indexOf(".studio-homepage__tile p"),
    );
    expect(tilePreviewCss).toContain("object-fit: contain");
    expect(tilePreviewCss).not.toContain("object-fit: cover");
    const tileMap = page.slice(
      page.indexOf("homepageWhatWeCreate.items.map"),
      page.indexOf('id="packages"'),
    );
    expect(tileMap).not.toContain("homepageWhatWeCreate.sampleLabel");
    expect(tileMap).not.toContain("studio-homepage__chip");
    expect(homepageDemo.approved).toBe(true);
    expect(homepageWhatWeCreate.items.map((item) => item.label)).toContain(
      "Promotional flyers",
    );
    expect(
      homepageWhatWeCreate.items.map((item) => item.label).join(" ").toLowerCase(),
    ).not.toContain("business card");
    expect(JSON.stringify(homepageWhatWeCreate.items)).not.toContain("playableSrc");
    expect(homepageDemo.src).toBe(
      "/studio-demo/clip-repurposing-studio-tour-v1-polish-9.mp4?v=polish9-20261022",
    );
    expect(homepageDemo.poster).toBe(
      "/studio-demo/clip-repurposing-studio-tour-v1-polish-9-poster.jpg?v=polish9-20261022",
    );
    expect(homepageDemo.playLabel).toBe("Play Studio Demo");
    expect(homepageHero.seeWhatWeCreate).toBe("See Our Work");
    expect(homepageHero.showSeeOurWork).toBe(false);
    expect(homepageWhatWeCreate.sampleLabel).toBe("Sample");
    const customerCopy = [
      homepageHero.headline,
      homepageHero.body,
      homepageHero.supportingLine,
      ...homepageHero.assurances.map((item) => item.text),
      homepageWhatWeCreate.headline,
      homepageWhatWeCreate.clarifier,
      homepageWhatWeCreate.sampleLabel,
      ...homepagePackages.items.map(
        (item) => `${item.name} ${item.description} ${item.detail}`,
      ),
      ...homepageAbout.paragraphs,
      ...homepageFaq.items.map((item) => `${item.question} ${item.answer}`),
      ...homepageContact.paths.map((item) => `${item.title} ${item.body}`),
    ]
      .join(" ")
      .toLowerCase();
    expect(customerCopy).not.toContain("$399");
    expect(customerCopy).not.toContain("fast turnaround");
    expect(customerCopy).not.toContain("worldwide");
    expect(customerCopy).not.toContain("started in 2026");
    expect(customerCopy).not.toContain("years of experience");
    expect(customerCopy).not.toContain("business growth");
    expect(customerCopy).not.toContain("later build");
    expect(customerCopy).not.toContain("reserves a place");
    expect(customerCopy).not.toContain("sample reserved");
    expect(homepageForbiddenCopy.length).toBeGreaterThan(0);
  });

  it("does not rebuild protected rooms from this package", () => {
    expect(studioHomepageLobbyRebuildV1.noCheckoutChange).toBe(true);
    expect(studioHomepageLobbyRebuildV1.noMyStudioRebuild).toBe(true);
    expect(studioHomepageLobbyRebuildV1.noFinalDeliveryChange).toBe(true);
    expect(studioHomepageLobbyRebuildV1.noPackageDetailPages).toBe(true);
    expect(studioHomepageLobbyRebuildV1.noPublish).toBe(true);
    expect(studioHomepageLobbyRebuildV1.noMerge).toBe(true);
    expect(studioHomepageLobbyRebuildV1.noPush).toBe(true);
    const checkout = read("src/components/payment/SecureCheckoutGrid.tsx");
    expect(checkout).toContain("lobby-entry-film__cta co-submit");
  });
});
