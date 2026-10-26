"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import {
  homepageContact,
  homepageFaq,
  homepageHowItWorks,
  homepagePackages,
  homepageVoice,
} from "@/config/studio-homepage-lobby-rebuild-v1";
import { studioVoiceMachineCustomerCommunicationV1 } from "@/config/studio-voice-machine-customer-communication-v1";
import {
  readStudioVoiceTurns,
  writeStudioVoiceTurns,
} from "@/lib/studio-voice-conversation/session";
import { isApprovedStudioVoiceGuide } from "@/lib/studio-voice-conversation/customer-guidance";
import { STUDIO_VOICE_DISCLOSURE } from "@/lib/studio-voice-conversation/types";
import {
  cancelStudioVoicePlayback,
  playStudioVoice,
} from "@/lib/studio-voice-playback";

const helpPath = homepageContact.paths.find((path) => path.id === "help");
const emailPath = homepageContact.paths.find((path) => path.id === "email");

type TourStep = {
  id: string;
  text: string;
  /** Stay on this section instead of scrolling the card to the top. */
  scrollTarget?: string;
  /** Champagne edge on this card while she talks about it. */
  pointAt?: string;
  /** How many times to press the sample arrow while this line is spoken. */
  showcaseClicks?: number;
};

/**
 * One click. She hosts the page: welcome is separate, then she shows the work,
 * explains what each package is for, and leaves the door open.
 */
export const homepageStudioVoiceTour: readonly TourStep[] = [
  {
    id: "our-work",
    text: "Come see what we can create for your business.",
  },
  {
    id: "our-work",
    scrollTarget: "our-work",
    showcaseClicks: 4,
    text: "I'll slide these over with you. Long video into short clips, short-form editing, social graphics, ad creative, then email, menus, reviews, and flyers.",
  },
  {
    id: "packages",
    text: `${homepagePackages.headline} There are four, and I'll tell you what each one is for, so you can choose the one that fits.`,
  },
  {
    id: "package-clip-repurposing",
    scrollTarget: "packages",
    pointAt: "package-clip-repurposing",
    text: "Clip Repurposing is for a longer video you already have. You provide a qualifying long-form video, and The Studio turns it into polished short-form clips.",
  },
  {
    id: "package-short-form-video-editing",
    scrollTarget: "packages",
    pointAt: "package-short-form-video-editing",
    text: "Short-Form Video Editing is for the short pieces you already picked. You provide English short clips or marked moments, and The Studio edits them into polished short-form videos.",
  },
  {
    id: "package-social-and-promo-graphics",
    scrollTarget: "packages",
    pointAt: "package-social-and-promo-graphics",
    text: "Social and Promo Graphics is for one campaign or theme. You share those details, and The Studio creates a coordinated set of social and promotional graphics.",
  },
  {
    id: "package-campaign-launch-kit",
    scrollTarget: "packages",
    pointAt: "package-campaign-launch-kit",
    text: "The Campaign Launch Kit is for one offer, event, launch, or announcement. The Studio turns that into a polished set of campaign materials, so the pieces belong together.",
  },
  {
    id: "how-it-works",
    text: `Here's how we do this together. First, ${homepageHowItWorks.steps[0].title.toLowerCase()}. Second, ${homepageHowItWorks.steps[1].title.toLowerCase()}. We want to understand it. Third, ${homepageHowItWorks.steps[2].title.toLowerCase()}. Fourth, ${homepageHowItWorks.steps[3].copy.charAt(0).toLowerCase()}${homepageHowItWorks.steps[3].copy.slice(1)} Fifth, ${homepageHowItWorks.steps[4].copy}`,
  },
  {
    id: "faq",
    text: `${homepageFaq.headline} Please be sure to go over them.`,
  },
  {
    id: "contact",
    text: `If that still isn't enough, ${emailPath ? emailPath.title.charAt(0).toLowerCase() + emailPath.title.slice(1) : "email The Studio"}. You can also visit the ${helpPath?.title ?? "Help Center"} for ${helpPath?.body?.replace(/\.$/, "").toLowerCase() ?? "policies, common questions, and guidance"}.`,
  },
];

const pageOpening = `Welcome. ${STUDIO_VOICE_DISCLOSURE} I'm glad you're here. Walk through this page with me, or send a question whenever you'd like.`;
const questionOpening = `${STUDIO_VOICE_DISCLOSURE} You can ask a question.`;

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
}

function clearPackagePoint() {
  document.querySelectorAll(".studio-homepage__card--pointed").forEach((node) => {
    node.classList.remove("studio-homepage__card--pointed");
  });
}

