/**
 * Shared launch control — coordination register paths (records only).
 * Does not change product behavior or grant merge/push/deploy.
 */

export const STUDIO_SHARED_LAUNCH_CONTROL_ID = "STUDIO-SHARED-LAUNCH-CONTROL-REGISTER-1" as const;

export const STUDIO_SHARED_TRUTH_COMMUNICATION_CERT_PACKAGE_ID =
  "STUDIO-SHARED-TRUTH-AND-COMMUNICATION-CERT-1" as const;

export const studioSharedLaunchControlV1 = {
  id: STUDIO_SHARED_LAUNCH_CONTROL_ID,
  markdownVersion: "v1.1" as const,
  markdownRelativePath:
    "docs/launch/studio-shared-truth-and-communication-cert-1/STUDIO-SHARED-LAUNCH-CONTROL-v1.1.md" as const,
  registerJsonRelativePath:
    "docs/launch/studio-shared-truth-and-communication-cert-1/shared-launch-control-register.json" as const,
  eventsJsonlRelativePath:
    "docs/launch/studio-shared-truth-and-communication-cert-1/shared-launch-control-events.jsonl" as const,
  threadHandoffDirRelativePath:
    "docs/launch/studio-shared-truth-and-communication-cert-1/thread-handoffs" as const,
  canonicalLaunchTruthDoc:
    "docs/launch/studio-canonical-launch-truth-1/STUDIO-CANONICAL-LAUNCH-TRUTH.md" as const,
  canonicalLaunchTruthConfig: "src/config/studio-canonical-launch-truth-v1.ts" as const,
  opsBridgeMessageInbox: "docs/launch/owner-bridge/messages.jsonl" as const,
  opsBridgeSnapshot: "docs/launch/owner-bridge/outbound-snapshot.json" as const,
  opsBridgeInbound: "docs/launch/owner-bridge/inbound-decisions.jsonl" as const,
  opsBridgeAcknowledgements: "docs/launch/owner-bridge/acknowledgements.jsonl" as const,
  dailyOperatingBridge: "docs/launch/PROJECT-ALPHA-DAILY-OPERATING-BRIDGE.md" as const,
  dropboxNotHistoricalAuthorityBefore: "2026-10-24" as const,
} as const;
