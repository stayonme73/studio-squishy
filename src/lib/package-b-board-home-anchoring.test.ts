import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { studioBoard } from "@/config/studio-board";
import { utilityShell } from "@/config/utility-shell";

/** Package B — Board home anchoring + Project Record demotion (config + wiring truth). */
describe("Package B Board home anchoring", () => {
  it("uses secondary submitted-details wording instead of Open Project Record", () => {
    expect(studioBoard.campaignBrief.openRecordLabel).toBe("View submitted project details");
    expect(studioBoard.campaignBrief.openRecordLabel).not.toMatch(/Open Project Record/i);
    expect(studioBoard.campaignBrief.openRecordLabel).not.toMatch(/^Open /);
  });

  it("keeps Project Record one click away via Board route and utility nav", () => {
    expect(studioBoard.routes.campaignDetails).toBe("/campaign-details");
    expect(studioBoard.routes.studioBoard).toBe("/studio-board");

    const recordNav = utilityShell.nav.find((item) => item.id === "campaign-details");
    expect(recordNav).toBeDefined();
    expect(recordNav?.href).toBe("/campaign-details");
    expect(utilityShell.nav[0]?.id).toBe("studio-board");
  });

  it("softens Record-as-home customer copy without removing the Record surface", () => {
    expect(studioBoard.campaignDetails.pageTitle).toBe("Project Record");
    expect(studioBoard.campaignDetails.lead).toBe(
      "Review the project details you submitted to The Studio.",
    );
    expect(studioBoard.campaignDetails.lead).not.toMatch(/manage the project/i);
    expect(studioBoard.campaignDetails.arrival.message).toBe(
      "Your project is confirmed. Review the submitted details you shared for your Studio Plan.",
    );
    expect(studioBoard.campaignDetails.arrival.message).not.toMatch(/Welcome to your Project Record/i);
    expect(studioBoard.campaignDetails.arrival.message).not.toMatch(/this is where you can follow progress/i);
    expect(studioBoard.campaignDetails.backLabel).toBe("Back to Studio Board");
  });

  it("wires Board hierarchy: Next Action before submitted-details, without prominent Record CTA", () => {
    const sceneSource = readFileSync(
      resolve(process.cwd(), "src/components/studio-board/StudioBoardScene.tsx"),
      "utf8",
    );
    const nextActionIndex = sceneSource.indexOf("<CampaignNextAction");
    const briefActionsIndex = sceneSource.indexOf("<CampaignBriefActions");
    expect(nextActionIndex).toBeGreaterThan(-1);
    expect(briefActionsIndex).toBeGreaterThan(-1);
    expect(nextActionIndex).toBeLessThan(briefActionsIndex);
    expect(sceneSource).not.toMatch(/<CampaignBriefActions[\s\S]*?\n\s*prominent\b/);

    const briefSource = readFileSync(
      resolve(process.cwd(), "src/components/campaign-details/CampaignBriefActions.tsx"),
      "utf8",
    );
    expect(briefSource).toContain("campaignBrief.openRecordLabel");
    expect(briefSource).toContain("utility-btn--secondary");
  });

  it("preserves Package 1b incomplete-intake primary CTA copy", () => {
    expect(studioBoard.nextAction.completeProjectDetails).toBe("Complete Project Intake");
    expect(studioBoard.nextAction.waitingOnProjectIntakeLabel).toBe("Waiting on Project Intake");
  });

  it("preserves Record drawer deep-link compatibility surface", () => {
    const drawerSource = readFileSync(
      resolve(process.cwd(), "src/components/studio-board/CampaignRecordDrawer.tsx"),
      "utf8",
    );
    expect(drawerSource).toContain("?record=open");
    expect(drawerSource).toContain("/campaign-details");
  });
});
