"use client";

import type { ReactNode } from "react";

import { useSamsungTapActivate } from "@/lib/studio-samsung-activate";

/**
 * Accepted Welcome / Voice Choice Denim CTA.
 * Samsung: href-less `<a role="button">` often skips pointerdown on a normal
 * tap and only fires after a long press. useSamsungActivate then ignores
 * that click (`!lastAt`). Tap-activate + a real href restores single-tap.
 */
export default function SamsungDenimCta({
  children,
  onActivate,
  dataAttr,
  className,
  disabled,
}: {
  children: ReactNode;
  onActivate: () => void;
  dataAttr?: string;
  className?: string;
  disabled?: boolean;
}) {
  const activate = useSamsungTapActivate<HTMLAnchorElement>(() => {
    if (disabled) return;
    onActivate();
  });
  return (
    <a
      ref={activate.ref}
      href="#studio-action"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      className={["lobby-entry-film__cta", className].filter(Boolean).join(" ")}
      data-review-studio-plan={dataAttr === "review-plan" ? "" : undefined}
      onClick={(event) => {
        event.preventDefault();
        if (disabled) return;
        activate.onClick();
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onActivate();
      }}
    >
      {children}
    </a>
  );
}
