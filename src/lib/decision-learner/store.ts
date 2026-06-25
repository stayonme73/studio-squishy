import { promises as fs } from "fs";
import path from "path";

import type {
  DecisionCase,
  DecisionLearnerStore,
  PredictionRecord,
} from "./types";

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "decision-learner.json");

function emptyStore(): DecisionLearnerStore {
  const now = new Date().toISOString();
  return {
    policy: "",
    cases: [],
    predictions: [],
    updatedAt: now,
  };
}

async function ensureStoreFile(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(
      STORE_PATH,
      JSON.stringify(emptyStore(), null, 2),
      "utf8",
    );
  }
}

export async function readStore(): Promise<DecisionLearnerStore> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  return JSON.parse(raw) as DecisionLearnerStore;
}

async function writeStore(store: DecisionLearnerStore): Promise<void> {
  store.updatedAt = new Date().toISOString();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function getPolicy(): Promise<string> {
  const store = await readStore();
  return store.policy;
}

export async function setPolicy(policy: string): Promise<void> {
  const store = await readStore();
  store.policy = policy;
  await writeStore(store);
}

export async function listCases(): Promise<DecisionCase[]> {
  const store = await readStore();
  return [...store.cases].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function createCase(
  input: Pick<DecisionCase, "situation" | "decision" | "rationale" | "source">,
): Promise<DecisionCase> {
  const store = await readStore();
  const now = new Date().toISOString();
  const entry: DecisionCase = {
    id: crypto.randomUUID(),
    situation: input.situation.trim(),
    decision: input.decision.trim(),
    rationale: input.rationale.trim(),
    source: input.source,
    createdAt: now,
    updatedAt: now,
  };
  store.cases.push(entry);
  await writeStore(store);
  return entry;
}

export async function updateCase(
  id: string,
  input: Pick<DecisionCase, "situation" | "decision" | "rationale">,
): Promise<DecisionCase | null> {
  const store = await readStore();
  const index = store.cases.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const existing = store.cases[index];
  const updated: DecisionCase = {
    ...existing,
    situation: input.situation.trim(),
    decision: input.decision.trim(),
    rationale: input.rationale.trim(),
    updatedAt: new Date().toISOString(),
  };
  store.cases[index] = updated;
  await writeStore(store);
  return updated;
}

export async function deleteCase(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.cases.length;
  store.cases = store.cases.filter((c) => c.id !== id);
  if (store.cases.length === before) return false;
  await writeStore(store);
  return true;
}

export async function addPrediction(
  input: Omit<PredictionRecord, "id" | "createdAt" | "feedback">,
): Promise<PredictionRecord> {
  const store = await readStore();
  const record: PredictionRecord = {
    id: crypto.randomUUID(),
    situation: input.situation.trim(),
    predictedDecision: input.predictedDecision.trim(),
    predictedRationale: input.predictedRationale.trim(),
    citations: input.citations,
    createdAt: new Date().toISOString(),
  };
  store.predictions.push(record);
  await writeStore(store);
  return record;
}

export async function addFeedbackToPrediction(
  predictionId: string,
  feedback: PredictionRecord["feedback"],
): Promise<{ prediction: PredictionRecord; newCase: DecisionCase } | null> {
  const store = await readStore();
  const index = store.predictions.findIndex((p) => p.id === predictionId);
  if (index === -1 || !feedback) return null;

  const prediction = store.predictions[index];
  if (prediction.feedback) return null;

  prediction.feedback = feedback;
  store.predictions[index] = prediction;

  const now = new Date().toISOString();
  const newCase: DecisionCase = feedback.correct
    ? {
        id: crypto.randomUUID(),
        situation: prediction.situation,
        decision: prediction.predictedDecision,
        rationale: [
          prediction.predictedRationale,
          feedback.note.trim()
            ? `Owner confirmed: ${feedback.note.trim()}`
            : "Owner confirmed this prediction was correct.",
        ].join("\n\n"),
        source: "feedback-correct",
        createdAt: now,
        updatedAt: now,
      }
    : {
        id: crypto.randomUUID(),
        situation: prediction.situation,
        decision: (feedback.ownerDecision ?? "").trim(),
        rationale: feedback.note.trim(),
        source: "feedback-correction",
        createdAt: now,
        updatedAt: now,
      };

  store.cases.push(newCase);
  await writeStore(store);
  return { prediction, newCase };
}

export async function listPredictions(): Promise<PredictionRecord[]> {
  const store = await readStore();
  return [...store.predictions].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
