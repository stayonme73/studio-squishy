import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  launchMarkdownHasCommunicationSections,
  renderLaunchMarkdown,
} from "@/lib/launch-tracker/render-launch-markdown";
import { masterLaunchListAbsolutePath } from "@/lib/launch-tracker/load-master-launch-list";
import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";

function userWithRoles(roles: StudioUser["roles"]): StudioUser {
  return {
    id: "test-user",
    email: "test@local.dev",
    displayName: "Test",
    roles,
  };
}

describe("Launch Tracker markdown renderer", () => {
  it("renders checkboxes, strikethrough, and active heading", () => {
    const html = renderLaunchMarkdown(`# Title

## CURRENTLY IN PROGRESS: Room Inventory

- [x] ~~Done item~~
- [ ] Open item

### Tagia Notes
`);
    expect(html).toContain('lt-heading--active');
    expect(html).toContain("lt-check--done");
    expect(html).toContain("<del>Done item</del>");
    expect(html).toContain("☐");
    expect(html).toContain("☑");
  });

  it("highlights communication notebook headings", () => {
    const html = renderLaunchMarkdown(`### Scout Notes\n\nHello`);
    expect(html).toContain("lt-heading--notes");
    expect(html).toContain("Scout Notes");
  });

  it("escapes raw HTML from markdown source", () => {
    const html = renderLaunchMarkdown(`<script>alert(1)</script>`);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("redacts absolute local paths from the browser view", () => {
    const html = renderLaunchMarkdown(
      `| Repo | C:\\Users\\tagia\\studio-squishy |\n| --- | --- |`,
    );
    expect(html).not.toContain("C:\\Users\\tagia");
    expect(html).toContain("[local repo path]");
  });
});

describe("Master Launch List source document", () => {
  const markdown = readFileSync(masterLaunchListAbsolutePath(), "utf8");

  it("includes communication notebook sections", () => {
    expect(launchMarkdownHasCommunicationSections(markdown)).toBe(true);
  });

  it("includes Visual Quality Queue and Parking Lot", () => {
    expect(markdown).toMatch(/##\s+13\.\s+Visual Quality Queue/);
    expect(markdown).toMatch(/##\s+15\.\s+Parking Lot/);
  });

  it("marks room inventory as currently in progress", () => {
    expect(markdown).toMatch(/CURRENTLY IN PROGRESS/);
    expect(markdown).toMatch(/Customer-Facing Room Inventory/);
  });

  it("renders the real document without inventing packages", () => {
    const html = renderLaunchMarkdown(markdown);
    expect(html).toContain("Launch Goal");
    expect(html).toContain("Tagia Notes");
    expect(html).toContain("Scout Notes");
    expect(html).toContain("Decisions Needed");
    expect(html).toContain("Blocker Notes");
    expect(html).toContain("Daily Progress Notes");
    expect(html).toContain("Visual Quality Queue");
    expect(html).toContain("Parking Lot");
    expect(html).toContain("lt-heading--active");
  });
});

describe("Launch Tracker owner gate", () => {
  it("allows owner users", () => {
    expect(isOwnerUser(userWithRoles(["owner"]))).toBe(true);
    expect(isOwnerUser(userWithRoles(["owner", "client"]))).toBe(true);
  });

  it("denies staff-only and client-only users", () => {
    expect(isOwnerUser(userWithRoles(["staff"]))).toBe(false);
    expect(isOwnerUser(userWithRoles(["client"]))).toBe(false);
    expect(isOwnerUser(null)).toBe(false);
  });
});

describe("Launch Tracker route placement", () => {
  it("keeps the temporary page under the protected file-room namespace", () => {
    const pagePath = path.join(
      process.cwd(),
      "src/app/file-room/launch-tracker/page.tsx",
    );
    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).toContain("isOwnerUser");
    expect(source).toContain("loadMasterLaunchListMarkdown");
    expect(source).toContain("Launch Tracker");
    expect(source).toContain("Temporary owner-only Launch Tracker");
  });
});
