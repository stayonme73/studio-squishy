/**
 * Room 4B — photo-led campaign live-cert access probe.
 * CapCut-style: prove credentials exist before claiming Machine control.
 * Does NOT call vendor APIs. Does NOT purchase. Does not invent access.
 *
 * Usage: npx tsx scripts/studio-operating-room-4b-photo-led-access-probe.mts
 */

type CandidateId = "adobe" | "canva" | "placid";

type AccessRow = {
  id: CandidateId;
  envKeysChecked: string[];
  credentialPresent: boolean;
  liveApiCallableWithoutPurchase: boolean;
  status:
    | "ACCESS_GATE_OWNER_DECISION"
    | "CREDENTIALS_PRESENT_PROCEED_WITH_LIVE_CALLS";
  notes: string;
};

function envPresent(keys: string[]): boolean {
  return keys.some((k) => {
    const v = process.env[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

const rows: AccessRow[] = [
  {
    id: "adobe",
    envKeysChecked: [
      "ADOBE_CLIENT_ID",
      "ADOBE_CLIENT_SECRET",
      "ADOBE_FIREFLY_CLIENT_ID",
      "ADOBE_FIREFLY_CLIENT_SECRET",
      "FIREFLY_CLIENT_ID",
      "FIREFLY_CLIENT_SECRET",
    ],
    credentialPresent: false,
    liveApiCallableWithoutPurchase: false,
    status: "ACCESS_GATE_OWNER_DECISION",
    notes:
      "Firefly Services / Photoshop API require org provisioning (ETLA). Creative Cloud individual ≠ API.",
  },
  {
    id: "canva",
    envKeysChecked: [
      "CANVA_CLIENT_ID",
      "CANVA_CLIENT_SECRET",
      "CANVA_ACCESS_TOKEN",
      "CANVA_REFRESH_TOKEN",
    ],
    credentialPresent: false,
    liveApiCallableWithoutPurchase: false,
    status: "ACCESS_GATE_OWNER_DECISION",
    notes:
      "Brand Template + Autofill require Canva Enterprise (or Owner-approved developer exception).",
  },
  {
    id: "placid",
    envKeysChecked: ["PLACID_API_TOKEN", "PLACID_API_KEY"],
    credentialPresent: false,
    liveApiCallableWithoutPurchase: false,
    status: "ACCESS_GATE_OWNER_DECISION",
    notes:
      "Free trial exists officially (no card; watermarked previews). Not started without Manager-scoped authorization.",
  },
];

for (const row of rows) {
  row.credentialPresent = envPresent(row.envKeysChecked);
  if (row.credentialPresent) {
    row.status = "CREDENTIALS_PRESENT_PROCEED_WITH_LIVE_CALLS";
    // Still may require paid plan — probe only proves secrets exist.
    row.liveApiCallableWithoutPurchase = row.id === "placid";
  }
}

const niaPhotoBinariesPresent = false; // fixture materials are descriptive placeholders only

const report = {
  packageId: "STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1",
  kind: "photo-led-campaign-live-certification-access-probe",
  recordedAt: new Date().toISOString(),
  recommendation: "OWNER_PURCHASE_DECISION_REQUIRED" as const,
  twoStageMeansLogicalCapabilitiesNotTwoSubscriptions: true,
  niaPhotoBinariesPresent,
  niaMaterialsNote:
    "src/lib/studio-room-4b-launch-toolbox/nia-fixture.ts NIA_MATERIALS are descriptive placeholders — not image files.",
  textLedBaselinePaths: [
    "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/nia-social-post-1.png",
    "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/continuation-v2/artifacts/nia-flyer-v1.png",
  ],
  accessMatrix: rows,
  adobeRateLimitsOfficialDefault: {
    rpm: 4,
    rpd: 9000,
    source:
      "https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/rate-limits/",
  },
  parkForManager: true,
  doNotPurchase: true,
  doNotMerge: true,
  doNotStartRoom5: true,
};

console.log(JSON.stringify(report, null, 2));

const blocked = rows.every((r) => r.status === "ACCESS_GATE_OWNER_DECISION");
process.exit(blocked ? 2 : 0);
