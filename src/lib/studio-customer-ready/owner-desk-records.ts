/**
 * Owner desk record projections.
 * Customer / project facts stay in the existing records.
 * The desk points at them. It does not keep a second customer pile.
 */

import { studioArea22aLiveRevisionProductionGateV1 } from "@/config/studio-area-22a-live-revision-production-gate-v1";
import { studioDemoVideo1OwnerConsoleV1 } from "@/config/studio-demo-video-1-owner-console-v1";
import { homepageWhatWeCreateSampleSetV1 } from "@/config/studio-homepage-what-we-create-sample-set-v1";
import { helpCenter } from "@/config/help-center";
import { studioPolicies } from "@/config/policies";
import { studioRoom4cScenario1CedarLaneV1 as cedarLane } from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";
import { studioRoom4cScenario2HarborRoastV1 as harborRoast } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";
import { studioRoom4cScenario3MossAndThreadV1 as mossThread } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";

export type OwnerDeskRecordKind = "project" | "policy" | "internal";

export type OwnerDeskRecord = {
  id: string;
  kind: OwnerDeskRecordKind;
  source: string;
  company: string;
  projectName: string;
  whatTheyWant: string;
  projectState: string;
  facts: string;
  studioAlreadyDid: string;
};

function policySummary(id: "refunds" | "revisions"): string {
  const item = helpCenter.quickPolicyGuide.rows.find((entry) => entry.id === id);
  return item?.summary ?? "";
}

function policyTitle(id: "refund-policy" | "revision-policy"): string {
  return (
    studioPolicies.policies.items.find((entry) => entry.id === id)?.title ?? id
  );
}

