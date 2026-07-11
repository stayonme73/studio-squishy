"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import MaterialsUpdateBranch from "@/components/campaign-details/MaterialsUpdateBranch";
import SquishyStatusPanel from "@/components/squishy/SquishyStatusPanel";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import {
  isDirectApplyTargetKey,
  readOfficialFieldValue,
} from "@/lib/customer-field-tokens";
import type { CustomerTimelineItem } from "@/lib/project-activity/types";
import type { CustomerPendingProjectChangeConsent } from "@/lib/project-activity/customer-view";
import {
  buildClarifyingQuestion,
  buildProjectChangeConsentExplanation,
  buildReviewSummary,
  buildReviewSummaryFields,
  buildSubmitTarget,
  extractRequestedValue,
  isMaterialIntent,
  isReadOnlyIntent,
  matchProjectRecordIntent,
  resolveGroundedAnswer,
  resolveMaterialKeyFromUtterance,
  resolveSquishyProjectRecordMessage,
  SQUISHY_PROJECT_RECORD_GROUNDED_COPY,
  validateRequestedValue,
  type MaterialUiKey,
  type ProjectRecordIntentMatch,
  type ProjectRecordSquishySnapshot,
  type ReviewSummaryFields,
} from "@/lib/project-record-squishy";

const copy = studioBoard.campaignDetails.informationUpdate;

type ConversationLine = {
  id: string;
  speaker: "customer" | "squishy";
  text: string;
};

type Phase =
  | "input"
  | "clarifying"
  | "review"
  | "materials"
  | "awaiting-confirmation"
  | "project-change-consent"
  | "done";

type Props = {
  campaign: CampaignRecord;
  snapshot: ProjectRecordSquishySnapshot;
  activityEvents: readonly CustomerTimelineItem[];
  pendingProjectChangeConsent: CustomerPendingProjectChangeConsent | null;
  onActivityRefresh: () => Promise<void>;
  onGreeted: () => void;
};

function lineId(): string {
  return crypto.randomUUID();
}

function readPreviousValueForMatch(
  campaign: CampaignRecord,
  match: ProjectRecordIntentMatch,
): string | null {
  if (!match.targetKey || !isDirectApplyTargetKey(match.targetKey)) return null;
  return readOfficialFieldValue(campaign, match.targetKey);
}

