import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { readMaterialsEnvelope } from "@/lib/materials/store";

import { projectKitchenCommsLedger } from "./project-events";
import type { KitchenCommsLedger } from "./types";

/**
 * Read-only Kitchen communication ledger loader.
 * Does not generate tasks, initialize materials, or enqueue communications.
 */
export async function loadKitchenCommsLedger(
  campaignId: string,
): Promise<KitchenCommsLedger> {
  const [tasksEnvelope, materialsEnvelope] = await Promise.all([
    readTasksEnvelope(campaignId),
    readMaterialsEnvelope(campaignId),
  ]);

  return projectKitchenCommsLedger({
    campaignId,
    tasksEnvelope,
    materials: materialsEnvelope?.items ?? [],
  });
}