function pointAtCard(id: string) {
  const card = document.getElementById(id);
  if (!card) return;
  card.classList.add("studio-homepage__card--pointed");
  const mast = document.querySelector(".studio-homepage__mast")?.getBoundingClientRect().height ?? 0;
  const rect = card.getBoundingClientRect();
  const topLimit = mast + 16;
  const bottomLimit = window.innerHeight - 16;
  const visible = Math.max(0, Math.min(rect.bottom, bottomLimit) - Math.max(rect.top, topLimit));
  if (visible >= rect.height * 0.6) return;
  card.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "nearest",
  });
}

type SpeechClip = {
  audioBase64?: string | null;
  fallbackOnly?: boolean;
};

function speakHomepageLine(
  text: string,
  speech: SpeechClip | undefined,
  onSpeaking: (speaking: boolean) => void,
) {
  onSpeaking(true);
  void playStudioVoice({
    text,
    audioBase64: speech?.audioBase64,
    fallbackOnly: speech?.fallbackOnly,
    withoutRoomPreference: true,
    onStart: () => onSpeaking(true),
    onEnd: () => onSpeaking(false),
  }).then((result) => {
    if (result !== "jessica" && result !== "mark") onSpeaking(false);
  });
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Homepage walks its own sections. Other pages keep the question. */
  showWalk?: boolean;
};

