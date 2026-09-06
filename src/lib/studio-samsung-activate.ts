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
  const sawPointerDown = useRef(false);
  const nodeRef = useRef<T | null>(null);

  const onPointerDown = useRef((event: PointerEvent) => {
    sawPointerDown.current = true;
    startX.current = event.clientX;
    startY.current = event.clientY;
  });

  const onPointerUp = useRef((event: PointerEvent) => {
    if (!sawPointerDown.current) return;
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
      /* Already handled by pointerup on this node. */
      if (lastAt.current && Date.now() - lastAt.current < 450) return;
      /*
       * Leftover click after Review Studio Plan unmounts. Continue to Checkout
       * mounts under the same finger and must not inherit that click.
       * Click-only fallback still works when THIS node saw pointerdown.
       */
      if (!sawPointerDown.current) return;
      lastAt.current = Date.now();
      handlerRef.current();
    },
  };
}

/**
 * Voice Choice gate. Samsung may skip pointerdown, skip click if pointerdown
 * was preventDefault'd, or miss pointerup. Do not require pointerdown.
 * Do not preventDefault on pointerdown.
 *
 * pointerdown paints the pressed/selected state on the node only.
 * Do not React-setState on pointerdown — a re-render can rebind listeners
 * and drop the finger-up on Samsung.
 * Commit on pointerup / touchend / click so the next screen does not mount
 * under the same finger. Click without pointerdown still commits (Samsung skip).
 */
export function useSamsungGateActivate<T extends HTMLElement>(
  handler: () => void,
  options?: { onPress?: () => void },
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const onPressRef = useRef(options?.onPress);
  onPressRef.current = options?.onPress;
  const committedAt = useRef(0);
  const nodeRef = useRef<T | null>(null);

  const onEvent = useRef((event: Event) => {
    if (event.type === "pointerdown") {
      const node = event.currentTarget;
      if (node instanceof HTMLElement) {
        node.dataset.gatePressed = "true";
      }
      onPressRef.current?.();
      return;
    }
    if (event.type === "pointercancel") {
      const node = event.currentTarget;
      if (node instanceof HTMLElement) {
        delete node.dataset.gatePressed;
      }
      return;
    }
    const now = Date.now();
    if (committedAt.current && now - committedAt.current < 400) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    committedAt.current = now;
    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopPropagation();
    handlerRef.current();
  });

  const ref: RefCallback<T> = useCallback((node) => {
    if (nodeRef.current === node) return;
    const prev = nodeRef.current;
    if (prev) {
      prev.removeEventListener("pointerdown", onEvent.current, true);
      prev.removeEventListener("pointerup", onEvent.current, true);
      prev.removeEventListener("pointercancel", onEvent.current, true);
      prev.removeEventListener("touchend", onEvent.current);
      prev.removeEventListener("click", onEvent.current, true);
    }
    nodeRef.current = node;
    if (node) {
      node.addEventListener("pointerdown", onEvent.current, true);
      node.addEventListener("pointerup", onEvent.current, true);
      node.addEventListener("pointercancel", onEvent.current, true);
      node.addEventListener("touchend", onEvent.current, { passive: false });
      node.addEventListener("click", onEvent.current, true);
    }
  }, []);

  return { ref };
}

/**
 * After a first-entry Voice gate tap, the Speak/Type mic can mount under the
 * same finger. Do not re-arm on pointerup/touchend — leftover click comes next
 * and would start listening. Swallow that leftover click, then re-arm.
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
    window.removeEventListener("click", swallowClick, true);
    window.removeEventListener("pointercancel", finish, true);
    window.clearTimeout(timeout);
    window.setTimeout(onSettled, 0);
  };
  const swallowClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    finish();
  };
  const timeout = window.setTimeout(finish, 500);
  window.addEventListener("click", swallowClick, true);
  window.addEventListener("pointercancel", finish, true);
}
