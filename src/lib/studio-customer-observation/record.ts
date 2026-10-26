import { randomUUID } from "crypto";
import { appendFile, mkdir } from "fs/promises";
import path from "path";

export const CUSTOMER_OBSERVATION_KINDS = [
  "delivery_problem",
  "satisfaction",
  "dissatisfaction",
  "suggestion",
  "help",
] as const;

export type CustomerObservationKind = (typeof CUSTOMER_OBSERVATION_KINDS)[number];

export type CustomerObservationRecord = {
  id: string;
  campaignId: string;
  jobId: string | null;
  userId: string;
  displayName: string;
  kind: CustomerObservationKind;
  note: string;
  recordedAt: string;
  route: "studio_learning";
  startsRevision: false;
  promisesRefund: false;
  promisesNewService: false;
  ownerDecisionRequired: false;
};

const DIR = path.join(process.cwd(), "data", "studio-customer-observations");
const FILE = path.join(DIR, "observations.jsonl");

export function isCustomerObservationKind(value: string): value is CustomerObservationKind {
  return (CUSTOMER_OBSERVATION_KINDS as readonly string[]).includes(value);
}

export async function recordCustomerObservation(
  input: Omit<CustomerObservationRecord, "id" | "recordedAt" | "route" | "startsRevision" | "promisesRefund" | "promisesNewService" | "ownerDecisionRequired">,
): Promise<CustomerObservationRecord> {
  const record: CustomerObservationRecord = {
    ...input,
    id: randomUUID(),
    recordedAt: new Date().toISOString(),
    route: "studio_learning",
    startsRevision: false,
    promisesRefund: false,
    promisesNewService: false,
    ownerDecisionRequired: false,
  };
  await mkdir(DIR, { recursive: true });
  await appendFile(FILE, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}
