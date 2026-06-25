import { NextResponse } from "next/server";

import { listPredictions } from "@/lib/decision-learner/store";
import { computeAccuracyStats } from "@/lib/decision-learner/stats";

export async function GET() {
  const predictions = await listPredictions();
  const stats = computeAccuracyStats(predictions);
  return NextResponse.json({ stats, predictions });
}
