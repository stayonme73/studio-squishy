"use client";

import Link from "next/link";

import styles from "@/components/studio-conversation-room/help-center-panel.module.css";

export type HelpCenterPanelProps = {
  open?: boolean;
  onClose?: () => void;
  className?: string;
};

/**
 * Help Center overlay — Conversation Room shell.
 * Full FAQ/policy content lives at /help-center.
 */
export default function HelpCenterPanel({
  open = false,
  onClose,
  className,
}: HelpCenterPanelProps) {
  if (!open) return null;

  return (
    <div
      className={[styles.panel, className ?? ""].filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label="Help Center"
      data-conversation-help="open"
    >
      <div className={styles.sheet}>
        <p className={styles.eyebrow}>Help Center</p>
        <h2 className={styles.title}>Need a hand?</h2>
        <p className={styles.body}>
          Policies, FAQ, and the Quick Policy Guide are in the full Help Center.
        </p>
        <div className={styles.actions}>
          <Link href="/help-center" className={styles.primary}>
            Open Help Center
          </Link>
          {onClose ? (
            <button type="button" className={styles.secondary} onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
