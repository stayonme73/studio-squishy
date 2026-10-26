/**
 * Official Machine retry of system Final Delivery for Maya Version 16.
 * Uses reevaluateSystemFinalDeliveryAfterMaterialChange with the live ledger.
 * Does not remint. Does not invent materials. Does not use Owner exception.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { readCampaignEnvelope } from "../src/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "../src/lib/campaign-tasks/store";
import { reevaluateSystemFinalDeliveryAfterMaterialChange } from "../src/lib/job-control/final-delivery-actions";
import { canClientAccessJobDelivery } from "../src/lib/job-control/final-delivery-access";
import { resolveFinalDeliveryView } from "../src/lib/job-control/final-delivery-view";
import { readMaterialsEnvelope } from "../src/lib/materials/store";

const CAMPAIGN_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";

async function main() {
  const usersBefore = readFileSync(path.join(process.cwd(), "data/studio-users.json"), "utf8");
  const campaignEnvelope = await readCampaignEnvelope(CAMPAIGN_ID);
  const tasks = await readTasksEnvelope(CAMPAIGN_ID);
  const materials = await readMaterialsEnvelope(CAMPAIGN_ID);
  if (!campaignEnvelope?.record || !tasks || !materials) {
    throw new Error("Maya campaign, tasks, or materials ledger is missing.");
  }

  const before = tasks.jobRecords?.[0];
  const pinBefore = JSON.stringify(before?.customerApprovedArtifactAuthorization);
  const result = reevaluateSystemFinalDeliveryAfterMaterialChange({
    envelope: tasks,
    campaign: campaignEnvelope.record,
    materials: materials.items,
    clientId:
      campaignEnvelope.clientUserId ?? `unclaimed-client:${CAMPAIGN_ID}`,
  });

  if (result.releasedJobIds.length === 0) {
    const job = result.envelope.jobRecords?.[0];
    console.log(
      JSON.stringify(
        {
          applied: false,
          spine: job?.spineStatus,
          pin: job?.customerApprovedArtifactAuthorization?.workVersionId,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  await writeTasksEnvelope(result.envelope);
  const usersAfter = readFileSync(path.join(process.cwd(), "data/studio-users.json"), "utf8");
  if (usersAfter !== usersBefore) {
    throw new Error("studio-users.json changed — remint is forbidden.");
  }

  const after = result.envelope.jobRecords?.[0];
  if (JSON.stringify(after?.customerApprovedArtifactAuthorization) !== pinBefore) {
    throw new Error("Version 16 pin changed — rewrite is forbidden.");
  }

  const view = resolveFinalDeliveryView(campaignEnvelope.record, result.envelope.jobRecords ?? []);
  console.log(
    JSON.stringify(
      {
        applied: true,
        releasedJobIds: result.releasedJobIds,
        spine: after?.spineStatus,
        pin: after?.customerApprovedArtifactAuthorization?.workVersionId,
        hashes: after?.customerApprovedArtifactAuthorization?.contentSha256s,
        cdf: (after?.clientDeliveryFiles ?? []).map((file) => ({
          fileName: file.fileName,
          versionLabel: file.versionLabel,
          releaseStatus: file.releaseStatus,
        })),
        clientCanOpen: after ? canClientAccessJobDelivery(after) : false,
        viewState: view.state,
        viewFiles: view.jobs.flatMap((job) => job.files.map((file) => file.fileName)),
        usersUnchanged: true,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
