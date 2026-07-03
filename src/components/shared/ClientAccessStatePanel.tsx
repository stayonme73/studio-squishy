import Link from "next/link";

import type { CurrentCampaignAccessState } from "@/lib/use-current-campaign";

type Props = {
  state: CurrentCampaignAccessState;
};

export default function ClientAccessStatePanel({ state }: Props) {
  const signIn = state === "auth-required";
  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="client-access-title">
          <p className="utility-eyebrow">{signIn ? "Client Access" : "Access Control"}</p>
          <h1 id="client-access-title" className="utility-title">
            {signIn ? "Sign in required" : "Access denied"}
          </h1>
          <p className="utility-lead">
            {signIn
              ? "Sign in with the account connected to this Studio work."
              : "This area is not available for your account. No project details were loaded."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {signIn ? (
              <Link href="/sign-in" className="utility-btn utility-btn--primary">
                Sign in
              </Link>
            ) : (
              <Link href="/studio-board" className="utility-btn utility-btn--primary">
                Studio Board
              </Link>
            )}
            <Link href="/help-center" className="utility-btn utility-btn--secondary">
              Help Center
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
