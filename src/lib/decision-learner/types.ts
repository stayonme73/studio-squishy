export type CaseSource = "manual" | "feedback-correct" | "feedback-correction";

export type DecisionCase = {
  id: string;
  situation: string;
  decision: string;
  rationale: string;
  source: CaseSource;
  createdAt: string;
  updatedAt: string;
};

export type PredictionFeedback = {
  correct: boolean;
  note: string;
  ownerDecision?: string;
  createdAt: string;
};

export type PredictionRecord = {
  id: string;
  situation: string;
  predictedDecision: string;
  predictedRationale: string;
  citations: string[];
  createdAt: string;
  feedback?: PredictionFeedback;
};

export type DecisionLearnerStore = {
  policy: string;
  cases: DecisionCase[];
  predictions: PredictionRecord[];
  updatedAt: string;
};

export type AccuracyStats = {
  totalPredictions: number;
  reviewedPredictions: number;
  correctCount: number;
  accuracyRate: number | null;
  history: Array<{
    predictionId: string;
    createdAt: string;
    correct: boolean;
    runningAccuracy: number;
  }>;
};

export type AiPredictionResponse = {
  decision: string;
  rationale: string;
  citations: string[];
};
