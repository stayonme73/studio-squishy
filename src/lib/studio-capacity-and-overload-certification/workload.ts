import { resolveControlLaneForSku } from "@/lib/job-control/lane-map";
import {
  CLIP_SOLD_CONTRACT_MEASURED_MS,
  CLIP_SOLD_CONTRACT_VENDOR,
  SHORT_FORM_PACK_MEASURED_MS,
  SHORT_FORM_PACK_VENDOR,
  studioCapacityAndOverloadCertificationV1 as pack,
} from "@/config/studio-capacity-and-overload-certification-v1";

export type EvidenceKind = "MEASURED" | "DERIVED_FROM_MEASURED" | "UNKNOWN";

export type WorkloadLine = {
  id: string;
  label: string;
  ms: number | null;
  kind: EvidenceKind;
  note: string;
};

export type ServiceWorkload = {
  skuId:
    | "v2-rtu-short-form-video-edit"
    | "v2-rtu-clip-repurposing";
  controlLane: "heavy";
  lines: readonly WorkloadLine[];
  firstCutHeavyMs: number;
  withIncludedRevisionHeavyMs: number;
  firstCutHeavyKind: EvidenceKind;
  withRevisionHeavyKind: EvidenceKind;
  vendor: {
    deepgramUsd: number;
    shotstackCredits: number | null;
    shotstackRenders: number;
    elevenLabsCredits: number;
    ownerProductionMinutes: number;
    kind: EvidenceKind;
  };
};

const CLIP_REMAKE_RATIO =
  CLIP_SOLD_CONTRACT_MEASURED_MS.remake /
  CLIP_SOLD_CONTRACT_MEASURED_MS.firstCutDispatch;

const SHORT_FORM_REVISION_DERIVED_MS = Math.round(
  SHORT_FORM_PACK_MEASURED_MS.firstCutElapsed * CLIP_REMAKE_RATIO,
);

const SHORT_FORM_QUALITY_DERIVED_MS = Math.round(
  (CLIP_SOLD_CONTRACT_MEASURED_MS.qualityFirstCut +
    CLIP_SOLD_CONTRACT_MEASURED_MS.qualityRevision) /
    2,
);

export function shortFormContentPackWorkload(): ServiceWorkload {
  const firstCutHeavyMs = SHORT_FORM_PACK_MEASURED_MS.firstCutElapsed;
  const withIncludedRevisionHeavyMs =
    firstCutHeavyMs + SHORT_FORM_REVISION_DERIVED_MS + SHORT_FORM_QUALITY_DERIVED_MS;
  return {
    skuId: "v2-rtu-short-form-video-edit",
    controlLane: "heavy",
    firstCutHeavyMs,
    withIncludedRevisionHeavyMs,
    firstCutHeavyKind: "MEASURED",
    withRevisionHeavyKind: "DERIVED_FROM_MEASURED",
    vendor: {
      deepgramUsd: SHORT_FORM_PACK_VENDOR.deepgramUsd,
      shotstackCredits: 0,
      shotstackRenders: SHORT_FORM_PACK_VENDOR.shotstackRenders,
      elevenLabsCredits: SHORT_FORM_PACK_VENDOR.elevenCredits,
      ownerProductionMinutes: 0,
      kind: "MEASURED",
    },
    lines: [
      {
        id: "intake",
        label: "Intake / validation",
        ms: null,
        kind: "UNKNOWN",
        note: "Customer marks moments. Clock not separated from first-cut elapsed.",
      },
      {
        id: "transcription",
        label: "Transcription",
        ms: null,
        kind: "UNKNOWN",
        note: "Inside first-cut elapsed. Deepgram $0.0042 measured for the stamped pack.",
      },
      {
        id: "discovery",
        label: "Discovery / idea cut",
        ms: null,
        kind: "UNKNOWN",
        note: "Customer points to each clip. Not a long-source search.",
      },
      {
        id: "production",
        label: "First-cut production elapsed",
        ms: SHORT_FORM_PACK_MEASURED_MS.firstCutElapsed,
        kind: "MEASURED",
        note: "Daniel pack CERT-RUN spend.elapsedMs.",
      },
      {
        id: "rendering",
        label: "Rendering",
        ms: null,
        kind: "UNKNOWN",
        note: "Stamped pack used 0 Shotstack renders. Local finish path.",
      },
      {
        id: "quality",
        label: "Quality",
        ms: SHORT_FORM_QUALITY_DERIVED_MS,
        kind: "DERIVED_FROM_MEASURED",
        note: "No stamped Short-Form Quality clock. Analog from Clip Quality mean.",
      },
      {
        id: "revision",
        label: "Included CTA / set revision",
        ms: SHORT_FORM_REVISION_DERIVED_MS,
        kind: "DERIVED_FROM_MEASURED",
        note: `Clip remake/first-cut ratio ${CLIP_REMAKE_RATIO.toFixed(3)} applied to Short-Form first cut.`,
      },
      {
        id: "delivery",
        label: "Delivery generation",
        ms: null,
        kind: "UNKNOWN",
        note: "Package assembly not separately clocked.",
      },
      {
        id: "journey",
        label: "Customer journey / system overhead",
        ms: null,
        kind: "UNKNOWN",
        note: "Not in Heavy occupancy. Board wake can take 15–55s after an identity hold.",
      },
      {
        id: "vendor_wait",
        label: "Vendor / system waiting",
        ms: null,
        kind: "UNKNOWN",
        note: "Folded into first-cut elapsed where it occurred.",
      },
      {
        id: "heavy",
        label: "Heavy-slot occupancy",
        ms: withIncludedRevisionHeavyMs,
        kind: "DERIVED_FROM_MEASURED",
        note: "First cut measured. Revision + Quality derived. Conservative included-round plan.",
      },
      {
        id: "human",
        label: "Human touch time",
        ms: 0,
        kind: "MEASURED",
        note: "Stamped pack ownerRoutineLaborRequired false. Unusual cert routineWithoutOwner.",
      },
      {
        id: "owner",
        label: "Owner production touch",
        ms: 0,
        kind: "MEASURED",
        note: "Owner is not routine production labor on the stamped path.",
      },
    ],
  };
}

