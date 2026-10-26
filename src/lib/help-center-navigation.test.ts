import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentProps } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";

import type { HelpCenterFrom } from "@/config/help-center";
import { HELP_CENTER_FROM_WHITELIST, helpCenter, helpCenterHref } from "@/config/help-center";
import { studioBoard } from "@/config/studio-board";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import {
  parseHelpCenterFromParam,
  resolveHelpCenterBackHref,
  resolveHelpCenterBackLabel,
  resolveHelpCenterOriginForUtilityNav,
  resolveHelpCenterProtectedAriaLabel,
  resolveHelpCenterProtectedHref,
  studioSignInHref,
} from "@/lib/help-center-navigation";

/** Outbound Help Center emitter context on utility headers — not inbound `?from=`. */
type OutboundHelpCenterFrom = NonNullable<
  ComponentProps<typeof UtilityPageHeader>["helpCenterFrom"]
>;

describe("Help Center navigation honesty", () => {
  it("parses only the known origin whitelist", () => {
    expect(parseHelpCenterFromParam("studio-lobby")).toBe("studio-lobby");
    expect(parseHelpCenterFromParam("conversation-room")).toBe("conversation-room");
    expect(parseHelpCenterFromParam("final-delivery-room")).toBe("final-delivery-room");
    expect(parseHelpCenterFromParam("review-room")).toBe("review-room");
    expect(parseHelpCenterFromParam("deliverables")).toBe("deliverables");
    expect(parseHelpCenterFromParam("route-map")).toBe("route-map");
    expect(parseHelpCenterFromParam("studio-board")).toBe("studio-board");
    expect(parseHelpCenterFromParam("campaign-details")).toBe("campaign-details");
    expect(parseHelpCenterFromParam("payment")).toBe("payment");
    expect(parseHelpCenterFromParam("package-detail")).toBe("package-detail");
    expect(parseHelpCenterFromParam("short-form-package-detail")).toBe(
      "short-form-package-detail",
    );
    expect(parseHelpCenterFromParam("social-package-detail")).toBe("social-package-detail");
    expect(parseHelpCenterFromParam("project-builder")).toBe("project-builder");
    expect(parseHelpCenterFromParam("checkout")).toBe("checkout");
    expect(parseHelpCenterFromParam("unknown")).toBeNull();
    expect(parseHelpCenterFromParam("/studio-board")).toBeNull();
    expect(parseHelpCenterFromParam("https://evil.example")).toBeNull();
    expect(HELP_CENTER_FROM_WHITELIST).not.toContain("https://evil.example");
  });

  it("maps each known origin to a truthful Back door", () => {
    expect(resolveHelpCenterBackHref("studio-lobby")).toBe("/studio-lobby");
    expect(resolveHelpCenterBackLabel("studio-lobby")).toBe("← Back to Home");
    expect(resolveHelpCenterBackHref("conversation-room")).toBe("/studio-conversation-room");
    expect(resolveHelpCenterBackLabel("conversation-room")).toBe("← Back to Conversation Room");
    expect(resolveHelpCenterBackHref("route-map")).toBe("/studio-conversation-room");
    expect(resolveHelpCenterBackLabel("route-map")).toBe("← Back to Conversation Room");
    expect(resolveHelpCenterBackHref("payment")).toBe("/studio-conversation-room");
    expect(resolveHelpCenterBackHref("studio-board")).toBe("/studio-board");
    expect(resolveHelpCenterBackLabel("studio-board")).toBe("← Back to My Studio");
    expect(resolveHelpCenterBackHref("campaign-details")).toBe("/campaign-details");
    expect(resolveHelpCenterBackHref("review-room")).toBe("/feedback-studio");
    expect(resolveHelpCenterBackHref("deliverables")).toBe("/deliverables");
    expect(resolveHelpCenterBackHref("final-delivery-room")).toBe("/final-delivery-room");
    expect(resolveHelpCenterBackLabel("final-delivery-room")).toBe("← Back to Final Delivery");
    expect(resolveHelpCenterBackHref("package-detail")).toBe("/package/clip-repurposing");
    expect(resolveHelpCenterBackLabel("package-detail")).toBe("← Back to Package Detail");
    expect(resolveHelpCenterBackHref("short-form-package-detail")).toBe(
      "/package/short-form-video-editing",
    );
    expect(resolveHelpCenterBackHref("social-package-detail")).toBe(
      "/package/social-promo-graphics",
    );
    expect(resolveHelpCenterBackHref("project-builder")).toBe("/project-builder");
    expect(resolveHelpCenterBackLabel("project-builder")).toBe(
      "← Back to Build Your Project",
    );
    expect(resolveHelpCenterBackHref("checkout")).toBe("/checkout");
    expect(resolveHelpCenterBackLabel("checkout")).toBe("← Back to Review & Pay");
  });

  it("defaults missing or invalid from to Studio Lobby, not Studio Board", () => {
    expect(resolveHelpCenterBackHref(null)).toBe("/studio-lobby");
    expect(resolveHelpCenterBackHref(parseHelpCenterFromParam(null))).toBe("/studio-lobby");
    expect(resolveHelpCenterBackHref(parseHelpCenterFromParam("bogus"))).toBe("/studio-lobby");
    expect(resolveHelpCenterBackLabel(null)).toBe("← Back to Home");
  });

  it("does not publish the proof room as a generic Help destination", () => {
    expect(studioBoard.routes.deliverables).toBe("/deliverables");
    expect(helpCenter.routes.deliverables).toBe("/deliverables");
    expect(helpCenter.routes.finalDeliveryRoom).toBe("/final-delivery-room");
    expect(resolveHelpCenterBackHref("deliverables")).not.toBe("/final-delivery-room");
  });

  it("sends unsigned protected doors through existing sign-in return-to", () => {
    expect(resolveHelpCenterProtectedHref("/studio-board", false)).toBe(
      "/sign-in?from=%2Fstudio-board",
    );
    expect(resolveHelpCenterProtectedHref("/campaign-details", false)).toBe(
      "/sign-in?from=%2Fcampaign-details",
    );
    expect(resolveHelpCenterProtectedHref("/feedback-studio", false)).toBe(
      "/sign-in?from=%2Ffeedback-studio",
    );
    expect(resolveHelpCenterProtectedHref("/deliverables", false)).toBe(
      "/sign-in?from=%2Fdeliverables",
    );
    expect(resolveHelpCenterProtectedHref("/studio-lobby", false)).toBe("/studio-lobby");
    expect(resolveHelpCenterProtectedHref("/final-delivery-room", false)).toBe(
      "/final-delivery-room",
    );
    expect(resolveHelpCenterProtectedHref("/studio-board", true)).toBe("/studio-board");
    expect(studioSignInHref("/studio-board")).toBe("/sign-in?from=%2Fstudio-board");
    expect(resolveHelpCenterProtectedAriaLabel("Studio Board", "/studio-board", false)).toBe(
      "Sign in to open Studio Board",
    );
    expect(
      resolveHelpCenterProtectedAriaLabel("← Back to Studio Board", "/studio-board", false, "return"),
    ).toBe("Sign in to return to Studio Board");
    expect(resolveHelpCenterProtectedAriaLabel("← Back to Home", "/studio-lobby", false)).toBe(
      "← Back to Home",
    );
  });

  it("carries the page origin on utility Help tiles", () => {
    expect(resolveHelpCenterOriginForUtilityNav("studio-board")).toBe("studio-board");
    expect(resolveHelpCenterOriginForUtilityNav("campaign-details")).toBe("campaign-details");
    expect(resolveHelpCenterOriginForUtilityNav("review-room")).toBe("review-room");
    expect(resolveHelpCenterOriginForUtilityNav("deliverables")).toBe("deliverables");
    expect(resolveHelpCenterOriginForUtilityNav("help-center")).toBeUndefined();
    expect(helpCenterHref(undefined, "studio-board")).toBe("/help-center?from=studio-board");
    expect(helpCenterHref(undefined, "conversation-room")).toBe(
      "/help-center?from=conversation-room",
    );
    expect(helpCenterHref(undefined, "final-delivery-room")).toBe(
      "/help-center?from=final-delivery-room",
    );
  });

  it("does not reuse inbound from as outbound Help Center link context on Help Center", () => {
    const inboundOrigins: HelpCenterFrom[] = [...HELP_CENTER_FROM_WHITELIST];

    for (const from of inboundOrigins) {
      const backHref = resolveHelpCenterBackHref(from);
      expect(backHref).toBeTruthy();
      const mistakenOutbound = helpCenterHref(undefined, from);
      expect(studioBoard.routes.studioBoard).not.toBe(mistakenOutbound);
      expect(mistakenOutbound.startsWith(studioBoard.routes.helpCenter)).toBe(true);
    }
  });

  it("keeps outbound header contract free of route-map", () => {
    expectTypeOf<OutboundHelpCenterFrom>().toEqualTypeOf<
      "campaign-details" | "studio-board" | "payment"
    >();
    expectTypeOf<"route-map">().not.toMatchTypeOf<OutboundHelpCenterFrom>();

    const outboundMembers: OutboundHelpCenterFrom[] = [
      "campaign-details",
      "studio-board",
      "payment",
    ];
    expect(outboundMembers).not.toContain("route-map");

    for (const from of outboundMembers) {
      expect(helpCenterHref(undefined, from)).toBe(`/help-center?from=${from}`);
    }
  });

  it("Help Center page reads the live session before first paint", () => {
    const pagePath = join(process.cwd(), "src/app/help-center/page.tsx");
    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain("readSessionFromCookieHeader");
    expect(source).toContain("initialSignedIn");
    expect(source).not.toContain("HelpCenterScene />");
  });

  it("HelpCenterScene wires inbound to backHref only — never helpCenterFrom", () => {
    const scenePath = join(process.cwd(), "src/components/help-center/HelpCenterScene.tsx");
    const source = readFileSync(scenePath, "utf8");

    expect(source).toContain("backHref={backHref}");
    expect(source).toContain('activeNav="help-center"');
    expect(source).toContain("parseHelpCenterFromParam");
    expect(source).toContain("resolveHelpCenterBackHref");
    expect(source).toContain("signedIn={signedIn}");
    expect(source).toContain("initialSignedIn");
    expect(source).toContain("if (ok) setSignedIn(true)");
    expect(source).not.toContain("helpCenterFrom");
    expect(source).not.toMatch(/helpCenterFrom=\{/);
  });
});
