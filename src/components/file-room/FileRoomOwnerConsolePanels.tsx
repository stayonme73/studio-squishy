"use client";

import Link from "next/link";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { campaignTasksConfig } from "@/config/campaign-tasks";
import { ownerConsole } from "@/config/owner-console";
import type { FileRoomExceptionOperatorContext } from "@/lib/campaign-tasks/exceptions-view";
import type {
  OwnerConsoleLinkedMaterialSummary,
  OwnerConsoleOfficeLink,
  OwnerConsoleProductionSummary,
  OwnerConsoleReassignContext,
} from "@/lib/campaign-tasks/owner-console-campaign-view";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";
import { resolveFileRoomTaskOwnershipPresentation } from "@/lib/campaign-tasks/task-ownership-presentation";
import type { FileRoomTaskRow } from "@/lib/campaign-tasks/tasks-view";
import type { TasksPatchBody } from "@/lib/campaign-tasks/actions";

import FileRoomExceptionAssignPanel, {
  type AssignExceptionFormState,
} from "./FileRoomExceptionAssignPanel";
import FileRoomExceptionOwnerApprovalPanel, {
  type OwnerApprovalFormState,
} from "./FileRoomExceptionOwnerApprovalPanel";
import FileRoomExceptionResolvePanel, {
  type ResolveExceptionFormState,
} from "./FileRoomExceptionResolvePanel";
import FileRoomOwnerConsoleReassignPanel from "./FileRoomOwnerConsoleReassignPanel";
import FileRoomOwnerDecisionCard from "./FileRoomOwnerDecisionCard";
import FileRoomSectionCard from "./FileRoomSectionCard";
import type { OwnerConsolePanelMode } from "./useOwnerConsoleActions";

type FileRoomOwnerConsoleContextRailProps = {
  linkedTask: FileRoomTaskRow | null;
  linkedServiceName: string | null;
  linkedMaterials: readonly OwnerConsoleLinkedMaterialSummary[];
  qaHistory: readonly {
    actionLabel: string;
    actorDisplayName: string;
    notesPreview: string | null;
    createdAt: string;
  }[];
  productionSummary: OwnerConsoleProductionSummary | null;
  officeLinks: readonly OwnerConsoleOfficeLink[];
  fileRoomHref: string;
};

