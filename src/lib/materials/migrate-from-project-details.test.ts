import { describe, expect, it } from "vitest";

import { EMPTY_PROJECT_DETAILS_FORM } from "@/config/project-details";
import type { CampaignRecord } from "@/config/studio-board";

import { buildMaterialsRecordFromCampaign } from "./migrate-from-project-details";
import { countBlockingRequiredMaterials } from "./materials-view";

const now = "2026-06-01T12:00:00.000Z";

function buildCampaign(): CampaignRecord {
  return {
    campaignId: "migrate-test",
    campaignName: "Migrate Test",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "TBD",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    approvedStudioPlan: {
      selectedServiceIds: ["bf-001"],
      includedServiceIds: ["bf-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 50000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 50000,
      lineItems: [
        {
          skuId: "bf-001",
          serviceName: "Brand Foundation",
          billingType: "one_time",
          exactPriceCents: 50000,
          priceDisplay: "$500",
          deliverables: [],
          exclusions: [],
          timingWindowLabel: "2 weeks",
          revisionRule: "1 round",
          clientResponsibilities: ["Existing logo files if available"],
          executionResponsibility: "studio",
        },
      ],
      approvedAt: now,
    },
    projectDetailsSubmittedAt: now,
    projectDetails: {
      form: {
        ...EMPTY_PROJECT_DETAILS_FORM,
        workingOn: "Summer promo",
        destinationLink: "https://example.com/book",
      },
      files: [
        {
          id: "file-1",
          category: "logo",
          fileName: "logo.svg",
          mimeType: "image/svg+xml",
          sizeBytes: 1200,
          uploadedAt: now,
        },
      ],
      submittedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe("migrate-from-project-details", () => {
  it("seeds slots from approved plan and marks submitted project details files", () => {
    const record = buildMaterialsRecordFromCampaign(buildCampaign());

    expect(record.campaignId).toBe("migrate-test");
    expect(record.items.length).toBeGreaterThan(0);

    const logoItem = record.items.find(
      (item) => item.category === "logo-brand" && item.fileName === "logo.svg",
    );
    expect(logoItem?.reviewStatus).toBe("submitted");
    expect(logoItem?.uploadStatus).toBe("metadata_only");
    expect(logoItem?.submittedBy?.displayName).toContain("Project Details");
  });

  it("backfills destination link into url-link slot", () => {
    const record = buildMaterialsRecordFromCampaign(buildCampaign());
    const urlItem = record.items.find(
      (item) => item.category === "url-link" && item.url === "https://example.com/book",
    );
    expect(urlItem?.reviewStatus).toBe("submitted");
  });

  it("counts missing required slots as blocking", () => {
    const record = buildMaterialsRecordFromCampaign({
      ...buildCampaign(),
      projectDetails: undefined,
      projectDetailsSubmittedAt: undefined,
    });
    expect(countBlockingRequiredMaterials(record.items)).toBeGreaterThan(0);
  });
});