export default function HomepageStudioVoice({ open, onClose, showWalk = true }: Props) {
  const openingLine = showWalk ? pageOpening : questionOpening;
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const spokeOpeningRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const tourRef = useRef(0);
  const prefetchedRef = useRef(new Map<number, Promise<string | null>>());
  const showcaseTimersRef = useRef<number[]>([]);
  const scrolledRef = useRef("");
  onCloseRef.current = onClose;
  const [line, setLine] = useState(openingLine);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [guides, setGuides] = useState<{ label: string; href: string }[]>([]);

  useEffect(() => {
    if (!open) {
      spokeOpeningRef.current = false;
      tourRef.current += 1;
      for (const timer of showcaseTimersRef.current) window.clearTimeout(timer);
      showcaseTimersRef.current = [];
      scrolledRef.current = "";
      clearPackagePoint();
      cancelStudioVoicePlayback();
      prefetchedRef.current.clear();
      setGuides([]);
      return;
    }
    closeRef.current?.focus();
    const panel = document.getElementById("homepage-studio-voice");
    panel?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    if (!spokeOpeningRef.current) {
      spokeOpeningRef.current = true;
      speakHomepageLine(openingLine, undefined, setSpeaking);
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  function prefetchTourLine(index: number) {
    const step = homepageStudioVoiceTour[index];
    if (!step || prefetchedRef.current.has(index)) return;
    const pending = fetch("/api/studio-voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: step.text }),
    })
      .then(async (response) => {
        const type = response.headers.get("content-type") ?? "";
        if (!response.ok || !type.includes("audio")) return null;
        return URL.createObjectURL(new Blob([await response.blob()], { type: "audio/mpeg" }));
      })
      .catch(() => null);
    prefetchedRef.current.set(index, pending);
  }

  function stopTour() {
    tourRef.current += 1;
    for (const timer of showcaseTimersRef.current) window.clearTimeout(timer);
    showcaseTimersRef.current = [];
    scrolledRef.current = "";
    clearPackagePoint();
    cancelStudioVoicePlayback();
  }

  function showMoreSamples(times: number, tourId: number, done: () => void) {
    const scroller = document.querySelector<HTMLElement>(".studio-homepage__showcase");
    if (!scroller || times <= 0) {
      done();
      return;
    }
    let count = 0;
    const tick = () => {
      if (tourRef.current !== tourId) return;
      window.dispatchEvent(
        new CustomEvent("studio-homepage-showcase", { detail: { direction: 1 } }),
      );
      count += 1;
      if (count >= times) {
        done();
        return;
      }
      showcaseTimersRef.current.push(window.setTimeout(tick, 3200));
    };
    tick();
  }

  function speakTourStep(index: number, tourId: number) {
    const step = homepageStudioVoiceTour[index];
    if (!step || tourRef.current !== tourId) return;
    setLine(step.text);
    clearPackagePoint();
    const target = step.scrollTarget ?? step.id;
    if (scrolledRef.current !== target) {
      scrolledRef.current = target;
      scrollToSection(target);
    }
    if (step.pointAt) pointAtCard(step.pointAt);
    if (step.id === "our-work" && !step.showcaseClicks) {
      document
        .querySelector<HTMLElement>(".studio-homepage__showcase")
        ?.scrollTo({ left: 0, behavior: "auto" });
    }
    prefetchTourLine(index);
    prefetchTourLine(index + 1);
    const ready = prefetchedRef.current.get(index) ?? Promise.resolve(null);
    prefetchedRef.current.delete(index);
    let speechDone = false;
    let samplesDone = !step.showcaseClicks;
    let slidesStarted = false;
    const tryAdvance = () => {
      if (tourRef.current !== tourId || !speechDone || !samplesDone) return;
      if (index + 1 < homepageStudioVoiceTour.length) speakTourStep(index + 1, tourId);
      else setSpeaking(false);
    };
    const startSlides = () => {
      if (slidesStarted || !step.showcaseClicks) return;
      slidesStarted = true;
      showMoreSamples(step.showcaseClicks, tourId, () => {
        samplesDone = true;
        tryAdvance();
      });
    };
    void ready.then((audioUrl) => {
      if (tourRef.current !== tourId) {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        return;
      }
      void playStudioVoice({
        text: step.text,
        audioUrl,
        withoutRoomPreference: true,
        onStart: () => {
          setSpeaking(true);
          startSlides();
        },
        onEnd: () => {
          speechDone = true;
          tryAdvance();
        },
      }).then((result) => {
        if (result === "silent") {
          speechDone = true;
          startSlides();
          tryAdvance();
        }
      });
    });
  }

  function walk() {
    const tourId = tourRef.current + 1;
    tourRef.current = tourId;
    for (const timer of showcaseTimersRef.current) window.clearTimeout(timer);
    showcaseTimersRef.current = [];
    scrolledRef.current = "";
    clearPackagePoint();
    prefetchedRef.current.clear();
    cancelStudioVoicePlayback();
    setSpeaking(true);
    speakTourStep(0, tourId);
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    stopTour();
    setBusy(true);
    const turns = readStudioVoiceTurns(window.sessionStorage);
    try {
      const response = await fetch("/api/studio-voice/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, turns, inputMode: "text" }),
      });
      if (!response.ok) {
        setGuides([]);
        setLine(studioVoiceMachineCustomerCommunicationV1.customerCopy.lookupFailed);
        return;
      }
      const payload = (await response.json()) as {
        say?: string;
        turns?: { role: "customer" | "studio"; text: string }[];
        guides?: { label?: string; href?: string }[];
        speech?: { provider?: string; audioBase64?: string };
      };
      const say = payload.say?.trim();
      if (!say) {
        setGuides([]);
        setLine(studioVoiceMachineCustomerCommunicationV1.customerCopy.lookupFailed);
        return;
      }
      if (payload.turns) writeStudioVoiceTurns(payload.turns, window.sessionStorage);
      setGuides(
        (payload.guides ?? []).flatMap((guide) => {
          const label = guide.label?.trim() ?? "";
          const href = guide.href?.trim() ?? "";
          return label && href && isApprovedStudioVoiceGuide({ label, href })
            ? [{ label, href }]
            : [];
        }),
      );
      setLine(say);
      setQuestion("");
      const clip =
        payload.speech?.provider === "elevenlabs" && payload.speech.audioBase64
          ? { audioBase64: payload.speech.audioBase64 }
          : { fallbackOnly: true };
      speakHomepageLine(say, clip, setSpeaking);
    } catch {
      setGuides([]);
      setLine(studioVoiceMachineCustomerCommunicationV1.customerCopy.lookupFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="homepage-studio-voice"
      className="studio-homepage__voice-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-homepage-studio-voice="open"
    >
      <div className="studio-homepage__voice-panel-head">
        <h2 id={titleId}>{homepageVoice.label}</h2>
        <p className="studio-homepage__voice-status" aria-live="polite">
          {speaking ? "Speaking" : "Ready"}
        </p>
        <button
          ref={closeRef}
          type="button"
          className="studio-homepage__btn-secondary"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <p className="studio-homepage__voice-line" aria-live="polite">
        {line}
      </p>
      {guides.length > 0 ? (
        <div className="studio-homepage__voice-guides">
          {guides.map((guide) => (
            <a
              key={guide.href}
              className="studio-homepage__btn-secondary"
              href={guide.href}
            >
              {guide.label}
            </a>
          ))}
        </div>
      ) : null}
      <div className="studio-homepage__voice-controls">
        {showWalk ? (
          <button type="button" className="studio-homepage__btn-secondary" onClick={walk}>
            Walk through this page
          </button>
        ) : null}
        <form className="studio-homepage__voice-ask" onSubmit={ask}>
          <label htmlFor="homepage-studio-voice-question">Your question</label>
          <textarea
            id="homepage-studio-voice-question"
            value={question}
            rows={2}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button type="submit" className="studio-homepage__btn-secondary" disabled={busy}>
            Send question
          </button>
        </form>
      </div>
    </section>
  );
}
