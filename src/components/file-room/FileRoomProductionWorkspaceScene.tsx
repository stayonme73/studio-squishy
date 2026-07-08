"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { OWNER_CONSOLE_ROUTE } from "@/config/owner-console";
import { productionWorkspace } from "@/config/production-workspace";
import { formatActivityKind } from "@/lib/job-control/activity-log";
import type { ProductionWorkspaceView } from "@/lib/job-control/production-workspace-view";
import { RouteMapProductionBriefPanel } from "@/components/route-map/RouteMapIntakeSummaryPanels";

import FileRoomSectionCard from "./FileRoomSectionCard";

type Props = {
  view: ProductionWorkspaceView;
  isOwner: boolean;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRegistryToken(value: string): string {
  return value.replace(/_/g, " ");
}

function formatStorageRefLabel(ref: ProductionWorkspaceView["fileRegistry"][number]): string {
  if (ref.storageRef.provider === "google_shared_drive") return ref.storageRef.reference;
  return "Private File Room object";
}

export default function FileRoomProductionWorkspaceScene({ view, isOwner }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [clientFileDeliverableKey, setClientFileDeliverableKey] = useState("");
  const [clientFileName, setClientFileName] = useState("");
  const [clientFileType, setClientFileType] = useState("");
  const [clientFileUrl, setClientFileUrl] = useState("");
  const [clientFileInstructions, setClientFileInstructions] = useState("");
  const [assigningRole, setAssigningRole] = useState<string | null>(null);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(view.campaignId)}/jobs/${encodeURIComponent(view.jobId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Request failed");
      }
      router.refresh();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fr-production-workspace">
      <header className="fr-production-workspace__header">
        <div>
          <h2 className="fr-production-workspace__title">
            {productionWorkspace.pageTitle}
          </h2>
          <p className="fr-header__meta">
            {view.campaignName} · {view.serviceName} · {productionWorkspace.pageLead}
          </p>
        </div>
        <p className="fr-header__meta">
          <Link className="fr-back-link" href={OWNER_CONSOLE_ROUTE}>
            ← {productionWorkspace.backToControlRoom}
          </Link>
        </p>
      </header>

      {error ? (
        <p className="fr-exceptions__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="fr-production-workspace__grid">
        <div className="fr-production-workspace__main">
          <FileRoomSectionCard title={productionWorkspace.briefTitle}>
            {view.productionBrief ? (
              <RouteMapProductionBriefPanel brief={view.productionBrief} />
            ) : (
              <p className="fr-tasks-empty__body">{productionWorkspace.briefEmpty}</p>
            )}
          </FileRoomSectionCard>

          <FileRoomSectionCard title={productionWorkspace.scopeTitle}>
            <p className="fr-kv-list__value">{view.scopeSummary}</p>
          </FileRoomSectionCard>

          <FileRoomSectionCard title={productionWorkspace.deliverablesTitle}>
            <p className="fr-control-room__section-lead">{productionWorkspace.deliverablesLead}</p>
            {view.requiredDeliverables.length === 0 ? (
              <p className="fr-tasks-empty__body">No deliverables on line item.</p>
            ) : (
              <ul className="fr-production-workspace__deliverables">
                {view.requiredDeliverables.map((row) => (
                  <li key={row.key} className="fr-production-workspace__deliverable">
                    <label className="fr-production-workspace__deliverable-label">
                      <input
                        type="checkbox"
                        checked={row.prepared}
                        disabled={busy || row.prepared || view.spineStatus !== "building_concepts"}
                        onChange={() =>
                          void patch({
                            action: "mark_deliverable_prepared",
                            deliverableKey: row.key,
                          })
                        }
                      />
                      <span>{row.label}</span>
                    </label>
                    {row.preparedAt ? (
                      <span className="fr-tasks-row__meta">Prepared {formatWhen(row.preparedAt)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {view.allDeliverablesPrepared ? (
              <p className="fr-banner" role="status">
                {productionWorkspace.allPreparedLabel}
              </p>
            ) : null}
          </FileRoomSectionCard>

          <FileRoomSectionCard title="Work Packet handoff">
            <p className="fr-control-room__section-lead">
              Internal-only job packet handoff from Production Workspace into Team Offices.
            </p>
            <dl className="fr-kv-list">
              <div>
                <dt>Production brief</dt>
                <dd>
                  {view.workPacketSummary.productionBriefAvailable
                    ? "Available"
                    : "Use approved plan scope"}
                </dd>
              </div>
              <div>
                <dt>Return location</dt>
                <dd>{view.workPacketSummary.returnLocationLabel}</dd>
              </div>
              <div>
                <dt>Approval</dt>
                <dd>{view.workPacketSummary.ownerApprovalRequirement}</dd>
              </div>
            </dl>

            {view.workPacketSummary.roleRows.length === 0 ? (
              <p className="fr-tasks-empty__body">No Team Office roles mapped for this job.</p>
            ) : (
              <ul className="fr-production-workspace__deliverables">
                {view.workPacketSummary.roleRows.map((row) => (
                  <li key={row.role} className="fr-production-workspace__deliverable">
                    <div>
                      <p className="fr-production-workspace__deliverable-label">
                        {row.roleLabel} · {row.statusLabel}
                      </p>
                      <p className="fr-tasks-row__meta">
                        Next responsible: {row.nextResponsibleLabel}
                        {row.assignedAt ? ` · Assigned ${formatWhen(row.assignedAt)}` : ""}
                        {row.returnedAt ? ` · Last return ${formatWhen(row.returnedAt)}` : ""}
                      </p>
                      {row.taskTitles.length > 0 ? (
                        <p className="fr-tasks-row__meta">{row.taskTitles.join(", ")}</p>
                      ) : null}
                    </div>
                    <div className="fr-production-workspace__actions">
                      <Link className="utility-btn" href={row.officeHref}>
                        Open office
                      </Link>
                      {row.canAssign ? (
                        <button
                          type="button"
                          className="utility-btn utility-btn--primary"
                          disabled={busy || assigningRole === row.role}
                          onClick={() => {
                            setAssigningRole(row.role);
                            void patch({ action: "assign_work_packet", role: row.role }).finally(() =>
                              setAssigningRole(null),
                            );
                          }}
                        >
                          Assign packet
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="fr-scope-group">
              <p className="fr-scope-group__name">Returned draft/final file refs</p>
              {view.workPacketSummary.returnedFiles.length === 0 ? (
                <p className="fr-tasks-row__meta">No returned file references yet.</p>
              ) : (
                <ul className="fr-scope-group__list">
                  {view.workPacketSummary.returnedFiles.map((file) => (
                    <li key={file.id}>
                      <a className="fr-back-link" href={file.url} target="_blank" rel="noreferrer">
                        {file.kind}: {file.label}
                      </a>
                      {file.deliverableLabel ? ` · ${file.deliverableLabel}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="fr-tasks-row__meta">{view.workPacketSummary.integrationStatusLabel}</p>
          </FileRoomSectionCard>

          {view.clientRevisionFeedback ? (
            <FileRoomSectionCard title={productionWorkspace.clientRevisionFeedbackTitle}>
              <p className="fr-control-room__section-lead">
                {productionWorkspace.clientRevisionFeedbackLead}
              </p>
              <ul className="fr-production-workspace__notes">
                {Object.entries(view.clientRevisionFeedback.sectionStatuses).map(([key, status]) =>
                  status !== "neutral" ? (
                    <li key={`status-${key}`} className="fr-production-workspace__note">
                      <strong>{key}</strong> — {status}
                    </li>
                  ) : null,
                )}
                {view.clientRevisionFeedback.stickyNotes.map((note) => (
                  <li key={note.id} className="fr-production-workspace__note">
                    Sticky ({note.color}): {note.text}
                  </li>
                ))}
                {view.clientRevisionFeedback.drawSections.map((key) => (
                  <li key={`draw-${key}`} className="fr-production-workspace__note">
                    Annotation on {key}
                  </li>
                ))}
                {view.clientRevisionFeedback.voiceNotes.map((note) => (
                  <li key={note.id} className="fr-production-workspace__note">
                    Voice note ({note.durationSec}s) on {note.deliverableKey}
                  </li>
                ))}
              </ul>
            </FileRoomSectionCard>
          ) : null}

          <FileRoomSectionCard title={productionWorkspace.internalNotesTitle}>
            <p className="fr-control-room__section-lead">{productionWorkspace.internalNotesLead}</p>
            {view.internalNotes.length === 0 ? (
              <p className="fr-tasks-empty__body">{productionWorkspace.internalNotesEmpty}</p>
            ) : (
              <ul className="fr-production-workspace__notes">
                {view.internalNotes.map((note) => (
                  <li key={note.id} className="fr-production-workspace__note">
                    <p>{note.content}</p>
                    <p className="fr-tasks-row__meta">
                      {note.author.displayName ?? note.author.role} · {formatWhen(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="fr-production-workspace__form"
              onSubmit={(event) => {
                event.preventDefault();
                void patch({ action: "add_internal_note", content: noteContent }).then(() =>
                  setNoteContent(""),
                );
              }}
            >
              <textarea
                className="fr-production-work__textarea"
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder={productionWorkspace.notePlaceholder}
                rows={3}
              />
              <button type="submit" className="utility-btn utility-btn--primary" disabled={busy || !noteContent.trim()}>
                {productionWorkspace.addNoteLabel}
              </button>
            </form>
          </FileRoomSectionCard>

          <FileRoomSectionCard title={productionWorkspace.workingFilesTitle}>
            <p className="fr-control-room__section-lead">{productionWorkspace.workingFilesLead}</p>
            {view.fileRegistry.length === 0 ? (
              <p className="fr-tasks-empty__body">{productionWorkspace.workingFilesEmpty}</p>
            ) : (
              <ul className="fr-production-workspace__files">
                {view.fileRegistry.map((ref) => (
                  <li key={ref.id} className="fr-production-workspace__file-row">
                    <span className="fr-production-workspace__deliverable-label">
                      {ref.filename} ({ref.fileType})
                    </span>
                    <span className="fr-tasks-row__meta">
                      {formatRegistryToken(ref.category)} · {formatRegistryToken(ref.visibility)} ·{" "}
                      {formatRegistryToken(ref.status)} · {ref.versionLabel}
                    </span>
                    {ref.storageRef.provider === "google_shared_drive" && ref.storageRef.referenceKind === "manual_link" ? (
                      <a className="fr-back-link" href={ref.storageRef.reference} target="_blank" rel="noreferrer">
                        {ref.storageRef.reference}
                      </a>
                    ) : (
                      <span className="fr-tasks-row__meta">{formatStorageRefLabel(ref)}</span>
                    )}
                    <span className="fr-tasks-row__meta">
                      {ref.addedBy.displayName ?? ref.addedBy.role} · {formatWhen(ref.addedAt)} ·{" "}
                      {formatRegistryToken(ref.storageRef.connectionStatus)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="fr-production-workspace__form"
              onSubmit={(event) => {
                event.preventDefault();
                void patch({
                  action: "add_working_file_ref",
                  label: fileLabel,
                  url: fileUrl,
                }).then(() => {
                  setFileLabel("");
                  setFileUrl("");
                });
              }}
            >
              <input
                className="fr-production-workspace__input"
                value={fileLabel}
                onChange={(event) => setFileLabel(event.target.value)}
                placeholder={productionWorkspace.fileLabelPlaceholder}
              />
              <input
                className="fr-production-workspace__input"
                value={fileUrl}
                onChange={(event) => setFileUrl(event.target.value)}
                placeholder={productionWorkspace.fileUrlPlaceholder}
              />
              <button
                type="submit"
                className="utility-btn utility-btn--primary"
                disabled={busy || !fileLabel.trim() || !fileUrl.trim()}
              >
                {productionWorkspace.addFileRefLabel}
              </button>
            </form>
          </FileRoomSectionCard>

          <FileRoomSectionCard title={productionWorkspace.clientDeliveryFilesTitle}>
            <p className="fr-control-room__section-lead">{productionWorkspace.clientDeliveryFilesLead}</p>
            {view.clientDeliveryFiles.length === 0 ? (
              <p className="fr-tasks-empty__body">{productionWorkspace.clientDeliveryFilesEmpty}</p>
            ) : (
              <ul className="fr-production-workspace__files">
                {view.clientDeliveryFiles.map((file) => (
                  <li key={file.id}>
                    <span className="fr-production-workspace__deliverable-label">
                      {file.deliverableLabel}: {file.fileName} ({file.fileType})
                    </span>
                    <a className="fr-back-link" href={file.url} target="_blank" rel="noreferrer">
                      {file.url}
                    </a>
                    {file.useInstructions ? (
                      <p className="fr-tasks-row__meta">{file.useInstructions}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <form
              className="fr-production-workspace__form"
              onSubmit={(event) => {
                event.preventDefault();
                void patch({
                  action: "add_client_delivery_file",
                  deliverableKey: clientFileDeliverableKey,
                  fileName: clientFileName,
                  fileType: clientFileType,
                  url: clientFileUrl,
                  useInstructions: clientFileInstructions || undefined,
                }).then(() => {
                  setClientFileName("");
                  setClientFileType("");
                  setClientFileUrl("");
                  setClientFileInstructions("");
                });
              }}
            >
              <select
                className="fr-production-workspace__input"
                value={clientFileDeliverableKey}
                onChange={(event) => setClientFileDeliverableKey(event.target.value)}
                required
              >
                <option value="">Select deliverable…</option>
                {view.requiredDeliverables.map((row) => (
                  <option key={row.key} value={row.key}>
                    {row.label}
                  </option>
                ))}
              </select>
              <input
                className="fr-production-workspace__input"
                value={clientFileName}
                onChange={(event) => setClientFileName(event.target.value)}
                placeholder={productionWorkspace.clientFileNamePlaceholder}
              />
              <input
                className="fr-production-workspace__input"
                value={clientFileType}
                onChange={(event) => setClientFileType(event.target.value)}
                placeholder={productionWorkspace.clientFileTypePlaceholder}
              />
              <input
                className="fr-production-workspace__input"
                value={clientFileUrl}
                onChange={(event) => setClientFileUrl(event.target.value)}
                placeholder={productionWorkspace.clientFileUrlPlaceholder}
              />
              <textarea
                className="fr-production-work__textarea"
                value={clientFileInstructions}
                onChange={(event) => setClientFileInstructions(event.target.value)}
                placeholder={productionWorkspace.clientFileInstructionsPlaceholder}
                rows={2}
              />
              <button
                type="submit"
                className="utility-btn utility-btn--primary"
                disabled={
                  busy ||
                  !clientFileDeliverableKey ||
                  !clientFileName.trim() ||
                  !clientFileType.trim() ||
                  !clientFileUrl.trim()
                }
              >
                {productionWorkspace.addClientFileLabel}
              </button>
            </form>
          </FileRoomSectionCard>
        </div>

        <aside className="fr-production-workspace__aside">
          <FileRoomSectionCard title={productionWorkspace.statusTitle}>
            <dl className="fr-kv-list">
              <div>
                <dt>{productionWorkspace.statusTitle}</dt>
                <dd>{view.spineStatusLabel}</dd>
              </div>
              <div>
                <dt>{productionWorkspace.laneTitle}</dt>
                <dd>{view.productionLaneLabel}</dd>
              </div>
              <div>
                <dt>{productionWorkspace.deadlineTitle}</dt>
                <dd>{view.clientDeadline ?? productionWorkspace.deadlineEmpty}</dd>
              </div>
            </dl>

            {view.ownerApprovalPending === "before_review" ? (
              <p className="fr-production-workspace__pending" role="status">
                Owner Desk — Owner Support Review
              </p>
            ) : null}

            {view.ownerApprovalPending === "before_delivery" ? (
              <p className="fr-production-workspace__pending" role="status">
                {productionWorkspace.finalReleasePendingLabel}
              </p>
            ) : null}

            <div className="fr-production-workspace__actions">
              {view.gates.canStartBuildingConcepts ? (
                <button
                  type="button"
                  className="utility-btn utility-btn--primary"
                  disabled={busy}
                  onClick={() => void patch({ action: "start_building_concepts" })}
                >
                  {productionWorkspace.startProductionLabel}
                </button>
              ) : null}

              {view.spineStatus === "ready_for_queue" && view.gates.startBlockedReasons.length > 0 ? (
                <div className="fr-production-workspace__gate">
                  <p className="fr-production-workspace__gate-title">
                    {productionWorkspace.gateBlockedTitle}
                  </p>
                  <ul>
                    {view.gates.startBlockedReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {view.gates.canSubmitForOwnerApproval ? (
                <button
                  type="button"
                  className="utility-btn utility-btn--primary"
                  disabled={busy}
                  onClick={() => void patch({ action: "submit_for_owner_approval" })}
                >
                  {productionWorkspace.submitApprovalLabel}
                </button>
              ) : null}

              {view.spineStatus === "building_concepts" &&
              !view.gates.canSubmitForOwnerApproval &&
              view.gates.submitBlockedReasons.length > 0 ? (
                <div className="fr-production-workspace__gate">
                  <p className="fr-production-workspace__gate-title">
                    {productionWorkspace.gateBlockedTitle}
                  </p>
                  <ul>
                    {view.gates.submitBlockedReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {isOwner && view.gates.canOwnerApproveForReview ? (
                <button
                  type="button"
                  className="utility-btn utility-btn--primary"
                  disabled={busy}
                  onClick={() => void patch({ action: "owner_approve_for_review" })}
                >
                  {productionWorkspace.ownerApproveLabel}
                </button>
              ) : null}

              {isOwner && view.gates.canOwnerFinalRelease ? (
                <button
                  type="button"
                  className="utility-btn utility-btn--primary"
                  disabled={busy}
                  onClick={() => void patch({ action: "owner_final_release" })}
                >
                  {productionWorkspace.ownerFinalReleaseLabel}
                </button>
              ) : null}

              {isOwner && view.spineStatus === "ready_for_delivery" && !view.gates.canMarkDelivered ? (
                <div className="fr-production-workspace__gate">
                  <p className="fr-production-workspace__gate-title">
                    {productionWorkspace.gateBlockedTitle}
                  </p>
                  <ul>
                    {view.gates.markDeliveredBlockedReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {isOwner && view.gates.canMarkDelivered ? (
                <button
                  type="button"
                  className="utility-btn utility-btn--primary"
                  disabled={busy}
                  onClick={() => void patch({ action: "mark_delivered" })}
                >
                  {productionWorkspace.markDeliveredLabel}
                </button>
              ) : null}
            </div>
          </FileRoomSectionCard>

          <FileRoomSectionCard title={productionWorkspace.materialsTitle}>
            {view.materials.length === 0 ? (
              <p className="fr-tasks-empty__body">{productionWorkspace.materialsEmpty}</p>
            ) : (
              <ul className="fr-production-workspace__materials">
                {view.materials.map((item) => (
                  <li key={item.id}>
                    <span>{item.label}</span>
                    <span className="fr-production-workspace__material-status">{item.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </FileRoomSectionCard>

          <FileRoomSectionCard title={productionWorkspace.clientNotesTitle}>
            {view.clientVisibleNotes.length === 0 ? (
              <p className="fr-tasks-empty__body">{productionWorkspace.clientNotesEmpty}</p>
            ) : (
              <ul className="fr-production-workspace__notes">
                {view.clientVisibleNotes.map((note, index) => (
                  <li key={`client-note-${index}`}>{note}</li>
                ))}
              </ul>
            )}
          </FileRoomSectionCard>

          <FileRoomSectionCard title={productionWorkspace.activityTitle}>
            {view.activity.length === 0 ? (
              <p className="fr-tasks-empty__body">{productionWorkspace.activityEmpty}</p>
            ) : (
              <ol className="fr-control-room-activity" aria-label="Job activity">
                {view.activity.map((event) => (
                  <li key={event.id} className="fr-control-room-activity__item">
                    <time className="fr-control-room-activity__when" dateTime={event.occurredAt}>
                      {formatWhen(event.occurredAt)}
                    </time>
                    <span className="fr-control-room-activity__kind">
                      {formatActivityKind(event.kind)}
                    </span>
                    <span className="fr-control-room-activity__actor">
                      {event.actor.displayName ?? event.actor.role}
                    </span>
                    {event.reason ? (
                      <p className="fr-control-room-activity__reason">{event.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </FileRoomSectionCard>
        </aside>
      </div>
    </div>
  );
}
