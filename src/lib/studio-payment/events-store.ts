import { promises as fs } from "fs";
import path from "path";

import { atomicReplaceFile, withCampaignWriteLock } from "@/lib/campaign-store/file-io";

const EVENTS_DIR = path.join(process.cwd(), "data", "payment-events");

export type ProcessedPaymentEvent = {
  eventId: string;
  campaignId: string;
  checkoutSessionId: string;
  processedAt: string;
  kind: "stripe_webhook" | "reconcile" | "sandbox";
};

function eventPath(eventId: string): string {
  const safe = eventId.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return path.join(EVENTS_DIR, `${safe}.json`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(EVENTS_DIR, { recursive: true });
}

export async function readProcessedPaymentEvent(
  eventId: string,
): Promise<ProcessedPaymentEvent | null> {
  try {
    const raw = await fs.readFile(eventPath(eventId), "utf8");
    return JSON.parse(raw) as ProcessedPaymentEvent;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeProcessedPaymentEvent(
  event: ProcessedPaymentEvent,
): Promise<ProcessedPaymentEvent> {
  return withCampaignWriteLock(`payment-event:${event.eventId}`, async () => {
    await ensureDir();
    await atomicReplaceFile(eventPath(event.eventId), JSON.stringify(event, null, 2));
    return event;
  });
}

/** Session → campaign binding to prevent transaction reuse across projects. */
export type CheckoutSessionBinding = {
  checkoutSessionId: string;
  campaignId: string;
  expectedAmountCents: number;
  currency: "usd";
  selectedServiceIds: readonly string[];
  decisionId: string;
  factFingerprint: string;
  draftRevision: number;
  createdAt: string;
  sandbox?: boolean;
  /**
   * Pay-per-cycle purchase (sm-001-monthly). Absent on sealed studio_plan checkouts.
   * When set, amount must include cyclePriceCents and confirm writes ledger authority only for this id.
   */
  purchaseKind?: "studio_plan" | "paid_cycle";
  paidCyclePurchaseId?: string;
  cycleSkuId?: "sm-001-monthly";
  cyclePriceCents?: number;
  /**
   * Sealed ma-001 pack composition at checkout authority (when ma-001 selected).
   */
  ma001CompositionSeal?: import("@/lib/studio-design-renderer/ma-001-composition-payment-gate").Ma001CompositionPaymentSeal;
  /**
   * Sealed rm-j002 kit lock at checkout authority (when rm-j002 selected).
   */
  rmj002KitSeal?: import("@/lib/studio-design-renderer/rm-j002-kit-payment-gate").RmJ002KitPaymentSeal;
  /**
   * Sealed rm-j008 Update Kit lock at checkout authority (when rm-j008 selected).
   */
  rmj008KitSeal?: import("@/lib/studio-design-renderer/rm-j008-kit-payment-gate").RmJ008KitPaymentSeal;
  /**
   * Sealed bf-001 Brand Identity Refresh package lock at checkout authority
   * (when bf-001 selected).
   */
  bf001PackageSeal?: import("@/lib/studio-design-renderer/bf-001-kit-payment-gate").Bf001PackagePaymentSeal;
  /**
   * Sealed rm-j007 Reference-Guided Promotion Update lock at checkout authority
   * (when rm-j007 selected).
   */
  rmj007UpdateSeal?: import("@/lib/studio-design-renderer/rm-j007-kit-payment-gate").RmJ007UpdatePaymentSeal;
};

const SESSIONS_DIR = path.join(process.cwd(), "data", "payment-sessions");

function sessionPath(sessionId: string): string {
  const safe = sessionId.replace(/[^a-zA-Z0-9_\-]/g, "_");
  return path.join(SESSIONS_DIR, `${safe}.json`);
}

export async function readCheckoutSessionBinding(
  checkoutSessionId: string,
): Promise<CheckoutSessionBinding | null> {
  try {
    const raw = await fs.readFile(sessionPath(checkoutSessionId), "utf8");
    return JSON.parse(raw) as CheckoutSessionBinding;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeCheckoutSessionBinding(
  binding: CheckoutSessionBinding,
): Promise<CheckoutSessionBinding> {
  return withCampaignWriteLock(`payment-session:${binding.checkoutSessionId}`, async () => {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    await atomicReplaceFile(
      sessionPath(binding.checkoutSessionId),
      JSON.stringify(binding, null, 2),
    );
    return binding;
  });
}