export function FileRoomOwnerConsoleContextRail({
  linkedTask,
  linkedServiceName,
  linkedMaterials,
  qaHistory,
  productionSummary,
  officeLinks,
  fileRoomHref,
}: FileRoomOwnerConsoleContextRailProps) {
  return (
    <FileRoomSectionCard title={ownerConsole.contextSectionTitle}>
      <div className="fr-owner-console-context">
        <section className="fr-owner-console-context__block">
          <h4 className="fr-owner-console-context__heading">{ownerConsole.linkedTaskTitle}</h4>
          {linkedTask ? (
            <ul className="fr-kv-list">
              <li className="fr-kv-list__row">
                <span className="fr-kv-list__label">Task</span>
                <p className="fr-kv-list__value">{linkedTask.title}</p>
              </li>
              <li className="fr-kv-list__row">
                <span className="fr-kv-list__label">Status</span>
                <p className="fr-kv-list__value">{linkedTask.statusLabel}</p>
              </li>
              {(() => {
                const ownership = resolveFileRoomTaskOwnershipPresentation({
                  responsibleRole: linkedTask.responsibleRole,
                  claimedByDisplayName: linkedTask.claimedByDisplayName,
                });
                return (
                  <>
                    <li className="fr-kv-list__row">
                      <span className="fr-kv-list__label">
                        {campaignTasksConfig.responsibleRoleLabel}
                      </span>
                      <p
                        className="fr-kv-list__value"
                        data-fr-task-responsible-role={ownership.responsibleRoleLabel}
                      >
                        {ownership.responsibleRoleLabel}
                      </p>
                    </li>
                    <li className="fr-kv-list__row">
                      <span className="fr-kv-list__label">Claim</span>
                      <p
                        className="fr-kv-list__value"
                        data-fr-task-ownership={ownership.claimStatus}
                        data-fr-task-claim-status
                      >
                        {ownership.claimLine}
                      </p>
                    </li>
                  </>
                );
              })()}
              {linkedTask.blockedReason ? (
                <li className="fr-kv-list__row">
                  <span className="fr-kv-list__label">Blocker</span>
                  <p className="fr-kv-list__value">{linkedTask.blockedReason}</p>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="fr-tasks-empty__body">{ownerConsole.noLinkedTask}</p>
          )}
        </section>

        {linkedServiceName ? (
          <section className="fr-owner-console-context__block">
            <h4 className="fr-owner-console-context__heading">{ownerConsole.linkedServiceTitle}</h4>
            <p className="fr-kv-list__value">{linkedServiceName}</p>
          </section>
        ) : null}

        <section className="fr-owner-console-context__block">
          <h4 className="fr-owner-console-context__heading">{ownerConsole.materialsTitle}</h4>
          {linkedMaterials.length > 0 ? (
            <ul className="fr-owner-console-scan__list">
              {linkedMaterials.map((item) => (
                <li key={item.id} className="fr-owner-console-scan__item">
                  <div>
                    <span className="fr-owner-console-scan__item-title">{item.label}</span>
                    <span className="fr-owner-console-scan__item-meta">
                      {item.statusLabel}
                      {item.isBlocking ? " · blocking" : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fr-tasks-empty__body">{ownerConsole.noMaterials}</p>
          )}
        </section>

        <section className="fr-owner-console-context__block">
          <h4 className="fr-owner-console-context__heading">{ownerConsole.qaTitle}</h4>
          {qaHistory.length > 0 ? (
            <ul className="fr-owner-console-scan__list">
              {qaHistory.map((entry) => (
                <li
                  key={`${entry.createdAt}-${entry.actionLabel}`}
                  className="fr-owner-console-scan__item"
                >
                  <div>
                    <span className="fr-owner-console-scan__item-title">
                      {entry.actionLabel} · {entry.actorDisplayName}
                    </span>
                    {entry.notesPreview ? (
                      <span className="fr-owner-console-scan__item-meta">{entry.notesPreview}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fr-tasks-empty__body">{ownerConsole.noQaHistory}</p>
          )}
        </section>

        <section className="fr-owner-console-context__block">
          <h4 className="fr-owner-console-context__heading">{ownerConsole.productionTitle}</h4>
          {productionSummary ? (
            <ul className="fr-kv-list">
              <li className="fr-kv-list__row">
                <span className="fr-kv-list__label">Stage</span>
                <p className="fr-kv-list__value">{productionSummary.stageLabel}</p>
              </li>
              {productionSummary.workUnitStatusLabel ? (
                <li className="fr-kv-list__row">
                  <span className="fr-kv-list__label">Work unit</span>
                  <p className="fr-kv-list__value">{productionSummary.workUnitStatusLabel}</p>
                </li>
              ) : null}
              <li className="fr-kv-list__row">
                <span className="fr-kv-list__label">Draft</span>
                <p className="fr-kv-list__value">{productionSummary.currentBodyPreview}</p>
              </li>
              {productionSummary.blockedMessage ? (
                <li className="fr-kv-list__row">
                  <span className="fr-kv-list__label">Note</span>
                  <p className="fr-kv-list__value">{productionSummary.blockedMessage}</p>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="fr-tasks-empty__body">{ownerConsole.noProduction}</p>
          )}
        </section>

        <section className="fr-owner-console-context__block">
          <h4 className="fr-owner-console-context__heading">{ownerConsole.teamOfficeTitle}</h4>
          <div className="fr-owner-console-actions">
            <Link className="utility-btn" href={fileRoomHref}>
              {ownerConsole.fullFileRoomLabel}
            </Link>
            {officeLinks.map((link) => (
              <Link key={link.slug} className="utility-btn" href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </FileRoomSectionCard>
  );
}

type FileRoomOwnerConsoleDecisionPanelsProps = {
  selectedCard: OwnerConsoleDecisionCard;
  rowPanel: OwnerConsolePanelMode;
  busy: boolean;
  operatorContext: FileRoomExceptionOperatorContext;
  assignForm: AssignExceptionFormState;
  resolveForm: ResolveExceptionFormState;
  approvalForm: OwnerApprovalFormState | null;
  reassign: OwnerConsoleReassignContext | null;
  onAssignChange: (next: AssignExceptionFormState) => void;
  onResolveChange: (next: ResolveExceptionFormState) => void;
  onApprovalChange: (next: OwnerApprovalFormState) => void;
  onConfirmAssign: () => void;
  onConfirmResolve: () => void;
  onApprove: () => void;
  onHold: () => void;
  onDecline: () => void;
  onReassign: (body: TasksPatchBody) => void;
  onCancel: () => void;
};

export function FileRoomOwnerConsoleDecisionPanels({
  selectedCard,
  rowPanel,
  busy,
  operatorContext,
  assignForm,
  resolveForm,
  approvalForm,
  reassign,
  onAssignChange,
  onResolveChange,
  onApprovalChange,
  onConfirmAssign,
  onConfirmResolve,
  onApprove,
  onHold,
  onDecline,
  onReassign,
  onCancel,
}: FileRoomOwnerConsoleDecisionPanelsProps) {
  if (rowPanel === "assign") {
    return (
      <div className="fr-exception-row__panel">
        <FileRoomExceptionAssignPanel
          form={assignForm}
          busy={busy}
          operatorContext={operatorContext}
          onChange={onAssignChange}
          onConfirm={onConfirmAssign}
          onCancel={onCancel}
        />
      </div>
    );
  }

  if (rowPanel === "resolve") {
    return (
      <div className="fr-exception-row__panel">
        <FileRoomExceptionResolvePanel
          form={resolveForm}
          busy={busy}
          onChange={onResolveChange}
          onConfirm={onConfirmResolve}
          onCancel={onCancel}
        />
      </div>
    );
  }

  if (rowPanel === "approve" && approvalForm) {
    return (
      <div className="fr-exception-row__panel">
        <FileRoomExceptionOwnerApprovalPanel
          row={selectedCard.row}
          form={approvalForm}
          busy={busy}
          operatorContext={operatorContext}
          onChange={onApprovalChange}
          onApprove={onApprove}
          onHold={onHold}
          onDecline={onDecline}
          onCancel={onCancel}
        />
      </div>
    );
  }

  if (rowPanel === "reassign" && reassign?.canReassign) {
    return (
      <div className="fr-exception-row__panel">
        <FileRoomOwnerConsoleReassignPanel
          reassign={reassign}
          busy={busy}
          onConfirm={onReassign}
          onCancel={onCancel}
        />
      </div>
    );
  }

  return null;
}

type FileRoomOwnerConsoleActionBarProps = {
  selectedCard: OwnerConsoleDecisionCard;
  busy: boolean;
  showDrillDownLink?: boolean;
  drillDownHref?: string;
  fileRoomHref?: string;
  reassign?: OwnerConsoleReassignContext | null;
  onOpenApprove: () => void;
  onOpenResolve: () => void;
  onOpenAssign: () => void;
  onOpenReassign?: () => void;
};

export function FileRoomOwnerConsoleActionBar({
  selectedCard,
  busy,
  showDrillDownLink = false,
  drillDownHref,
  fileRoomHref,
  reassign,
  onOpenApprove,
  onOpenResolve,
  onOpenAssign,
  onOpenReassign,
}: FileRoomOwnerConsoleActionBarProps) {
  return (
    <div className="fr-owner-console-actions-slot">
      <div className="fr-owner-console-actions-dock">
        <div className="fr-owner-console-actions">
          {selectedCard.row.promotion.showApprovalPanel ? (
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={busy}
              onClick={onOpenApprove}
            >
              {campaignExceptionsConfig.promotionPanelTitle}
            </button>
          ) : null}
          {selectedCard.row.permissions.canResolve ? (
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={busy}
              onClick={onOpenResolve}
            >
              {campaignExceptionsConfig.resolveLabel}
            </button>
          ) : null}
          {selectedCard.row.permissions.canAssign ? (
            <button type="button" className="utility-btn" disabled={busy} onClick={onOpenAssign}>
              {campaignExceptionsConfig.assignLabel}
            </button>
          ) : null}
          {reassign?.canReassign && onOpenReassign ? (
            <button type="button" className="utility-btn" disabled={busy} onClick={onOpenReassign}>
              {ownerConsole.reassignTaskLabel}
            </button>
          ) : null}
          {showDrillDownLink && drillDownHref ? (
            <Link className="utility-btn" href={drillDownHref}>
              {ownerConsole.openCampaignLabel}
            </Link>
          ) : null}
          {fileRoomHref ? (
            <Link className="utility-btn" href={fileRoomHref}>
              {ownerConsole.fullFileRoomLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FileRoomOwnerConsoleDecisionDetail({
  selectedCard,
}: {
  selectedCard: OwnerConsoleDecisionCard;
}) {
  return (
    <FileRoomOwnerDecisionCard
      card={selectedCard}
      selected
      onSelect={() => {
        /* detail panel — selection handled by parent */
      }}
    />
  );
}
