"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { ownerConsole } from "@/config/owner-console";
import type { TasksPatchBody } from "@/lib/campaign-tasks/actions";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";
import type { OwnerConsoleSequentialItem } from "@/lib/campaign-tasks/owner-console-sequential";
import {
  resolveOwnerDeskJobPostDecisionBriefing,
  resolveOwnerPostDecisionBriefing,
  type OwnerDeskJobAction,
} from "@/studio-coordinator";
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
    setError,
  };
}
