"use client";

import { useEffect, useState } from "react";

/** Same phone breakpoint as Studio Controls / Conversation Room CSS. */
export const STUDIO_PHONE_LAYOUT_QUERY = "(max-width: 960px)";

/** Click-time read — do not wait for React state after a route Continue tap. */
export function readPhoneLayout(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(STUDIO_PHONE_LAYOUT_QUERY).matches
  );
}

export function usePhoneLayout(): boolean {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(STUDIO_PHONE_LAYOUT_QUERY);
    const sync = () => setIsPhone(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isPhone;
}
