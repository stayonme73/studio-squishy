import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ownerConsoleWebsiteInspectionV1 } from "@/config/owner-console-website-inspection-v1";
import { canAccessOwnerConsole } from "@/lib/campaign-tasks/owner-console-access";
import type { StudioUser } from "@/lib/campaign-store/types";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Studio Review → Owner Console migration", () => {
  it("does not mount global Studio Review on the site layout", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain("StudioMobileUtilityHost");
    expect(layout).not.toContain("OwnerQaRoot");
  });

  it("removes Conversation Room Studio Review shortcut", () => {
    const nav = read("src/components/studio-conversation-room/ConversationNavPanel.tsx");
    expect(nav).not.toContain("Studio Review");
    expect(nav).not.toContain("studioReview");
    expect(nav).not.toContain("StudioReviewControl");
  });

  it("lists verified customer journey shortcuts without legacy doors", () => {
    const hrefs = ownerConsoleWebsiteInspectionV1.shortcuts.journey.map((item) => item.href);
    expect(hrefs).toContain("/route-map");
    expect(hrefs).toContain("/feedback-studio");
    expect(hrefs).toContain("/deliverables");
    expect(hrefs.some((href) => href.includes("intake"))).toBe(true);
    expect(hrefs).not.toContain("/project-summary");
    expect(hrefs).not.toContain("/business-discovery-studio");
    expect(hrefs).not.toContain("/final-delivery-room");
  });

  it("gates Owner Console to owner users only", () => {
    const owner: StudioUser = {
      id: "tagia",
      email: "tagia@local.dev",
      displayName: "Tagia",
      roles: ["owner"],
    };
    const client: StudioUser = {
      id: "client-1",
      email: "client@local.dev",
      displayName: "Client",
      roles: ["client"],
    };
    const staff: StudioUser = {
      id: "staff-1",
      email: "staff@local.dev",
      displayName: "Staff",
      roles: ["staff"],
    };
    expect(canAccessOwnerConsole(owner)).toBe(true);
    expect(canAccessOwnerConsole(client)).toBe(false);
    expect(canAccessOwnerConsole(staff)).toBe(false);
  });

  it("requires owner session on device-preview API", () => {
    const route = read("src/app/api/dev/device-preview/route.ts");
    expect(route).toContain("isOwnerUser");
    expect(route).toContain("403");
  });

  it("embeds website inspection on Owner Console scene only", () => {
    const scene = read("src/components/file-room/FileRoomOwnerConsoleScene.tsx");
    expect(scene).toContain("FileRoomOwnerConsoleWebsiteInspection");
  });

  it("preserves full hrefs in mobile preview selector options", () => {
    const inspection = read("src/components/file-room/FileRoomOwnerConsoleWebsiteInspection.tsx");
    expect(inspection).toContain("parseDevDevicePreviewHref");
    expect(inspection).toContain("value={item.href}");
    expect(inspection).not.toMatch(/href\.split\("\?"\)\[0\]/);
  });
});
