"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  AccuracyStats,
  DecisionCase,
  PredictionRecord,
} from "@/lib/decision-learner/types";

type CaseForm = {
  situation: string;
  decision: string;
  rationale: string;
};

const emptyCaseForm: CaseForm = {
  situation: "",
  decision: "",
  rationale: "",
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return payload;
}

export default function DecisionLearnerApp() {
  const [policy, setPolicy] = useState("");
  const [policyDraft, setPolicyDraft] = useState("");
  const [policyStatus, setPolicyStatus] = useState("");
  const [cases, setCases] = useState<DecisionCase[]>([]);
  const [caseForm, setCaseForm] = useState<CaseForm>(emptyCaseForm);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState("");

  const [newSituation, setNewSituation] = useState("");
  const [predictStatus, setPredictStatus] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [activePrediction, setActivePrediction] =
    useState<PredictionRecord | null>(null);

  const [feedbackNote, setFeedbackNote] = useState("");
  const [ownerDecision, setOwnerDecision] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [loadError, setLoadError] = useState("");

  const refreshCases = useCallback(async () => {
    const data = await readJson<{ cases: DecisionCase[] }>(
      await fetch("/api/decision-learner/cases"),
    );
    setCases(data.cases);
  }, []);

  const refreshStats = useCallback(async () => {
    const data = await readJson<{
      stats: AccuracyStats;
      predictions: PredictionRecord[];
    }>(await fetch("/api/decision-learner/stats"));
    setStats(data.stats);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setLoadError("");
      const [policyData] = await Promise.all([
        readJson<{ policy: string }>(await fetch("/api/decision-learner/policy")),
        refreshCases(),
        refreshStats(),
      ]);
      setPolicy(policyData.policy);
      setPolicyDraft(policyData.policy);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load.");
    }
  }, [refreshCases, refreshStats]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function savePolicy() {
    setPolicyStatus("Saving…");
    try {
      await readJson(
        await fetch("/api/decision-learner/policy", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ policy: policyDraft }),
        }),
      );
      setPolicy(policyDraft);
      setPolicyStatus("Saved.");
    } catch (error) {
      setPolicyStatus(
        error instanceof Error ? error.message : "Could not save policy.",
      );
    }
  }

  function startEdit(entry: DecisionCase) {
    setEditingCaseId(entry.id);
    setCaseForm({
      situation: entry.situation,
      decision: entry.decision,
      rationale: entry.rationale,
    });
    setCaseStatus("");
  }

  function resetCaseForm() {
    setEditingCaseId(null);
    setCaseForm(emptyCaseForm);
  }

  async function submitCase(event: React.FormEvent) {
    event.preventDefault();
    setCaseStatus("Saving…");
    try {
      if (editingCaseId) {
        await readJson(
          await fetch(`/api/decision-learner/cases/${editingCaseId}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(caseForm),
          }),
        );
        setCaseStatus("Case updated.");
      } else {
        await readJson(
          await fetch("/api/decision-learner/cases", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(caseForm),
          }),
        );
        setCaseStatus("Case added.");
      }
      resetCaseForm();
      await refreshCases();
    } catch (error) {
      setCaseStatus(
        error instanceof Error ? error.message : "Could not save case.",
      );
    }
  }

  async function removeCase(id: string) {
    if (!window.confirm("Delete this case?")) return;
    setCaseStatus("Deleting…");
    try {
      await readJson(
        await fetch(`/api/decision-learner/cases/${id}`, { method: "DELETE" }),
      );
      if (editingCaseId === id) resetCaseForm();
      setCaseStatus("Case deleted.");
      await refreshCases();
    } catch (error) {
      setCaseStatus(
        error instanceof Error ? error.message : "Could not delete case.",
      );
    }
  }

  async function runPrediction(event: React.FormEvent) {
    event.preventDefault();
    setPredictStatus("");
    setPredicting(true);
    setActivePrediction(null);
    setFeedbackNote("");
    setOwnerDecision("");
    setFeedbackStatus("");

    try {
      const data = await readJson<{ prediction: PredictionRecord }>(
        await fetch("/api/decision-learner/predict", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ situation: newSituation }),
        }),
      );
      setActivePrediction(data.prediction);
      setPredictStatus("Prediction ready. Mark correct or wrong below.");
      await refreshStats();
    } catch (error) {
      setPredictStatus(
        error instanceof Error ? error.message : "Prediction failed.",
      );
    } finally {
      setPredicting(false);
    }
  }

  async function submitFeedback(correct: boolean) {
    if (!activePrediction) return;
    if (!correct && !ownerDecision.trim()) {
      setFeedbackStatus("Enter what you would decide when marking Wrong.");
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackStatus("Saving feedback…");
    try {
      await readJson(
        await fetch("/api/decision-learner/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            predictionId: activePrediction.id,
            correct,
            note: feedbackNote,
            ownerDecision: correct ? undefined : ownerDecision,
          }),
        }),
      );
      setFeedbackStatus(
        correct
          ? "Marked correct. Added to case log."
          : "Marked wrong. Correction added to case log.",
      );
      setActivePrediction(null);
      setNewSituation("");
      setFeedbackNote("");
      setOwnerDecision("");
      await Promise.all([refreshCases(), refreshStats()]);
    } catch (error) {
      setFeedbackStatus(
        error instanceof Error ? error.message : "Could not save feedback.",
      );
    } finally {
      setSubmittingFeedback(false);
    }
  }

  return (
    <>
      <header className="decision-learner__header">
        <h1>Decision Learner</h1>
        <p>
          Research prototype — teach policy + past decisions, then test whether
          AI predicts your calls on new situations.
        </p>
      </header>

      <main className="decision-learner__main">
        {loadError ? <p className="status error">{loadError}</p> : null}

        <section className="decision-learner__panel">
          <h2>1. Policy &amp; Rules</h2>
          <p className="help">
            Free-form notes: thresholds, exceptions, philosophy, examples of
            past calls.
          </p>
          <div className="field">
            <label htmlFor="policy">Owner policy notes</label>
            <textarea
              id="policy"
              className="tall"
              value={policyDraft}
              onChange={(event) => setPolicyDraft(event.target.value)}
              placeholder="Example: Approve rush jobs only if client pays 25% rush fee and timeline is at least 5 business days..."
            />
          </div>
          <div className="row">
            <button type="button" className="primary" onClick={() => void savePolicy()}>
              Save policy
            </button>
            <span className="status">{policyStatus}</span>
            {policy ? (
              <span className="status">{policy.length.toLocaleString()} chars saved</span>
            ) : null}
          </div>
        </section>

        <section className="decision-learner__panel">
          <h2>2. Case Log</h2>
          <p className="help">Past decisions you made — the training examples.</p>
          <form onSubmit={(event) => void submitCase(event)}>
            <div className="field">
              <label htmlFor="case-situation">Situation</label>
              <textarea
                id="case-situation"
                value={caseForm.situation}
                onChange={(event) =>
                  setCaseForm((prev) => ({
                    ...prev,
                    situation: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="case-decision">What I decided</label>
              <input
                id="case-decision"
                type="text"
                value={caseForm.decision}
                onChange={(event) =>
                  setCaseForm((prev) => ({
                    ...prev,
                    decision: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="case-rationale">Why</label>
              <textarea
                id="case-rationale"
                value={caseForm.rationale}
                onChange={(event) =>
                  setCaseForm((prev) => ({
                    ...prev,
                    rationale: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="row">
              <button type="submit" className="primary">
                {editingCaseId ? "Update case" : "Add case"}
              </button>
              {editingCaseId ? (
                <button type="button" onClick={resetCaseForm}>
                  Cancel edit
                </button>
              ) : null}
              <span className="status">{caseStatus}</span>
            </div>
          </form>

          <div className="case-list">
            {cases.length === 0 ? (
              <p className="status">No cases yet.</p>
            ) : (
              cases.map((entry) => (
                <article key={entry.id} className="case-card">
                  <div className="case-card__meta">
                    <span>
                      {new Date(entry.createdAt).toLocaleString()} ·{" "}
                      <span className="tag">{entry.source}</span>
                    </span>
                    <span className="row">
                      <button type="button" onClick={() => startEdit(entry)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => void removeCase(entry.id)}>
                        Delete
                      </button>
                    </span>
                  </div>
                  <h3>Situation</h3>
                  <p>{entry.situation}</p>
                  <h3>Decision</h3>
                  <p>{entry.decision}</p>
                  <h3>Why</h3>
                  <p>{entry.rationale}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="decision-learner__panel">
          <h2>3. New Case Tester</h2>
          <p className="help">
            Enter a new situation. Sends policy + all cases + situation to
            Claude.
          </p>
          <form onSubmit={(event) => void runPrediction(event)}>
            <div className="field">
              <label htmlFor="new-situation">New situation</label>
              <textarea
                id="new-situation"
                value={newSituation}
                onChange={(event) => setNewSituation(event.target.value)}
                required
                placeholder="Describe a situation you have not decided yet..."
              />
            </div>
            <div className="row">
              <button type="submit" className="primary" disabled={predicting}>
                {predicting ? "Predicting…" : "Predict my decision"}
              </button>
              <span className={`status${predictStatus.includes("failed") || predictStatus.includes("error") ? " error" : ""}`}>
                {predictStatus}
              </span>
            </div>
          </form>

          {activePrediction ? (
            <div className="prediction">
              <h3>AI prediction</h3>
              <p>
                <strong>Decision:</strong> {activePrediction.predictedDecision}
              </p>
              <p>
                <strong>Why:</strong> {activePrediction.predictedRationale}
              </p>
              {activePrediction.citations.length > 0 ? (
                <>
                  <strong>Citations</strong>
                  <ul>
                    {activePrediction.citations.map((citation) => (
                      <li key={citation}>{citation}</li>
                    ))}
                  </ul>
                </>
              ) : null}

              <h3 style={{ marginTop: "1rem" }}>4. Feedback loop</h3>
              <p className="help">
                Mark the prediction. Wrong answers become new case log entries
                so the system improves.
              </p>
              <div className="field">
                <label htmlFor="feedback-note">Note (optional for Correct)</label>
                <textarea
                  id="feedback-note"
                  value={feedbackNote}
                  onChange={(event) => setFeedbackNote(event.target.value)}
                  placeholder="What it missed, nuance, or confirmation note..."
                />
              </div>
              <div className="field">
                <label htmlFor="owner-decision">
                  What you would decide (required if Wrong)
                </label>
                <input
                  id="owner-decision"
                  type="text"
                  value={ownerDecision}
                  onChange={(event) => setOwnerDecision(event.target.value)}
                  placeholder="Only needed when marking Wrong"
                />
              </div>
              <div className="row">
                <button
                  type="button"
                  className="good"
                  disabled={submittingFeedback}
                  onClick={() => void submitFeedback(true)}
                >
                  Correct
                </button>
                <button
                  type="button"
                  className="bad"
                  disabled={submittingFeedback}
                  onClick={() => void submitFeedback(false)}
                >
                  Wrong
                </button>
                <span className="status">{feedbackStatus}</span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="decision-learner__panel">
          <h2>5. Results dashboard</h2>
          <p className="help">Accuracy over reviewed predictions.</p>
          {stats ? (
            <>
              <div className="stats-grid">
                <div className="stat">
                  <strong>
                    {stats.accuracyRate === null ? "—" : `${stats.accuracyRate}%`}
                  </strong>
                  <span>Accuracy rate</span>
                </div>
                <div className="stat">
                  <strong>{stats.reviewedPredictions}</strong>
                  <span>Reviewed predictions</span>
                </div>
                <div className="stat">
                  <strong>{stats.correctCount}</strong>
                  <span>Marked correct</span>
                </div>
                <div className="stat">
                  <strong>{stats.totalPredictions}</strong>
                  <span>Total predictions</span>
                </div>
              </div>

              {stats.history.length > 0 ? (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Result</th>
                      <th>Running accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.history.map((row) => (
                      <tr key={row.predictionId}>
                        <td>{new Date(row.createdAt).toLocaleString()}</td>
                        <td>
                          <span className={`tag ${row.correct ? "good" : "bad"}`}>
                            {row.correct ? "Correct" : "Wrong"}
                          </span>
                        </td>
                        <td>{row.runningAccuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="status">No reviewed predictions yet.</p>
              )}
            </>
          ) : (
            <p className="status">Loading stats…</p>
          )}
        </section>
      </main>
    </>
  );
}
