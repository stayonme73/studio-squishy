"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { ownerConsole } from "@/config/owner-console";
import type { TasksPatchBody } from "@/lib/campaign-tasks/actions";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";
import type { OwnerConsoleSequentialItem } from "@/lib/campaign-tasks/owner-console-sequential";
import {
  resolveOwnerComplianceHoldPostDecisionBriefing,
  resolveOwnerComplaintPostDecisionBriefing,
  resolveOwnerDeadlinePostDecisionBriefing,
  resolveOwnerDirectionDisagreementPostDecisionBriefing,
  resolveOwnerHeavyLanePostDecisionBriefing,
  resolveOwnerRefundPostDecisionBriefing,
  resolveOwnerRevisionPostDecisionBriefing,
  resolveOwnerScopePostDecisionBriefing,
  resolveOwnerDeskJobPostDecisionBriefing,
  resolveOwnerPostDecisionBriefing,
  type OwnerComplaintDecisionAction,
  type OwnerComplianceHoldAction,
  type OwnerDeadlineDecisionAction,
  type OwnerDirectionDisagreementAction,
  type OwnerHeavyLaneDecisionAction,
  type OwnerRefundDecisionAction,
  type OwnerRevisionDecisionAction,
  type OwnerScopeDecisionAction,
  type OwnerDeskJobAction,
} from "@/studio-coordinator";
import type { OwnerDecisionFolderPatchBody } from "@/lib/campaign-tasks/owner-decision-folder-dispatch";
import { contentKindForCategory } from "@/lib/materials/promotion";

import {
  emptyAssignExceptionForm,
  type AssignExceptionFormState,
} from "./FileRoomExceptionAssignPanel";
import {
  emptyOwnerApprovalForm,
  type OwnerApprovalFormState,
} from "./FileRoomExceptionOwnerApprovalPanel";
import {
  emptyResolveExceptionForm,
  type ResolveExceptionFormState,
} from "./FileRoomExceptionResolvePanel";

export type OwnerConsolePanelMode = "assign" | "resolve" | "approve" | "reassign" | null;

function confirmIrreversible(message: string): boolean {
  if (typeof window === "undefined") return true;
  return window.confirm(message);
}

