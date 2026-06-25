import { NextResponse } from "next/server";

import { addFeedbackToPrediction } from "@/lib/decision-learner/store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    predictionId?: string;
    correct?: boolean;
    note?: string;
    ownerDecision?: string;
  };

  if (!body.predictionId || typeof body.correct !== "boolean") {
    return NextResponse.json(
      { error: "predictionId and correct are required" },
      { status: 400 },
    );
  }

  if (!body.correct && !body.ownerDecision?.trim()) {
    return NextResponse.json(
      { error: "ownerDecision is required when marking Wrong" },
      { status: 400 },
    );
  }

  const result = await addFeedbackToPrediction(body.predictionId, {
    correct: body.correct,
    note: body.note?.trim() ?? "",
    ownerDecision: body.ownerDecision?.trim(),
    createdAt: new Date().toISOString(),
  });

  if (!result) {
    return NextResponse.json(
      { error: "Prediction not found or already reviewed" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
