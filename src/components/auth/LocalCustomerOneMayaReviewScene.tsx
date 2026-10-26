"use client";

import { useEffect, useState } from "react";

import { localCustomerOneAuthFixtureCopy } from "@/lib/auth/local-customer-one-fixture-copy";
import { mayaPaidReviewPhoneHref } from "@/lib/auth/local-customer-one-maya-review";

/** Local/test only. Replaces the current phone session with Customer-One, then opens Maya Review. */
export default function LocalCustomerOneMayaReviewScene() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/local-customer-one", {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setError("Local Customer-One sign-in is unavailable.");
          return;
        }
        window.location.assign(mayaPaidReviewPhoneHref());
      })
      .catch(() => {
        if (!cancelled) {
          setError("Local Customer-One sign-in failed.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="utility-page">
      <div className="utility-shell utility-shell--narrow">
        <section className="utility-card" aria-labelledby="local-maya-review-title">
          <p className="utility-eyebrow">
            {localCustomerOneAuthFixtureCopy.eyebrow}
          </p>
          <h1 id="local-maya-review-title" className="utility-title">
            Paid Maya access
          </h1>
          <p className="utility-lead">
            {localCustomerOneAuthFixtureCopy.mayaReviewSigningIn}
          </p>
          {error ? (
            <p className="utility-error" role="alert">
              {error}
            </p>
          ) : (
            <p className="utility-note">Do not tap Approve or Request revision.</p>
          )}
        </section>
      </div>
    </div>
  );
}
