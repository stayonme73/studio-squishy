/**
 * Provider-independent worker registration and heartbeat contract.
 * Registering a worker does not connect Claude, Build-A-Bot, Make, or Resend.
 */

export const SUPERVISION_REGISTER_PATH =
  "/api/operating/supervision/register" as const;
export const SUPERVISION_HEARTBEAT_PATH =
  "/api/operating/supervision/heartbeat" as const;
export const SUPERVISION_SWEEP_PATH =
  "/api/operating/supervision/sweep" as const;
export const SUPERVISION_AUTH_HEADER = "x-studio-operating-secret" as const;
export const SUPERVISION_IDEMPOTENCY_HEADER = "idempotency-key" as const;

/** Local development only. Never a production credential. Never a connected provider. */
export const SUPERVISION_DEV_PROOF_SECRET =
  "studio-supervision-dev-proof-only" as const;

export const WORKER_SELF_CERTIFY_KEYS = [
  "health",
  "healthy",
  "selfCertified",
  "certifiedHealth",
  "certifiedStatus",
] as const;

export const WORKER_REGISTRATION_RULES = {
  workerCannotSelfCertify: true as const,
  machineComputesHealth: true as const,
  registrationDoesNotConnectProviders: true as const,
  unconnectedProvidersStayCoverageNotConnected: [
    "claude",
    "build_a_bot",
    "make",
    "resend",
  ] as const,
};
