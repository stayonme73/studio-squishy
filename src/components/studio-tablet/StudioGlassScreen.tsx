"use client";

import type { ReactNode } from "react";

import styles from "@/components/studio-tablet/studio-glass-screen.module.css";

export type StudioGlassScreenProps = {
  children?: ReactNode;
  eyebrow?: string;
  title?: string;
  className?: string;
};

/**
 * Customer-facing modern glass screen — React panel, not a PNG.
 * Mirrors what matters; Host detail stays on the Tablet.
 */
export default function StudioGlassScreen({
  children,
  eyebrow = "Customer view",
  title = "Let's build your project",
  className,
}: StudioGlassScreenProps) {
  return (
    <aside
      className={`${styles.glass}${className ? ` ${className}` : ""}`}
      aria-label="Studio glass screen"
    >
      <div className={styles.sheen} aria-hidden />
      <header className={styles.header}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
      </header>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
