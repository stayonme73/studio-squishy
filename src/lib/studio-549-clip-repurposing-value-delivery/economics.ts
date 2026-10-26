import { estimateClip549WorstCaseEconomics } from "@/lib/studio-549-clip-repurposing/economics";

export type Clip549ValueEconomics = {
  priceUsd: 549;
  existingVideoVendorWorstUsd: number;
  valueLayerVendorUsd: 0;
  combinedVendorWorstUsd: number;
  minutesPerClipCopy: 6;
  minutesCompanion: 12;
  minutesDeliveryAssembly: 18;
  fiveClipWorstMinutes: number;
  sustainableAt549: boolean;
  qualityReduced: false;
  scopeNarrowed: false;
  priceChanged: false;
  note: string;
};

export function estimateClip549ValueEconomics(): Clip549ValueEconomics {
  const video = estimateClip549WorstCaseEconomics();
  const minutesPerClipCopy = 6;
  const minutesCompanion = 12;
  const minutesDeliveryAssembly = 18;
  const fiveClipWorstMinutes =
    minutesPerClipCopy * 5 + minutesCompanion + minutesDeliveryAssembly;
  const valueLayerVendorUsd = 0;
  const combinedVendorWorstUsd = Number(
    (video.vendorWorstUsd + valueLayerVendorUsd).toFixed(4),
  );
  return {
    priceUsd: 549,
    existingVideoVendorWorstUsd: video.vendorWorstUsd,
    valueLayerVendorUsd,
    combinedVendorWorstUsd,
    minutesPerClipCopy,
    minutesCompanion,
    minutesDeliveryAssembly,
    fiveClipWorstMinutes,
    sustainableAt549: combinedVendorWorstUsd < 549 && fiveClipWorstMinutes <= 90,
    qualityReduced: false,
    scopeNarrowed: false,
    priceChanged: false,
    note:
      "Captions, titles, hashtags, the companion, and delivery assembly are local Studio work. No added vendor API. Designed covers stay out. Video vendor cost is unchanged from the certified finishing lane.",
  };
}
