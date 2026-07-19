"use client";

import styles from "@/components/studio-tablet/studio-tablet.module.css";

type StudioTabletDockProps = {
  className?: string;
};

/** Optional charging dock — separate from the tablet shell. */
export default function StudioTabletDock({ className }: StudioTabletDockProps) {
  return (
    <div
      className={`${styles.dock}${className ? ` ${className}` : ""}`}
      aria-hidden
    />
  );
}
