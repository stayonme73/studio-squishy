"use client";

import type { ReactNode } from "react";

import { useSamsungActivate } from "@/lib/studio-samsung-activate";

/**
 * Shared Conversation Back control. Samsung skips pointerdown on href-less
 * `<a role="button">` and can miss React click on a plain button. A real
 * href plus native pointerdown keeps the tap live. Visual class stays with
 * the caller — this is not a redesign.
 */
export default function SamsungDeckBack({
  children,
  onActivate,
  className,
}: {
  children: ReactNode;
  onActivate: () => void;
  className: string;
}) {
  const activate = useSamsungActivate<HTMLAnchorElement>(onActivate, {
    consumeGesture: true,
  });
  return (
    <a
      ref={activate.ref}
      href="#studio-deck-back"
      role="button"
      className={className}
      data-pre-checkout-deck-back=""
      onClick={(event) => {
        event.preventDefault();
        activate.onClick(event);
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
