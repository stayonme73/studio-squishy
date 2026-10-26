import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { CLIP_REPURPOSING_PUBLISH_DRAFT } from "@/catalog/v2/clip-repurposing-publish";
import { STUDIO_549_CLIP_VIDEO_QUALITY_ACCEPTED_IDS } from "@/config/studio-549-clip-repurposing-build-v1";
import { studio549ClipRepurposingValueDeliveryV1 as value } from "@/config/studio-549-clip-repurposing-value-delivery-v1";
import { studioFinalDeliveryRoomV1 as room } from "@/config/studio-final-delivery-room-v1";

import { clip549CustomerShortFileName, clip549FinalRoomProof } from "./content";

const REPO = path.resolve(__dirname, "../../..");

describe("STUDIO-FINAL-DELIVERY-ROOM-1", () => {
  it("proves Clip first and does not replace live Final Delivery", () => {
    expect(room.proofRoute).toBe("/final-delivery-room");
    expect(room.doNotReplaceLiveDeliverables).toBe(true);
    expect(room.doNotRedrawPlate).toBe(true);
    expect(room.doNotPolishTanPage).toBe(true);
    expect(room.doNotRebuildAcceptedContent).toBe(true);
    expect(room.classification).toBe("B_READY_WITH_EXPLICIT_LIMITS");
    expect(room.ownerAcceptedMobileVisual).toBe(true);
    expect(room.sectionClosed).toBe(true);
    expect(room.unpublishedProofRoute).toBe(true);
    expect(value.doNotPolishTanPage).toBe(true);
    expect(CLIP_REPURPOSING_PUBLISH_DRAFT.includedDeliverables[0]?.quantity).toBe(3);
    const live = readFileSync(
      path.join(REPO, "src/app/(studio)/deliverables/page.tsx"),
      "utf8",
    );
    expect(live).toContain("redirect(buildDeliverablesCompatibilityRedirectPath");
    expect(live).not.toContain("FinalDeliveryRoom");
  });

  it("reuses the accepted $549 content without rewriting the shorts", () => {
    expect(clip549FinalRoomProof.shorts.map((short) => short.clipId)).toEqual([
      ...STUDIO_549_CLIP_VIDEO_QUALITY_ACCEPTED_IDS,
    ]);
    expect(clip549FinalRoomProof.shorts).toHaveLength(5);
    expect(clip549FinalRoomProof.groups.map((group) => group.id)).toEqual([
      "studio",
      "videos",
      "captions",
      "titles",
      "hashtags",
      "guide",
      "support",
      "pathway",
    ]);
    expect(clip549FinalRoomProof.studioCard.title).toBe("Thank you");
    expect(clip549FinalRoomProof.studioCard.helpHref).toBe(
      "/help-center?from=final-delivery-room",
    );
    expect(clip549FinalRoomProof.studioCard.thanks[0]).toMatch(/Thank you/i);
    expect(clip549FinalRoomProof.studioCard.contact.join(" ")).not.toMatch(/@/);
    expect(clip549FinalRoomProof.studioCard.feedback.join(" ")).toMatch(/not a new Review Room/i);
    expect(clip549FinalRoomProof.shorts[0]!.caption).toContain("bigger menu");
    expect(clip549FinalRoomProof.pathway.closing).toMatch(/new Clip Repurposing order/);
    expect(clip549FinalRoomProof.pathway.services.map((service) => service.name)).toEqual([
      "Short-Form Video Editing",
      "Social & Promo Graphics",
    ]);
    expect(JSON.stringify(clip549FinalRoomProof.pathway)).not.toMatch(
      /Short-Form Content Pack|Make My|Email Campaign Kit|Text Message Campaign Kit|\$\d/,
    );
  });

  it("keeps certification language out of the customer-facing room", () => {
    const roomUi = readFileSync(
      path.join(REPO, "src/components/studio-final-delivery-room/FinalDeliveryRoom.tsx"),
      "utf8",
    );
    expect(roomUi).not.toContain("Owner-accepted certification set");
    expect(roomUi).not.toContain("CERT-CLIP-549-VALUE-1");
    expect(roomUi).toContain("customerFacing");
    expect(clip549FinalRoomProof.customerFacing.serviceName).toBe("Clip Repurposing");
  });

  it("keeps the consistency pass on three type sizes, white, gray, and a deeper accent", () => {
    const css = readFileSync(
      path.join(REPO, "src/components/studio-final-delivery-room/final-delivery-room.css"),
      "utf8",
    );
    expect(css).toContain("top: 54.0vh");
    expect(css).toContain("top: 29.63vw");
    expect(css).toContain("--fdr-title: 20px");
    expect(css).toContain("--fdr-sub: 18px");
    expect(css).toContain("--fdr-body: 16px");
    expect(css).toContain("#c5cad1");
    expect(css).toContain("#f0d08a");
    expect(css).not.toContain("#8ff5c6");
    expect(css).not.toContain("#bfd8f2");
    expect(css).not.toContain("font-size: 26px");
    expect(css).not.toContain("font-size: 22px");
    expect(css).toContain(".fdr__open");
    expect(css).toMatch(/\.fdr__open[\s\S]*font-size: 14px/);
    expect(css).toContain(".fdr[data-box-fit] .fdr__stage");
    expect(css).not.toContain("top: 58.4vh");
  });

  it("keeps Tags to the terms only and hides Previous on page one", () => {
    const roomUi = readFileSync(
      path.join(REPO, "src/components/studio-final-delivery-room/FinalDeliveryRoom.tsx"),
      "utf8",
    );
    expect(roomUi).not.toContain("These are suggested descriptive terms");
    expect(roomUi).not.toContain("do not promise reach");
    expect(roomUi).toContain("index > 0");
    expect(roomUi).toContain("Suggested tags");
  });

  it("keeps Help Center from abandoning delivery and names files for customers", () => {
    const roomUi = readFileSync(
      path.join(REPO, "src/components/studio-final-delivery-room/FinalDeliveryRoom.tsx"),
      "utf8",
    );
    expect(roomUi).toContain('target="_blank"');
    expect(roomUi).toContain("rememberFinalDeliveryHelpReturn");
    expect(roomUi).toContain('href="/studio-lobby"');
    expect(roomUi).toContain(">Lobby<");
    expect(roomUi).toContain("studio-holo-plate-1");
    expect(roomUi).toContain("proof.studioCard.boardLabel");
    expect(roomUi).toContain("download={short.downloadName}");
    expect(roomUi).toContain("shortIndex > 0");
    expect(roomUi).toContain("fdr__scrim");
    expect(roomUi).toContain("fdr__copy");
    expect(roomUi).not.toContain("Previous categories");
    expect(clip549FinalRoomProof.shorts[0]!.fileName).toBe("01-c-56-423.mp4");
    expect(clip549FinalRoomProof.shorts[0]!.downloadName).toBe("Clip-Repurposing-Short-01.mp4");
    expect(clip549FinalRoomProof.companionOrder).toEqual([
      clip549CustomerShortFileName(0),
      clip549CustomerShortFileName(1),
      clip549CustomerShortFileName(2),
      clip549CustomerShortFileName(3),
      clip549CustomerShortFileName(4),
    ]);
    expect(clip549FinalRoomProof.studioCard.boardHref).toBe("/studio-board");
    expect(clip549FinalRoomProof.studioCard.websiteHref).toBe("https://thestudiocompany7.com");
    expect(clip549FinalRoomProof.revision.join(" ")).not.toMatch(/01-c-56-423/);
  });
});
