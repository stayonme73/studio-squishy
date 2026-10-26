"use client";

import { useCallback, useRef, type RefCallback } from "react";

export const STUDIO_POINTER_SETTLE_MS = 450;

let settleUntil = 0;
let settleTimer = 0;
let settleArmed = false;
const settleCallbacks: Array<() => void> = [];
const settleListeners = new Set<() => void>();
const blockedPointerIds = new Set<number>();

export function subscribeStudioPointerSettle(listener: () => void): () => void {
  settleListeners.add(listener);
  return () => {
    settleListeners.delete(listener);
  };
}

function notifyStudioPointerSettle() {
  settleListeners.forEach((listener) => listener());
}

export function blockStudioPointerId(pointerId: number, ms = 700): void {
  if (!Number.isFinite(pointerId)) return;
  blockedPointerIds.add(pointerId);
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    blockedPointerIds.delete(pointerId);
  }, ms);
}

export function isBlockedStudioPointerId(pointerId: number | undefined): boolean {
  return typeof pointerId === "number" && blockedPointerIds.has(pointerId);
}

function pointerIdOf(event: Event): number | undefined {
  if ("pointerId" in event && typeof event.pointerId === "number") {
    return event.pointerId;
  }
  return undefined;
}

function swallowClick(event: Event) {
  if (!isStudioPointerSettling()) {
    finishSettle();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function finishSettle() {
  if (!settleArmed) return;
  settleArmed = false;
  if (typeof window === "undefined") return;
  window.removeEventListener("pointerdown", swallowClick, true);
  window.removeEventListener("pointerup", swallowClick, true);
  window.removeEventListener("touchend", swallowClick, true);
  window.removeEventListener("click", swallowClick, true);
  window.removeEventListener("pointercancel", finishSettle, true);
  window.clearTimeout(settleTimer);
  const pending = settleCallbacks.splice(0);
  notifyStudioPointerSettle();
  window.setTimeout(() => {
    pending.forEach((callback) => callback());
  }, 0);
}

export function isStudioPointerSettling(now = Date.now()): boolean {
  return now < settleUntil;
}

/**
 * After a screen/step change, swallow leftover pointer/touch/click so the
 * next Continue, chip, or tile cannot fire from the same finger.
 * One tap = one action. The next screen waits for a fresh tap.
 */
export function beginStudioPointerSettle(
  onSettled?: () => void,
  ms = STUDIO_POINTER_SETTLE_MS,
): void {
  settleUntil = Math.max(settleUntil, Date.now() + ms);
  if (onSettled) settleCallbacks.push(onSettled);
  notifyStudioPointerSettle();
  if (typeof window === "undefined") {
    return;
  }
  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(finishSettle, Math.max(0, settleUntil - Date.now()));
  if (settleArmed) return;
  settleArmed = true;
  window.addEventListener("pointerdown", swallowClick, true);
  window.addEventListener("pointerup", swallowClick, true);
  window.addEventListener("touchend", swallowClick, true);
  window.addEventListener("click", swallowClick, true);
  window.addEventListener("pointercancel", finishSettle, true);
}

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
  const mountedAt = useRef(0);
  const mountedDuringSettle = useRef(false);
  const nodeRef = useRef<T | null>(null);
  const consumeRef = useRef(options?.consumeGesture === true);
  consumeRef.current = options?.consumeGesture === true;

  const onPointerDown = useRef((event: PointerEvent) => {
    if (
      isBlockedStudioPointerId(event.pointerId) ||
      isStudioPointerSettling() ||
      (mountedDuringSettle.current &&
        Date.now() - mountedAt.current < STUDIO_POINTER_SETTLE_MS)
    ) {
      if (consumeRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
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
      mountedAt.current = Date.now();
      mountedDuringSettle.current = isStudioPointerSettling();
      node.addEventListener("pointerdown", onPointerDown.current);
    } else {
      mountedAt.current = 0;
      mountedDuringSettle.current = false;
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
  const mountedAt = useRef(0);
  const nodeRef = useRef<T | null>(null);

  const onPointerDown = useRef((event: PointerEvent) => {
    if (isStudioPointerSettling() || isBlockedStudioPointerId(event.pointerId)) return;
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
      mountedAt.current = Date.now();
      sawPointerDown.current = false;
      node.addEventListener("pointerdown", onPointerDown.current);
      node.addEventListener("pointerup", onPointerUp.current);
    } else {
      mountedAt.current = 0;
    }
  }, []);

  return {
    ref,
    onClick() {
      /* Already handled by pointerup on this node. */
      if (lastAt.current && Date.now() - lastAt.current < 450) return;
      if (!sawPointerDown.current) {
        /*
         * Leftover click from a prior screen arrives immediately. Ignore it.
         * After settle, Samsung may skip pointerdown on <a> and only fire click.
         */
        if (!mountedAt.current || Date.now() - mountedAt.current < 400) return;
      }
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
      if (event instanceof PointerEvent) {
        blockStudioPointerId(event.pointerId);
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
 * After a first-entry Voice gate tap or Continue, the next screen can mount
 * under the same finger. Swallow leftover pointer/touch/click for the settle
 * window, then re-arm. Do not finish on the first leftover event — Samsung
 * may still deliver pointerup + click after pointerdown.
 */
export function suppressSameGestureFollowUp(onSettled: () => void): void {
  beginStudioPointerSettle(onSettled);
}
