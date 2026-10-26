import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { studioClipRepurposingLiveDeliveryWiringV1 as wiring } from "@/config/studio-clip-repurposing-live-delivery-wiring-v1";
import { studioFinalDeliveryRoomV1 as room } from "@/config/studio-final-delivery-room-v1";
import type { ClientJobDeliveryView, FinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import { buildJobId } from "@/lib/job-control/lane-map";
import { clip549FinalRoomProof } from "@/lib/studio-final-delivery-room/content";

import {
  buildClipLiveRoomProof,
  isClipLiveDeliveryCandidate,
  resolveClipLiveDelivery,
  selectClipDeliveryJob,
} from "./resolve";

const REPO = path.resolve(__dirname, "../../..");

function campaign(input: {
  campaignId: string;
  campaignName: string;
  ctaText: string;
  services?: readonly string[];
}) {
  return {
    campaignId: input.campaignId,
    campaignName: input.campaignName,
    approvedStudioPlan: {
      selectedServiceIds: input.services ?? [CLIP_REPURPOSING_SKU],
    },
    routeMapContext: { jobId: CLIP_REPURPOSING_SKU },
    routeMapIntake: {
      answers: { ctaText: input.ctaText },
    },
  };
}

function clipJob(
  campaignId: string,
  files: readonly { fileName: string; url: string; deliverableLabel?: string }[],
): ClientJobDeliveryView {
  return {
    jobId: buildJobId(campaignId, CLIP_REPURPOSING_SKU),
    serviceName: "Clip Repurposing",
    spineStatus: "delivered",
    deliveredAt: "2026-10-02T16:00:00.000Z",
    completedDeliverables: ["Finished vertical shorts"],
    files: files.map((file, index) => ({
      id: `${campaignId}-file-${index + 1}`,
      deliverableLabel:
        file.deliverableLabel ?? `Clip ${index + 1} — 1080×1920 MP4`,
      fileName: file.fileName,
      fileType: "video/mp4",
      url: file.url,
      useInstructions: null,
      addedAt: "2026-10-02T16:00:00.000Z",
      versionLabel: "Set version 1",
      releasedAt: "2026-10-02T16:00:00.000Z",
    })),
  };
}

function deliveryView(jobs: readonly ClientJobDeliveryView[]): FinalDeliveryView {
  return {
    state: "ready",
    campaignName: "unused-view-name",
    jobs,
    hasDeliveredJobs: true,
    allJobsDelivered: true,
  };
}

const spoken = [
  "Keep the menu small so the work stays finished and clear.",
  "A customer paying real money should feel the work is finished.",
  "Simple placement can make the whole page feel calm and usable.",
];

describe("STUDIO-CLIP-REPURPOSING-LIVE-DELIVERY-WIRING-1", () => {
  it("keeps the proof route unpublished and does not import the room into /deliverables", () => {
    expect(wiring.skuId).toBe(CLIP_REPURPOSING_SKU);
    expect(wiring.doNotReplaceLiveDeliverablesGlobally).toBe(true);
    expect(wiring.doNotPublishClip).toBe(true);
    expect(room.proofRoute).toBe("/final-delivery-room");
    expect(room.unpublishedProofRoute).toBe(true);
    expect(room.sectionClosed).toBe(true);
    expect(room.ownerAcceptedMobileVisual).toBe(true);
    const live = readFileSync(
      path.join(REPO, "src/app/(studio)/deliverables/page.tsx"),
      "utf8",
    );
    expect(live).toContain("redirect(buildDeliverablesCompatibilityRedirectPath");
    expect(live).not.toContain("FinalDeliveryRoom");
    expect(clip549FinalRoomProof.customerFacing.customerName).toBe("The Studio Company");
  });

  it("opens only this campaign's Clip job and refuses other projects", () => {
    const a = campaign({
      campaignId: "camp-harbor",
      campaignName: "Harbor Oak",
      ctaText: "Visit harbor oak tonight",
    });
    const b = campaign({
      campaignId: "camp-salt",
      campaignName: "Salt Cedar",
      ctaText: "Start at salt cedar",
    });
    expect(isClipLiveDeliveryCandidate(a, buildJobId("camp-harbor", CLIP_REPURPOSING_SKU))).toBe(
      true,
    );
    expect(isClipLiveDeliveryCandidate(a, buildJobId("camp-salt", CLIP_REPURPOSING_SKU))).toBe(
      false,
    );
    expect(
      isClipLiveDeliveryCandidate(
        { ...a, approvedStudioPlan: { selectedServiceIds: ["v2-rtu-flyer"] } },
        "camp-harbor:v2-rtu-flyer",
      ),
    ).toBe(false);

    const stolen = selectClipDeliveryJob({
      campaignId: "camp-harbor",
      requestedJobId: buildJobId("camp-salt", CLIP_REPURPOSING_SKU),
      jobs: [
        clipJob("camp-salt", [
          { fileName: "salt-1.mp4", url: "/files/salt-1" },
          { fileName: "salt-2.mp4", url: "/files/salt-2" },
          { fileName: "salt-3.mp4", url: "/files/salt-3" },
        ]),
      ],
    });
    expect(stolen).toBeNull();
    void b;
  });

  it("builds this order's room and does not leak the cert-set or another project", () => {
    const harbor = resolveClipLiveDelivery({
      campaign: campaign({
        campaignId: "camp-harbor",
        campaignName: "Harbor Oak",
        ctaText: "Visit harbor oak tonight",
      }),
      requestedJobId: buildJobId("camp-harbor", CLIP_REPURPOSING_SKU),
      spokenIdeas: spoken,
      delivery: deliveryView([
        clipJob("camp-harbor", [
          { fileName: "harbor-1.mp4", url: "/api/files/harbor-1" },
          { fileName: "harbor-2.mp4", url: "/api/files/harbor-2" },
          { fileName: "harbor-3.mp4", url: "/api/files/harbor-3" },
        ]),
        {
          jobId: "camp-harbor:v2-rtu-flyer",
          serviceName: "Flyer",
          spineStatus: "delivered",
          deliveredAt: "2026-10-02T16:00:00.000Z",
          completedDeliverables: ["Print-ready PDF"],
          files: [
            {
              id: "flyer-1",
              deliverableLabel: "Print-ready PDF",
              fileName: "flyer.pdf",
              fileType: "application/pdf",
              url: "/api/files/flyer",
              useInstructions: null,
              addedAt: "2026-10-02T16:00:00.000Z",
              versionLabel: null,
              releasedAt: "2026-10-02T16:00:00.000Z",
            },
          ],
        },
      ]),
    });
    const cedar = resolveClipLiveDelivery({
      campaign: campaign({
        campaignId: "camp-salt",
        campaignName: "Salt Cedar",
        ctaText: "Start at salt cedar",
      }),
      spokenIdeas: [
        "Salt air should feel finished when the sign is simple.",
        "Guests need a clear next step from the first line.",
        "Keep the words short so the short stays readable.",
      ],
      delivery: deliveryView([
        clipJob("camp-salt", [
          { fileName: "cedar-1.mp4", url: "/api/files/cedar-1" },
          { fileName: "cedar-2.mp4", url: "/api/files/cedar-2" },
          { fileName: "cedar-3.mp4", url: "/api/files/cedar-3" },
        ]),
      ]),
    });

    expect(harbor.kind).toBe("ready");
    expect(cedar.kind).toBe("ready");
    if (harbor.kind !== "ready" || cedar.kind !== "ready") return;

    expect(harbor.campaignId).toBe("camp-harbor");
    expect(harbor.proof.customerFacing.customerName).toBe("Harbor Oak");
    expect(harbor.proof.studioCard.thanks.join(" ")).toContain("Harbor Oak");
    expect(harbor.proof.shorts.map((short) => short.src)).toEqual([
      "/api/files/harbor-1",
      "/api/files/harbor-2",
      "/api/files/harbor-3",
    ]);
    expect(harbor.proof.shorts.map((short) => short.downloadName)).toEqual([
      "Clip-Repurposing-Short-01.mp4",
      "Clip-Repurposing-Short-02.mp4",
      "Clip-Repurposing-Short-03.mp4",
    ]);
    const doorCta = resolveClipLiveDelivery({
      campaign: {
        ...campaign({
          campaignId: "camp-door",
          campaignName: "Door Co",
          ctaText: "",
        }),
        routeMapIntake: {
          answers: { "clip_repurposing:cta": "Visit the business site." },
        },
      },
      spokenIdeas: spoken,
      delivery: deliveryView([
        clipJob("camp-door", [
          { fileName: "door-1.mp4", url: "/api/files/door-1" },
          { fileName: "door-2.mp4", url: "/api/files/door-2" },
          { fileName: "door-3.mp4", url: "/api/files/door-3" },
        ]),
      ]),
    });
    expect(doorCta.kind).toBe("ready");
    if (doorCta.kind === "ready") {
      expect(doorCta.proof.shorts[0]!.caption).toContain("Visit the business site.");
      expect(JSON.stringify(doorCta.proof)).not.toMatch(/\$549/);
    }

    expect(harbor.proof.shorts[0]!.caption).toContain("Visit harbor oak tonight");
    expect(harbor.proof.shorts[0]!.caption).not.toContain("bigger menu");
    expect(harbor.proof.studioCard.helpHref).toBe("/help-center?from=deliverables");
    expect(harbor.proof.studioCard.boardHref).toBe("/studio-board");
    expect(harbor.proof.revision[0]).toMatch(/three revision rounds/);
    expect(harbor.proof.studioCard.thanks.join(" ")).toMatch(
      /Three revision rounds are included/,
    );
    expect(harbor.proof.pathway.services.map((service) => service.name)).toEqual([
      "Short-Form Video Editing",
      "Social & Promo Graphics",
    ]);
    expect(harbor.proof.pathway.services.every((service) => service.priceLabel === "")).toBe(
      true,
    );
    expect(JSON.stringify(harbor.proof)).not.toMatch(
      /Short-Form Content Pack|Make My Social Media Posts|Make My Campaign Graphics|Email Campaign Kit|Text Message Campaign Kit|\$349|\$99|\$79|\$129|\$69|\$549/,
    );
    expect(harbor.proof.revision.join(" ")).not.toMatch(/01-c-56-423|c-56-423/);
    expect(harbor.proof.pathway.closing).toMatch(/new Clip Repurposing order/);
    expect(harbor.proof.pathway.closing).not.toMatch(/Ad Creative|Local Visibility/);
    expect(harbor.proof.groups.map((group) => group.id)).toEqual([
      "studio",
      "videos",
      "captions",
      "titles",
      "hashtags",
      "guide",
      "support",
      "pathway",
    ]);

    expect(cedar.proof.customerFacing.customerName).toBe("Salt Cedar");
    expect(cedar.proof.shorts[0]!.src).toBe("/api/files/cedar-1");
    expect(cedar.proof.shorts[0]!.src).not.toBe(harbor.proof.shorts[0]!.src);
    expect(cedar.proof.shorts[0]!.caption).not.toBe(harbor.proof.shorts[0]!.caption);
    expect(JSON.stringify(harbor.proof)).not.toContain("/api/files/cedar-1");
    expect(JSON.stringify(cedar.proof)).not.toContain("/api/files/harbor-1");
    expect(JSON.stringify(harbor.proof)).not.toContain("The Studio Company");
    expect(JSON.stringify(harbor.proof)).not.toContain("/final-delivery-room/shorts/");
  });

  it("leaves flyer and incomplete Clip jobs on the existing delivery path", () => {
    const flyer = resolveClipLiveDelivery({
      campaign: campaign({
        campaignId: "camp-flyer",
        campaignName: "Flyer Shop",
        ctaText: "Call the shop",
        services: ["v2-rtu-flyer"],
      }),
      requestedJobId: "camp-flyer:v2-rtu-flyer",
      delivery: deliveryView([
        {
          jobId: "camp-flyer:v2-rtu-flyer",
          serviceName: "Flyer",
          spineStatus: "delivered",
          deliveredAt: "2026-10-02T16:00:00.000Z",
          completedDeliverables: ["Print-ready PDF"],
          files: [
            {
              id: "flyer-1",
              deliverableLabel: "Print-ready PDF",
              fileName: "flyer.pdf",
              fileType: "application/pdf",
              url: "/api/files/flyer",
              useInstructions: null,
              addedAt: "2026-10-02T16:00:00.000Z",
              versionLabel: null,
              releasedAt: "2026-10-02T16:00:00.000Z",
            },
          ],
        },
      ]),
    });
    expect(flyer.kind).toBe("not-clip");

    const preparing = resolveClipLiveDelivery({
      campaign: campaign({
        campaignId: "camp-harbor",
        campaignName: "Harbor Oak",
        ctaText: "Visit harbor oak tonight",
      }),
      delivery: { state: "preparing", campaignName: "Harbor Oak", jobs: [], hasDeliveredJobs: false, allJobsDelivered: false },
    });
    expect(preparing.kind).toBe("preparing");

    const twoFiles = resolveClipLiveDelivery({
      campaign: campaign({
        campaignId: "camp-harbor",
        campaignName: "Harbor Oak",
        ctaText: "Visit harbor oak tonight",
      }),
      spokenIdeas: spoken,
      delivery: deliveryView([
        clipJob("camp-harbor", [
          { fileName: "harbor-1.mp4", url: "/api/files/harbor-1" },
          { fileName: "harbor-2.mp4", url: "/api/files/harbor-2" },
        ]),
      ]),
    });
    expect(twoFiles.kind).toBe("legacy-files");

    const fromLabel = resolveClipLiveDelivery({
      campaign: campaign({
        campaignId: "camp-harbor",
        campaignName: "Harbor Oak",
        ctaText: "Visit harbor oak tonight",
      }),
      delivery: deliveryView([
        {
          ...clipJob("camp-harbor", [
            { fileName: "harbor-1.mp4", url: "/api/files/harbor-1" },
            { fileName: "harbor-2.mp4", url: "/api/files/harbor-2" },
            { fileName: "harbor-3.mp4", url: "/api/files/harbor-3" },
          ]),
          files: [
            {
              id: "h1",
              deliverableLabel: "Clip 1 — Keep the menu small so the work stays finished and clear.",
              fileName: "harbor-1.mp4",
              fileType: "video/mp4",
              url: "/api/files/harbor-1",
              useInstructions: null,
              addedAt: "2026-10-02T16:00:00.000Z",
              versionLabel: "Set version 1",
              releasedAt: "2026-10-02T16:00:00.000Z",
            },
            {
              id: "h2",
              deliverableLabel: "Clip 2 — A customer paying real money should feel the work is finished.",
              fileName: "harbor-2.mp4",
              fileType: "video/mp4",
              url: "/api/files/harbor-2",
              useInstructions: null,
              addedAt: "2026-10-02T16:00:00.000Z",
              versionLabel: "Set version 1",
              releasedAt: "2026-10-02T16:00:00.000Z",
            },
            {
              id: "h3",
              deliverableLabel: "Clip 3 — Simple placement can make the whole page feel calm and usable.",
              fileName: "harbor-3.mp4",
              fileType: "video/mp4",
              url: "/api/files/harbor-3",
              useInstructions: null,
              addedAt: "2026-10-02T16:00:00.000Z",
              versionLabel: "Set version 1",
              releasedAt: "2026-10-02T16:00:00.000Z",
            },
          ],
        },
      ]),
    });
    expect(fromLabel.kind).toBe("ready");

    const river = resolveClipLiveDelivery({
      campaign: campaign({
        campaignId: "camp-clip-full-cust-cert-20261002",
        campaignName: "River & Reed",
        ctaText: "Book a River & Reed table tonight",
      }),
      delivery: deliveryView([
        clipJob("camp-clip-full-cust-cert-20261002", [
          {
            fileName: "clip-repurposing-1.mp4",
            url: "/api/files/river-1",
            deliverableLabel:
              "Clip 1 — They think a bigger menu looks more impressive.",
          },
          {
            fileName: "clip-repurposing-2.mp4",
            url: "/api/files/river-2",
            deliverableLabel:
              "Clip 2 — If a customer is paying real money, it should feel finished.",
          },
          {
            fileName: "clip-repurposing-3.mp4",
            url: "/api/files/river-3",
            deliverableLabel:
              "Clip 3 — A button in the wrong place can make the whole page feel awkward.",
          },
        ]),
      ]),
    });
    expect(river.kind).toBe("ready");
    if (river.kind === "ready") {
      expect(river.proof.customerFacing.customerName).toBe("River & Reed");
      expect(river.proof.shorts[0]!.caption).toContain("bigger menu");
    }
    if (fromLabel.kind === "ready") {
      expect(fromLabel.proof.shorts[0]!.caption).toContain("Keep the menu small");
      expect(fromLabel.proof.shorts[0]!.caption).toContain("Visit harbor oak tonight");
    }

    const missingCta = buildClipLiveRoomProof({
      campaignId: "camp-harbor",
      campaignName: "Harbor Oak",
      ctaText: "",
      shorts: [
        { url: "/a", fileName: "a.mp4", spokenIdea: spoken[0] },
        { url: "/b", fileName: "b.mp4", spokenIdea: spoken[1] },
        { url: "/c", fileName: "c.mp4", spokenIdea: spoken[2] },
      ],
    });
    expect(missingCta.ok).toBe(true);
    if (missingCta.ok) {
      expect(missingCta.proof.identity.ctaText).toBe("");
      expect(missingCta.proof.shorts[0]!.caption).toBe(spoken[0]);
      expect(missingCta.proof.shorts[0]!.caption).not.toMatch(/book|visit|call/i);
    }
  });

  it("does not invent this delivery date when the job has no timestamp", () => {
    const built = buildClipLiveRoomProof({
      campaignId: "camp-harbor",
      campaignName: "Harbor Oak",
      ctaText: "Visit harbor oak tonight",
      shorts: [
        { url: "/a", fileName: "a.mp4", spokenIdea: spoken[0] },
        { url: "/b", fileName: "b.mp4", spokenIdea: spoken[1] },
        { url: "/c", fileName: "c.mp4", spokenIdea: spoken[2] },
      ],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.proof.studioCard.thanks.join(" ")).not.toMatch(/this delivery date/i);
    expect(built.proof.studioCard.thanks).toContain("This set is ready in Final Delivery.");
  });

  it("keeps Help and Board doors on the live customer path", () => {
    const scene = readFileSync(
      path.join(REPO, "src/components/feedback-studio/FeedbackStudioScene.tsx"),
      "utf8",
    );
    expect(scene).toContain("SharedFinalDeliveryGate");
    const host = readFileSync(
      path.join(REPO, "src/components/studio-final-delivery-room/SharedFinalDeliveryGate.tsx"),
      "utf8",
    );
    const unified = readFileSync(
      path.join(REPO, "src/components/feedback-studio/UnifiedRoomStateWorkspace.tsx"),
      "utf8",
    );
    expect(host).toContain("FinalDeliveryRoom");
    expect(host).toContain("fallback");
    expect(unified).toContain("DeliverablesScene");
  });
});
