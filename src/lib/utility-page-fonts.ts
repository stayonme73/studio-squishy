import { Caveat, Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-studio-board-sans",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-studio-board-script",
});

/** Shared Inter + Caveat variables for all Board Family utility pages. */
export const utilityPageFontClassName = `${inter.variable} ${caveat.variable}`;