export function useOwnerConsoleActions() {
  const router = useRouter();
  const [rowPanel, setRowPanel] = useState<OwnerConsolePanelMode>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<AssignExceptionFormState>(
    emptyAssignExceptionForm(),
  );
  const [resolveForm, setResolveForm] = useState<ResolveExceptionFormState>(
    emptyResolveExceptionForm(),
  );
  const [approvalForm, setApprovalForm] = useState<OwnerApprovalFormState | null>(null);

  const resetPanels = () => {
    setRowPanel(null);
    setAssignForm(emptyAssignExceptionForm());
    setResolveForm(emptyResolveExceptionForm());
    setApprovalForm(null);
  };

  const patchTasks = async (
    campaignId: string,
    body: TasksPatchBody,
    destinationCard?: OwnerConsoleDecisionCard,
  ) => {
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(
          json.error ?? `${campaignExceptionsConfig.updateFailedMessage} (${res.status})`,
        );
      }

      resetPanels();
      if (body.action === "reassign") {
        setStatusMessage(ownerConsole.reassignSuccessHint);
      } else if (
        destinationCard &&
        (body.action === "resolve_exception" ||
          body.action === "approve_client_request" ||
          body.action === "assign_exception" ||
          body.action === "decline_promotion")
      ) {
        setStatusMessage(
          resolveOwnerPostDecisionBriefing(body.action, destinationCard).message,
        );
      }
      router.refresh();
    } catch (patchError) {
      setError(
        patchError instanceof Error
          ? patchError.message
          : campaignExceptionsConfig.updateFailedMessage,
      );
    } finally {
      setBusy(false);
    }
  };

  const openAssign = () => {
    setRowPanel("assign");
    setAssignForm(emptyAssignExceptionForm());
  };

  const openResolve = () => {
    setRowPanel("resolve");
    setResolveForm(emptyResolveExceptionForm());
  };

  const openApprove = (card: OwnerConsoleDecisionCard) => {
    setRowPanel("approve");
    setApprovalForm(emptyOwnerApprovalForm(card.row.promotion.defaultWording));
  };

  const openReassign = () => {
    setRowPanel("reassign");
  };

  const confirmAssign = (card: OwnerConsoleDecisionCard) => {
    if (!assignForm.assignToUserId) return;
    void patchTasks(
      card.campaignId,
      {
        action: "assign_exception",
        exceptionId: card.id,
        assignToUserId: assignForm.assignToUserId,
        notes: assignForm.notes.trim() || undefined,
      },
      card,
    );
  };

  const confirmResolve = (card: OwnerConsoleDecisionCard) => {
    if (!confirmIrreversible(ownerConsole.confirmResolve)) return;
    void patchTasks(
      card.campaignId,
      {
        action: "resolve_exception",
        exceptionId: card.id,
        resolutionNotes: resolveForm.resolutionNotes.trim() || undefined,
      },
      card,
    );
  };

  const confirmApprove = (card: OwnerConsoleDecisionCard, form: OwnerApprovalFormState) => {
    if (!confirmIrreversible(ownerConsole.confirmApprove)) return;
    void patchTasks(
      card.campaignId,
      {
        action: "approve_client_request",
        exceptionId: card.id,
        category: form.category,
        contentKind: contentKindForCategory(form.category),
        clientFacingLabel: form.clientFacingLabel.trim(),
        clientFacingPrompt: form.clientFacingPrompt.trim(),
        whyNeeded: form.whyNeeded.trim(),
        requirementLevel: "required",
      },
      card,
    );
  };

  const confirmHold = (card: OwnerConsoleDecisionCard, form: OwnerApprovalFormState) => {
    void patchTasks(
      card.campaignId,
      {
        action: "assign_exception",
        exceptionId: card.id,
        assignToUserId: form.holdAssignToUserId.trim() || undefined,
        notes: form.holdInstruction.trim(),
      },
      card,
    );
  };

  const confirmDecline = (card: OwnerConsoleDecisionCard, form: OwnerApprovalFormState) => {
    if (!confirmIrreversible(ownerConsole.confirmDecline)) return;
    void patchTasks(
      card.campaignId,
      {
        action: "decline_promotion",
        exceptionId: card.id,
        notes: form.declineReason.trim(),
      },
      card,
    );
  };

  const confirmApproveForReview = async (item: OwnerConsoleSequentialItem) => {
    await patchReviewGate(item, "owner_approve_for_review", {});
  };

  const confirmSendBackForReview = async (
    item: OwnerConsoleSequentialItem,
    note: string,
  ) => {
    if (!note.trim()) {
      setError("A note for production is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.reviewGate.confirmSendBack)) return;
    await patchReviewGate(item, "owner_send_back_for_review", { note: note.trim() });
  };

  const confirmHoldReviewGate = async (item: OwnerConsoleSequentialItem, note: string) => {
    if (!note.trim()) {
      setError("A hold note is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.reviewGate.confirmHold)) return;
    await patchReviewGate(item, "owner_hold_review_gate", { note: note.trim() });
  };

  const confirmAskTeamReviewGate = async (item: OwnerConsoleSequentialItem, note: string) => {
    if (!note.trim()) {
      setError("A note for the team is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.reviewGate.confirmAskTeam)) return;
    await patchReviewGate(item, "owner_ask_team_review_gate", { note: note.trim() });
  };

  const confirmAskClientReviewGate = async (
    item: OwnerConsoleSequentialItem,
    clientMessage: string,
  ) => {
    if (!clientMessage.trim()) {
      setError("Approved client-facing wording is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.reviewGate.confirmAskClient)) return;
    await patchReviewGate(item, "owner_ask_client_review_gate", {
      clientMessage: clientMessage.trim(),
    });
  };

  const patchReviewGate = async (
    item: OwnerConsoleSequentialItem,
    action: OwnerDeskJobAction,
    payload: { note?: string; clientMessage?: string },
  ) => {
    const desk = item.deskItem;
    if (!desk?.jobId || desk.reason !== "approval_before_review") return;

    if (action === "owner_approve_for_review") {
      if (!confirmIrreversible(ownerConsole.reviewGate.confirmApproveForReview)) return;
    }

    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const body =
        action === "owner_ask_client_review_gate"
          ? { action, clientMessage: payload.clientMessage ?? "" }
          : action === "owner_approve_for_review"
            ? { action }
            : { action, note: payload.note ?? "" };

      const res = await fetch(
        `/api/campaigns/${desk.campaignId}/jobs/${encodeURIComponent(desk.jobId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? `Job update failed (${res.status})`);
      }

      resetPanels();
      setStatusMessage(resolveOwnerDeskJobPostDecisionBriefing(action).message);
      router.refresh();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Job update failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmReleaseToClient = async (item: OwnerConsoleSequentialItem) => {
    await patchReleaseGate(item, "owner_final_release", {});
  };

  const confirmSendBackForRelease = async (item: OwnerConsoleSequentialItem, note: string) => {
    if (!note.trim()) {
      setError("A note for production is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.releaseGate.confirmSendBack)) return;
    await patchReleaseGate(item, "owner_send_back_for_release", { note: note.trim() });
  };

  const confirmHoldReleaseGate = async (item: OwnerConsoleSequentialItem, note: string) => {
    if (!note.trim()) {
      setError("A hold note is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.releaseGate.confirmHold)) return;
    await patchReleaseGate(item, "owner_hold_release_gate", { note: note.trim() });
  };

  const confirmAskTeamReleaseGate = async (item: OwnerConsoleSequentialItem, note: string) => {
    if (!note.trim()) {
      setError("A note for the team is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.releaseGate.confirmAskTeam)) return;
    await patchReleaseGate(item, "owner_ask_team_release_gate", { note: note.trim() });
  };

  const patchReleaseGate = async (
    item: OwnerConsoleSequentialItem,
    action: OwnerDeskJobAction,
    payload: { note?: string },
  ) => {
    const desk = item.deskItem;
    if (!desk?.jobId || desk.reason !== "approval_before_delivery") return;

    if (action === "owner_final_release") {
      if (!confirmIrreversible(ownerConsole.releaseGate.confirmRelease)) return;
    }

    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const body =
        action === "owner_final_release" ? { action } : { action, note: payload.note ?? "" };

      const res = await fetch(
        `/api/campaigns/${desk.campaignId}/jobs/${encodeURIComponent(desk.jobId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error ?? `Job update failed (${res.status})`);
      }

      resetPanels();
      setStatusMessage(resolveOwnerDeskJobPostDecisionBriefing(action).message);
      router.refresh();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Job update failed.");
    } finally {
      setBusy(false);
    }
  };

  const patchComplianceHold = async (
    card: OwnerConsoleDecisionCard,
    action: OwnerComplianceHoldAction,
    payload: { note?: string; ownerNotes?: string; assignToUserId?: string },
  ) => {
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const body =
        action === "owner_clear_compliance_hold"
          ? {
              action,
              exceptionId: card.id,
              ownerNotes: payload.ownerNotes?.trim() || undefined,
            }
          : action === "owner_assign_compliance_hold"
            ? {
                action,
                exceptionId: card.id,
                assignToUserId: payload.assignToUserId ?? "",
                ownerNotes: payload.ownerNotes?.trim() || undefined,
                note: payload.note?.trim() || undefined,
              }
            : {
                action,
                exceptionId: card.id,
                note: payload.note ?? "",
                ownerNotes: payload.ownerNotes?.trim() || undefined,
                assignToUserId: payload.assignToUserId?.trim() || undefined,
              };

      const res = await fetch(`/api/campaigns/${card.campaignId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(
          json.error ?? `${campaignExceptionsConfig.updateFailedMessage} (${res.status})`,
        );
      }

      resetPanels();
      setStatusMessage(resolveOwnerComplianceHoldPostDecisionBriefing(action).message);
      router.refresh();
    } catch (patchError) {
      setError(
        patchError instanceof Error
          ? patchError.message
          : campaignExceptionsConfig.updateFailedMessage,
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmClearComplianceHold = (
    card: OwnerConsoleDecisionCard,
    ownerNotes: string,
  ) => {
    if (!confirmIrreversible(ownerConsole.complianceHold.confirmClear)) return;
    void patchComplianceHold(card, "owner_clear_compliance_hold", { ownerNotes });
  };

  const confirmHoldComplianceHold = (
    card: OwnerConsoleDecisionCard,
    note: string,
    ownerNotes: string,
  ) => {
    if (!note.trim()) {
      setError("A hold note is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.complianceHold.confirmHold)) return;
    void patchComplianceHold(card, "owner_hold_compliance_hold", { note, ownerNotes });
  };

  const confirmAskTeamComplianceHold = (
    card: OwnerConsoleDecisionCard,
    note: string,
    ownerNotes: string,
    assignToUserId?: string,
  ) => {
    if (!note.trim()) {
      setError("A note for the team is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.complianceHold.confirmAskTeam)) return;
    void patchComplianceHold(card, "owner_ask_team_compliance_hold", {
      note,
      ownerNotes,
      assignToUserId,
    });
  };

  const confirmAssignComplianceHold = (
    card: OwnerConsoleDecisionCard,
    assignToUserId: string,
    ownerNotes: string,
    note: string,
  ) => {
    if (!assignToUserId.trim()) {
      setError("Assignee is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.complianceHold.confirmAssign)) return;
    void patchComplianceHold(card, "owner_assign_compliance_hold", {
      assignToUserId,
      ownerNotes,
      note,
    });
  };

  const patchDirectionDisagreement = async (
    card: OwnerConsoleDecisionCard,
    action: OwnerDirectionDisagreementAction,
    payload: { note?: string; ownerNotes?: string; assignToUserId?: string },
  ) => {
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const body =
        action === "owner_confirm_direction_disagreement"
          ? {
              action,
              exceptionId: card.id,
              ownerNotes: payload.ownerNotes?.trim() || undefined,
            }
          : action === "owner_assign_direction_disagreement"
            ? {
                action,
                exceptionId: card.id,
                assignToUserId: payload.assignToUserId ?? "",
                ownerNotes: payload.ownerNotes?.trim() || undefined,
                note: payload.note?.trim() || undefined,
              }
            : {
                action,
                exceptionId: card.id,
                note: payload.note ?? "",
                ownerNotes: payload.ownerNotes?.trim() || undefined,
                assignToUserId: payload.assignToUserId?.trim() || undefined,
              };

      const res = await fetch(`/api/campaigns/${card.campaignId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(
          json.error ?? `${campaignExceptionsConfig.updateFailedMessage} (${res.status})`,
        );
      }

      resetPanels();
      setStatusMessage(resolveOwnerDirectionDisagreementPostDecisionBriefing(action).message);
      router.refresh();
    } catch (patchError) {
      setError(
        patchError instanceof Error
          ? patchError.message
          : campaignExceptionsConfig.updateFailedMessage,
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDirectionDisagreement = (
    card: OwnerConsoleDecisionCard,
    ownerNotes: string,
  ) => {
    if (!confirmIrreversible(ownerConsole.directionDisagreement.confirmDirection)) return;
    void patchDirectionDisagreement(card, "owner_confirm_direction_disagreement", { ownerNotes });
  };

  const confirmHoldDirectionDisagreement = (
    card: OwnerConsoleDecisionCard,
    note: string,
    ownerNotes: string,
  ) => {
    if (!note.trim()) {
      setError("A hold note is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.directionDisagreement.confirmHold)) return;
    void patchDirectionDisagreement(card, "owner_hold_direction_disagreement", { note, ownerNotes });
  };

  const confirmAskTeamDirectionDisagreement = (
    card: OwnerConsoleDecisionCard,
    note: string,
    ownerNotes: string,
    assignToUserId?: string,
  ) => {
    if (!note.trim()) {
      setError("A note for the team is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.directionDisagreement.confirmAskTeam)) return;
    void patchDirectionDisagreement(card, "owner_ask_team_direction_disagreement", {
      note,
      ownerNotes,
      assignToUserId,
    });
  };

  const confirmAssignDirectionDisagreement = (
    card: OwnerConsoleDecisionCard,
    assignToUserId: string,
    ownerNotes: string,
    note: string,
  ) => {
    if (!assignToUserId.trim()) {
      setError("Assignee is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.directionDisagreement.confirmAssign)) return;
    void patchDirectionDisagreement(card, "owner_assign_direction_disagreement", {
      assignToUserId,
      ownerNotes,
      note,
    });
  };

  const patchOwnerDecisionFolder = async (
    card: OwnerConsoleDecisionCard,
    body: OwnerDecisionFolderPatchBody,
    briefingAction:
      | OwnerDeadlineDecisionAction
      | OwnerRevisionDecisionAction
      | OwnerScopeDecisionAction
      | OwnerComplaintDecisionAction,
    briefingResolver: (action: typeof briefingAction) => { message: string },
  ) => {
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${card.campaignId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(
          json.error ?? `${campaignExceptionsConfig.updateFailedMessage} (${res.status})`,
        );
      }
      resetPanels();
      setStatusMessage(briefingResolver(briefingAction).message);
      router.refresh();
    } catch (patchError) {
      setError(
        patchError instanceof Error
          ? patchError.message
          : campaignExceptionsConfig.updateFailedMessage,
      );
    } finally {
      setBusy(false);
    }
  };

  const patchOwnerDecisionFolderForInteraction = async (
    campaignId: string,
    body: OwnerDecisionFolderPatchBody,
    action: OwnerComplaintDecisionAction,
  ) => {
    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(
          json.error ?? `${campaignExceptionsConfig.updateFailedMessage} (${res.status})`,
        );
      }
      resetPanels();
      setStatusMessage(resolveOwnerComplaintPostDecisionBriefing(action).message);
      router.refresh();
    } catch (patchError) {
      setError(
        patchError instanceof Error
          ? patchError.message
          : campaignExceptionsConfig.updateFailedMessage,
      );
    } finally {
      setBusy(false);
    }
  };

  const patchJobDecision = async (
    item: OwnerConsoleSequentialItem,
    action: OwnerRefundDecisionAction | OwnerHeavyLaneDecisionAction,
    body: Record<string, unknown>,
    decision?: "wait" | "bump",
  ) => {
    const desk = item.deskItem;
    if (!desk?.jobId) return;

    setBusy(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(
        `/api/campaigns/${desk.campaignId}/jobs/${encodeURIComponent(desk.jobId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...body }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? `Job update failed (${res.status})`);
      }
      resetPanels();
      if (action === "owner_resolve_heavy_lane") {
        setStatusMessage(
          resolveOwnerHeavyLanePostDecisionBriefing(action, decision).message,
        );
      } else {
        setStatusMessage(resolveOwnerRefundPostDecisionBriefing(action as OwnerRefundDecisionAction).message);
      }
      router.refresh();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Job update failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmOwnerDecisionPrimary = (card: OwnerConsoleDecisionCard, ownerNotes: string) => {
    const kind = card.row.kind;
    if (kind === "deadline_commitment" || kind === "deadline_risk") {
      if (!confirmIrreversible(ownerConsole.deadlineDecision.confirmCommit)) return;
      void patchOwnerDecisionFolder(
        card,
        { action: "owner_commit_deadline", exceptionId: card.id, ownerNotes },
        "owner_commit_deadline",
        resolveOwnerDeadlinePostDecisionBriefing,
      );
      return;
    }
    if (kind === "revision_exhausted") {
      if (!confirmIrreversible(ownerConsole.revisionDecision.confirmAllow)) return;
      void patchOwnerDecisionFolder(
        card,
        { action: "owner_allow_revision", exceptionId: card.id, ownerNotes },
        "owner_allow_revision",
        resolveOwnerRevisionPostDecisionBriefing,
      );
      return;
    }
    if (kind === "scope_change") {
      if (!confirmIrreversible(ownerConsole.scopeDecision.confirmApprove)) return;
      void patchOwnerDecisionFolder(
        card,
        { action: "owner_approve_scope_change", exceptionId: card.id, ownerNotes },
        "owner_approve_scope_change",
        resolveOwnerScopePostDecisionBriefing,
      );
    }
  };

  const confirmOwnerDecisionSecondary = (card: OwnerConsoleDecisionCard, ownerNotes: string) => {
    const kind = card.row.kind;
    if (kind === "revision_exhausted") {
      if (!confirmIrreversible(ownerConsole.revisionDecision.confirmHoldFirm)) return;
      void patchOwnerDecisionFolder(
        card,
        { action: "owner_hold_firm_revision", exceptionId: card.id, ownerNotes },
        "owner_hold_firm_revision",
        resolveOwnerRevisionPostDecisionBriefing,
      );
      return;
    }
    if (kind === "scope_change") {
      if (!confirmIrreversible(ownerConsole.scopeDecision.confirmDecline)) return;
      void patchOwnerDecisionFolder(
        card,
        { action: "owner_decline_scope_change", exceptionId: card.id, ownerNotes },
        "owner_decline_scope_change",
        resolveOwnerScopePostDecisionBriefing,
      );
    }
  };

  const confirmOwnerDecisionHold = (
    card: OwnerConsoleDecisionCard,
    note: string,
    ownerNotes: string,
  ) => {
    if (!note.trim()) {
      setError("A hold note is required.");
      return;
    }
    const kind = card.row.kind;
    if (kind === "deadline_commitment" || kind === "deadline_risk") {
      if (!confirmIrreversible(ownerConsole.deadlineDecision.confirmHold)) return;
      void patchOwnerDecisionFolder(
        card,
        { action: "owner_hold_deadline", exceptionId: card.id, note, ownerNotes },
        "owner_hold_deadline",
        resolveOwnerDeadlinePostDecisionBriefing,
      );
    } else if (kind === "revision_exhausted") {
      if (!confirmIrreversible(ownerConsole.revisionDecision.confirmHold)) return;
      void patchOwnerDecisionFolder(
        card,
        { action: "owner_hold_revision", exceptionId: card.id, note, ownerNotes },
        "owner_hold_revision",
        resolveOwnerRevisionPostDecisionBriefing,
      );
    } else if (kind === "scope_change") {
      if (!confirmIrreversible(ownerConsole.scopeDecision.confirmHold)) return;
      void patchOwnerDecisionFolder(
        card,
        { action: "owner_hold_scope_change", exceptionId: card.id, note, ownerNotes },
        "owner_hold_scope_change",
        resolveOwnerScopePostDecisionBriefing,
      );
    }
  };

  const confirmOwnerDecisionAskTeam = (
    card: OwnerConsoleDecisionCard,
    note: string,
    ownerNotes: string,
    assignToUserId?: string,
  ) => {
    if (!note.trim()) {
      setError("A note for the team is required.");
      return;
    }
    const kind = card.row.kind;
    if (kind === "deadline_commitment" || kind === "deadline_risk") {
      if (!confirmIrreversible(ownerConsole.deadlineDecision.confirmAskTeam)) return;
      void patchOwnerDecisionFolder(
        card,
        {
          action: "owner_ask_team_deadline",
          exceptionId: card.id,
          note,
          ownerNotes,
          assignToUserId,
        },
        "owner_ask_team_deadline",
        resolveOwnerDeadlinePostDecisionBriefing,
      );
    } else if (kind === "revision_exhausted") {
      if (!confirmIrreversible(ownerConsole.revisionDecision.confirmAskTeam)) return;
      void patchOwnerDecisionFolder(
        card,
        {
          action: "owner_ask_team_revision",
          exceptionId: card.id,
          note,
          ownerNotes,
          assignToUserId,
        },
        "owner_ask_team_revision",
        resolveOwnerRevisionPostDecisionBriefing,
      );
    } else if (kind === "scope_change") {
      if (!confirmIrreversible(ownerConsole.scopeDecision.confirmAskTeam)) return;
      void patchOwnerDecisionFolder(
        card,
        {
          action: "owner_ask_team_scope_change",
          exceptionId: card.id,
          note,
          ownerNotes,
          assignToUserId,
        },
        "owner_ask_team_scope_change",
        resolveOwnerScopePostDecisionBriefing,
      );
    }
  };

  const confirmOwnerDecisionAskClient = (
    card: OwnerConsoleDecisionCard,
    clientMessage: string,
    ownerNotes: string,
  ) => {
    if (!clientMessage.trim()) {
      setError("Approved client-facing wording is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.deadlineDecision.confirmAskClient)) return;
    void patchOwnerDecisionFolder(
      card,
      {
        action: "owner_ask_client_deadline",
        exceptionId: card.id,
        clientMessage,
        ownerNotes,
      },
      "owner_ask_client_deadline",
      resolveOwnerDeadlinePostDecisionBriefing,
    );
  };

  const confirmOwnerDecisionAskClientInfo = (
    card: OwnerConsoleDecisionCard,
    clientMessage: string,
    ownerNotes: string,
  ) => {
    if (!clientMessage.trim()) {
      setError("Approved client-facing wording is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.scopeDecision.confirmAskClientInfo)) return;
    void patchOwnerDecisionFolder(
      card,
      {
        action: "owner_ask_client_info_scope_change",
        exceptionId: card.id,
        clientMessage,
        ownerNotes,
      },
      "owner_ask_client_info_scope_change",
      resolveOwnerScopePostDecisionBriefing,
    );
  };

  const confirmOwnerDecisionAskClientApproval = (
    card: OwnerConsoleDecisionCard,
    clientMessage: string,
    ownerNotes: string,
  ) => {
    if (!clientMessage.trim()) {
      setError("Approved client-facing wording is required.");
      return;
    }
    const kind = card.row.kind;
    if (kind === "revision_exhausted") {
      if (!confirmIrreversible(ownerConsole.revisionDecision.confirmAskClient)) return;
      void patchOwnerDecisionFolder(
        card,
        {
          action: "owner_ask_client_revision",
          exceptionId: card.id,
          clientMessage,
          ownerNotes,
        },
        "owner_ask_client_revision",
        resolveOwnerRevisionPostDecisionBriefing,
      );
    } else if (kind === "scope_change") {
      if (!confirmIrreversible(ownerConsole.scopeDecision.confirmAskClientApproval)) return;
      void patchOwnerDecisionFolder(
        card,
        {
          action: "owner_ask_client_approval_scope_change",
          exceptionId: card.id,
          clientMessage,
          ownerNotes,
        },
        "owner_ask_client_approval_scope_change",
        resolveOwnerScopePostDecisionBriefing,
      );
    }
  };

  const confirmOwnerDecisionAssign = (
    card: OwnerConsoleDecisionCard,
    assignToUserId: string,
    ownerNotes: string,
    note: string,
  ) => {
    if (!assignToUserId.trim()) {
      setError("Assignee is required.");
      return;
    }
    const kind = card.row.kind;
    if (kind === "deadline_commitment" || kind === "deadline_risk") {
      if (!confirmIrreversible(ownerConsole.deadlineDecision.confirmAssign)) return;
      void patchOwnerDecisionFolder(
        card,
        {
          action: "owner_assign_deadline",
          exceptionId: card.id,
          assignToUserId,
          ownerNotes,
          note,
        },
        "owner_assign_deadline",
        resolveOwnerDeadlinePostDecisionBriefing,
      );
    } else if (kind === "revision_exhausted") {
      if (!confirmIrreversible(ownerConsole.revisionDecision.confirmAssign)) return;
      void patchOwnerDecisionFolder(
        card,
        {
          action: "owner_assign_revision",
          exceptionId: card.id,
          assignToUserId,
          ownerNotes,
          note,
        },
        "owner_assign_revision",
        resolveOwnerRevisionPostDecisionBriefing,
      );
    } else if (kind === "scope_change") {
      if (!confirmIrreversible(ownerConsole.scopeDecision.confirmAssign)) return;
      void patchOwnerDecisionFolder(
        card,
        {
          action: "owner_assign_scope_change",
          exceptionId: card.id,
          assignToUserId,
          ownerNotes,
          note,
        },
        "owner_assign_scope_change",
        resolveOwnerScopePostDecisionBriefing,
      );
    }
  };

  const interactionIdFromItem = (item: OwnerConsoleSequentialItem) =>
    item.deskItem?.interactionId ?? item.deskItem?.id.replace(/^desk:complaint:/, "");

  const confirmApproveRefund = (item: OwnerConsoleSequentialItem, reason: string, ownerNotes: string) => {
    if (!reason.trim()) {
      setError("Refund reason is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.refundDecision.confirmApprove)) return;
    void patchJobDecision(item, "owner_approve_refund", { reason, ownerNotes });
  };

  const confirmDenyRefund = (item: OwnerConsoleSequentialItem, ownerNotes: string) => {
    if (!confirmIrreversible(ownerConsole.refundDecision.confirmDeny)) return;
    void patchJobDecision(item, "owner_deny_refund", { ownerNotes });
  };

  const confirmHoldRefund = (item: OwnerConsoleSequentialItem, note: string, ownerNotes: string) => {
    if (!note.trim()) {
      setError("A hold note is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.refundDecision.confirmHold)) return;
    void patchJobDecision(item, "owner_hold_refund", { note, ownerNotes });
  };

  const confirmAskTeamRefund = (item: OwnerConsoleSequentialItem, note: string, ownerNotes: string) => {
    if (!note.trim()) {
      setError("A note for the team is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.refundDecision.confirmAskTeam)) return;
    void patchJobDecision(item, "owner_ask_team_refund", { note, ownerNotes });
  };

  const confirmAskClientRefund = (
    item: OwnerConsoleSequentialItem,
    clientMessage: string,
    ownerNotes: string,
  ) => {
    if (!clientMessage.trim()) {
      setError("Approved client-facing wording is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.refundDecision.confirmAskClient)) return;
    void patchJobDecision(item, "owner_ask_client_refund", { clientMessage, ownerNotes });
  };

  const confirmHeavyLaneWait = (item: OwnerConsoleSequentialItem, ownerNotes: string) => {
    if (!confirmIrreversible(ownerConsole.heavyLaneDecision.confirmResolveWait)) return;
    void patchJobDecision(item, "owner_resolve_heavy_lane", { decision: "wait", ownerNotes }, "wait");
  };

  const confirmHeavyLaneBump = (item: OwnerConsoleSequentialItem, ownerNotes: string) => {
    if (!confirmIrreversible(ownerConsole.heavyLaneDecision.confirmResolveBump)) return;
    void patchJobDecision(item, "owner_resolve_heavy_lane", { decision: "bump", ownerNotes }, "bump");
  };

  const confirmAssignHeavyLane = (
    item: OwnerConsoleSequentialItem,
    note: string,
    ownerNotes: string,
  ) => {
    if (!note.trim()) {
      setError("A note for Producer is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.heavyLaneDecision.confirmAssign)) return;
    void patchJobDecision(item, "owner_assign_heavy_lane", { note, ownerNotes });
  };

  const confirmResolveComplaint = (
    item: OwnerConsoleSequentialItem,
    clientReply: string,
    ownerNotes: string,
  ) => {
    const interactionId = interactionIdFromItem(item);
    if (!interactionId) return;
    if (!clientReply.trim()) {
      setError("Approved client reply is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.complaintDecision.confirmResolve)) return;
    void patchOwnerDecisionFolderForInteraction(item.campaignId, {
      action: "owner_resolve_complaint",
      interactionId,
      clientReply,
      ownerNotes,
    }, "owner_resolve_complaint");
  };

  const confirmEscalateComplaintRefund = (item: OwnerConsoleSequentialItem, ownerNotes: string) => {
    const interactionId = interactionIdFromItem(item);
    if (!interactionId) return;
    if (!confirmIrreversible(ownerConsole.complaintDecision.confirmEscalate)) return;
    void patchOwnerDecisionFolderForInteraction(item.campaignId, {
      action: "owner_escalate_complaint_refund",
      interactionId,
      ownerNotes,
    }, "owner_escalate_complaint_refund");
  };

  const confirmEscalateComplaintScope = (item: OwnerConsoleSequentialItem, ownerNotes: string) => {
    const interactionId = interactionIdFromItem(item);
    if (!interactionId) return;
    if (!confirmIrreversible(ownerConsole.complaintDecision.confirmEscalate)) return;
    void patchOwnerDecisionFolderForInteraction(item.campaignId, {
      action: "owner_escalate_complaint_scope",
      interactionId,
      ownerNotes,
    }, "owner_escalate_complaint_scope");
  };

  const confirmEscalateComplaintRevision = (item: OwnerConsoleSequentialItem, ownerNotes: string) => {
    const interactionId = interactionIdFromItem(item);
    if (!interactionId) return;
    if (!confirmIrreversible(ownerConsole.complaintDecision.confirmEscalate)) return;
    void patchOwnerDecisionFolderForInteraction(item.campaignId, {
      action: "owner_escalate_complaint_revision",
      interactionId,
      ownerNotes,
    }, "owner_escalate_complaint_revision");
  };

  const confirmDeclineComplaint = (
    item: OwnerConsoleSequentialItem,
    clientReply: string,
    ownerNotes: string,
  ) => {
    const interactionId = interactionIdFromItem(item);
    if (!interactionId) return;
    if (!clientReply.trim()) {
      setError("Policy-bound client reply is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.complaintDecision.confirmDecline)) return;
    void patchOwnerDecisionFolderForInteraction(item.campaignId, {
      action: "owner_decline_complaint_escalation",
      interactionId,
      clientReply,
      ownerNotes,
    }, "owner_decline_complaint_escalation");
  };

  const confirmHoldComplaint = (
    item: OwnerConsoleSequentialItem,
    note: string,
    ownerNotes: string,
  ) => {
    const interactionId = interactionIdFromItem(item);
    if (!interactionId) return;
    if (!note.trim()) {
      setError("A hold note is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.complaintDecision.confirmHold)) return;
    void patchOwnerDecisionFolderForInteraction(item.campaignId, {
      action: "owner_hold_complaint",
      interactionId,
      note,
      ownerNotes,
    }, "owner_hold_complaint");
  };

  const confirmAskTeamComplaint = (
    item: OwnerConsoleSequentialItem,
    note: string,
    ownerNotes: string,
  ) => {
    const interactionId = interactionIdFromItem(item);
    if (!interactionId) return;
    if (!note.trim()) {
      setError("A note for the team is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.complaintDecision.confirmAskTeam)) return;
    void patchOwnerDecisionFolderForInteraction(item.campaignId, {
      action: "owner_ask_team_complaint",
      interactionId,
      note,
      ownerNotes,
    }, "owner_ask_team_complaint");
  };

  const confirmAskClientComplaint = (
    item: OwnerConsoleSequentialItem,
    clientMessage: string,
    ownerNotes: string,
  ) => {
    const interactionId = interactionIdFromItem(item);
    if (!interactionId) return;
    if (!clientMessage.trim()) {
      setError("Approved client-facing wording is required.");
      return;
    }
    if (!confirmIrreversible(ownerConsole.complaintDecision.confirmAskClient)) return;
    void patchOwnerDecisionFolderForInteraction(item.campaignId, {
      action: "owner_ask_client_complaint",
      interactionId,
      clientMessage,
      ownerNotes,
    }, "owner_ask_client_complaint");
  };

  const confirmAssignComplaint = (
    item: OwnerConsoleSequentialItem,
    ownerNotes: string,
    note: string,
  ) => {
    const interactionId = interactionIdFromItem(item);
    if (!interactionId) return;
    if (!confirmIrreversible(ownerConsole.complaintDecision.confirmAssign)) return;
    void patchOwnerDecisionFolderForInteraction(item.campaignId, {
      action: "owner_assign_complaint",
      interactionId,
      ownerNotes,
      note,
    }, "owner_assign_complaint");
  };

  return {
    rowPanel,
    busy,
    error,
    statusMessage,
    assignForm,
    resolveForm,
    approvalForm,
    setAssignForm,
    setResolveForm,
    setApprovalForm,
    resetPanels,
    patchTasks,
    openAssign,
    openResolve,
    openApprove,
    openReassign,
    confirmAssign,
    confirmResolve,
    confirmApprove,
    confirmHold,
    confirmDecline,
    confirmApproveForReview,
    confirmSendBackForReview,
    confirmHoldReviewGate,
    confirmAskTeamReviewGate,
    confirmAskClientReviewGate,
    confirmReleaseToClient,
    confirmSendBackForRelease,
    confirmHoldReleaseGate,
    confirmAskTeamReleaseGate,
    confirmClearComplianceHold,
    confirmHoldComplianceHold,
    confirmAskTeamComplianceHold,
    confirmAssignComplianceHold,
    confirmDirectionDisagreement,
    confirmHoldDirectionDisagreement,
    confirmAskTeamDirectionDisagreement,
    confirmAssignDirectionDisagreement,
    confirmOwnerDecisionPrimary,
    confirmOwnerDecisionSecondary,
    confirmOwnerDecisionHold,
    confirmOwnerDecisionAskTeam,
    confirmOwnerDecisionAskClient,
    confirmOwnerDecisionAskClientInfo,
    confirmOwnerDecisionAskClientApproval,
    confirmOwnerDecisionAssign,
    confirmApproveRefund,
    confirmDenyRefund,
    confirmHoldRefund,
    confirmAskTeamRefund,
    confirmAskClientRefund,
    confirmHeavyLaneWait,
    confirmHeavyLaneBump,
    confirmAssignHeavyLane,
    confirmResolveComplaint,
    confirmEscalateComplaintRefund,
    confirmEscalateComplaintScope,
    confirmEscalateComplaintRevision,
    confirmDeclineComplaint,
    confirmHoldComplaint,
    confirmAskTeamComplaint,
    confirmAskClientComplaint,
    confirmAssignComplaint,
    setError,
  };
}
