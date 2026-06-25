import { NextResponse } from "next/server";

import { predictDecision } from "@/lib/decision-learner/anthropic";
import { buildPredictionPrompt } from "@/lib/decision-learner/prompt";
import {
  addPrediction,
  getPolicy,
  listCases,
} from "@/lib/decision-learner/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { situation?: string };
  if (!body.situation?.trim()) {
    return NextResponse.json(
      { error: "situation is required" },
      { status: 400 },
    );
  }

  try {
    const [policy, cases] = await Promise.all([getPolicy(), listCases()]);
    const prompt = buildPredictionPrompt({
      policy,
      cases,
      newSituation: body.situation,
    });

    const ai = await predictDecision(prompt);
    const prediction = await addPrediction({
      situation: body.situation,
      predictedDecision: ai.decision,
      predictedRationale: ai.rationale,
      citations: ai.citations,
    });

    return NextResponse.json({ prediction });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Prediction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
