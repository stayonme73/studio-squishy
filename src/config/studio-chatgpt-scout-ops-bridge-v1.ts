/**
 * ChatGPT ↔ Scout operations bridge — protocol only.
 * Does not grant merge/push. Does not touch customer job truth.
 */

export const STUDIO_CHATGPT_SCOUT_OPS_BRIDGE_PACKAGE_ID =
  "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1" as const;

export const OPS_BRIDGE_DRY_RUN_PACKAGE_ID =
  "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-DRY-RUN-1" as const;

export const studioChatgptScoutOpsBridgeV1 = {
  packageId: STUDIO_CHATGPT_SCOUT_OPS_BRIDGE_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-26" as const,
  step: 2 as const,
  gitIsEngineeringAuthority: true as const,
  machineIsCustomerJobTruth: true as const,
  scoutIsFactoryEngineer: true as const,
  chatgptMayReadRedactedSnapshot: true as const,
  chatgptMayPrepareDecisionLines: true as const,
  scoutActsOnlyOnAuthorizedInbound: true as const,
  ownerIsFinalForProtectedActions: true as const,
  noMergeWithoutExplicitAuthorization: true as const,
  noPushWithoutExplicitAuthorization: true as const,
  doNotReopenFactories: true as const,
  doNotStartWebsite: true as const,
  doNotStartBeta: true as const,
  doNotStartMarketing: true as const,
  shelfHonestyParked: true as const,
  outboundRelativePath: "docs/launch/owner-bridge/outbound-snapshot.json" as const,
  outboundMarkdownRelativePath: "docs/launch/owner-bridge/outbound-snapshot.md" as const,
  inboundRelativePath: "docs/launch/owner-bridge/inbound-decisions.jsonl" as const,
  acknowledgementsRelativePath: "docs/launch/owner-bridge/acknowledgements.jsonl" as const,
  staleDecisionMs: 14_400_000 as const,
  localDeskSnapshotPath: "/ops-bridge/snapshot.json" as const,
  githubConnectorRejected: true as const,
  githubRejectionReason:
    "GitHub connector required broader repository write than Owner permits." as const,
  ownerDeskNotTheChatgptTransport: true as const,
  localHttpsBridgeHost: "127.0.0.1" as const,
  localHttpsBridgePort: 4178 as const,
  localHttpsSnapshotPath: "/v1/snapshot" as const,
  localHttpsInboundPath: "/v1/inbound" as const,
  localHttpsAcknowledgementPath: "/v1/acknowledgement" as const,
  publicHttpsHosted: true as const,
  mcpEndpointPath: "/mcp" as const,
  mcpTools: [
    "studio_snapshot",
    "studio_inbound",
    "studio_acknowledgement",
    "studio_message_send",
    "studio_message_read",
  ] as const,
  mcpWrapsCertifiedRestOnly: true as const,
  mcpOauth21: true as const,
  mcpOauthPkce: "S256" as const,
  mcpOauthScopes: [
    "studio.snapshot.read",
    "studio.inbound.write",
    "studio.acknowledgement.read",
  ] as const,
  zeroCourierRequiresSharedTransport: true as const,
} as const;

export const OPS_BRIDGE_INBOUND_ACTIONS = [
  "authorize_package",
  "stop",
  "hold",
  "accept_proof",
  "reject_proof",
  "request_correction",
  "publish_authorization",
  "merge_authorization",
  "push_authorization",
  "acknowledge",
  "report_local_status",
  "run_readonly_task",
  "run_synthetic_engineering_handoff",
] as const;

export const OPS_BRIDGE_READONLY_TASKS = [
  "local_test_readiness",
  "synthetic_machine_quality_status",
] as const;

export const OPS_BRIDGE_ENGINEERING_TASKS = ["synthetic_assignment_receipt"] as const;

export type OpsBridgeInboundAction = (typeof OPS_BRIDGE_INBOUND_ACTIONS)[number];

export const OPS_BRIDGE_PROTECTED_ACTIONS = [
  "publish_authorization",
  "merge_authorization",
  "push_authorization",
] as const;
