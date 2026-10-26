/**
 * Disposable review-room-v1 — real File Room bytes via dev upload API + tasks patch.
 * Does not weaken release gates; only fixes harness data to match private storage contract.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CAMPAIGN_ID, JOB_ID, buildInternalQaReviewAuthorization } from "./seed-review-room-v1.mjs";

const TASKS_PATH = path.join(process.cwd(), "data", "campaign-tasks", `${CAMPAIGN_ID}.json`);

/** Fixed harmless bytes — harness asserts exact download equality. */
export const DISPOSABLE_DELIVERABLE_BYTES = {
  "deliverable-0": Buffer.from("RRV1-HARNESS-DELIVERABLE-0-DISPOSABLE\n", "utf8"),
  "deliverable-1": Buffer.from("RRV1-HARNESS-DELIVERABLE-1-DISPOSABLE\n", "utf8"),
  "deliverable-2": Buffer.from("RRV1-HARNESS-DELIVERABLE-2-DISPOSABLE\n", "utf8"),
};

export const DISPOSABLE_FILENAMES = {
  "deliverable-0": "harness-social-concepts.png",
  "deliverable-1": "harness-caption-copy.txt",
  "deliverable-2": "harness-export-ready.zip",
};

export const DISPOSABLE_CONTENT_TYPES = {
  "deliverable-0": "image/png",
  "deliverable-1": "text/plain",
  "deliverable-2": "application/zip",
};

export const UNRELEASED_HARNESS_BYTES = Buffer.from("RRV1-HARNESS-UNRELEASED-MUST-NOT-DOWNLOAD\n", "utf8");
export const UNRELEASED_HARNESS_FILENAME = "harness-unreleased-internal.zip";

