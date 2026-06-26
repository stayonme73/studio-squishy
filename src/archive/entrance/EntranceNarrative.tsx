import { entranceCopy } from "@/config/entrance-copy";

/**
 * Narrative welcome — Squishy is a host, not a receptionist.
 * Squishy does not speak here; the space welcomes first.
 */
export default function EntranceNarrative() {
  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--studio-teal)]">
        {entranceCopy.eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[var(--studio-denim)] sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]">
        {entranceCopy.headline}
      </h1>
      <div className="mt-5 space-y-4">
        {entranceCopy.paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 32)}
            className="text-base leading-relaxed text-[var(--studio-denim)] opacity-[0.88] sm:text-lg"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
