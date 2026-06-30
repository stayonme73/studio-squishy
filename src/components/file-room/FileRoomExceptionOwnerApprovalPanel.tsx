"use client";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { materialCategoryLabel } from "@/config/materials";
import { AD_HOC_MATERIAL_CATEGORIES } from "@/lib/materials/promotion";
import { validateClientFacingPromotionField } from "@/lib/materials/client-facing-validation";
import type { FileRoomExceptionRow } from "@/lib/campaign-tasks/exceptions-view";
import type { FileRoomExceptionOperatorContext } from "@/lib/campaign-tasks/exceptions-view";
import type { DefaultClientWording } from "@/lib/campaign-tasks/exceptions-promotion-view";

export type OwnerApprovalFormState = {
  clientFacingLabel: string;
  clientFacingPrompt: string;
  whyNeeded: string;
  category: DefaultClientWording["category"];
  holdInstruction: string;
  holdAssignToUserId: string;
  declineReason: string;
  decisionMode: "approve" | "hold" | "decline" | null;
};

export function emptyOwnerApprovalForm(
  wording: DefaultClientWording,
): OwnerApprovalFormState {
  return {
    clientFacingLabel: wording.clientFacingLabel,
    clientFacingPrompt: wording.clientFacingPrompt,
    whyNeeded: wording.whyNeeded,
    category: wording.category,
    holdInstruction: "",
    holdAssignToUserId: "",
    declineReason: "",
    decisionMode: null,
  };
}

type FileRoomExceptionOwnerApprovalPanelProps = {
  row: FileRoomExceptionRow;
  form: OwnerApprovalFormState;
  busy: boolean;
  operatorContext: FileRoomExceptionOperatorContext;
  onChange: (next: OwnerApprovalFormState) => void;
  onApprove: () => void;
  onHold: () => void;
  onDecline: () => void;
  onCancel: () => void;
};

