"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  studioPresenceV1,
  type PresenceVisualState,
} from "@/config/studio-presence-v1";

export type PresenceAnchorRect = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

type PresenceContextValue = {
  enabled: boolean;
  visible: boolean;
  state: PresenceVisualState;
  activeAnchorId: string | null;
  anchors: Record<string, PresenceAnchorRect>;
  setVisible: (visible: boolean) => void;
  setState: (state: PresenceVisualState) => void;
  registerAnchor: (rect: PresenceAnchorRect) => void;
  unregisterAnchor: (id: string) => void;
  setActiveAnchor: (id: string | null) => void;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

export function StudioPresenceProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<PresenceVisualState>("idle");
  const [activeAnchorId, setActiveAnchor] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<Record<string, PresenceAnchorRect>>(
    {},
  );

  const registerAnchor = useCallback((rect: PresenceAnchorRect) => {
    setAnchors((prev) => ({ ...prev, [rect.id]: rect }));
  }, []);

  const unregisterAnchor = useCallback((id: string) => {
    setAnchors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const value = useMemo(
    (): PresenceContextValue => ({
      enabled: studioPresenceV1.enabled,
      visible,
      state,
      activeAnchorId,
      anchors,
      setVisible,
      setState,
      registerAnchor,
      unregisterAnchor,
      setActiveAnchor,
    }),
    [
      visible,
      state,
      activeAnchorId,
      anchors,
      registerAnchor,
      unregisterAnchor,
    ],
  );

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
}

export function useStudioPresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error("useStudioPresence must be used within StudioPresenceProvider");
  }
  return ctx;
}

/** Safe for optional Lobby-only wiring outside provider (should not happen). */
export function useStudioPresenceOptional(): PresenceContextValue | null {
  return useContext(PresenceContext);
}
