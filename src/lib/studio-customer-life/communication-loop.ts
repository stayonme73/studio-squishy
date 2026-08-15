import { promises as fs } from "fs";
import path from "path";

import {
  studioVoiceMachineCustomerCommunicationV1 as comm,
  type CustomerCommunicationAskState,
} from "@/config/studio-voice-machine-customer-communication-v1";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import type { ProjectCommunicationMessage } from "@/lib/project-communication/types";

import { answerCustomerLifeQuestion, classifyCustomerLifeQuestion } from "./answer-question";
import { assembleCustomerLifeTruth } from "./assemble-truth";
import type {
  CustomerLifeAnswer,
  CustomerLifeAskResult,
  CustomerLifeTruth,
} from "./types";

const LIFE_DIR = path.join(process.cwd(), "data", "campaign-customer-life");

export type CustomerLifeReceipt = {
  askedAt: string;
  question: string;
  intent: string;
  answer: string;
  known: boolean;
  commMessageId?: string;
  askState: CustomerCommunicationAskState;
  source: "machine_record" | "none";
};

export type CustomerLifeMayaResponse = {
  respondedAt: string;
  body: string;
  requestId: string;
  acknowledgedText: string;
  stallCleared: boolean;
};

export type CustomerLifeEnvelope = {
  campaignId: string;
  updatedAt: string;
  asks: CustomerLifeReceipt[];
  mayaResponses: CustomerLifeMayaResponse[];
};

export type StudioCustomerRequestView = {
  id: string;
  prompt: string;
  reason: string;
  status: "open";
};

export type MachineAnswerView = {
  text: string;
  known: boolean;
  source: "machine_record" | "none";
  intent: string;
  askState: CustomerCommunicationAskState;
  lookupFailed?: boolean;
};

export type CustomerCommunicationLoopResult = {
  answer: CustomerLifeAnswer;
  truth: CustomerLifeTruth;
  confirmation: string;
  machineAnswer: MachineAnswerView;
  studioRequests: StudioCustomerRequestView[];
  mayaResponse?: CustomerLifeMayaResponse;
};

export function resolveCustomerAskState(input: {
  known: boolean;
  askedAt: string;
  stored?: CustomerCommunicationAskState;
  nowMs?: number;
  stallAfterMs?: number;
}): CustomerCommunicationAskState {
  if (input.stored === "waiting_for_customer" || input.stored === "answered") {
    return input.stored;
  }
  if (input.known) return "answered";
  const askedAtMs = Date.parse(input.askedAt);
  const nowMs = input.nowMs ?? Date.now();
  const stallAfterMs = input.stallAfterMs ?? comm.unansweredQuestionStallMs;
  if (Number.isFinite(askedAtMs) && nowMs - askedAtMs >= stallAfterMs) {
    return "stalled";
  }
  return "waiting_for_studio";
}

export function resolveStudioCustomerRequests(
  truth: CustomerLifeTruth,
): StudioCustomerRequestView[] {
  return truth.stalls
    .filter((stall) => stall.recoveryClass === "waiting_on_customer")
    .map((stall) => ({
      id: stall.id,
      prompt:
        stall.id === "awaiting_intake"
          ? comm.customerCopy.intakeRequest
          : stall.id === "upload_needs_usable_version"
            ? comm.customerCopy.unusableFileRequest
            : stall.id === "awaiting_materials"
              ? comm.customerCopy.materialsRequest
              : stall.summary,
      reason: stall.summary,
      status: "open" as const,
    }));
}

export async function readCustomerLifeEnvelope(
  campaignId: string,
): Promise<CustomerLifeEnvelope> {
  try {
    const raw = await fs.readFile(path.join(LIFE_DIR, `${campaignId}.json`), "utf8");
    const parsed = JSON.parse(raw) as Partial<CustomerLifeEnvelope> & {
      asks?: Array<Partial<CustomerLifeReceipt>>;
    };
    return {
      campaignId: parsed.campaignId ?? campaignId,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      asks: (parsed.asks ?? []).map((ask) => ({
        askedAt: ask.askedAt ?? new Date().toISOString(),
        question: ask.question ?? "",
        intent: ask.intent ?? "unknown",
        answer: ask.answer ?? "",
        known: Boolean(ask.known),
        commMessageId: ask.commMessageId,
        askState: ask.askState ?? (ask.known ? "answered" : "waiting_for_studio"),
        source: ask.source ?? "machine_record",
      })),
      mayaResponses: parsed.mayaResponses ?? [],
    };
  } catch {
    return {
      campaignId,
      updatedAt: new Date().toISOString(),
      asks: [],
      mayaResponses: [],
    };
  }
}

