import { studioHostCopy } from "@/config/studio-copy";

/**
 * Host greeting — appears after visitors experience the studio space.
 * Squishy asset and animation arrive in a later step.
 */
export default function StudioHostGreeting() {
  return (
    <div className="studio-host-greeting" role="complementary" aria-live="polite">
      <p className="studio-host-greeting__line">{studioHostCopy.greeting}</p>
      <p className="studio-host-greeting__prompt">{studioHostCopy.prompt}</p>
    </div>
  );
}
