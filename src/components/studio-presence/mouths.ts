/** Mouth only while speaking — never a permanent idle smile. */

export type PresenceMouthId = "speaking" | "happy";

export const PRESENCE_MOUTHS: Record<
  PresenceMouthId,
  { d: string; strokeWidth: number }
> = {
  speaking: {
    d: "M 58 58 C 64 63 76 63 82 58",
    strokeWidth: 2,
  },
  happy: {
    d: "M 58 57 C 65 62.5 75 62.5 82 57",
    strokeWidth: 1.9,
  },
};