async function writeCustomerLifeEnvelope(envelope: CustomerLifeEnvelope): Promise<void> {
  await fs.mkdir(LIFE_DIR, { recursive: true });
  await fs.writeFile(
    path.join(LIFE_DIR, `${envelope.campaignId}.json`),
    `${JSON.stringify(envelope, null, 2)}\n`,
    "utf8",
  );
}

async function loadFacts(input: {
  campaignId: string | null;
  campaignOverride?: import("@/config/studio-board").CampaignRecord | null;
}) {
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
  return { campaign, campaignId, materials, tasks };
}

export async function askCustomerLifeFromStore(input: {
  campaignId: string | null;
  question: string;
  campaignOverride?: import("@/config/studio-board").CampaignRecord | null;
  commMessageId?: string;
}): Promise<CustomerLifeAskResult> {
  const facts = await loadFacts(input);
  const answer = answerCustomerLifeQuestion(input.question, facts);
  const truth = assembleCustomerLifeTruth(facts);
  const askedAt = new Date().toISOString();
  const askState = resolveCustomerAskState({
    known: answer.known,
    askedAt,
  });

  if (facts.campaignId) {
    const envelope = await readCustomerLifeEnvelope(facts.campaignId);
    envelope.asks.push({
      askedAt,
      question: input.question,
      intent: answer.intent,
      answer: answer.text,
      known: answer.known,
      commMessageId: input.commMessageId,
      askState,
      source: answer.source,
    });
    envelope.updatedAt = askedAt;
    await writeCustomerLifeEnvelope(envelope);
  }

  return { answer, truth };
}

function looksLikeCustomerQuestion(text: string): boolean {
  return text.trim().endsWith("?");
}

export async function handleCustomerBoardQuestion(input: {
  campaignId: string;
  question: string;
  commMessageId: string;
}): Promise<CustomerCommunicationLoopResult> {
  let lookupFailed = false;
  let result: CustomerLifeAskResult;
  try {
    result = await askCustomerLifeFromStore({
      campaignId: input.campaignId,
      question: input.question,
      commMessageId: input.commMessageId,
    });
  } catch {
    lookupFailed = true;
    const facts = await loadFacts({ campaignId: input.campaignId }).catch(() => ({
      campaign: null as import("@/config/studio-board").CampaignRecord | null,
      campaignId: input.campaignId,
      materials: [] as const,
      tasks: null,
    }));
    const truth = assembleCustomerLifeTruth(facts);
    result = {
      answer: {
        intent: classifyCustomerLifeQuestion(input.question),
        text: comm.customerCopy.lookupFailed,
        known: false,
        phase: truth.phase,
        source: "none",
      },
      truth,
    };
  }

  const studioRequests = resolveStudioCustomerRequests(result.truth);
  const latestAsk = (await readCustomerLifeEnvelope(input.campaignId)).asks
    .filter((ask) => ask.commMessageId === input.commMessageId)
    .at(-1);
  const askState =
    latestAsk?.askState ??
    resolveCustomerAskState({
      known: result.answer.known && !lookupFailed,
      askedAt: new Date().toISOString(),
    });

  let mayaResponse: CustomerLifeMayaResponse | undefined;
  if (
    result.answer.intent === "unknown" &&
    studioRequests.length > 0 &&
    !lookupFailed &&
    !looksLikeCustomerQuestion(input.question)
  ) {
    mayaResponse = await recordMayaResponseToStudioRequest({
      campaignId: input.campaignId,
      body: input.question,
      requestId: studioRequests[0]!.id,
      truth: result.truth,
    });
    const envelope = await readCustomerLifeEnvelope(input.campaignId);
    const idx = envelope.asks.findLastIndex(
      (ask) => ask.commMessageId === input.commMessageId,
    );
    if (idx >= 0) {
      envelope.asks[idx] = {
        ...envelope.asks[idx]!,
        answer: mayaResponse.acknowledgedText,
        known: true,
        askState: mayaResponse.stallCleared ? "answered" : "waiting_for_customer",
      };
      envelope.updatedAt = new Date().toISOString();
      await fs.writeFile(
        path.join(LIFE_DIR, `${envelope.campaignId}.json`),
        `${JSON.stringify(envelope, null, 2)}\n`,
        "utf8",
      );
    }
  }

  const confirmation = lookupFailed
    ? comm.customerCopy.messageReceivedLookupFailed
    : mayaResponse
      ? mayaResponse.acknowledgedText
      : result.answer.known
        ? comm.customerCopy.messageReceivedAnswered
        : comm.customerCopy.messageReceivedUnknown;

  return {
    answer: result.answer,
    truth: result.truth,
    confirmation,
    machineAnswer: {
      text: lookupFailed
        ? comm.customerCopy.lookupFailed
        : mayaResponse
          ? mayaResponse.acknowledgedText
          : result.answer.text,
      known: lookupFailed ? false : mayaResponse ? true : result.answer.known,
      source: result.answer.source,
      intent: result.answer.intent,
      askState: mayaResponse
        ? mayaResponse.stallCleared
          ? "answered"
          : "waiting_for_customer"
        : askState,
      lookupFailed,
    },
    studioRequests,
    mayaResponse,
  };
}

