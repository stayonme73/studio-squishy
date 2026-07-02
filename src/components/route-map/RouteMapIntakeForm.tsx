"use client";

import { useMemo, useState } from "react";

import {
  getRouteMapIntakeSchema,
  type RouteMapIntakeAnswers,
} from "@/config/route-map-intake-v1";
import { ROUTE_MAP_V1, type RouteMapJob } from "@/config/route-map-v1";

type Props = {
  job: RouteMapJob;
  onSubmit: (answers: RouteMapIntakeAnswers) => void;
};

export default function RouteMapIntakeForm({ job, onSubmit }: Props) {
  const schema = useMemo(() => getRouteMapIntakeSchema(job.intakeType), [job.intakeType]);
  const [answers, setAnswers] = useState<RouteMapIntakeAnswers>(() =>
    Object.fromEntries(schema.fields.map((field) => [field.id, ""])),
  );
  const [submitting, setSubmitting] = useState(false);

  function handleChange(fieldId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    onSubmit(answers);
  }

  return (
    <section className="route-map-intake" aria-labelledby="route-map-intake-title">
      <h2 id="route-map-intake-title" className="route-map-section-title">
        {schema.title}
      </h2>
      <p className="route-map-section-lead">{ROUTE_MAP_V1.checkout.intakeLead}</p>
      <p className="route-map-intake__job">{job.name}</p>

      <form className="route-map-intake__form" onSubmit={handleSubmit}>
        {schema.fields.map((field) => (
          <label key={field.id} className="route-map-intake__field">
            <span className="route-map-intake__label">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            {field.type === "select" ? (
              <select
                required={field.required}
                value={answers[field.id] ?? ""}
                onChange={(event) => handleChange(field.id, event.target.value)}
              >
                <option value="">Select…</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                required={field.required}
                rows={4}
                placeholder={field.placeholder}
                value={answers[field.id] ?? ""}
                onChange={(event) => handleChange(field.id, event.target.value)}
              />
            ) : (
              <input
                type="text"
                required={field.required}
                placeholder={field.placeholder}
                value={answers[field.id] ?? ""}
                onChange={(event) => handleChange(field.id, event.target.value)}
              />
            )}
          </label>
        ))}

        <button type="submit" className="route-map-primary-btn" disabled={submitting}>
          Submit intake &amp; open Project Record
        </button>
      </form>
    </section>
  );
}
