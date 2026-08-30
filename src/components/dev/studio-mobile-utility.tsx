"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Shared Mobile bottom utility — Studio Review is the one tab.
 * Conversation Room registers Studio Controls into the Review drawer.
 * Desktop Conversation Room keeps the side rail.
 */
type StudioMobileUtilityContextValue = {
  slotEl: HTMLElement | null;
  registerSlot: (el: HTMLElement | null) => void;
  controlsRegistered: boolean;
  registerControls: () => () => void;
  closeUtility: () => void;
  setCloseUtility: (fn: (() => void) | null) => void;
};

const StudioMobileUtilityContext =
  createContext<StudioMobileUtilityContextValue | null>(null);

export function StudioMobileUtilityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const [controlsRegistered, setControlsRegistered] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);

  const registerSlot = useCallback((el: HTMLElement | null) => {
    setSlotEl(el);
  }, []);

  const registerControls = useCallback(() => {
    setControlsRegistered(true);
    return () => setControlsRegistered(false);
  }, []);

  const closeUtility = useCallback(() => {
    closeRef.current?.();
  }, []);

  const setCloseUtility = useCallback((fn: (() => void) | null) => {
    closeRef.current = fn;
  }, []);

  const value = useMemo(
    () => ({
      slotEl,
      registerSlot,
      controlsRegistered,
      registerControls,
      closeUtility,
      setCloseUtility,
    }),
    [
      slotEl,
      registerSlot,
      controlsRegistered,
      registerControls,
      closeUtility,
      setCloseUtility,
    ],
  );

  return (
    <StudioMobileUtilityContext.Provider value={value}>
      {children}
    </StudioMobileUtilityContext.Provider>
  );
}

export function useStudioMobileUtility() {
  return useContext(StudioMobileUtilityContext);
}

/** Mounted inside the Studio Review drawer — Conversation Controls portal here. */
export function StudioMobileControlsSlot() {
  const ctx = useStudioMobileUtility();
  return (
    <div
      ref={(node) => ctx?.registerSlot(node)}
      data-studio-controls-in-review=""
    />
  );
}
