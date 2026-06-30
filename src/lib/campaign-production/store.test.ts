import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import { readProductionEnvelope, writeProductionEnvelope } from "./store";
import type { ServerProductionEnvelope } from "./types";

const CAMPAIGN_ID = "production-store-test";
const PRODUCTION_DIR = path.join(process.cwd(), "data", "campaign-production");
const PRODUCTION_FILE = path.join(PRODUCTION_DIR, `${CAMPAIGN_ID}.json`);

function sampleEnvelope(): ServerProductionEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId: CAMPAIGN_ID,
    version: 1,
    planFingerprint: "sm-001:one_time",
    workUnits: [],
    versions: [],
    updatedAt: now,
    syncedAt: now,
  };
}

describe("campaign-production store", () => {
  beforeEach(async () => {
    await fs.mkdir(PRODUCTION_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(PRODUCTION_FILE, { force: true });
  });

  it("reads and writes campaign production envelope", async () => {
    expect(await readProductionEnvelope(CAMPAIGN_ID)).toBeNull();

    const written = await writeProductionEnvelope(sampleEnvelope());
    expect(written.campaignId).toBe(CAMPAIGN_ID);

    const read = await readProductionEnvelope(CAMPAIGN_ID);
    expect(read).toMatchObject({ campaignId: CAMPAIGN_ID, version: 1 });
  });
});
