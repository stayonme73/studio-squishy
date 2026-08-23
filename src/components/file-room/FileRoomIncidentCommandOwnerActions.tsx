"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { OWNER_ACTIONS, type OwnerActionId } from "@/lib/studio-work-supervision/types";

const ACTION_LABELS: Record<OwnerActionId, string> = {
  acknowledge: "Acknowledge",
  hold: "Hold",
  approve_recovery: "Approve recovery",
  request_more_information: "Request more information",
  resolve: "Resolve",
};

type Props = {
  incidentId: string;
};

export default function FileRoomIncidentCommandOwnerActions({ incidentId }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busyAction, setBusyAction] = useState<OwnerActionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: OwnerActionId) {
    setBusyAction(action);
    setError(null);
    const response = await fetch(
      `/api/file-room/incident-command/${encodeURIComponent(incidentId)}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: note.trim() || `Owner chose ${ACTION_LABELS[action]}.`,
        }),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "The Owner action could not be recorded.");
      setBusyAction(null);
      return;
    }
    setNote("");
    setBusyAction(null);
    router.refresh();
  }

  return (
    <section className="fr-incident-command__actions utility-card">
      <h2 className="fr-section-title">Owner controls</h2>
      <p className="fr-incident-command__hint">
        These controls are available because the Machine escalated this record. They do not
        change the decision desk.
      </p>
      <label className="fr-incident-command__note">
        <span>Note for the append-only history</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
        />
      </label>
      {error ? <p className="fr-incident-command__error">{error}</p> : null}
      <div className="fr-incident-command__action-row">
        {OWNER_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className={
              action === "resolve"
                ? "utility-btn utility-btn--primary"
                : "utility-btn utility-btn--secondary"
            }
            disabled={busyAction !== null}
            onClick={() => void runAction(action)}
          >
            {busyAction === action ? "Recording…" : ACTION_LABELS[action]}
          </button>
        ))}
      </div>
    </section>
  );
}
