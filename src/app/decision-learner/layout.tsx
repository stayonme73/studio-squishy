import type { Metadata } from "next";

import "./decision-learner.css";

export const metadata: Metadata = {
  title: "Decision Learner",
  description:
    "Research prototype: test whether AI can learn owner decision rules from policy and case history.",
};

export default function DecisionLearnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="decision-learner">{children}</div>;
}
