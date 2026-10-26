import test from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCTION_RECEIPT_FRESH_MS,
  presentProductionReceipt,
  productionReceiptForDesk,
} from "./owner-production-receipt.mjs";

const now = Date.parse("2026-10-19T22:30:00.000Z");
const oldRecord = {
  packetId: "studio-homepage-what-we-create-tile-previews",
  label: "What We Create tile previews",
  state: "COMPLETE",
  detail: "Complete. The 8 fitted tile previews are on your desk. Not the filed family packet.",
  updatedAt: "2026-10-04T16:35:21.765Z",
};

test("a fresh production record stays the current packet", () => {
  const shown = productionReceiptForDesk(
    { ...oldRecord, updatedAt: new Date(now - 60_000).toISOString() },
    now,
  );
  assert.equal(shown.fresh, true);
  assert.equal(shown.stale, false);
  assert.equal(shown.state, "COMPLETE");
  assert.equal(shown.detail, oldRecord.detail);
});

test("an old production record is shown as stale and is not a live packet", () => {
  const shown = productionReceiptForDesk(oldRecord, now);
  assert.equal(shown.stale, true);
  assert.equal(shown.fresh, false);
  assert.equal(shown.state, "");
  assert.equal(shown.recordedState, "COMPLETE");
  assert.equal(shown.recordedDetail, oldRecord.detail);
  assert.match(shown.detail, /^Stale\. No production update since 2026-10-04T16:35:21.765Z/);
  assert.match(shown.detail, /8 fitted tile previews/);
  assert.ok(now - Date.parse(oldRecord.updatedAt) > PRODUCTION_RECEIPT_FRESH_MS);
});

test("the same fresh record stays unchanged", () => {
  const raw = { ...oldRecord, updatedAt: new Date(now - 5_000).toISOString(), state: "WORKING", detail: "Working the current packet." };
  const first = productionReceiptForDesk(raw, now);
  const second = productionReceiptForDesk(raw, now + 1_000);
  assert.deepEqual(second, first);
});

test("a missing record stays quiet and the stored record is not rewritten", () => {
  const quiet = productionReceiptForDesk(null, now);
  assert.equal(quiet.state, "");
  assert.equal(quiet.detail, "Quiet. No production packet is open.");
  assert.equal(quiet.stale, false);
  const stored = presentProductionReceipt(oldRecord);
  assert.equal(stored.state, "COMPLETE");
  assert.equal(stored.detail, oldRecord.detail);
});
