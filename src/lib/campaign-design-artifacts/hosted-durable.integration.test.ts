import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { verifyStudioPersistenceTestStorageTarget } from "@/lib/studio-durable-persistence/test-storage-target-verify";

import { campaignDesignArtifactRelPath } from "./paths";
import {
  commitCampaignDesignArtifacts,
  hydrateCampaignDesignArtifacts,
  isHostedDurableCampaignArtifactsEnabled,
} from "./hosted-durable";

describe.runIf(
  verifyStudioPersistenceTestStorageTarget().ok &&
    process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL?.includes("tzyglhypseyokhbeozjw"),
)("hosted durable campaign design artifacts (Test Storage)", () => {
  it("round-trips bytes through Supabase private Storage", async () => {
    process.env.STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE = "1";
    process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
    expect(isHostedDurableCampaignArtifactsEnabled()).toBe(true);

    const campaignId = `disposable-artifact-storage-${randomBytes(4).toString("hex")}`;
    const workspace = path.join("/tmp", `artifact-it-${randomBytes(4).toString("hex")}`);
    const rel = campaignDesignArtifactRelPath(campaignId, "proof/roundtrip.txt");
    const payload = `artifact-bytes-${Date.now()}`;
    await fs.mkdir(path.dirname(path.join(workspace, rel)), { recursive: true });
    await fs.writeFile(path.join(workspace, rel), payload, "utf8");

    await commitCampaignDesignArtifacts(campaignId, workspace);

    const workspace2 = path.join("/tmp", `artifact-it-read-${randomBytes(4).toString("hex")}`);
    await hydrateCampaignDesignArtifacts(campaignId, workspace2);
    const readBack = await fs.readFile(path.join(workspace2, rel), "utf8");
    expect(readBack).toBe(payload);
  }, 60_000);
});
