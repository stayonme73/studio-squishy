"use client";

import { useCallback, useRef, type RefCallback } from "react";

/**
 * Samsung Chrome often skips React synthetic click, reports a finger as
 * mouse, and can miss pointerup if listeners rebind mid-gesture.
 * Bind a stable native pointerdown on the real node via callback ref.
 */
export function useSamsungActivate<T extends HTMLElement>(
  handler: () => void,
  options?: { consumeGesture?: boolean },
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const lastAt = useRef(0);
  const nodeRef = useRef<T | null>(null);
  const consumeRef = useRef(options?.consumeGesture === true);
  consumeRef.current = options?.consumeGesture === true;

  const onPointerDown = useRef((event: PointerEvent) => {
    if (consumeRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
    lastAt.current = Date.now();
    handlerRef.current();
  });

  const ref: RefCallback<T> = useCallback((node) => {
    const prev = nodeRef.current;
    if (prev) {
      prev.removeEventListener("pointerdown", onPointerDown.current);
    }
    nodeRef.current = node;
    if (node) {
      node.addEventListener("pointerdown", onPointerDown.current);
    }
  }, []);

  return {
    ref,
    onClick(event?: { detail?: number }) {
      /* Keyboard Enter: detail 0, no pointerdown on this node. */
      if (event?.detail === 0) {
        handlerRef.current();
        return;
      }
      /* Leftover click on a newly mounted chip never saw pointerdown here. */
      if (!lastAt.current) return;
      if (Date.now() - lastAt.current < 450) return;
      handlerRef.current();
    },
  };
}

const TAP_SLOP_PX = 12;

/**
 * MJ-D14: drawer / full-width dock controls sit in the page-scroll path.
 * Immediate pointerdown treats a vertical swipe as a tap. Fire only when
 * the finger lifts without moving — chips/Continue keep useSamsungActivate.
 */
export function useSamsungTapActivate<T extends HTMLElement>(handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const lastAt = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const nodeRef = useRef<T | null>(null);

  const onPointerDown = useRef((event: PointerEvent) => {
    startX.current = event.clientX;
    startY.current = event.clientY;
  });

  const onPointerUp = useRef((event: PointerEvent) => {
    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;
    if (dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX) return;
    lastAt.current = Date.now();
    handlerRef.current();
  });

  const ref: RefCallback<T> = useCallback((node) => {
    const prev = nodeRef.current;
    if (prev) {
      prev.removeEventListener("pointerdown", onPointerDown.current);
      prev.removeEventListener("pointerup", onPointerUp.current);
    }
    nodeRef.current = node;
    if (node) {
      node.addEventListener("pointerdown", onPointerDown.current);
      node.addEventListener("pointerup", onPointerUp.current);
    }
  }, []);

  return {
    ref,
    onClick() {
      if (Date.now() - lastAt.current < 450) return;
      handlerRef.current();
    },
  };
}

/**
 * After a first-entry Voice gate tap, the Speak/Type mic mounts under the
 * same finger. Ignore leftover pointerup/click so Voice Off cannot start
 * listening. The next explicit mic tap is allowed after this gesture ends.
 */
export function suppressSameGestureFollowUp(onSettled: () => void): void {
  if (typeof window === "undefined") {
    onSettled();
    return;
  }
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    window.removeEventListener("pointerup", finish, true);
    window.removeEventListener("pointercancel", finish, true);
    window.removeEventListener("click", finish, true);
    window.setTimeout(onSettled, 0);
  };
  window.addEventListener("pointerup", finish, true);
  window.addEventListener("pointercancel", finish, true);
  window.addEventListener("click", finish, true);
}
