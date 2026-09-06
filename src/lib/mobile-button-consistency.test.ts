import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { payment } from "@/config/payment";
import { MOBILE_VOICE_CHOICE_OWNER_ACCEPTED } from "@/config/mobile-customer-spine-palette-v1";
import {
  studioCustomerTileRecipesV1,
  studioTileClass,
  voiceChoiceButtonClass,
} from "@/config/studio-customer-tile-system-v1";
import { studioVoicePreferenceV1 } from "@/config/studio-voice-preference-v1";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("Mobile checkout + button consistency (2026-09-05)", () => {
  it("keeps Continue to Secure Checkout on the Welcome primary Denim CTA", () => {
    const grid = read("src/components/payment/SecureCheckoutGrid.tsx");
    expect(payment.form.submitLabel).toBe("Continue to secure checkout");
    expect(grid).toContain("{confirmLabel}");
    expect(grid).toContain("lobby-entry-film__cta co-submit");
    expect(grid).toContain('href="#checkout-continue"');
    expect(grid).not.toContain("utility-btn--primary");
    expect(grid).toContain("if (!termsAccepted)");
    expect(grid).toContain('data-checkout-pay="continue"');
    expect(grid).toContain("data-checkout-terms");
    const submitCss = read("src/app/checkout/checkout.css");
    const submitBlock = submitCss.slice(submitCss.indexOf(".co-submit {"));
    expect(submitBlock).toContain("min-height: 3.25rem");
    expect(submitBlock.slice(0, 280)).not.toContain("background");
    expect(submitBlock.slice(0, 280)).not.toContain("#547");
  });

  it("keeps Back to Studio Plan as a text secondary, not a filled primary", () => {
    const checkout = read(
      "src/components/studio-conversation-room/guide/ConversationCheckoutPanel.tsx",
    );
    expect(checkout).toContain("styles.backLink");
    expect(checkout).toContain("checkoutBackToPlanLabel");
    expect(checkout).not.toContain("lobby-entry-film__cta");
    const css = read(
      "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
    );
    const back = css.slice(css.indexOf(".backLink {"), css.indexOf(".builderToolbar {"));
    expect(back).toContain("background: none");
    expect(back).not.toContain("lobby-entry-film__cta");
  });

  it("maps Voice Choice to the Let’s Get Started Welcome CTA family without delaying the flow", () => {
    expect(voiceChoiceButtonClass(false)).toBe(studioTileClass.primaryAction);
    expect(voiceChoiceButtonClass(false)).toBe(
      MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.unselectedChoiceClass,
    );
    expect(voiceChoiceButtonClass(true)).toBe(studioTileClass.primaryAction);
    expect(voiceChoiceButtonClass(true)).toBe(
      MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.selectedChoiceClass,
    );
    expect(studioCustomerTileRecipesV1.selectedFill).toBe(
      "color-mix(in srgb, #547C92 22%, #F7F4EE)",
    );
    const tileCss = read("src/app/studio-customer-tile-system.css");
    const selected = tileCss.slice(
      tileCss.indexOf("[data-mobile-customer-spine] .studio-tile--selected {"),
    );
    expect(selected).toContain("color-mix(in srgb, #547c92 22%, #f7f4ee)");
    expect(selected).toContain("border: 1px solid #547c92");
    const film = read(
      "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
    );
    expect(film).toContain("voiceChoiceButtonClass(selected)");
    expect(film).toContain("onPress");
    expect(film).not.toContain('setChosen("on")');
    expect(film).not.toContain('setChosen("off")');
    expect(film).toContain("lobby-entry-film__cta");
    expect(film).not.toContain("setTimeout");
    expect(film).not.toContain("requestAnimationFrame");
    const voiceCss = read(
      "src/components/studio-conversation-room/voice-choice-film.module.css",
    );
    expect(voiceCss).toContain("Layout only");
    expect(voiceCss).not.toContain("background: var(--mc-denim, #547c92)");
    expect(voiceCss).not.toContain("color-mix(in srgb, #547c92 78%, #2e2b28)");
    expect(read("src/app/welcome-hall-phase1.css")).toContain(
      "background: var(--mc-denim, #547c92)",
    );
    expect(read("src/app/welcome-hall-phase1.css")).toContain(
      '[data-gate-pressed="true"]',
    );
    expect(tileCss).not.toContain(
      "[data-voice-choice-film] .lobby-entry-film__cta:active",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.doNotAddInspectionDelay).toBe(
      true,
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.buttonSystemStatus).toBe(
      "FUNCTION_PASS",
    );
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.selectedColorVisualStatus).toBe(
      "WELCOME_CTA_FAMILY",
    );
  });

  it("keeps Voice Choice on the Let’s Get Started CTA family with Fill it out myself on the Samsung gate", () => {
    const film = read(
      "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
    );
    expect(studioVoicePreferenceV1.copy.useVoiceGuidance).toBe(
      "Use Voice guidance",
    );
    expect(studioVoicePreferenceV1.copy.fillItOutMyself).toBe(
      "Fill it out myself",
    );
    expect(film).toContain("copy.useVoiceGuidance");
    expect(film).toContain("copy.fillItOutMyself");
    expect(film).toContain("voiceChoiceButtonClass(selected)");
    expect(film).toContain("useSamsungGateActivate");
    expect(film).toContain('action="off"');
    expect(film).toContain("<a");
    expect(film).toContain('href="#studio-voice-choice"');
    expect(film).toContain("lobby-entry-film__cta");
    const runtime = read(
      "src/components/studio-conversation-room/ConversationRoomRuntime.tsx",
    );
    const voicePref = runtime.slice(
      runtime.indexOf("function handleVoiceNarrationPreference"),
      runtime.indexOf("function handleTextDraftLive"),
    );
    expect(runtime).toContain("onChoose={handleVoiceNarrationPreference}");
    expect(voicePref).toContain("listenArmedRef.current = false");
    expect(voicePref).toContain('if (value === "off")');
    expect(voicePref).toContain("stopConversationDictation()");
    expect(voicePref).toContain("setListening(false)");
    expect(MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.samsungFillItOutMyselfStatus).toBe(
      "PASS",
    );
    expect(
      MOBILE_VOICE_CHOICE_OWNER_ACCEPTED.samsungFillItOutMyselfOwnerAcceptedAt,
    ).toBe("2026-09-06");
  });

  it("does not restyle frozen Step 2 or open MJ-D21 Step 3 tiles", () => {
    const servicesCss = read(
      "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
    );
    expect(servicesCss).toContain(
      "color-mix(in srgb, var(--mc-ivory, #f7f4ee) 32%, transparent)",
    );
    const plan = read(
      "src/components/studio-conversation-room/guide/ConversationStudioPlanTablet.tsx",
    );
    expect(plan).toContain("studioTileClass.standardLight");
    expect(plan).toContain("studioTileClass.supportingQuiet");
    const followUp = read(
      "docs/launch/studio-operating-mobile-customer-journey-certification-1/2026-09-05-STEP-3-STANDARD-LIGHT-VISUAL-FOLLOW-UP.md",
    );
    expect(followUp).toContain("OPEN visual follow-up");
    expect(followUp).toContain("Do not continue CSS");
    const ledger = read(
      "docs/launch/studio-operating-mobile-customer-journey-certification-1/DEFECT-LEDGER.md",
    );
    expect(ledger).toContain("MJ-D21 — Step 3 Standard Light tiles still read brown on Samsung");
  });
});
