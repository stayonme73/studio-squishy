import { isNextResponse, requireStaffOrOwner } from "@/lib/auth/require-session";
import { NextResponse } from "next/server";

import { sweepPaidActivationRecovery } from "@/lib/studio-paid-activation-recovery";

function cronSecretAuthorized(request: Request): boolean {
  const expected = process.env.STUDIO_OPERATING_SWEEP_SECRET?.trim();
  if (!expected) return false;
  const provided = request.headers.get("x-studio-operating-secret")?.trim();
  return Boolean(provided) && provided === expected;
}

/**
 * Durable paid-activation recovery sweep. Owner action is not required for the
 * recovery itself. This route exists so a restart/cron can wake stranded paid
 * projects without a customer browser session.
 */
export async function POST(request: Request) {
  if (!cronSecretAuthorized(request)) {
    const user = await requireStaffOrOwner(request);
    if (isNextResponse(user)) return user;
  }

  const result = await sweepPaidActivationRecovery();
  return NextResponse.json({
    ok: true,
    ownerActionRequired: result.ownerActionRequired,
    attempted: result.attempted,
    recovered: result.recovered,
    stillPending: result.stillPending,
  });
}
