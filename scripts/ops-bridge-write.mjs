/**
 * Write or consume the ChatGPT ↔ Scout ops bridge.
 * Used by pulse. Not a customer-site feature.
 */
import { writeOutboundSnapshot, consumeInboundDecision } from "./ops-bridge-lib.mjs";

const consumeIndex = process.argv.indexOf("--consume");
if (consumeIndex >= 0) {
  const raw = process.argv[consumeIndex + 1];
  if (!raw) {
    process.stderr.write("Missing decision JSON after --consume\n");
    process.exit(1);
  }
  const decision = JSON.parse(raw);
  const result = consumeInboundDecision(decision);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(result.ok ? 0 : 2);
}

const snapshot = writeOutboundSnapshot();
process.stdout.write(`ops-bridge snapshot ${snapshot.writtenAt} zeroCourier=${snapshot.transport.zeroCourierAchieved}\n`);
