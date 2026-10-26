import ReviewAndPayPage from "@/components/studio-journey/ReviewAndPayPage";

import "../studio-customer-last-paint.css";

export const metadata = {
  title: "Review & Pay",
  description: "Review the package, project details, and price before payment.",
};

/** Condensed Review & Pay — existing checkout plus project review. */
export default function CheckoutPage() {
  return <ReviewAndPayPage />;
}
