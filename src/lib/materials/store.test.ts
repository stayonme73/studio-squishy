import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";

import {
  readMaterialsEnvelope,
  writeMaterialsEnvelope,
} from "./store";
import type { ServerMaterialsEnvelope } from "./types";

const CAMPAIGN_ID = "materials-store-test";
const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");
const MATERIALS_FILE = path.join(MATERIALS_DIR, `${CAMPAIGN_ID}.json`);

function sampleEnvelope(): ServerMaterialsEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId: CAMPAIGN_ID,
    items: [],
    updatedAt: now,
    version: 1,
    syncedAt: now,
  };
}

describe("materials store", () => {
  beforeEach(async () => {
    await fs.mkdir(MATERIALS_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(MATERIALS_FILE, { force: true });
  });

  it("reads and writes campaign materials envelope", async () => {
    expect(await readMaterialsEnvelope(CAMPAIGN_ID)).toBeNull();

    const written = await writeMaterialsEnvelope(sampleEnvelope());
    expect(written.campaignId).toBe(CAMPAIGN_ID);

    const read = await readMaterialsEnvelope(CAMPAIGN_ID);
    expect(read).toMatchObject({ campaignId: CAMPAIGN_ID, version: 1 });
  });
});