export default function FileRoomExceptionOwnerApprovalPanel({
  row,
  form,
  busy,
  operatorContext,
  onChange,
  onApprove,
  onHold,
  onDecline,
  onCancel,
}: FileRoomExceptionOwnerApprovalPanelProps) {
  const { promotion } = row;
  const slotPreview = promotion.slotPreview;

  const labelValidation = validateClientFacingPromotionField(
    form.clientFacingLabel,
    "clientFacingLabel",
  );
  const promptValidation = validateClientFacingPromotionField(
    form.clientFacingPrompt,
    "clientFacingPrompt",
  );
  const whyValidation = validateClientFacingPromotionField(form.whyNeeded, "whyNeeded");
  const clientWordingError =
    labelValidation.ok === false
      ? labelValidation.error
      : promptValidation.ok === false
        ? promptValidation.error
        : whyValidation.ok === false
          ? whyValidation.error
          : null;

  const canSubmitApprove =
    labelValidation.ok && promptValidation.ok && whyValidation.ok;

  const canSubmitHold = form.holdInstruction.trim().length > 0;
  const canSubmitDecline = form.declineReason.trim().length > 0;

  return (
    <div className="fr-exception-promotion">
      <p className="fr-exception-promotion__title">
        {campaignExceptionsConfig.promotionPanelTitle}
      </p>

      <section className="fr-exception-promotion__zone" aria-label="Internal context">
        <h4 className="fr-exception-promotion__zone-label">
          {campaignExceptionsConfig.promotionInternalZoneLabel}
        </h4>
        <p className="fr-exception-promotion__internal">
          {promotion.internalContext ?? campaignExceptionsConfig.promotionNoInternalContext}
        </p>
        {row.taskTitle ? (
          <p className="fr-exception-row__meta">
            {campaignExceptionsConfig.linkedTaskLabel}: {row.taskTitle}
          </p>
        ) : null}
        {promotion.holdStateLabel ? (
          <span className="fr-exception-badge fr-exception-badge--hold">
            {campaignExceptionsConfig.promotionHoldBadge}
          </span>
        ) : null}
        {promotion.promotionDeclined ? (
          <span className="fr-exception-badge fr-exception-badge--declined">
            {campaignExceptionsConfig.promotionDeclinedBadge}
          </span>
        ) : null}
      </section>

      <section className="fr-exception-promotion__zone" aria-label="Client-facing wording">
        <h4 className="fr-exception-promotion__zone-label">
          {campaignExceptionsConfig.promotionClientZoneLabel}
        </h4>

        <label className="fr-exception-panel__field">
          <span>{campaignExceptionsConfig.promotionCategoryField}</span>
          <select
            className="fr-exception-panel__select"
            value={form.category}
            disabled={busy}
            onChange={(event) =>
              onChange({
                ...form,
                category: event.target.value as OwnerApprovalFormState["category"],
              })
            }
          >
            {AD_HOC_MATERIAL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {materialCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="fr-exception-panel__field">
          <span>{campaignExceptionsConfig.promotionClientLabelField}</span>
          <input
            className="fr-exception-panel__input"
            value={form.clientFacingLabel}
            disabled={busy}
            onChange={(event) => onChange({ ...form, clientFacingLabel: event.target.value })}
          />
        </label>

        <label className="fr-exception-panel__field">
          <span>{campaignExceptionsConfig.promotionClientPromptField}</span>
          <textarea
            className="fr-exception-panel__textarea"
            value={form.clientFacingPrompt}
            disabled={busy}
            rows={2}
            onChange={(event) => onChange({ ...form, clientFacingPrompt: event.target.value })}
          />
        </label>

        <label className="fr-exception-panel__field">
          <span>{campaignExceptionsConfig.promotionWhyNeededField}</span>
          <textarea
            className="fr-exception-panel__textarea"
            value={form.whyNeeded}
            disabled={busy}
            rows={2}
            onChange={(event) => onChange({ ...form, whyNeeded: event.target.value })}
          />
        </label>

        {slotPreview ? (
          <div className="fr-exception-promotion__slot-preview">
            <p className="fr-exception-promotion__slot-label">
              {campaignExceptionsConfig.promotionSlotPreviewLabel}
            </p>
            <p className="fr-exception-row__meta">
              {slotPreview.mode === "attach_existing"
                ? campaignExceptionsConfig.promotionSlotAttachLabel
                : campaignExceptionsConfig.promotionSlotCreateLabel}
              {": "}
              {slotPreview.itemLabels.join(", ")}
            </p>
          </div>
        ) : null}
      </section>

      {clientWordingError ? (
        <p className="fr-exception-promotion__validation" role="alert">
          {clientWordingError}
        </p>
      ) : null}

      <section className="fr-exception-promotion__zone" aria-label="Owner decision">
        <h4 className="fr-exception-promotion__zone-label">
          {campaignExceptionsConfig.promotionDecisionZoneLabel}
        </h4>

        {form.decisionMode === "hold" ? (
          <>
            <label className="fr-exception-panel__field">
              <span>{campaignExceptionsConfig.promotionHoldInstructionLabel}</span>
              <textarea
                className="fr-exception-panel__textarea"
                value={form.holdInstruction}
                disabled={busy}
                rows={2}
                placeholder={campaignExceptionsConfig.promotionHoldInstructionPlaceholder}
                onChange={(event) => onChange({ ...form, holdInstruction: event.target.value })}
              />
            </label>
            <label className="fr-exception-panel__field">
              <span>{campaignExceptionsConfig.promotionHoldAssignLabel}</span>
              <select
                className="fr-exception-panel__select"
                value={form.holdAssignToUserId}
                disabled={busy}
                onChange={(event) =>
                  onChange({ ...form, holdAssignToUserId: event.target.value })
                }
              >
                <option value="">No assignee</option>
                {operatorContext.assignCandidates
                  .filter((candidate) => !candidate.isOwner)
                  .map((candidate) => (
                    <option key={candidate.userId} value={candidate.userId}>
                      {candidate.displayName}
                    </option>
                  ))}
              </select>
            </label>
            <div className="fr-exception-panel__actions">
              <button
                type="button"
                className="utility-btn utility-btn--primary"
                disabled={busy || !canSubmitHold}
                onClick={onHold}
              >
                {campaignExceptionsConfig.promotionHoldLabel}
              </button>
              <button
                type="button"
                className="utility-btn"
                disabled={busy}
                onClick={() => onChange({ ...form, decisionMode: null })}
              >
                Back
              </button>
            </div>
          </>
        ) : form.decisionMode === "decline" ? (
          <>
            <label className="fr-exception-panel__field">
              <span>{campaignExceptionsConfig.promotionDeclineReasonLabel}</span>
              <textarea
                className="fr-exception-panel__textarea"
                value={form.declineReason}
                disabled={busy}
                rows={2}
                placeholder={campaignExceptionsConfig.promotionDeclineReasonPlaceholder}
                onChange={(event) => onChange({ ...form, declineReason: event.target.value })}
              />
            </label>
            <div className="fr-exception-panel__actions">
              <button
                type="button"
                className="utility-btn utility-btn--primary"
                disabled={busy || !canSubmitDecline}
                onClick={onDecline}
              >
                {campaignExceptionsConfig.promotionDeclineLabel}
              </button>
              <button
                type="button"
                className="utility-btn"
                disabled={busy}
                onClick={() => onChange({ ...form, decisionMode: null })}
              >
                Back
              </button>
            </div>
          </>
        ) : (
          <div className="fr-exception-panel__actions">
            {promotion.canApprove ? (
              <button
                type="button"
                className="utility-btn utility-btn--primary"
                disabled={busy || !canSubmitApprove}
                onClick={onApprove}
              >
                {campaignExceptionsConfig.promotionApproveLabel}
              </button>
            ) : null}
            {promotion.canHold ? (
              <button
                type="button"
                className="utility-btn"
                disabled={busy}
                onClick={() => onChange({ ...form, decisionMode: "hold" })}
              >
                {campaignExceptionsConfig.promotionHoldLabel}
              </button>
            ) : null}
            {promotion.canDecline ? (
              <button
                type="button"
                className="utility-btn"
                disabled={busy}
                onClick={() => onChange({ ...form, decisionMode: "decline" })}
              >
                {campaignExceptionsConfig.promotionDeclineLabel}
              </button>
            ) : null}
            <button type="button" className="utility-btn" disabled={busy} onClick={onCancel}>
              Close
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
