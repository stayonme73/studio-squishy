/** Minimal creative marks on the vision step — decorative only. */
export default function IntakeVisionAccents() {
  return (
    <div className="dri-vision-accents" aria-hidden>
      <svg className="dri-vision-accent dri-vision-accent--spark" viewBox="0 0 16 16">
        <path
          d="M8 2.5v11M4.5 8h7M5.8 5.8l4.4 4.4M10.2 5.8 5.8 10.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      <svg className="dri-vision-accent dri-vision-accent--bulb" viewBox="0 0 16 16">
        <path
          d="M8 3c-1.6.2-2.6 1.4-2.5 2.8.1 1 .7 1.7 1.3 2.2.4.3.6.7.6 1.1M6.4 11.2h3.2M7 12.4h2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
      <svg className="dri-vision-accent dri-vision-accent--brush" viewBox="0 0 16 16">
        <path
          d="M3.5 12.5c2.2-1.2 4.2-3.2 6.5-7.2 1.2-.2 2.3-.1 3.1.5-1.8 2.8-3.6 4.8-5.8 6.2-.8.5-2 .4-3.8-.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