export function sha256Prefixed(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

export function harnessChecksumsByDeliverable() {
  return Object.fromEntries(
    Object.entries(DISPOSABLE_DELIVERABLE_BYTES).map(([key, buf]) => [key, sha256Prefixed(buf)]),
  );
}

async function readTasksEnvelope() {
  return JSON.parse(await readFile(TASKS_PATH, "utf8"));
}

async function writeTasksEnvelope(envelope) {
  envelope.updatedAt = new Date().toISOString();
  envelope.syncedAt = envelope.updatedAt;
  await writeFile(TASKS_PATH, JSON.stringify(envelope, null, 2));
}

/** Remove seed placeholder proofs so uploads are the only review_proof rows. */
export async function clearReviewRoomV1FileRegistryForHarness() {
  const envelope = await readTasksEnvelope();
  const index = (envelope.jobRecords ?? []).findIndex((row) => row.jobId === JOB_ID);
  if (index < 0) throw new Error("review-room-v1 job missing");
  envelope.jobRecords[index] = {
    ...envelope.jobRecords[index],
    fileRegistry: [],
    clientDeliveryFiles: [],
  };
  await writeTasksEnvelope(envelope);
}

export async function syncReviewRoomV1QaPinForHarness(workVersionId, decisionSuffix) {
  const checksums = Object.values(harnessChecksumsByDeliverable());
  const envelope = await readTasksEnvelope();
  const index = (envelope.jobRecords ?? []).findIndex((row) => row.jobId === JOB_ID);
  if (index < 0) throw new Error("review-room-v1 job missing");
  const qa = buildInternalQaReviewAuthorization(workVersionId, decisionSuffix);
  qa.contentSha256s = checksums;
  envelope.jobRecords[index] = {
    ...envelope.jobRecords[index],
    internalQaReviewAuthorization: qa,
  };
  await writeTasksEnvelope(envelope);
  return qa;
}

function patchStorageRefChecksum(ref, checksumSha256) {
  if (!ref?.storageRef || ref.storageRef.provider !== "supabase_storage") return ref;
  return {
    ...ref,
    storageRef: {
      ...ref.storageRef,
      connectionStatus: "private_object",
      checksumSha256,
    },
  };
}

/** Upload API omits checksum on metadata; assembly requires checksumSha256 on proofs. */
export async function patchReviewRoomV1RegistryChecksums(checksumByFilename) {
  const envelope = await readTasksEnvelope();
  const index = (envelope.jobRecords ?? []).findIndex((row) => row.jobId === JOB_ID);
  if (index < 0) throw new Error("review-room-v1 job missing");
  const job = envelope.jobRecords[index];
  const fileRegistry = (job.fileRegistry ?? []).map((ref) => {
    const checksum = checksumByFilename[ref.filename];
    return checksum ? patchStorageRefChecksum(ref, checksum) : ref;
  });
  const clientDeliveryFiles = (job.clientDeliveryFiles ?? []).map((cdf) => {
    const checksum = checksumByFilename[cdf.fileName];
    if (!checksum || !cdf.storageRef) return cdf;
    return {
      ...cdf,
      contentSha256: checksum,
      storageRef: patchStorageRefChecksum(
        { storageRef: cdf.storageRef },
        checksum,
      ).storageRef,
    };
  });
  envelope.jobRecords[index] = { ...job, fileRegistry, clientDeliveryFiles };
  await writeTasksEnvelope(envelope);
}

export async function uploadFileRoomHarnessFile(baseUrl, sessionCookie, fields) {
  const form = new FormData();
  const file = new File([fields.body], fields.filename, { type: fields.contentType });
  form.set("file", file);
  form.set("category", fields.category);
  form.set("visibility", fields.visibility ?? "client_visible");
  form.set("status", fields.status ?? (fields.category === "review_proof" ? "approved_for_review" : "approved_for_release"));
  form.set("versionLabel", fields.versionLabel ?? "Harness v2");
  if (fields.deliverableKey) form.set("deliverableKey", fields.deliverableKey);
  if (fields.deliverableLabel) form.set("deliverableLabel", fields.deliverableLabel);

  const res = await fetch(
    `${baseUrl}/api/file-room/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/files`,
    {
      method: "POST",
      headers: { Cookie: `studio_session=${sessionCookie}` },
      body: form,
    },
  );
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/**
 * After revision resubmit: empty registry, sync QA pin to harness hashes, upload proofs + one unreleased final.
 */
export async function seedReviewRoomV1PrivateFileRoomObjects(baseUrl, ownerSessionCookie, workVersionId, decisionSuffix) {
  await clearReviewRoomV1FileRegistryForHarness();
  await syncReviewRoomV1QaPinForHarness(workVersionId, decisionSuffix);

  const checksumByFilename = {};
  const deliverableLabels = {
    "deliverable-0": "3 social post concepts",
    "deliverable-1": "Caption copy set",
    "deliverable-2": "Export-ready files",
  };

  for (const [deliverableKey, body] of Object.entries(DISPOSABLE_DELIVERABLE_BYTES)) {
    const filename = DISPOSABLE_FILENAMES[deliverableKey];
    checksumByFilename[filename] = sha256Prefixed(body);
    const uploaded = await uploadFileRoomHarnessFile(baseUrl, ownerSessionCookie, {
      body,
      filename,
      contentType: DISPOSABLE_CONTENT_TYPES[deliverableKey],
      category: "review_proof",
      deliverableKey,
      deliverableLabel: deliverableLabels[deliverableKey],
    });
    if (uploaded.status !== 200) {
      throw new Error(
        `review_proof upload ${deliverableKey} failed HTTP ${uploaded.status}: ${uploaded.json.error ?? ""}`,
      );
    }
  }

  const unreleasedName = UNRELEASED_HARNESS_FILENAME;
  checksumByFilename[unreleasedName] = sha256Prefixed(UNRELEASED_HARNESS_BYTES);
  const unreleased = await uploadFileRoomHarnessFile(baseUrl, ownerSessionCookie, {
    body: UNRELEASED_HARNESS_BYTES,
    filename: unreleasedName,
    contentType: "application/zip",
    category: "internal_draft",
    status: "draft",
    visibility: "internal_only",
  });
  if (unreleased.status !== 200) {
    throw new Error(
      `unreleased internal_draft upload failed HTTP ${unreleased.status}: ${unreleased.json.error ?? ""}`,
    );
  }

  await patchReviewRoomV1RegistryChecksums(checksumByFilename);
  return { checksumByFilename, primaryDownload: { filename: DISPOSABLE_FILENAMES["deliverable-0"], body: DISPOSABLE_DELIVERABLE_BYTES["deliverable-0"] } };
}
