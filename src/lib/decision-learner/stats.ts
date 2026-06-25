import type { AccuracyStats, PredictionRecord } from "./types";

export function computeAccuracyStats(
  predictions: PredictionRecord[],
): AccuracyStats {
  const reviewed = [...predictions]
    .filter((p) => p.feedback)
    .sort(
      (a, b) =>
        new Date(a.feedback!.createdAt).getTime() -
        new Date(b.feedback!.createdAt).getTime(),
    );

  let correctCount = 0;
  const history = reviewed.map((prediction, index) => {
    if (prediction.feedback?.correct) correctCount += 1;
    return {
      predictionId: prediction.id,
      createdAt: prediction.feedback!.createdAt,
      correct: prediction.feedback!.correct,
      runningAccuracy: Math.round((correctCount / (index + 1)) * 1000) / 10,
    };
  });

  return {
    totalPredictions: predictions.length,
    reviewedPredictions: reviewed.length,
    correctCount,
    accuracyRate:
      reviewed.length > 0
        ? Math.round((correctCount / reviewed.length) * 1000) / 10
        : null,
    history,
  };
}
