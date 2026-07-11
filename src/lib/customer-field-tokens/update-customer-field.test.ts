import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";

import {
  preserveDirectApplyFieldsOnUpsert,
  readFieldToken,
  seedCustomerFieldTokensFromProjectDetails,
  updateCustomerField,
  withAuthorizedCustomerFieldWrite,
} from "./update-customer-field";

function recordWithDetails(form: Partial<typeof EMPTY_PROJECT_DETAILS_FORM>): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId: "camp-1",
    campaignName: "Test",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Test",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: now,
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: { ...EMPTY_PROJECT_DETAILS_FORM, ...form },
      files: [],
      submittedAt: now,
    },
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
  };
}

describe("updateCustomerField", () => {
  it("increments revision monotonically when the official field changes", () => {
    const base = seedCustomerFieldTokensFromProjectDetails(
      recordWithDetails({ primaryApproverEmail: "old@example.com" }),
    );

    const updated = updateCustomerField(base, "primary_approver_email", "new@example.com");
    const token = readFieldToken(updated, "primary_approver_email");

    expect(updated.projectDetails?.form.primaryApproverEmail).toBe("new@example.com");
    expect(token).toEqual({ revision: 2, valueFingerprint: "new@example.com" });
  });
});

describe("preserveDirectApplyFieldsOnUpsert", () => {
  it("blocks unauthorized changes to direct-apply fields", () => {
    const existing = seedCustomerFieldTokensFromProjectDetails(
      recordWithDetails({ primaryApproverEmail: "kept@example.com" }),
    );
    const incoming = recordWithDetails({ primaryApproverEmail: "hijack@example.com" });

    const merged = preserveDirectApplyFieldsOnUpsert(existing, incoming);
    expect(merged.projectDetails?.form.primaryApproverEmail).toBe("kept@example.com");
    expect(merged.customerFieldTokens).toEqual(existing.customerFieldTokens);
  });

  it("allows changes when authorized helper path is active", async () => {
    const existing = seedCustomerFieldTokensFromProjectDetails(
      recordWithDetails({ primaryApproverEmail: "kept@example.com" }),
    );
    const incoming = updateCustomerField(existing, "primary_approver_email", "applied@example.com");

    const merged = await withAuthorizedCustomerFieldWrite(async () =>
      preserveDirectApplyFieldsOnUpsert(existing, incoming),
    );
    expect(merged.projectDetails?.form.primaryApproverEmail).toBe("applied@example.com");
    expect(readFieldToken(merged, "primary_approver_email")?.revision).toBe(2);
  });
});
