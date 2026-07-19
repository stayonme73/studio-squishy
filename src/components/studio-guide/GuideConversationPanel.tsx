"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import {
  type GuideConversationStep,
  GUIDE_SCRIM_DISMISS_DELAY_MS,
  isStudioGuideVoiceEnabled,
  studioGuideConversationV1,
} from "@/config/studio-guide-conversation-v1";
import GuideCaptureSummary from "@/components/studio-guide/GuideCaptureSummary";
import GuideDraftCarryFields from "@/components/studio-guide/GuideDraftCarryFields";
import GuideMicControl, {
  GuideMicFieldButton,
} from "@/components/studio-guide/GuideMicControl";
import { useGuideDictation } from "@/components/studio-guide/useGuideDictation";
import {
  createEmptyGuideCaptureDraft,
  startNewGuideCaptureConversation,
  type GuideCaptureDraftV1,
} from "@/lib/studio-guide-capture";
import {
  GUIDE_HARD_NAV,
  clearGuideUiStep,
  commitGuideHardNavAdvance,
  loadGuideDraft,
  persistGuideDraft,
  processGuideHardNavSearchParams,
  resolveGuideOpenStep,
  writeGuideUiStep,
  type GuideServerHardNav,
} from "@/lib/studio-guide-hard-nav";

import styles from "./GuideConversationPanel.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  closeHref?: string;
  /** Full query string — changes when Samsung GET-submits Continue. */
  navKey?: string;
  /** Server-interpreted Continue — first paint must already be the next step. */
  serverHardNav?: GuideServerHardNav;
};

function initialStateFromServer(serverHardNav: GuideServerHardNav | undefined): {
  step: GuideConversationStep;
  draft: GuideCaptureDraftV1;
  fieldError: string | null;
} {
  if (serverHardNav?.kind === "advanced") {
    return {
      step: serverHardNav.step,
      draft: serverHardNav.draft,
      fieldError: null,
    };
  }
  if (serverHardNav?.kind === "error") {
    return {
      step: serverHardNav.step,
      draft: createEmptyGuideCaptureDraft(),
      fieldError: serverHardNav.message,
    };
  }
  return {
    step: "ask_project_need",
    draft: createEmptyGuideCaptureDraft(),
    fieldError: null,
  };
}

type GuideLayout = "room" | "rail";

function questionForStep(step: GuideConversationStep): string | null {
  const q = studioGuideConversationV1.questions;
  switch (step) {
    case "ask_preferred_name":
      return q.preferredName;
    case "ask_project_need":
      return q.projectNeed;
    case "ask_business_name":
      return q.businessName;
    case "ask_deadline":
      return q.deadline;
    case "ask_materials":
      return q.materials;
    default:
      return null;
  }
}

function detectGuideLayout(): GuideLayout {
  if (typeof window === "undefined") return "room";
  if (window.matchMedia("(pointer: coarse)").matches) return "room";
  if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) {
    return "room";
  }
  const fineDesktop = window.matchMedia(
    "(min-width: 1025px) and (pointer: fine) and (hover: hover)",
  ).matches;
  return fineDesktop ? "rail" : "room";
}

const PORTAL_HOST_ID = "studio-guide-portal-host";

function ensureGuidePortalHost(): HTMLElement {
  let host = document.getElementById(PORTAL_HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = PORTAL_HOST_ID;
    host.setAttribute("data-studio-guide-portal", "true");
    document.documentElement.appendChild(host);
  }
  return host;
}

function pinHostToVisualViewport(host: HTMLElement) {
  const vv = window.visualViewport;
  const top = vv ? Math.round(vv.offsetTop) : 0;
  const left = vv ? Math.round(vv.offsetLeft) : 0;
  const width = vv ? Math.round(vv.width) : window.innerWidth;
  const height = vv ? Math.round(vv.height) : window.innerHeight;
  const safeW = width > 0 ? width : window.innerWidth || 360;
  const safeH = height > 0 ? height : window.innerHeight || 640;

  host.style.cssText = [
    "position:fixed",
    `top:${top}px`,
    `left:${left}px`,
    "right:auto",
    "bottom:auto",
    `width:${safeW}px`,
    `height:${safeH}px`,
    "margin:0",
    "padding:0",
    "border:0",
    "transform:none",
    "z-index:2147483000",
    "box-sizing:border-box",
    "pointer-events:auto",
    "overflow:hidden",
    "background:#f3ede3",
  ].join(";");
}

const roomShellStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  background: "#f3ede3",
  color: "#2c3e50",
  overflow: "hidden",
  fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
};

