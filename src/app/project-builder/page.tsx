import BuildYourProjectPage from "@/components/studio-journey/BuildYourProjectPage";

import "../studio-customer-last-paint.css";

export const metadata = {
  title: "Build Your Project",
  description: "Add the details The Studio needs before review and payment.",
};

/** Condensed Build Your Project — one page, existing card language. */
export default function ProjectBuilderPage() {
  return <BuildYourProjectPage />;
}
