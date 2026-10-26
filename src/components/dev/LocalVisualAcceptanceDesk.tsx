"use client";

const SCREENS = [
  { id: "lobby", title: "Lobby", live: "/" },
  { id: "conversation", title: "Conversation Room", live: "/studio-conversation-room" },
  { id: "payment", title: "Payment", live: "/local-test-fixtures?inspect=payment" },
  { id: "intake", title: "Intake", live: "/local-test-fixtures?inspect=intake" },
  { id: "board", title: "Studio Board", live: "/studio-board" },
  { id: "record", title: "Project Record", live: "/campaign-details" },
  { id: "review", title: "Review Room", live: "/feedback-studio" },
  { id: "help", title: "Help Center", live: "/help-center" },
  { id: "delivery", title: "Final Delivery", live: "/deliverables" },
] as const;

export default function LocalVisualAcceptanceDesk() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        overflow: "auto",
        background: "#11130f",
        color: "#fff8e7",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "1.25rem 1.25rem 6rem",
      }}
    >
      <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
        Final visual freeze confirmation
      </h1>
      <p>
        Frozen system only. Not a redesign. Mobile + laptop side by side. Walk
        the live rooms if you want, or look at these pictures.
      </p>
      <p>
        Check: white text · baby-blue selected · champagne trim · ink primary ·
        one clear glass · same type, cards, nav, spacing.
      </p>
      {SCREENS.map((screen) => (
        <section key={screen.id} style={{ margin: "2rem 0" }}>
          <h2>
            {screen.title}{" "}
            <a href={screen.live} style={{ color: "#c8b59b", fontWeight: 500 }}>
              open live
            </a>
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 390px) 1fr",
              gap: "1rem",
            }}
          >
            <figure style={{ margin: 0, background: "#1a1c16", padding: "0.6rem" }}>
              <figcaption>Mobile · 390</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/owner-visual-acceptance/freeze-confirm-${screen.id}-mobile.jpg`}
                alt={`${screen.title} mobile`}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </figure>
            <figure style={{ margin: 0, background: "#1a1c16", padding: "0.6rem" }}>
              <figcaption>Laptop · 1280</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/owner-visual-acceptance/freeze-confirm-${screen.id}-laptop.jpg`}
                alt={`${screen.title} laptop`}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </figure>
          </div>
        </section>
      ))}
    </div>
  );
}