const roomPanelStyle: CSSProperties = {
  position: "relative",
  flex: "1 1 auto",
  width: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  background: "#f3ede3",
  borderTop: "4px solid #d94e2b",
  padding: "16px 16px 20px",
  overflow: "auto",
  WebkitOverflowScrolling: "touch",
};

const roomFallbackFixedStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  height: "100dvh",
  zIndex: 2147483000,
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  background: "#f3ede3",
  color: "#2c3e50",
  overflow: "hidden",
  fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
};

export default function GuideConversationPanel({
  open,
  onClose,
  closeHref,
  navKey = "",
  serverHardNav = { kind: "none" },
}: Props) {
  const titleId = useId();
  const boot = initialStateFromServer(serverHardNav);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<GuideLayout>("room");
  const [step, setStep] = useState<GuideConversationStep>(boot.step);
  const [draft, setDraft] = useState<GuideCaptureDraftV1>(boot.draft);
  const [fieldError, setFieldError] = useState<string | null>(boot.fieldError);
  const [scrimDismissArmed, setScrimDismissArmed] = useState(false);
  const scrimDismissArmedRef = useRef(false);
  const serverNavAppliedRef = useRef(false);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const stepRef = useRef(step);
  stepRef.current = step;
  const isRoom = layout === "room";
  const copy = studioGuideConversationV1;
  const voiceFlagOn = isStudioGuideVoiceEnabled();
  const questionStep =
    step === "ask_preferred_name" ||
    step === "ask_project_need" ||
    step === "ask_business_name" ||
    step === "ask_deadline" ||
    step === "ask_materials";
  const dictation = useGuideDictation({
    active: open && voiceFlagOn && questionStep,
    answerInputRef,
    stepKey: step,
  });

  useLayoutEffect(() => {
    if (!open) {
      setPortalEl(null);
      return;
    }
    const host = ensureGuidePortalHost();
    setPortalEl(host);
    setLayout(detectGuideLayout());

    const pin = () => {
      try {
        if (detectGuideLayout() === "room") {
          pinHostToVisualViewport(host);
        } else {
          host.style.cssText =
            "position:fixed;inset:0;width:100%;height:100%;z-index:2147483000;pointer-events:auto;background:transparent;";
        }
      } catch {
        /* Viewport APIs must never block the conversation field. */
        host.style.cssText =
          "position:fixed;inset:0;width:100%;height:100%;z-index:2147483000;pointer-events:auto;overflow:hidden;background:#f3ede3;";
      }
    };

    pin();
    const raf = window.requestAnimationFrame(pin);
    const again = window.setTimeout(pin, 200);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", pin);
    vv?.addEventListener("scroll", pin);
    window.addEventListener("resize", pin);
    window.addEventListener("orientationchange", pin);

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    /* Client conversation is mounted — remove SSR shell so it cannot trap the phone. */
    document.getElementById("studio-guide-ssr-boot")?.remove();

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(again);
      vv?.removeEventListener("resize", pin);
      vv?.removeEventListener("scroll", pin);
      window.removeEventListener("resize", pin);
      window.removeEventListener("orientationchange", pin);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      host.style.cssText =
        "position:fixed;inset:0;width:0;height:0;overflow:hidden;pointer-events:none;";
    };
  }, [open]);

  /*
   * Persist server Continue result + clean URL.
   * First paint already shows the next step from serverHardNav — do not reset to Q1.
   */
  useLayoutEffect(() => {
    if (!open) {
      serverNavAppliedRef.current = false;
      return;
    }

    if (serverHardNav.kind === "advanced" && !serverNavAppliedRef.current) {
      serverNavAppliedRef.current = true;
      const merged = commitGuideHardNavAdvance({
        kind: "advanced",
        draft: serverHardNav.draft,
        step: serverHardNav.step,
        fromStep: serverHardNav.fromStep,
        answer: serverHardNav.answer,
        skipped: serverHardNav.skipped,
        cleanHref: serverHardNav.cleanHref,
      });
      setDraft(merged);
      setStep(serverHardNav.step);
      setFieldError(null);
      console.info("[studio-guide] server-hard-nav applied", {
        step: serverHardNav.step,
        projectNeed: merged.projectNeed,
      });
      window.history.replaceState(null, "", serverHardNav.cleanHref);
      return;
    }

    if (serverHardNav.kind === "error" && !serverNavAppliedRef.current) {
      serverNavAppliedRef.current = true;
      setStep(serverHardNav.step);
      setFieldError(serverHardNav.message);
      window.history.replaceState(
        null,
        "",
        `/?guide=1&gr=${GUIDE_HARD_NAV.gr}&gstep=${encodeURIComponent(serverHardNav.step)}`,
      );
      return;
    }

    /* Soft client navKey changes (no server payload): process GET if present. */
    const params = new URLSearchParams(window.location.search);
    if (params.get("gact")) {
      const nav = processGuideHardNavSearchParams(params);
      if (nav.kind === "advanced") {
        setDraft(nav.draft);
        setStep(nav.step);
        setFieldError(null);
        window.history.replaceState(null, "", nav.cleanHref);
        return;
      }
      if (nav.kind === "error") {
        setStep(nav.step);
        setFieldError(nav.message);
        return;
      }
    }

    const existing = loadGuideDraft();
    if (existing) {
      persistGuideDraft(existing);
      const resume = resolveGuideOpenStep(params, existing);
      /* Do not overwrite an advanced step already shown from the server. */
      if (serverHardNav.kind !== "advanced") {
        setDraft(existing);
        setStep(resume);
        writeGuideUiStep(resume);
      }
    }
  }, [open, navKey, serverHardNav]);

  useEffect(() => {
    if (!open) {
      scrimDismissArmedRef.current = false;
      setScrimDismissArmed(false);
      return;
    }
    scrimDismissArmedRef.current = false;
    setScrimDismissArmed(false);
    if (isRoom) return;
    const timer = window.setTimeout(() => {
      scrimDismissArmedRef.current = true;
      setScrimDismissArmed(true);
    }, GUIDE_SCRIM_DISMISS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [open, isRoom]);

  const stopDictationForClose = dictation.stopForClose;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        stopDictationForClose();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, stopDictationForClose]);

  function handleStartNewConversation() {
    const empty = startNewGuideCaptureConversation();
    clearGuideUiStep();
    setDraft(empty);
    setStep("ask_preferred_name");
    writeGuideUiStep("ask_preferred_name");
    setFieldError(null);
    window.location.assign(`/?guide=1&gr=${GUIDE_HARD_NAV.gr}`);
  }

  function handleScrimDismiss() {
    if (isRoom) return;
    if (!scrimDismissArmedRef.current) return;
    dictation.stopForClose();
    onClose();
  }

  function handleCloseClick() {
    dictation.stopForClose();
    onClose();
  }

  /* Input renders as soon as Guide is open — no readiness / scrim / focus gate. */
  if (!open) return null;

  const question = questionForStep(step);
  const canSkip =
    step === "ask_business_name" ||
    step === "ask_deadline" ||
    step === "ask_materials";

  const ui = (
    <div
      className={styles.root}
      role="presentation"
      data-studio-guide-open="true"
      data-layout={layout}
      data-guide-boot="room-v8"
      data-studio-guide-step={step}
      style={isRoom ? (portalEl ? roomShellStyle : roomFallbackFixedStyle) : undefined}
    >
      {!isRoom ? (
        <button
          type="button"
          className={styles.scrim}
          aria-label={copy.closeLabel}
          tabIndex={!scrimDismissArmed ? -1 : 0}
          data-dismiss-armed={scrimDismissArmed ? "true" : "false"}
          onClick={handleScrimDismiss}
        />
      ) : null}
      <section
        className={styles.panel}
        style={isRoom ? roomPanelStyle : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.header}>
          <p id={titleId} className={styles.eyebrow}>
            {copy.guideRoleLabel}
          </p>
          {closeHref ? (
            <a
              href={closeHref}
              className={styles.close}
              onClick={() => dictation.stopForClose()}
            >
              {copy.closeLabel}
            </a>
          ) : (
            <button type="button" className={styles.close} onClick={handleCloseClick}>
              {copy.closeLabel}
            </button>
          )}
        </header>

        <div className={styles.body}>
          {question ? (
            <>
              <p className={styles.guideLine}>{question}</p>
              {/*
                Native GET form — Samsung submits this reliably (same class of
                navigation as Close). Client applies ganswer on the next load.
              */}
              <form
                className={styles.form}
                method="get"
                action="/"
                onSubmit={() => dictation.stopForContinue()}
              >
                <input type="hidden" name="guide" value={GUIDE_HARD_NAV.guide} />
                <input type="hidden" name="gr" value={GUIDE_HARD_NAV.gr} />
                <input type="hidden" name="gfrom" value={step} />
                <input
                  type="hidden"
                  name="gact"
                  value={GUIDE_HARD_NAV.actContinue}
                />
                <GuideDraftCarryFields draft={draft} />

                <label className={styles.label} htmlFor="studio-guide-answer">
                  Your answer
                </label>
                <div
                  className={styles.answerField}
                  data-listening={
                    dictation.speechState === "listening" ||
                    dictation.speechState === "processing"
                      ? "true"
                      : "false"
                  }
                  data-voice={voiceFlagOn ? "true" : "false"}
                >
                  <input
                    id="studio-guide-answer"
                    ref={answerInputRef}
                    name="ganswer"
                    className={styles.input}
                    defaultValue=""
                    placeholder={
                      step === "ask_deadline"
                        ? copy.deadlinePlaceholder
                        : copy.inputPlaceholder
                    }
                    autoComplete="off"
                    enterKeyHint="done"
                    inputMode="text"
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={
                      [
                        voiceFlagOn ? "studio-guide-voice-assist" : null,
                        step === "ask_deadline"
                          ? "studio-guide-deadline-hint"
                          : null,
                        fieldError
                          ? step === "ask_deadline"
                            ? "studio-guide-deadline-error"
                            : "studio-guide-field-error"
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                    onInput={() => dictation.onCustomerInput()}
                  />
                  {voiceFlagOn ? (
                    <GuideMicFieldButton
                      state={dictation.speechState}
                      onMicTap={dictation.onMicTap}
                    />
                  ) : null}
                </div>
                {voiceFlagOn ? (
                  <div id="studio-guide-voice-assist">
                    <GuideMicControl
                      state={dictation.speechState}
                      interimText={dictation.interimText}
                      errorMessage={dictation.speechError}
                      onRetry={dictation.onRetry}
                    />
                  </div>
                ) : null}
                {step === "ask_deadline" ? (
                  <p id="studio-guide-deadline-hint" className={styles.hint}>
                    {copy.deadlineFormatHint}
                  </p>
                ) : null}
                {fieldError ? (
                  <p
                    id={
                      step === "ask_deadline"
                        ? "studio-guide-deadline-error"
                        : "studio-guide-field-error"
                    }
                    className={styles.fieldError}
                    role="alert"
                  >
                    {fieldError}
                  </p>
                ) : null}
                <div className={styles.actions}>
                  {canSkip ? (
                    <button
                      type="submit"
                      className={styles.secondary}
                      name="gact"
                      value={GUIDE_HARD_NAV.actSkip}
                    >
                      {copy.skipLabel}
                    </button>
                  ) : null}
                  <button type="submit" className={styles.primary}>
                    {copy.submitAnswerLabel}
                  </button>
                </div>
              </form>
            </>
          ) : null}

          {step === "summary" ? (
            <>
              <GuideCaptureSummary draft={draft} />
              <div className={styles.actions}>
                <form method="get" action="/">
                  <input type="hidden" name="guide" value={GUIDE_HARD_NAV.guide} />
                  <input type="hidden" name="gr" value={GUIDE_HARD_NAV.gr} />
                  <input
                    type="hidden"
                    name="gact"
                    value={GUIDE_HARD_NAV.actCorrect}
                  />
                  <GuideDraftCarryFields draft={draft} />
                  <button type="submit" className={styles.secondary}>
                    {copy.correctLabel}
                  </button>
                </form>
                <form method="get" action="/">
                  <input type="hidden" name="guide" value={GUIDE_HARD_NAV.guide} />
                  <input type="hidden" name="gr" value={GUIDE_HARD_NAV.gr} />
                  <input
                    type="hidden"
                    name="gact"
                    value={GUIDE_HARD_NAV.actConfirm}
                  />
                  <GuideDraftCarryFields draft={draft} />
                  <button type="submit" className={styles.primary}>
                    {copy.confirmLabel}
                  </button>
                </form>
              </div>
            </>
          ) : null}

          {step === "confirmed" ? (
            <>
              <p className={styles.guideLine}>{copy.confirmedTitle}</p>
              <p className={styles.muted}>{copy.confirmedBody}</p>
              {draft.deadlineStatus === "unconfirmed" ? (
                <p className={styles.deadlineNote}>{copy.deadlineUnconfirmedNote}</p>
              ) : null}
              <GuideCaptureSummary draft={draft} />
              <div className={styles.actions}>
                {closeHref ? (
                  <a href={closeHref} className={styles.secondary}>
                    {copy.closeLabel}
                  </a>
                ) : (
                  <button type="button" className={styles.secondary} onClick={onClose}>
                    {copy.closeLabel}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primary}
                  onClick={handleStartNewConversation}
                >
                  {copy.startNewConversationLabel}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );

  if (portalEl) {
    return createPortal(ui, portalEl);
  }
  return ui;
}