export default function ProjectRecordSquishy({
  campaign,
  snapshot,
  activityEvents,
  pendingProjectChangeConsent,
  onActivityRefresh,
  onGreeted,
}: Props) {
  const [lines, setLines] = useState<ConversationLine[]>([]);
  const [phase, setPhase] = useState<Phase>("input");
  const [input, setInput] = useState("");
  const [activeMatch, setActiveMatch] = useState<ProjectRecordIntentMatch | null>(null);
  const [reviewFields, setReviewFields] = useState<ReviewSummaryFields | null>(null);
  const [confirmDisclaimer, setConfirmDisclaimer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestJustConfirmed, setRequestJustConfirmed] = useState(false);
  const [materialKey, setMaterialKey] = useState<MaterialUiKey | null>(null);
  const [submitRequestId, setSubmitRequestId] = useState<string | null>(null);
  const [awaitingActivityCopyShown, setAwaitingActivityCopyShown] = useState(false);
  const [consentRequestId, setConsentRequestId] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const submitInFlightRef = useRef(false);
  const activityRefreshAttemptedRef = useRef(false);

  const statusMessage = useMemo(
    () =>
      resolveSquishyProjectRecordMessage({
        ...snapshot,
        requestJustConfirmed,
      }),
    [snapshot, requestJustConfirmed],
  );

  useEffect(() => {
    if (!pendingProjectChangeConsent) return;
    if (phase !== "input" && phase !== "project-change-consent") return;
    if (consentRequestId === pendingProjectChangeConsent.requestId && phase === "project-change-consent") {
      return;
    }

    setConsentRequestId(pendingProjectChangeConsent.requestId);
    setLines([
      {
        id: lineId(),
        speaker: "squishy",
        text: buildProjectChangeConsentExplanation(pendingProjectChangeConsent),
      },
    ]);
    setPhase("project-change-consent");
    setError(null);
  }, [pendingProjectChangeConsent, phase, consentRequestId]);

  useEffect(() => {
    if (statusMessage?.key === "first-paid-visit") {
      onGreeted();
    }
  }, [statusMessage, onGreeted]);

  useEffect(() => {
    if (!submitRequestId) return;
    const confirmed = activityEvents.some(
      (event) => event.kind === "request_received" && event.requestId === submitRequestId,
    );
    if (confirmed) {
      setLines((current) => [
        ...current,
        {
          id: lineId(),
          speaker: "squishy",
          text: SQUISHY_PROJECT_RECORD_GROUNDED_COPY.requestReceived,
        },
      ]);
      setRequestJustConfirmed(true);
      setPhase("done");
      setSubmitRequestId(null);
      setAwaitingActivityCopyShown(false);
      activityRefreshAttemptedRef.current = false;
      return;
    }

    if (activityRefreshAttemptedRef.current && !awaitingActivityCopyShown) {
      setLines((current) => [
        ...current,
        {
          id: lineId(),
          speaker: "squishy",
          text: SQUISHY_PROJECT_RECORD_GROUNDED_COPY.submittedAwaitingActivity,
        },
      ]);
      setAwaitingActivityCopyShown(true);
      setPhase("awaiting-confirmation");
    }
  }, [activityEvents, submitRequestId, awaitingActivityCopyShown]);

  function appendCustomer(text: string) {
    setLines((current) => [...current, { id: lineId(), speaker: "customer", text }]);
  }

  function appendSquishy(text: string) {
    setLines((current) => [...current, { id: lineId(), speaker: "squishy", text }]);
  }

  function resetConversation(options?: { cancelled?: boolean }) {
    if (options?.cancelled && (phase === "review" || phase === "clarifying")) {
      appendSquishy(SQUISHY_PROJECT_RECORD_GROUNDED_COPY.nothingSubmitted);
    }
    setPhase("input");
    setActiveMatch(null);
    setReviewFields(null);
    setConfirmDisclaimer(false);
    setError(null);
    setMaterialKey(null);
    setRequestJustConfirmed(false);
    setSubmitRequestId(null);
    setAwaitingActivityCopyShown(false);
    setConsentRequestId(null);
    activityRefreshAttemptedRef.current = false;
    setInput("");
    idempotencyKeyRef.current = crypto.randomUUID();
    submitInFlightRef.current = false;
  }

  function enterReview(match: ProjectRecordIntentMatch, requestedValue: string) {
    const validationError = validateRequestedValue(match, requestedValue);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setReviewFields(
      buildReviewSummaryFields(match, requestedValue, readPreviousValueForMatch(campaign, match)),
    );
    appendSquishy(buildReviewSummary(match, requestedValue).text);
    setPhase("review");
    setConfirmDisclaimer(false);
  }

  function handleUtterance(utterance: string) {
    const trimmed = utterance.trim();
    if (!trimmed) return;

    appendCustomer(trimmed);
    const match = matchProjectRecordIntent(trimmed);
    setActiveMatch(match);
    setError(null);

    if (isReadOnlyIntent(match.intent)) {
      const answer = resolveGroundedAnswer(snapshot, match);
      if (answer) appendSquishy(answer.text);
      setPhase("input");
      return;
    }

    if (isMaterialIntent(match)) {
      const resolvedMaterial = match.materialKey ?? resolveMaterialKeyFromUtterance(trimmed);
      const answer = resolveGroundedAnswer(snapshot, match);
      if (answer) appendSquishy(answer.text);
      if (resolvedMaterial) {
        setMaterialKey(resolvedMaterial);
        setPhase("materials");
      } else {
        appendSquishy(buildClarifyingQuestion(match));
        setPhase("clarifying");
      }
      return;
    }

    if (match.intent === "scope_change") {
      const answer = resolveGroundedAnswer(snapshot, match);
      if (answer) appendSquishy(answer.text);
      const value = extractRequestedValue(trimmed) ?? (trimmed.split(/\s+/).length >= 4 ? trimmed : "");
      if (!value) {
        appendSquishy(buildClarifyingQuestion(match));
        setPhase("clarifying");
        return;
      }
      enterReview(match, value);
      return;
    }

    if (match.intent === "unknown") {
      appendSquishy(resolveGroundedAnswer(snapshot, match)?.text ?? SQUISHY_PROJECT_RECORD_GROUNDED_COPY.unknown);
      setPhase("input");
      return;
    }

    const value = extractRequestedValue(trimmed);
    if (!value) {
      appendSquishy(buildClarifyingQuestion(match));
      setPhase("clarifying");
      return;
    }

    enterReview(match, value);
  }

  function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "input") return;
    handleUtterance(input);
    setInput("");
  }

  function handleClarify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "clarifying" || !activeMatch) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    appendCustomer(trimmed);
    setError(null);

    if (activeMatch.intent === "upload_file" && !materialKey) {
      const resolved = resolveMaterialKeyFromUtterance(trimmed);
      if (!resolved) {
        appendSquishy(buildClarifyingQuestion(activeMatch));
        setInput("");
        return;
      }
      setMaterialKey(resolved);
      appendSquishy(
        resolveGroundedAnswer(snapshot, { ...activeMatch, materialKey: resolved })?.text ??
          SQUISHY_PROJECT_RECORD_GROUNDED_COPY.materialsHandoff("file"),
      );
      setPhase("materials");
      setInput("");
      return;
    }

    enterReview(activeMatch, trimmed);
    setInput("");
  }

  function handleReviewValueChange(nextValue: string) {
    if (!activeMatch || !reviewFields) return;
    setReviewFields({
      ...reviewFields,
      requestedValue: nextValue,
    });
    setConfirmDisclaimer(false);
    idempotencyKeyRef.current = crypto.randomUUID();
    setError(null);
  }

  async function handleConfirmSubmit() {
    if (phase !== "review" || !activeMatch || !reviewFields || !confirmDisclaimer) return;
    if (submitting || submitInFlightRef.current) return;

    const validationError = validateRequestedValue(activeMatch, reviewFields.requestedValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    const submitTarget = buildSubmitTarget(activeMatch, reviewFields.requestedValue) ?? {
      targetKey: activeMatch.targetKey ?? "clarification",
      requestedValue: reviewFields.requestedValue.trim(),
    };

    if (!submitTarget.requestedValue.trim()) {
      setError("Please provide the requested value before submitting.");
      return;
    }

    submitInFlightRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaign.campaignId}/project-activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_request",
          idempotencyKey: idempotencyKeyRef.current,
          targetKey: submitTarget.targetKey,
          requestedValue: submitTarget.requestedValue,
          confirmScopeDisclaimer: true,
        }),
      });
      const body = (await res.json()) as {
        requestId?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Could not submit request.");
        return;
      }

      if (!body.requestId) {
        setError("The server did not confirm your request. Nothing was submitted.");
        return;
      }

      setSubmitRequestId(body.requestId);
      activityRefreshAttemptedRef.current = true;
      await onActivityRefresh();
      setConfirmDisclaimer(false);
    } catch {
      setError("Could not submit request.");
    } finally {
      setSubmitting(false);
      submitInFlightRef.current = false;
    }
  }

  async function handleConsentResponse(response: "granted" | "declined") {
    if (phase !== "project-change-consent" || !pendingProjectChangeConsent) return;
    if (submitting || submitInFlightRef.current) return;

    submitInFlightRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaign.campaignId}/project-activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond_project_change_consent",
          requestId: pendingProjectChangeConsent.requestId,
          response,
        }),
      });
      const body = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(body.error ?? "Could not record your response.");
        return;
      }

      appendSquishy(
        response === "granted"
          ? SQUISHY_PROJECT_RECORD_GROUNDED_COPY.consentGranted
          : SQUISHY_PROJECT_RECORD_GROUNDED_COPY.consentDeclined,
      );
      setPhase("done");
      setConsentRequestId(null);
      await onActivityRefresh();
    } catch {
      setError("Could not record your response.");
    } finally {
      setSubmitting(false);
      submitInFlightRef.current = false;
    }
  }

  return (
    <section className="utility-card cd-card--squishy" aria-labelledby="cd-squishy-title">
      <h2 id="cd-squishy-title" className="utility-card__title">
        {studioBoard.campaignDetails.squishy.title}
      </h2>
      <p className="cd-journey__lead">{studioBoard.campaignDetails.squishy.lead}</p>

      <SquishyStatusPanel message={statusMessage} classNamePrefix="cd-squishy" />

      {lines.length > 0 ? (
        <div className="cd-squishy__conversation" aria-live="polite">
          {lines.map((line) => (
            <p
              key={line.id}
              className={
                line.speaker === "customer"
                  ? "cd-squishy__line cd-squishy__line--customer"
                  : "cd-squishy__line cd-squishy__line--squishy"
              }
            >
              {line.speaker === "squishy" ? (
                <>
                  <span className="cd-squishy__speaker">Squishy</span> {line.text}
                </>
              ) : (
                line.text
              )}
            </p>
          ))}
        </div>
      ) : null}

      {phase === "project-change-consent" && pendingProjectChangeConsent ? (
        <div className="cd-squishy__consent">
          <div className="cd-squishy__actions">
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={submitting}
              onClick={() => void handleConsentResponse("granted")}
            >
              {SQUISHY_PROJECT_RECORD_GROUNDED_COPY.consentGrantLabel}
            </button>
            <button
              type="button"
              className="utility-btn utility-btn--secondary"
              disabled={submitting}
              onClick={() => void handleConsentResponse("declined")}
            >
              {SQUISHY_PROJECT_RECORD_GROUNDED_COPY.consentDeclineLabel}
            </button>
          </div>
        </div>
      ) : null}

      {phase === "input" ? (
        <form className="cd-squishy__form" onSubmit={handleAsk}>
          <label className="cd-squishy__label" htmlFor="cd-squishy-input">
            {studioBoard.campaignDetails.squishy.prompt}
          </label>
          <textarea
            id="cd-squishy-input"
            className="cd-squishy__textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder={studioBoard.campaignDetails.squishy.placeholder}
          />
          <button type="submit" className="utility-btn utility-btn--secondary" disabled={!input.trim()}>
            {studioBoard.campaignDetails.squishy.askLabel}
          </button>
        </form>
      ) : null}

      {phase === "clarifying" ? (
        <form className="cd-squishy__form" onSubmit={handleClarify}>
          <label className="cd-squishy__label" htmlFor="cd-squishy-clarify">
            {buildClarifyingQuestion(activeMatch ?? { intent: "unknown" })}
          </label>
          <textarea
            id="cd-squishy-clarify"
            className="cd-squishy__textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
          />
          <div className="cd-squishy__actions">
            <button
              type="button"
              className="utility-btn utility-btn--secondary"
              onClick={() => resetConversation({ cancelled: true })}
            >
              {copy.backLabel}
            </button>
            <button type="submit" className="utility-btn utility-btn--secondary" disabled={!input.trim()}>
              {studioBoard.campaignDetails.squishy.continueLabel}
            </button>
          </div>
        </form>
      ) : null}

      {phase === "review" && reviewFields ? (
        <div className="cd-squishy__review">
          <p className="cd-squishy__review-lead">{copy.reviewHint}</p>
          <dl className="cd-squishy__review-fields">
            <div className="cd-squishy__review-row">
              <dt>Field</dt>
              <dd>{reviewFields.targetLabel}</dd>
            </div>
            {reviewFields.previousValue ? (
              <div className="cd-squishy__review-row">
                <dt>Current value</dt>
                <dd>{reviewFields.previousValue}</dd>
              </div>
            ) : null}
            <div className="cd-squishy__review-row">
              <dt>Requested value</dt>
              <dd>
                <textarea
                  className="cd-squishy__textarea"
                  value={reviewFields.requestedValue}
                  onChange={(event) => handleReviewValueChange(event.target.value)}
                  rows={2}
                  aria-label="Requested value"
                />
              </dd>
            </div>
          </dl>
          <label className="cd-information-update__confirm">
            <input
              type="checkbox"
              checked={confirmDisclaimer}
              onChange={(event) => setConfirmDisclaimer(event.target.checked)}
            />
            {copy.scopeDisclaimer}
          </label>
          <div className="cd-squishy__actions">
            <button
              type="button"
              className="utility-btn utility-btn--secondary"
              onClick={() => resetConversation({ cancelled: true })}
            >
              {copy.backLabel}
            </button>
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={!confirmDisclaimer || submitting}
              onClick={() => void handleConfirmSubmit()}
            >
              {submitting ? copy.submittingLabel : copy.submitLabel}
            </button>
          </div>
        </div>
      ) : null}

      {phase === "materials" && materialKey ? (
        <div className="cd-squishy__materials">
          <button
            type="button"
            className="utility-btn utility-btn--secondary"
            onClick={() => resetConversation({ cancelled: true })}
          >
            ← {copy.backLabel}
          </button>
          <MaterialsUpdateBranch
            campaign={campaign}
            onSubmitted={() => {
              void onActivityRefresh();
              resetConversation();
            }}
          />
        </div>
      ) : null}

      {phase === "done" || phase === "awaiting-confirmation" ? (
        <button type="button" className="utility-btn utility-btn--secondary" onClick={() => resetConversation()}>
          {studioBoard.campaignDetails.squishy.askAnotherLabel}
        </button>
      ) : null}

      {error ? (
        <p className="cd-information-update__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
