import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentProps } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";

import type { HelpCenterFrom } from "@/config/help-center";
import { helpCenter, helpCenterHref } from "@/config/help-center";
import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";
import { studioBoard } from "@/config/studio-board";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import {
  parseHelpCenterFromParam,
  resolveHelpCenterBackHref,
} from "@/lib/help-center-navigation";

/** Outbound Help Center emitter context on utility headers — not inbound `?from=`. */
type OutboundHelpCenterFrom = NonNullable<
  ComponentProps<typeof UtilityPageHeader>["helpCenterFrom"]
>;

describe("BH-HC-1 Help Center inbound vs outbound navigation contract", () => {
  it("keeps inbound HelpCenterFrom able to parse route-map for return navigation", () => {
    expect(parseHelpCenterFromParam("route-map")).toBe("route-map");
    expect(parseHelpCenterFromParam("studio-board")).toBe("studio-board");
    expect(parseHelpCenterFromParam("campaign-details")).toBe("campaign-details");
    expect(parseHelpCenterFromParam("payment")).toBe("payment");
    expect(parseHelpCenterFromParam("unknown")).toBeNull();
  });

  it("maps ?from=route-map to Route Map back navigation", () => {
    expect(resolveHelpCenterBackHref("route-map")).toBe(
      legacyRouteQuarantineV1.activeFrontDoor,
    );
    expect(resolveHelpCenterBackHref("route-map")).toBe("/route-map");
  });

  it("maps ?from=studio-board to Studio Board back navigation", () => {
    expect(resolveHelpCenterBackHref("studio-board")).toBe(helpCenter.routes.studioBoard);
    expect(resolveHelpCenterBackHref("studio-board")).toBe("/studio-board");
  });

  it("maps ?from=campaign-details to Project Record back navigation", () => {
    expect(resolveHelpCenterBackHref("campaign-details")).toBe(
      helpCenter.routes.campaignDetails,
    );
    expect(resolveHelpCenterBackHref("campaign-details")).toBe("/campaign-details");
  });

  it("defaults Back to Studio Board when inbound from is absent or invalid", () => {
    expect(resolveHelpCenterBackHref(null)).toBe("/studio-board");
    expect(resolveHelpCenterBackHref(parseHelpCenterFromParam(null))).toBe("/studio-board");
  });

  it("does not reuse inbound from as outbound Help Center link context on Help Center", () => {
    // On Help Center, UtilityPageHeader uses activeNav === "help-center" and emits
    // a fixed Studio Board exit — never helpCenterHref(..., inboundFrom).
    const inboundOrigins: HelpCenterFrom[] = [
      "route-map",
      "studio-board",
      "campaign-details",
      "payment",
    ];

    for (const from of inboundOrigins) {
      const backHref = resolveHelpCenterBackHref(from);
      // Inbound still drives Back only.
      expect(backHref).toBeTruthy();
      // Helplink that would result from mistakenly reusing inbound as outbound:
      const mistakenOutbound = helpCenterHref(undefined, from);
      // Help Center page exit must not become another Help Center URL.
      expect(studioBoard.routes.studioBoard).not.toBe(mistakenOutbound);
      expect(studioBoard.routes.studioBoard).toBe("/studio-board");
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

  it("HelpCenterScene wires inbound to backHref only — never helpCenterFrom", () => {
    const scenePath = join(process.cwd(), "src/components/help-center/HelpCenterScene.tsx");
    const source = readFileSync(scenePath, "utf8");

    expect(source).toContain("backHref={backHref}");
    expect(source).toContain('activeNav="help-center"');
    expect(source).toContain("parseHelpCenterFromParam");
    expect(source).toContain("resolveHelpCenterBackHref");
    expect(source).not.toContain("helpCenterFrom");
    // Inbound origin must not be passed into the outbound emitter prop.
    expect(source).not.toMatch(/helpCenterFrom=\{/);
  });
});
