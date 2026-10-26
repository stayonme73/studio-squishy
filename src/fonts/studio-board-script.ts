import localFont from "next/font/local";

/**
 * Shared Caveat for Board-family script.
 * The Latin file from the current dev build is one variable font, wght 400-700.
 * Weights 500, 600, and 700 are positions on that axis.
 */
export const studioBoardScriptFont = localFont({
  src: "./caveat/caveat-latin-variable.woff2",
  weight: "500 700",
  display: "swap",
  adjustFontFallback: "Arial",
  variable: "--font-studio-board-script",
});
