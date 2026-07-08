import { describe, expect, it } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import {
  resolveDefaultClientWording,
  resolveFileRoomExceptionPromotionPanel,
} from "./exceptions-promotion-view";
import type { CampaignExceptionRecord } from "./exceptions-types";
import type { CampaignTaskItem } from "./types";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const producer: StudioUser = {
  id: "staff-producer",
  email: "producer@local.dev",
  displayName: "Producer",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-producer": ["campaign-1"] },
  staffCapabilities: { "staff-producer": ["producer_dispatcher"] },
};

const tasks: CampaignTaskItem[] = [
  {
    id: "sm-001:copy",
    title: "Copy draft",
    serviceName: "Social",
    familyId: "social",
    catalogFamilyId: "social_media",
    relatedServiceIds: ["sm-001"],
    phase: "copy",
    status: "blocked",
    dependsOn: [],
  },
];

const materials: CampaignMaterialItem[] = [
  {
    id: "logo-sm",
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "missing",
    contentKind: "file-metadata",
    label: "Logo slot",
    reason: "Social",
    relatedServiceIds: ["sm-001"],
    uploadStatus: "none",
  },
];

function exception(overrides: Partial<CampaignExceptionRecord> = {}): CampaignExceptionRecord {
  return {
    id: "exc-1",
    campaignId: "campaign-1",
    kind: "missing_client_fact",
    status: "waiting_owner",
    title: "Brand hex codes",
    description: "Internal QA note — not for client",
    createdAt: "2026-06-29T12:00:00.000Z",
    updatedAt: "2026-06-29T12:00:00.000Z",
    raisedByUserId: "staff-qa",
    raisedByDisplayName: "QA",
    raisedByRole: "qa",
    taskId: "sm-001:copy",
    ...overrides,
  };
}

describe("exceptions-promotion-view", () => {
  it("defaults client wording from materials config for missing_client_fact", () => {
    const wording = resolveDefaultClientWording(exception(), tasks, materials);
    expect(wording.category).toBe("factual-confirmation");
    expect(wording.clientFacingLabel).toBe("Factual confirmation");
    expect(wording.clientFacingPrompt).toContain("confirm");
    expect(wording.whyNeeded).toContain("color palette");
    expect(wording.whyNeeded.toLowerCase()).toContain("social");
    expect(wording.clientFacingLabel).not.toContain("QA");
  });

  it("derives whyNeeded from clientRequestDraft item and task service", () => {
    const wording = resolveDefaultClientWording(
      exception({
        kind: "client_request",
        clientRequestDraft: {
          exactClientOnlyItem: "Vector logo",
          whyBlocksWork: "Internal blocker — not for client",
        },
      }),
      tasks,
      materials,
    );
    expect(wording.clientFacingLabel).toBe("Vector logo");
    expect(wording.whyNeeded).toBe("We need vector logo to move forward on Social.");
    expect(wording.category).toBe("logo-brand");
  });

  it("shows owner approval panel for eligible missing_client_fact", () => {
    const panel = resolveFileRoomExceptionPromotionPanel(
      exception(),
      [],
      materials,
      tasks,
      owner,
      assignments,
    );
    expect(panel.showApprovalPanel).toBe(true);
    expect(panel.canApprove).toBe(true);
    expect(panel.slotPreview?.mode).toBe("create_ad_hoc");
  });

  it("allows owner approval from waiting_internal after hold", () => {
    const panel = resolveFileRoomExceptionPromotionPanel(
      exception({ status: "waiting_internal" }),
      [],
      materials,
      tasks,
      owner,
      assignments,
    );
    expect(panel.showApprovalPanel).toBe(true);
    expect(panel.canApprove).toBe(true);
  });

  it("hides approval controls for producer and shows read-only details", () => {
    const panel = resolveFileRoomExceptionPromotionPanel(
      exception(),
      [],
      materials,
      tasks,
      producer,
      assignments,
    );
    expect(panel.showApprovalPanel).toBe(false);
    expect(panel.showReadOnlyDetails).toBe(true);
    expect(panel.canApprove).toBe(false);
  });

  it("blocks approval after decline event", () => {
    const panel = resolveFileRoomExceptionPromotionPanel(
      exception({ status: "waiting_internal" }),
      [
        {
          id: "evt-1",
          exceptionId: "exc-1",
          campaignId: "campaign-1",
          createdAt: "2026-06-29T12:00:00.000Z",
          actorUserId: owner.id,
          actorDisplayName: owner.displayName,
          actorRole: "owner",
          action: "declined_promotion",
          statusAfter: "waiting_internal",
          notes: "Handle internally",
        },
      ],
      materials,
      tasks,
      owner,
      assignments,
    );
    expect(panel.promotionDeclined).toBe(true);
    expect(panel.showApprovalPanel).toBe(false);
    expect(panel.canApprove).toBe(false);
  });

  it("shows promoted summary when promotion exists", () => {
    const panel = resolveFileRoomExceptionPromotionPanel(
      exception({
        status: "waiting_client",
        promotion: {
          approvedAt: "2026-06-29T12:00:00.000Z",
          approvedByUserId: owner.id,
          approvedByDisplayName: owner.displayName,
          materialItemIds: ["logo-sm"],
          consolidatedRequestId: "factual-confirmation:confirmation",
          clientFacingLabel: "Brand colors",
          clientFacingPrompt: "Please confirm hex codes",
          whyNeeded: "Needed for copy",
          category: "factual-confirmation",
          contentKind: "confirmation",
          requirementLevel: "required",
        },
      }),
      [],
      materials,
      tasks,
      owner,
      assignments,
    );
    expect(panel.showPromotedSummary).toBe(true);
    expect(panel.promotedSummary?.clientFacingLabel).toBe("Brand colors");
  });

  it("does not show approval panel for non-promotable kinds", () => {
    const panel = resolveFileRoomExceptionPromotionPanel(
      exception({ kind: "compliance_hold" }),
      [],
      materials,
      tasks,
      owner,
      assignments,
    );
    expect(panel.showApprovalPanel).toBe(false);
    expect(panel.showReadOnlyDetails).toBe(false);
  });
});
