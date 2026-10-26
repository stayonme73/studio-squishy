import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { customerVisibilityContinuityV1 } from "@/config/customer-visibility-continuity-v1";
import { PROJECT_INTAKE_RECEIVED_LEAD } from "@/lib/post-submit-customer-signals";
import { DISCOVERY_COMPLETE_LEAD } from "@/lib/studio-board-next-action";
import {
  isCeremonialNextActionLead,
  isCeremonialNextUpdate,
  isDuplicateStatusAndStage,
  isDuplicateStatusNextStep,
  isEmptyStatusRisk,
  isRepeatedRecoveryCopy,
} from "@/lib/studio-board/board-status-mobile-presentation";

describe("board status mobile presentation", () => {
  it("treats matching next-step and studio-working copy as a phone duplicate", () => {
    expect(
      isDuplicateStatusNextStep(PROJECT_INTAKE_RECEIVED_LEAD, PROJECT_INTAKE_RECEIVED_LEAD),
    ).toBe(true);
    expect(isDuplicateStatusNextStep("Finish Project Intake", PROJECT_INTAKE_RECEIVED_LEAD)).toBe(
      false,
    );
  });

  it("treats the payment-ready paragraph as one leftover story", () => {
    const lead =
      "Your payment is confirmed. The Studio is still getting your project ready. This usually finishes on its own.";
    const next = `${lead} You do not need to pay again.`;
    expect(isDuplicateStatusNextStep(next, lead)).toBe(true);
    expect(isRepeatedRecoveryCopy(lead)).toBe(true);
    expect(isRepeatedRecoveryCopy("Finish Project Intake first.")).toBe(false);
  });

  it("treats the empty risk line as ceremonial phone copy", () => {
    expect(isEmptyStatusRisk(customerVisibilityContinuityV1.empty.noRisk)).toBe(true);
    expect(isEmptyStatusRisk("Required materials are still needed before work can continue.")).toBe(
      false,
    );
  });

  it("treats locked post-intake and discovery leads as ceremonial next-action copy", () => {
    expect(isCeremonialNextActionLead(PROJECT_INTAKE_RECEIVED_LEAD)).toBe(true);
    expect(isCeremonialNextActionLead(DISCOVERY_COMPLETE_LEAD)).toBe(true);
    expect(isCeremonialNextActionLead("Please finish Project Intake.")).toBe(false);
  });

  it("treats matching current-status and project-stage labels as a phone duplicate", () => {
    expect(isDuplicateStatusAndStage("Project Intake Received", "Project Intake Received")).toBe(
      true,
    );
    expect(isDuplicateStatusAndStage("Project Intake Received", "Preparing Next Stage")).toBe(
      false,
    );
  });

  it("treats the generic next-update placeholder as ceremonial phone copy", () => {
    expect(isCeremonialNextUpdate("When the next project update is ready")).toBe(true);
    expect(isCeremonialNextUpdate("Tuesday, September 15")).toBe(false);
  });

  it("uses phone-only hide classes without restyling Materials", () => {
    const surfaces = readFileSync(
      join(process.cwd(), "src/app/mobile-customer-spine-surfaces.css"),
      "utf8",
    );
    expect(surfaces).toContain(".sb-card--project-communication");
    expect(surfaces).toContain(".sb-card--refund-request");
    expect(surfaces).toContain(".sb-card--project-snapshot");
    expect(surfaces).toContain(".sb-status-copy-repeat");
    expect(surfaces).toContain(".sb-card--current");
    expect(surfaces).toContain(".sb-materials-glance");
  });
});
