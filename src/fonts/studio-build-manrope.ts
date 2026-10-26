import { Manrope } from "next/font/google";

/** Updated Studio face. Glass rooms use this with the shared veil, not a new card fill. */
export const studioBuildManrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-studio-manrope",
});
