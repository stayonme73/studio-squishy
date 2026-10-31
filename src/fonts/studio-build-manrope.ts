import localFont from "next/font/local";

/** Updated Studio face. Self-hosted so Preview/Production builds do not depend on Google Fonts fetch. */
export const studioBuildManrope = localFont({
  src: [
    {
      path: "../../assets/fonts/manrope/manrope-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../assets/fonts/manrope/manrope-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../assets/fonts/manrope/manrope-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../assets/fonts/manrope/manrope-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
  variable: "--font-studio-manrope",
});
