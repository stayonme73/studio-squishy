"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { TeamOfficeWorkPacketView } from "@/lib/job-control/work-packets";

import FileRoomSectionCard from "./FileRoomSectionCard";

type FileRoomWorkPacketPanelProps = {
  packet: TeamOfficeWorkPacketView | null;
};

export default function FileRoomWorkPacketPanel({ packet }: FileRoomWorkPacketPanelProps) {
  const router = useRouter();
  const [fileKind, setFileKind] = useState<"draft" | "final">("draft");
  const [deliverableKey, setDeliverableKey] = useState("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!packet) {
    return (
      <FileRoomSectionCard title="Work Packet">
        <p className="fr-tasks-empty__body">
          No job-level Work Packet assigned from Production Workspace for this task yet.
        </p>
      </FileRoomSectionCard>
    );
  }

  const returnFile = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(packet.campaignId)}/jobs/${encodeURIComponent(packet.jobId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "return_work_packet_file",
            packetId: packet.packetId,
            fileKind,
            label,
            url,
            deliverableKey: deliverableKey || undefined,
            note: note || undefined,
          }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Unable to return file reference.");
      }
      setLabel("");
      setUrl("");
      setNote("");
      setDeliverableKey("");
      router.refresh();
    } catch (returnError) {
      setError(returnError instanceof Error ? returnError.message : "Unable to return file reference.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FileRoomSectionCard title="Work Packet">
      <dl className="fr-kv-list">
        <div>
          <dt>Job</dt>
          <dd>{packet.serviceName}</dd>
        </div>
        <div>
          <dt>Assigned office</dt>
          <dd>{packet.roleLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{packet.statusLabel}</dd>
        </div>
        <div>
          <dt>Production brief</dt>
          <dd>{packet.productionBriefAvailable ? "Available in packet" : "Use approved plan scope"}</dd>
        </div>
        <div>
          <dt>Return location</dt>
          <dd>{packet.returnLocationLabel}</dd>
        </div>
        <div>
          <dt>Approval</dt>
          <dd>{packet.ownerApprovalRequirement}</dd>
        </div>
      </dl>

      <div className="fr-scope-group">
        <p className="fr-scope-group__name">Required deliverables</p>
        <ul className="fr-scope-group__list">
          {packet.requiredDeliverables.map((item) => (
            <li key={item.key}>
              {item.label} {item.prepared ? "(prepared)" : "(open)"}
            </li>
          ))}
        </ul>
      </div>

      <div className="fr-scope-group">
        <p className="fr-scope-group__name">Source materials / files</p>
        {packet.materials.length === 0 && packet.workingFileRefs.length === 0 ? (
          <p className="fr-tasks-row__meta">No source materials or working refs linked yet.</p>
        ) : (
          <>
            {packet.materials.length > 0 ? (
              <ul className="fr-scope-group__list">
                {packet.materials.map((item) => (
                  <li key={item.id}>
                    {item.label} ({item.status})
                  </li>
                ))}
              </ul>
            ) : null}
            {packet.workingFileRefs.length > 0 ? (
              <ul className="fr-scope-group__list">
                {packet.workingFileRefs.map((ref) => (
                  <li key={ref.id}>
                    <a className="fr-back-link" href={ref.url} target="_blank" rel="noreferrer">
                      {ref.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      <div className="fr-scope-group">
        <p className="fr-scope-group__name">Internal notes</p>
        {packet.internalNotes.length === 0 ? (
          <p className="fr-tasks-row__meta">No internal notes yet.</p>
        ) : (
          <ul className="fr-scope-group__list">
            {packet.internalNotes.map((noteEntry) => (
              <li key={noteEntry.id}>{noteEntry.content}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="fr-scope-group">
        <p className="fr-scope-group__name">Returned draft/final refs</p>
        {packet.returnedFiles.length === 0 ? (
          <p className="fr-tasks-row__meta">No returned file references yet.</p>
        ) : (
          <ul className="fr-scope-group__list">
            {packet.returnedFiles.map((file) => (
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

      <form
        className="fr-production-workspace__form"
        onSubmit={(event) => {
          event.preventDefault();
          void returnFile();
        }}
      >
        <select
          className="fr-production-workspace__input"
          value={fileKind}
          onChange={(event) => setFileKind(event.target.value as "draft" | "final")}
        >
          <option value="draft">Draft return</option>
          <option value="final">Final return</option>
        </select>
        <select
          className="fr-production-workspace__input"
          value={deliverableKey}
          onChange={(event) => setDeliverableKey(event.target.value)}
          required={fileKind === "final"}
        >
          <option value="">Select deliverable for final returns</option>
          {packet.requiredDeliverables.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          className="fr-production-workspace__input"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Returned file label"
        />
        <input
          className="fr-production-workspace__input"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
        />
        <textarea
          className="fr-production-work__textarea"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Internal return note (optional)"
          rows={2}
        />
        <button
          type="submit"
          className="utility-btn utility-btn--primary"
          disabled={busy || !label.trim() || !url.trim() || (fileKind === "final" && !deliverableKey)}
        >
          Return file reference
        </button>
      </form>

      <p className="fr-tasks-row__meta">{packet.integrationStatusLabel}</p>
      {error ? (
        <p className="fr-tasks-row__meta" role="alert">
          {error}
        </p>
      ) : null}
    </FileRoomSectionCard>
  );
}