export function clipRepurposingWorkload(): ServiceWorkload {
  const firstCutHeavyMs =
    CLIP_SOLD_CONTRACT_MEASURED_MS.sourceAudioGate +
    CLIP_SOLD_CONTRACT_MEASURED_MS.firstCutDispatch +
    CLIP_SOLD_CONTRACT_MEASURED_MS.qualityFirstCut;
  const withIncludedRevisionHeavyMs =
    CLIP_SOLD_CONTRACT_MEASURED_MS.heavySlotOccupancy;
  return {
    skuId: "v2-rtu-clip-repurposing",
    controlLane: "heavy",
    firstCutHeavyMs,
    withIncludedRevisionHeavyMs,
    firstCutHeavyKind: "MEASURED",
    withRevisionHeavyKind: "MEASURED",
    vendor: {
      deepgramUsd: CLIP_SOLD_CONTRACT_VENDOR.deepgramUsdList,
      shotstackCredits: CLIP_SOLD_CONTRACT_VENDOR.shotstackCredits,
      shotstackRenders: CLIP_SOLD_CONTRACT_VENDOR.shotstackRenders,
      elevenLabsCredits: CLIP_SOLD_CONTRACT_VENDOR.elevenLabsCredits,
      ownerProductionMinutes: CLIP_SOLD_CONTRACT_VENDOR.ownerProductionMinutes,
      kind: "MEASURED",
    },
    lines: [
      {
        id: "intake",
        label: "Intake / validation",
        ms: CLIP_SOLD_CONTRACT_MEASURED_MS.sourceAudioGate,
        kind: "MEASURED",
        note: "23:23 source audio gate. NOTICE_AND_CHOICE. Isolated needles.",
      },
      {
        id: "transcription",
        label: "Transcription",
        ms: null,
        kind: "UNKNOWN",
        note: "Whole-source vs discovery clocks were not exposed. Deepgram $0.1006 reused.",
      },
      {
        id: "discovery",
        label: "Discovery / ranking",
        ms: null,
        kind: "UNKNOWN",
        note: "Inside first-cut dispatch. Not separately clocked.",
      },
      {
        id: "production",
        label: "First-cut production",
        ms: CLIP_SOLD_CONTRACT_MEASURED_MS.firstCutDispatch,
        kind: "MEASURED",
        note: "Sold-contract first cut. Three 1080×1920 shorts.",
      },
      {
        id: "rendering",
        label: "Rendering",
        ms: null,
        kind: "UNKNOWN",
        note: "Shotstack 0.62 credits / 6 renders measured for the whole sold-contract run.",
      },
      {
        id: "quality",
        label: "Quality",
        ms:
          CLIP_SOLD_CONTRACT_MEASURED_MS.qualityFirstCut +
          CLIP_SOLD_CONTRACT_MEASURED_MS.qualityRevision,
        kind: "MEASURED",
        note: "First 21.1s + revision 30.4s. Quality was not skipped.",
      },
      {
        id: "revision",
        label: "Included set CTA remake",
        ms: CLIP_SOLD_CONTRACT_MEASURED_MS.remake,
        kind: "MEASURED",
        note: "CTA remake 410.4s. One included revision.",
      },
      {
        id: "delivery",
        label: "Delivery generation",
        ms: null,
        kind: "UNKNOWN",
        note: "Package refresh after copy fix was ~10s. Not in factory elapsed.",
      },
      {
        id: "journey",
        label: "Customer journey / system overhead",
        ms: null,
        kind: "UNKNOWN",
        note: "Board / FDR / Help walk is not Heavy occupancy.",
      },
      {
        id: "vendor_wait",
        label: "Vendor / system waiting",
        ms: null,
        kind: "UNKNOWN",
        note: "Folded into first-cut and remake where it occurred.",
      },
      {
        id: "heavy",
        label: "Heavy-slot occupancy",
        ms: CLIP_SOLD_CONTRACT_MEASURED_MS.heavySlotOccupancy,
        kind: "MEASURED",
        note: "Preserved ~1353s including included revision.",
      },
      {
        id: "human",
        label: "Human touch time",
        ms: 0,
        kind: "MEASURED",
        note: "Scout machine produced. No human finishing.",
      },
      {
        id: "owner",
        label: "Owner production touch",
        ms: 0,
        kind: "MEASURED",
        note: "Owner production minutes 0 on the sold-contract run.",
      },
    ],
  };
}

export function scopedServicesAreHeavy(): boolean {
  return pack.servicesInScope.every(
    (sku) => resolveControlLaneForSku(sku) === "heavy",
  );
}

export function businessHoursPerMonth(): number {
  return (
    pack.operatingHours.businessDaysPerMonth *
    pack.operatingHours.businessHoursPerDay
  );
}

export function unattendedHoursPerMonth(): number {
  return (
    pack.operatingHours.calendarDaysPerMonth *
    pack.operatingHours.unattendedHoursPerDay
  );
}

export function heavyMsForSku(
  sku: ServiceWorkload["skuId"],
  includeRevision: boolean,
): number {
  const workload =
    sku === "v2-rtu-clip-repurposing"
      ? clipRepurposingWorkload()
      : shortFormContentPackWorkload();
  return includeRevision
    ? workload.withIncludedRevisionHeavyMs
    : workload.firstCutHeavyMs;
}