export async function recordMayaResponseToStudioRequest(input: {
  campaignId: string;
  body: string;
  requestId: string;
  truth?: CustomerLifeTruth;
}): Promise<CustomerLifeMayaResponse> {
  const facts = input.truth
    ? null
    : await loadFacts({ campaignId: input.campaignId });
  const truth = input.truth ?? assembleCustomerLifeTruth(facts!);
  const stillOpen = resolveStudioCustomerRequests(truth).some(
    (request) => request.id === input.requestId,
  );
  const acknowledgedText = stillOpen
    ? comm.customerCopy.responseAckStillWaiting
    : comm.customerCopy.responseAckCleared;
  const row: CustomerLifeMayaResponse = {
    respondedAt: new Date().toISOString(),
    body: input.body,
    requestId: input.requestId,
    acknowledgedText,
    stallCleared: !stillOpen,
  };
  const envelope = await readCustomerLifeEnvelope(input.campaignId);
  envelope.mayaResponses.push(row);
  envelope.updatedAt = row.respondedAt;
  await writeCustomerLifeEnvelope(envelope);
  return row;
}

export function machineAnswerForMessage(
  envelope: CustomerLifeEnvelope,
  message: Pick<ProjectCommunicationMessage, "id" | "body" | "senderRole">,
  nowMs = Date.now(),
): MachineAnswerView | null {
  if (message.senderRole !== "customer") return null;
  const receipt =
    envelope.asks.filter((ask) => ask.commMessageId === message.id).at(-1) ??
    envelope.asks.filter((ask) => ask.question.trim() === message.body.trim()).at(-1);
  if (!receipt) return null;
  const askState = resolveCustomerAskState({
    known: receipt.known,
    askedAt: receipt.askedAt,
    stored: receipt.askState,
    nowMs,
  });
  return {
    text: receipt.answer,
    known: receipt.known,
    source: receipt.source,
    intent: receipt.intent,
    askState,
  };
}

export async function readCustomerLifeStatus(campaignId: string | null): Promise<{
  truth: CustomerLifeTruth;
  studioRequests: StudioCustomerRequestView[];
  asks: CustomerLifeReceipt[];
  mayaResponses: CustomerLifeMayaResponse[];
  summary: {
    answered: number;
    waitingForCustomer: number;
    waitingForStudio: number;
    stalled: number;
  };
}> {
  const facts = await loadFacts({ campaignId });
  const truth = assembleCustomerLifeTruth(facts);
  const envelope = facts.campaignId
    ? await readCustomerLifeEnvelope(facts.campaignId)
    : {
        campaignId: campaignId ?? "",
        updatedAt: new Date().toISOString(),
        asks: [] as CustomerLifeReceipt[],
        mayaResponses: [] as CustomerLifeMayaResponse[],
      };
  const nowMs = Date.now();
  const asks = envelope.asks.map((ask) => ({
    ...ask,
    askState: resolveCustomerAskState({
      known: ask.known,
      askedAt: ask.askedAt,
      stored: ask.askState,
      nowMs,
    }),
  }));
  const studioRequests = resolveStudioCustomerRequests(truth);
  const summary = {
    answered: asks.filter((ask) => ask.askState === "answered").length,
    waitingForCustomer: studioRequests.length,
    waitingForStudio: asks.filter((ask) => ask.askState === "waiting_for_studio").length,
    stalled: asks.filter((ask) => ask.askState === "stalled").length,
  };
  return {
    truth,
    studioRequests,
    asks,
    mayaResponses: envelope.mayaResponses,
    summary,
  };
}
