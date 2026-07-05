import Link from "next/link";

import { studioBoard } from "@/config/studio-board";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const metadata = {
  title: "Access Denied",
};

export default function AccessDeniedPage() {
  return (
    <main className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col`}>
      <div className="utility-page">
        <div className="utility-shell utility-shell--narrow">
          <section className="utility-card" aria-labelledby="access-denied-title">
            <p className="utility-eyebrow">Access Control</p>
            <h1 id="access-denied-title" className="utility-title">
              Access denied
            </h1>
            <p className="utility-lead">{studioBoard.clientAccess.denied.message}</p>
            <p className="utility-note">{studioBoard.clientAccess.denied.note}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/studio-board" className="utility-btn utility-btn--primary">
                Studio Board
              </Link>
              <Link href="/help-center" className="utility-btn utility-btn--secondary">
                Help Center
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
