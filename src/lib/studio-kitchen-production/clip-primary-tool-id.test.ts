import { describe, expect, it } from "vitest";

import { CLIP_REPURPOSING_PRIMARY_TOOL_ID } from "@/config/studio-clip-repurposing-launch-integration-v1";
import type { ProductionToolId } from "@/lib/studio-kitchen-production/types";

describe("clip primary tool id", () => {
  it("keeps the persisted factory id on the production tool union", () => {
    const toolId: ProductionToolId = CLIP_REPURPOSING_PRIMARY_TOOL_ID;
    expect(toolId).toBe("clip_repurposing_pipeline");
  });
});
