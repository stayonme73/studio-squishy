import { promises as fs } from "fs";
import path from "path";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { readMaterialsEnvelope } from "@/lib/materials/store";

import { answerCustomerLifeQuestion } from "./answer-question";
import { assembleCustomerLifeTruth } from "./assemble-truth";
import type { CustomerLifeAskResult } from "./types";

const LIFE_DIR = path.join(process.cwd(), "data", "campaign-customer-life");

type LifeReceipt = {
  askedAt: string;
  question: string;
  intent: string;
  answer: string;
  known: boolean;
};

type LifeEnvelope = {
  campaignId: string;
  updatedAt: string;
  asks: LifeReceipt[];
};

async function readLifeEnvelope(campaignId: string): Promise<LifeEnvelope> {
  try {
    const raw = await fs.readFile(path.join(LIFE_DIR, `${campaignId}.json`), "utf8");
    return JSON.parse(raw) as LifeEnvelope;
  } catch {
    return { campaignId, updatedAt: new Date().toISOString(), asks: [] };
  }
}

async function writeLifeEnvelope(envelope: LifeEnvelope): Promise<void> {
  await fs.mkdir(LIFE_DIR, { recursive: true });
  await fs.writeFile(
    path.join(LIFE_DIR, `${envelope.campaignId}.json`),
    `${JSON.stringify(envelope, null, 2)}\n`,
    "utf8",
  );
}

/**
 * Voice → Machine truth → Voice. Records the question and the truthful answer.
 */
export async function askCustomerLifeFromStore(input: {
  campaignId: string | null;
  question: string;
  campaignOverride?: import("@/config/studio-board").CampaignRecord | null;
}): Promise<CustomerLifeAskResult> {
  const campaign =
    input.campaignOverride !== undefined
      ? input.campaignOverride
      : input.campaignId
        ? ((await readCampaignEnvelope(input.campaignId))?.record ?? null)
        : null;
  const campaignId = campaign?.campaignId ?? input.campaignId;
  const tasks = campaignId ? await readTasksEnvelope(campaignId) : null;
  const materials = campaignId
    ? ((await readMaterialsEnvelope(campaignId))?.items ?? [])
    : [];
  const facts = { campaign, materials, tasks };
  const answer = answerCustomerLifeQuestion(input.question, facts);
  const truth = assembleCustomerLifeTruth(facts);

  if (campaignId) {
    const envelope = await readLifeEnvelope(campaignId);
    envelope.asks.push({
      askedAt: new Date().toISOString(),
      question: input.question,
      intent: answer.intent,
      answer: answer.text,
      known: answer.known,
    });
    envelope.updatedAt = new Date().toISOString();
    await writeLifeEnvelope(envelope);
  }

  return { answer, truth };
}
