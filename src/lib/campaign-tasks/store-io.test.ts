import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { readTasksEnvelope, writeTasksEnvelope } from "./store";
import type { ServerTasksEnvelope } from "./types";

const campaignId = `room4-tasks-io-${Date.now()}`;
const filePath = path.join(process.cwd(), "data", "campaign-tasks", `${campaignId}.json`);

function envelope(marker: string): ServerTasksEnvelope {
  const now = new Date().toISOString();
  return {
    campaignId,
    tasks: [],
    planFingerprint: marker,
    updatedAt: now,
    syncedAt: now,
    version: 12,
  };
}

afterAll(async () => {
  await fs.rm(filePath, { force: true });
});

describe("campaign-tasks store IO", () => {
  it("keeps the tasks envelope readable across concurrent writes", async () => {
    await Promise.all([
      writeTasksEnvelope(envelope("first")),
      writeTasksEnvelope(envelope("second")),
      writeTasksEnvelope(envelope("third")),
    ]);
    const raw = await fs.readFile(filePath, "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
    const read = await readTasksEnvelope(campaignId);
    expect(read?.campaignId).toBe(campaignId);
    expect(["first", "second", "third"]).toContain(read?.planFingerprint);
  });
});
