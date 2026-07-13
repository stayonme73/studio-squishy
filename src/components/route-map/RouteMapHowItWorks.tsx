const STEPS = [
  {
    icon: "↗",
    title: "Pick Your Route",
    lead: "Start with what you need right now.",
  },
  {
    icon: "☰",
    title: "Choose a Job",
    lead: "See what is included and choose your service.",
  },
  {
    icon: "▣",
    title: "Pay & Confirm",
    lead: "Review your order and pay securely.",
  },
  {
    icon: "▤",
    title: "Share the Details",
    lead: "Send the information and materials we need.",
  },
  {
    icon: "◎",
    title: "We Get To Work",
    lead: "We create it, you review it, then we complete and deliver your finished project.",
  },
] as const;

export default function RouteMapHowItWorks() {
  return (
    <section className="route-map-how-it-works" aria-label="How it works">
      <h2 className="route-map-how-it-works__title">How It Works</h2>
      <ol className="route-map-how-it-works__steps">
        {STEPS.map((step, index) => (
          <li key={step.title} className="route-map-how-it-works__step">
            <div className="route-map-how-it-works__head">
              <span className="route-map-how-it-works__step-num" aria-hidden>
                {index + 1}
              </span>
              <span className="route-map-how-it-works__icon" aria-hidden>
                {step.icon}
              </span>
            </div>
            <div className="route-map-how-it-works__body">
              <span className="route-map-how-it-works__step-title">{step.title}</span>
              <span className="route-map-how-it-works__step-lead">{step.lead}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