export const OWNER_DESK_RECORDS: Record<string, OwnerDeskRecord> = {
  [cedarLane.campaignId]: {
    id: cedarLane.campaignId,
    kind: "project",
    source: "src/config/studio-room-4c-scenario-1-cedar-lane-v1.ts",
    company: cedarLane.customer.businessName,
    projectName: cedarLane.offer.name,
    whatTheyWant: `${cedarLane.offer.description} Requested: ${cedarLane.requestedDeliverables
      .map((item) => item.output)
      .join("; ")}.`,
    projectState: "Room 4C Scenario 1 — CLOSED WITH EXPLICIT LIMITS",
    facts: `${cedarLane.customer.businessName}, ${cedarLane.customer.location}. ${cedarLane.offer.name}, ${cedarLane.offer.windowDisplay}. Phone and booking stay on the approved record.`,
    studioAlreadyDid:
      "Certified the Fall Closet Reset multi-service package. Did not invent a price. Refused carousel and unsupported sizes.",
  },
  [harborRoast.campaignId]: {
    id: harborRoast.campaignId,
    kind: "project",
    source: "src/config/studio-room-4c-scenario-2-harbor-roast-v1.ts",
    company: harborRoast.customer.businessName,
    projectName: harborRoast.offer.name,
    whatTheyWant: `${harborRoast.offer.description} ${harborRoast.offer.contentsDisplay}. ${harborRoast.offer.priceDisplay}. ${harborRoast.offer.windowDisplay}.`,
    projectState: "Room 4C Scenario 2 — CLOSED WITH EXPLICIT LIMITS",
    facts: `${harborRoast.customer.businessName}. ${harborRoast.offer.name} at ${harborRoast.offer.priceDisplay}. Product URL and support email stay on the authorized record.`,
    studioAlreadyDid:
      "Certified the Autumn Single-Origin Box package from the owner-authorized brief. Campaign direction is already bound.",
  },
  [mossThread.campaignId]: {
    id: mossThread.campaignId,
    kind: "project",
    source: "src/config/studio-room-4c-scenario-3-moss-and-thread-v1.ts",
    company: mossThread.customer.businessName,
    projectName: mossThread.offer.name,
    whatTheyWant: `${mossThread.offer.name} at ${mossThread.customer.businessName}, ${mossThread.customer.locationDisplay}. ${mossThread.offer.windowDisplay}.`,
    projectState: "Room 4C Scenario 3 — CLOSED WITH EXPLICIT LIMITS",
    facts: `${mossThread.customer.businessName} ${mossThread.offer.name}. Address, hours, and visit claim stay on the authorized record. No invented prices or extras.`,
    studioAlreadyDid:
      "Certified the Open Weekend package from the owner-authorized brief. Campaign direction is already bound.",
  },
  "area-22a-live-revision": {
    id: "area-22a-live-revision",
    kind: "project",
    source: "src/config/studio-area-22a-live-revision-production-gate-v1.ts",
    company: studioArea22aLiveRevisionProductionGateV1.proofCustomer.businessName,
    projectName: studioArea22aLiveRevisionProductionGateV1.proofCustomer.campaignName,
    whatTheyWant: studioArea22aLiveRevisionProductionGateV1.ownerSupersede,
    projectState: studioArea22aLiveRevisionProductionGateV1.status,
    facts: "Maya stays frozen. Do not remint her. Do not repair the legacy composer.",
    studioAlreadyDid:
      "Passed Area 22A with explicit limits. Maya was not reminted.",
  },
  "studio-homepage-what-we-create-tile-previews": {
    id: "studio-homepage-what-we-create-tile-previews",
    kind: "internal",
    source: "src/config/studio-homepage-lobby-rebuild-v1.ts",
    company: homepageWhatWeCreateSampleSetV1.company,
    projectName: "What We Create tile previews",
    whatTheyWant:
      "Owner judgment of all 8 homepage tile previews inside the real carousel. This is the fitted-preview set, not the filed family-plate packet.",
    projectState: "INTERNAL TILE PREVIEW SET — homepage fit only",
    facts:
      "Approved 1920x1080 plates stay untouched. Fit uses contain. No cover-zoom. No publish / no merge / no push.",
    studioAlreadyDid:
      "Scout applied the approved Long video fit rule to the remaining 7 tiles and placed all 8 previews in the existing What We Create tiles.",
  },
  "studio-homepage-long-to-short-tile-crop": {
    id: "studio-homepage-long-to-short-tile-crop",
    kind: "internal",
    source: "src/config/studio-homepage-lobby-rebuild-v1.ts",
    company: homepageWhatWeCreateSampleSetV1.company,
    projectName: "Long video tile crop",
    whatTheyWant:
      "Owner judgment of the homepage-specific preview crop for Long video to short clips only. Do not treat this as full-set approval.",
    projectState: "INTERNAL TILE CROP — one homepage preview",
    facts:
      "Approved 1920x1080 plate stays untouched. Other 7 tiles stay empty. Crop rule only. No publish / no merge / no push.",
    studioAlreadyDid:
      "Machine cut a wide shallow homepage preview from the approved plate and placed it in the existing Long video tile only.",
  },
  [homepageWhatWeCreateSampleSetV1.recordId]: {
    id: homepageWhatWeCreateSampleSetV1.recordId,
    kind: "internal",
    source: "src/config/studio-homepage-what-we-create-sample-set-v1.ts",
    company: homepageWhatWeCreateSampleSetV1.company,
    projectName: homepageWhatWeCreateSampleSetV1.matter,
    whatTheyWant:
      "Owner final acceptance of all 8 What We Create sample plates as one family before Scout may place any card on Page 1.",
    projectState: "INTERNAL STUDIO EXAMPLE OUTPUT SET — not a customer campaign",
    facts:
      "Exact 8 categories. Still Example Output plates. Labeled SAMPLE. No fake client claims. Scout integrates only after Owner APPROVE of the full set.",
    studioAlreadyDid:
      "Scout packaged one coordinated Production Team batch. Copy, Video, Design, and Quality work from one family lock.",
  },
  [studioDemoVideo1OwnerConsoleV1.recordId]: {
    id: studioDemoVideo1OwnerConsoleV1.recordId,
    kind: "internal",
    source: "src/config/studio-demo-video-1-owner-console-v1.ts",
    company: studioDemoVideo1OwnerConsoleV1.company,
    projectName: studioDemoVideo1OwnerConsoleV1.matter,
    whatTheyWant:
      "Owner final acceptance of the Clip Repurposing Studio Demo before Scout may connect it to the existing Page 1 demo slot.",
    projectState: "INTERNAL STUDIO DEMO — not a customer campaign",
    facts:
      "Locked presenter. Package truth preserved. Homepage slot #studio-demo stays. Scout integrates only after Owner APPROVE.",
    studioAlreadyDid:
      "Scout packaged the correction brief and dispatched it to Copy, Video, and Quality. Scout did not produce the cut.",
  },
  "help-center-refund-policy": {
    id: "help-center-refund-policy",
    kind: "policy",
    source: "src/config/help-center.ts · src/config/policies.ts",
    company: "Studio Reference",
    projectName: policyTitle("refund-policy"),
    whatTheyWant: "Owner needs the locked refund rule, not a new policy.",
    projectState: "Help Center V1 locked",
    facts: policySummary("refunds"),
    studioAlreadyDid: "Refund policy is locked. May be approved. Do not change that to will receive.",
  },
  "help-center-revision-policy": {
    id: "help-center-revision-policy",
    kind: "policy",
    source: "src/config/help-center.ts · src/config/policies.ts",
    company: "Studio Reference",
    projectName: policyTitle("revision-policy"),
    whatTheyWant: "Owner needs the locked revision rule, not a new policy.",
    projectState: "Help Center V1 locked",
    facts: policySummary("revisions"),
    studioAlreadyDid:
      "Revision policy is locked. Included revisions depend on the purchased service.",
  },
};

export function ownerDeskRecord(id: string): OwnerDeskRecord {
  const record = OWNER_DESK_RECORDS[id];
  if (!record) {
    throw new Error(`Owner desk record missing: ${id}`);
  }
  return record;
}
