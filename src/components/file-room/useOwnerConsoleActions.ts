"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { ownerConsole } from "@/config/owner-console";
import type { TasksPatchBody } from "@/lib/campaign-tasks/actions";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";
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

  const patchTasks = async (campaignId: string, body: TasksPatchBody) => {
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
    void patchTasks(card.campaignId, {
      action: "assign_exception",
      exceptionId: card.id,
      assignToUserId: assignForm.assignToUserId,
      notes: assignForm.notes.trim() || undefined,
    });
  };

  const confirmResolve = (card: OwnerConsoleDecisionCard) => {
    if (!confirmIrreversible(ownerConsole.confirmResolve)) return;
    void patchTasks(card.campaignId, {
      action: "resolve_exception",
      exceptionId: card.id,
      resolutionNotes: resolveForm.resolutionNotes.trim() || undefined,
    });
  };

  const confirmApprove = (card: OwnerConsoleDecisionCard, form: OwnerApprovalFormState) => {
    if (!confirmIrreversible(ownerConsole.confirmApprove)) return;
    void patchTasks(card.campaignId, {
      action: "approve_client_request",
      exceptionId: card.id,
      category: form.category,
      contentKind: contentKindForCategory(form.category),
      clientFacingLabel: form.clientFacingLabel.trim(),
      clientFacingPrompt: form.clientFacingPrompt.trim(),
      whyNeeded: form.whyNeeded.trim(),
      requirementLevel: "required",
    });
  };

  const confirmHold = (card: OwnerConsoleDecisionCard, form: OwnerApprovalFormState) => {
    void patchTasks(card.campaignId, {
      action: "assign_exception",
      exceptionId: card.id,
      assignToUserId: form.holdAssignToUserId.trim() || undefined,
      notes: form.holdInstruction.trim(),
    });
  };

  const confirmDecline = (card: OwnerConsoleDecisionCard, form: OwnerApprovalFormState) => {
    if (!confirmIrreversible(ownerConsole.confirmDecline)) return;
    void patchTasks(card.campaignId, {
      action: "decline_promotion",
      exceptionId: card.id,
      notes: form.declineReason.trim(),
    });
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
    setError,
  };
}
