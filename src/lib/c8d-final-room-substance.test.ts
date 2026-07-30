import { describe, expect, it } from "vitest";

import {
  resolveFinalJobFocus,
  resolveFinalRoomSubstance,
} from "@/lib/c8d-final-room-substance";
import type { FinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import type { ClientStagesJobItem } from "@/lib/review-delivery-stage/build-client-stages";

function jobA(overrides: Partial<ClientStagesJobItem> = {}): ClientStagesJobItem {
  return {
    jobId: "job-a",
    serviceName: "Social Media Launch Set",
    stageId: "approved-for-final-delivery",
    label: "Approved for Final Delivery",
    explanation: "This work is approved and the Studio is preparing final delivery.",
    actionOwner: "studio",
    blocksCampaignCustomerAction: false,
    terminal: false,
    ...overrides,
  };
}

function jobB(overrides: Partial<ClientStagesJobItem> = {}): ClientStagesJobItem {
  return {
    jobId: "job-b",
    serviceName: "Brand Kit",
    stageId: "final-delivery",
    label: "Final Delivery",
    explanation: "This work has been delivered.",
    actionOwner: "complete",
    blocksCampaignCustomerAction: false,
    terminal: true,
    ...overrides,
  };
}

function deliveryWithJobs(
  jobs: FinalDeliveryView["jobs"],
  state: FinalDeliveryView["state"] = "ready",
): FinalDeliveryView {
  return {
    state,
    campaignName: "Test",
    jobs,
    hasDeliveredJobs: jobs.some((j) => j.spineStatus === "delivered"),
    allJobsDelivered: jobs.length > 0 && jobs.every((j) => j.spineStatus === "delivered"),
  };
}

const releasedFile = (id: string, versionLabel: string | null = "Proof v2") => ({
  id,
  deliverableLabel: "Files",
  fileName: `${id}.zip`,
  fileType: "zip",
  url: `/api/file-room/files/${id}/download`,
  useInstructions: null,
  addedAt: "2026-07-10T00:00:00.000Z",
  versionLabel,
  releasedAt: "2026-07-10T00:00:00.000Z",
});

const preparingEmpty = deliveryWithJobs([], "preparing");

describe("resolveFinalJobFocus", () => {
  it("matches an authorized requested jobId", () => {
    const result = resolveFinalJobFocus([jobA(), jobB()], "job-a");
    expect(result.focused?.jobId).toBe("job-a");
    expect(result.requestedJobUnavailable).toBe(false);
  });

  it("does not silently substitute another job for a stale requested jobId", () => {
    const result = resolveFinalJobFocus([jobA(), jobB()], "job-missing");
    expect(result.focused).toBeNull();
    expect(result.requestedJobUnavailable).toBe(true);
  });
});

describe("resolveFinalRoomSubstance — focused-job delivery truth", () => {
  it("marks focused Job A available when Job A has released files", () => {
    const substance = resolveFinalRoomSubstance({
      requestedJobId: "job-a",
      stages: {
        status: "ready",
        summary: {
          summaryId: "approved-for-final-delivery",
          label: "Approved for Final Delivery",
          explanation: "Preparing.",
        },
        jobs: [jobA(), jobB()],
      },
      delivery: {
        status: "ready",
        delivery: deliveryWithJobs([
          {
            jobId: "job-a",
            serviceName: "Social Media Launch Set",
            spineStatus: "delivered",
            deliveredAt: "2026-07-10T00:00:00.000Z",
            completedDeliverables: ["Posts"],
            files: [releasedFile("a1", "Proof A")],
          },
        ]),
      },
    });

    expect(substance.deliveryAvailability.kind).toBe("available");
    expect(substance.deliveryAvailability.message).toMatch(/for this work/i);
    expect(substance.openDelivery.emphasize).toBe(true);
    expect(substance.workReference.versionLabel).toBe("Proof A");
  });

  it("distinguishes Job B released files from focused Job A with none", () => {
    const substance = resolveFinalRoomSubstance({
      requestedJobId: "job-a",
      stages: {
        status: "ready",
        summary: {
          summaryId: "approved-for-final-delivery",
          label: "Approved for Final Delivery",
          explanation: "Preparing.",
        },
        jobs: [jobA(), jobB()],
      },
      delivery: {
        status: "ready",
        delivery: deliveryWithJobs([
          {
            jobId: "job-b",
            serviceName: "Brand Kit",
            spineStatus: "delivered",
            deliveredAt: "2026-07-10T00:00:00.000Z",
            completedDeliverables: ["Kit"],
            files: [releasedFile("b1", "Proof B")],
          },
        ]),
      },
    });

    expect(substance.focusedJobId).toBe("job-a");
    expect(substance.workReference.serviceName).toBe("Social Media Launch Set");
    expect(substance.deliveryAvailability.kind).toBe("available_other");
    expect(substance.deliveryAvailability.message).toMatch(/Other project files/i);
    expect(substance.deliveryAvailability.message).toMatch(/this work are not yet released/i);
    expect(substance.openDelivery.emphasize).toBe(false);
    expect(substance.workReference.versionLabel).toBeNull();
  });

  it("uses focused preparing language when neither focused nor other jobs have files", () => {
    const substance = resolveFinalRoomSubstance({
      requestedJobId: "job-a",
      stages: {
        status: "ready",
        summary: {
          summaryId: "approved-for-final-delivery",
          label: "Approved for Final Delivery",
          explanation: "Preparing.",
        },
        jobs: [jobA()],
      },
      delivery: { status: "ready", delivery: preparingEmpty },
    });

    expect(substance.deliveryAvailability.kind).toBe("preparing");
    expect(substance.deliveryAvailability.message).toMatch(/for this work/i);
    expect(substance.deliveryAvailability.message).not.toMatch(/Other project/i);
  });

  it("uses campaign-level available language when no focused job and files exist", () => {
    const substance = resolveFinalRoomSubstance({
      stages: {
        status: "ready",
        summary: {
          summaryId: "final-delivery",
          label: "Final Delivery",
          explanation: "Delivered.",
        },
        jobs: [],
      },
      delivery: {
        status: "ready",
        delivery: deliveryWithJobs([
          {
            jobId: "job-b",
            serviceName: "Brand Kit",
            spineStatus: "delivered",
            deliveredAt: "2026-07-10T00:00:00.000Z",
            completedDeliverables: ["Kit"],
            files: [releasedFile("b1")],
          },
        ]),
      },
    });

    expect(substance.focusedJobId).toBeNull();
    expect(substance.deliveryAvailability.kind).toBe("available");
    expect(substance.deliveryAvailability.message).toMatch(/project files/i);
  });

  it("never borrows a version label from another job", () => {
    const substance = resolveFinalRoomSubstance({
      requestedJobId: "job-a",
      stages: {
        status: "ready",
        summary: {
          summaryId: "approved-for-final-delivery",
          label: "Approved for Final Delivery",
          explanation: "Preparing.",
        },
        jobs: [jobA(), jobB()],
      },
      delivery: {
        status: "ready",
        delivery: deliveryWithJobs([
          {
            jobId: "job-b",
            serviceName: "Brand Kit",
            spineStatus: "delivered",
            deliveredAt: "2026-07-10T00:00:00.000Z",
            completedDeliverables: ["Kit"],
            files: [releasedFile("b1", "Proof B Only")],
          },
        ]),
      },
    });

    expect(substance.workReference.versionLabel).toBeNull();
    expect(substance.workReference.detail).not.toContain("Proof B Only");
  });

  it("does not silently relabel another job when requested jobId is stale", () => {
    const substance = resolveFinalRoomSubstance({
      requestedJobId: "job-stale",
      stages: {
        status: "ready",
        summary: {
          summaryId: "approved-for-final-delivery",
          label: "Approved for Final Delivery",
          explanation: "Campaign-level Final explanation.",
        },
        jobs: [jobA(), jobB()],
      },
      delivery: {
        status: "ready",
        delivery: deliveryWithJobs([
          {
            jobId: "job-b",
            serviceName: "Brand Kit",
            spineStatus: "delivered",
            deliveredAt: "2026-07-10T00:00:00.000Z",
            completedDeliverables: ["Kit"],
            files: [releasedFile("b1", "Proof B")],
          },
        ]),
      },
    });

    expect(substance.requestedJobUnavailable).toBe(true);
    expect(substance.focusedJobId).toBeNull();
    expect(substance.workReference.serviceName).toBeNull();
    expect(substance.workReference.detail).toMatch(/not available for Final/i);
    expect(substance.heading).toBe("Approved for Final Delivery");
    expect(substance.statusExplanation).toBe("Campaign-level Final explanation.");
    // Campaign-level availability — Job B files exist, but not claimed as focused work.
    expect(substance.deliveryAvailability.kind).toBe("available");
    expect(substance.deliveryAvailability.message).toMatch(/project files/i);
    expect(substance.workReference.versionLabel).toBeNull();
  });

  it("keeps loading and error delivery states truthful", () => {
    const loading = resolveFinalRoomSubstance({
      stages: { status: "unavailable" },
      delivery: { status: "loading" },
    });
    expect(loading.deliveryAvailability.kind).toBe("loading");
    expect(loading.openDelivery.enabled).toBe(false);

    const errored = resolveFinalRoomSubstance({
      stages: {
        status: "ready",
        summary: {
          summaryId: "approved-for-final-delivery",
          label: "Approved for Final Delivery",
          explanation: "Preparing.",
        },
        jobs: [jobA()],
      },
      delivery: { status: "error" },
    });
    expect(errored.deliveryAvailability.kind).toBe("error");
    expect(errored.openDelivery.enabled).toBe(true);
  });

  it("preserves Studio-owned no-action language for focused Final prep", () => {
    const substance = resolveFinalRoomSubstance({
      requestedJobId: "job-a",
      stages: {
        status: "ready",
        summary: {
          summaryId: "approved-for-final-delivery",
          label: "Approved for Final Delivery",
          explanation: "Preparing.",
        },
        jobs: [jobA()],
      },
      delivery: { status: "ready", delivery: preparingEmpty },
    });
    expect(substance.customerAction.kind).toBe("none_required");
    expect(substance.whatHappensNext.body).not.toMatch(/soon|tomorrow|\d+%/i);
  });
});
