import type { GuideConversationStep } from "@/config/studio-guide-conversation-v1";
import { studioGuideConversationV1 } from "@/config/studio-guide-conversation-v1";
import GuideDraftCarryFields from "@/components/studio-guide/GuideDraftCarryFields";
import {
  createEmptyGuideCaptureDraft,
  type GuideCaptureDraftV1,
} from "@/lib/studio-guide-capture";
import { GUIDE_HARD_NAV } from "@/lib/studio-guide-hard-nav";

type Props = {
  step?: GuideConversationStep;
  fieldError?: string | null;
  draft?: GuideCaptureDraftV1;
};

function questionForStep(step: GuideConversationStep): string {
  const q = studioGuideConversationV1.questions;
  switch (step) {
    case "ask_preferred_name":
      return q.preferredName;
    case "ask_business_name":
      return q.businessName;
    case "ask_deadline":
      return q.deadline;
    case "ask_materials":
      return q.materials;
    case "ask_project_need":
    default:
      return q.projectNeed;
  }
}

/**
 * Server-rendered Guide room for `?guide=1`.
 * Shows the correct step on first paint after Continue (no bounce to Question 1).
 */
export default function GuideSsrBootShell({
  step = "ask_preferred_name",
  fieldError = null,
  draft = createEmptyGuideCaptureDraft(),
}: Props) {
  const copy = studioGuideConversationV1;
  const question = questionForStep(step);
  const canSkip =
    step === "ask_business_name" ||
    step === "ask_deadline" ||
    step === "ask_materials";
  const showQuestion =
    step === "ask_preferred_name" ||
    step === "ask_project_need" ||
    step === "ask_business_name" ||
    step === "ask_deadline" ||
    step === "ask_materials";

  return (
    <div
      id="studio-guide-ssr-boot"
      data-studio-guide-ssr="true"
      data-studio-guide-has-input="true"
      data-studio-guide-step={step}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        zIndex: 2147483000,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        background: "#f3ede3",
        color: "#2c3e50",
        padding: "16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {copy.guideRoleLabel}
        </p>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: "2.5rem",
            padding: "0.45rem 0.7rem",
            border: "1px solid rgba(44, 62, 80, 0.18)",
            borderRadius: "6px",
            background: "#fff",
            color: "#2c3e50",
            fontSize: "0.78rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {copy.closeLabel}
        </a>
      </div>

      {showQuestion ? (
        <>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: "1.15rem",
              fontWeight: 600,
              lineHeight: 1.35,
            }}
          >
            {question}
          </p>

          <form
            method="get"
            action="/"
            style={{
              marginTop: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <input type="hidden" name="guide" value={GUIDE_HARD_NAV.guide} />
            <input type="hidden" name="gr" value={GUIDE_HARD_NAV.gr} />
            <input type="hidden" name="gfrom" value={step} />
            <input type="hidden" name="gact" value={GUIDE_HARD_NAV.actContinue} />
            <GuideDraftCarryFields draft={draft} />

            <label
              htmlFor="studio-guide-answer-ssr"
              style={{ fontSize: "0.78rem", fontWeight: 600 }}
            >
              Your answer
            </label>
            <input
              id="studio-guide-answer-ssr"
              name="ganswer"
              placeholder={
                step === "ask_deadline"
                  ? copy.deadlinePlaceholder
                  : copy.inputPlaceholder
              }
              autoComplete="off"
              enterKeyHint="done"
              inputMode="text"
              style={{
                width: "100%",
                boxSizing: "border-box",
                minHeight: "3rem",
                padding: "0.75rem 0.85rem",
                border: "1px solid rgba(44, 62, 80, 0.22)",
                borderRadius: "8px",
                fontSize: "1rem",
                color: "#1a1a1a",
                background: "#fff",
              }}
            />
            {fieldError ? (
              <p style={{ margin: 0, color: "#8a2f1f", fontWeight: 600 }} role="alert">
                {fieldError}
              </p>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {canSkip ? (
                <button
                  type="submit"
                  name="gact"
                  value={GUIDE_HARD_NAV.actSkip}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "2.85rem",
                    padding: "0.6rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid rgba(44, 62, 80, 0.28)",
                    background: "transparent",
                    color: "#2c3e50",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {copy.skipLabel}
                </button>
              ) : null}
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "2.85rem",
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2c3e50",
                  color: "#fff",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {copy.submitAnswerLabel}
              </button>
            </div>
          </form>
        </>
      ) : null}

      {step === "summary" ? (
        <>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: "1.15rem",
              fontWeight: 600,
            }}
          >
            {copy.summaryIntro}
          </p>
          {draft.projectNeed.trim() ? (
            <p style={{ margin: "12px 0 0", fontSize: "0.95rem", lineHeight: 1.4 }}>
              {draft.projectNeed}
            </p>
          ) : null}
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <form method="get" action="/">
              <input type="hidden" name="guide" value={GUIDE_HARD_NAV.guide} />
              <input type="hidden" name="gr" value={GUIDE_HARD_NAV.gr} />
              <input type="hidden" name="gact" value={GUIDE_HARD_NAV.actCorrect} />
              <GuideDraftCarryFields draft={draft} />
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "2.85rem",
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(44, 62, 80, 0.28)",
                  background: "transparent",
                  color: "#2c3e50",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {copy.correctLabel}
              </button>
            </form>
            <form method="get" action="/">
              <input type="hidden" name="guide" value={GUIDE_HARD_NAV.guide} />
              <input type="hidden" name="gr" value={GUIDE_HARD_NAV.gr} />
              <input type="hidden" name="gact" value={GUIDE_HARD_NAV.actConfirm} />
              <GuideDraftCarryFields draft={draft} />
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "2.85rem",
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2c3e50",
                  color: "#fff",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {copy.confirmLabel}
              </button>
            </form>
          </div>
        </>
      ) : null}

      {step === "confirmed" ? (
        <>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: "1.15rem",
              fontWeight: 600,
            }}
          >
            {copy.confirmedTitle}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: "0.95rem" }}>{copy.confirmedBody}</p>
        </>
      ) : null}
    </div>
  );
}
