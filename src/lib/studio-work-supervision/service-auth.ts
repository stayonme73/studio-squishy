import { timingSafeEqual } from "crypto";

import {
  SUPERVISION_AUTH_HEADER,
  SUPERVISION_DEV_PROOF_SECRET,
} from "./contract";

export type ServiceAuthResult =
  | { ok: true; source: "env" | "development_proof" }
  | { ok: false; status: 401 | 503; error: string };

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function expectedOperatingSecret(): string | null {
  const value = process.env.STUDIO_OPERATING_SWEEP_SECRET?.trim();
  return value ? value : null;
}

export function authorizeSupervisionService(request: Request): ServiceAuthResult {
  const provided = request.headers.get(SUPERVISION_AUTH_HEADER)?.trim() ?? "";
  const expected = expectedOperatingSecret();

  if (expected) {
    if (!provided || !secretsEqual(provided, expected)) {
      return { ok: false, status: 401, error: "Service authentication failed." };
    }
    return { ok: true, source: "env" };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      status: 503,
      error: "Supervision service secret is not configured.",
    };
  }

  if (!provided || !secretsEqual(provided, SUPERVISION_DEV_PROOF_SECRET)) {
    return { ok: false, status: 401, error: "Service authentication failed." };
  }
  return { ok: true, source: "development_proof" };
}

export function authFailedResponse(result: Extract<ServiceAuthResult, { ok: false }>) {
  return {
    error: result.error,
    status: result.status,
  };
}
