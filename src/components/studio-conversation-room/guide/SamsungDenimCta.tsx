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
}: {
  children: ReactNode;
  onActivate: () => void;
  dataAttr?: string;
}) {
  const activate = useSamsungTapActivate<HTMLAnchorElement>(onActivate);
  return (
    <a
      ref={activate.ref}
      href="#studio-action"
      role="button"
      tabIndex={0}
      className="lobby-entry-film__cta"
      data-review-studio-plan={dataAttr === "review-plan" ? "" : undefined}
      onClick={(event) => {
        event.preventDefault();
        activate.onClick();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onActivate();
      }}
    >
      {children}
    </a>
  );
}
