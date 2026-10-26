"use client";

import { useState } from "react";

const TOPICS = [
  { id: "delivery_problem", label: "A file or download needs attention" },
  { id: "satisfaction", label: "This worked well" },
  { id: "dissatisfaction", label: "This did not meet what I expected" },
  { id: "suggestion", label: "A suggestion for The Studio" },
  { id: "help", label: "I need help understanding these files" },
] as const;

type Props = {
  campaignId: string;
  jobId: string;
};

/** Post-delivery note. It records an observation. It does not start a revision. */
export default function DeliveryObservationForm({ campaignId, jobId }: Props) {
  const [kind, setKind] = useState<(typeof TOPICS)[number]["id"]>("suggestion");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/studio-customer-observation", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, jobId, kind, note }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        acknowledgement?: string;
        error?: string;
      };
      if (!response.ok) {
        setError(body.error ?? "The note could not be sent.");
        return;
      }
      setNote("");
      setMessage(body.acknowledgement ?? "The Studio received your note.");
    } catch {
      setError("The note could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      className="fd-block fd-block--scope"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3>Tell The Studio how this went</h3>
      <p className="fd-item__text">
        This note is for learning and support. It does not start a revision, request a refund, or add a service.
      </p>
      <label className="utility-field">
        <span>Topic</span>
        <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
          {TOPICS.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.label}
            </option>
          ))}
        </select>
      </label>
      <label className="utility-field">
        <span>Your note</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          minLength={8}
          maxLength={800}
          required
          rows={4}
        />
      </label>
      {error ? <p className="utility-error" role="alert">{error}</p> : null}
      {message ? <p className="fd-item__text" role="status">{message}</p> : null}
      <button className="utility-btn utility-btn--secondary" type="submit" disabled={sending}>
        {sending ? "Sending..." : "Send note"}
      </button>
    </form>
  );
}
