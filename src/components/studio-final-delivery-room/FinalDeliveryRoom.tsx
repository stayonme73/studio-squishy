"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { studioFinalDeliveryRoomV1 as room } from "@/config/studio-final-delivery-room-v1";
import {
  clip549FinalRoomProof,
  type FinalRoomGroupId,
  type FinalRoomProof,
} from "@/lib/studio-final-delivery-room/content";
import {
  rememberFinalDeliveryHelpReturn,
  takeFinalDeliveryHelpReturn,
} from "@/lib/studio-final-delivery-room/return-state";

import type { ReleasedDeliveryPresentation } from "@/lib/studio-final-delivery-room/shared-delivery";

import DeliveryObservationForm from "@/components/deliverables/DeliveryObservationForm";
import { studioBuildManrope } from "@/fonts/studio-build-manrope";

import "./final-delivery-room.css";

type RoomPhase = "arriving" | "ready" | "opening" | "open";

type Props = {
  proof?: FinalRoomProof;
  live?: boolean;
  /** Studio Extras sheet body; shown when `proof.groups` includes "extras". */
  extras?: ReactNode;
  /** Real released job. When set, Clip proof copy is not shown. */
  released?: ReleasedDeliveryPresentation | null;
};

export default function FinalDeliveryRoom({
  proof = clip549FinalRoomProof,
  live = false,
  extras = null,
  released = null,
}: Props) {
  const router = useRouter();
  const labelId = useId();
  const packageRef = useRef<HTMLButtonElement>(null);
  const plateRef = useRef<HTMLImageElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLElement>(null);
  const restoredRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [booted, setBooted] = useState(false);
  const [phase, setPhase] = useState<RoomPhase>("arriving");
  const [group, setGroup] = useState<FinalRoomGroupId | null>(null);
  const [shortIndex, setShortIndex] = useState(0);
  const [thanksSeen, setThanksSeen] = useState(false);
  const [plateFailed, setPlateFailed] = useState(false);
  const greetedRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    router.prefetch("/help-center?from=deliverables");
    router.prefetch("/studio-lobby");
    router.prefetch("/studio-board");
  }, [router]);

  useEffect(() => {
    if (!released?.jobId) {
      setBooted(true);
      return;
    }
    const saved = takeFinalDeliveryHelpReturn(released.jobId);
    if (saved) {
      restoredRef.current = true;
      setPhase("open");
      setGroup(saved.group as FinalRoomGroupId | null);
      setThanksSeen(saved.group !== "studio");
      const scrollTop = saved.scrollTop;
      window.requestAnimationFrame(() => {
        const sheet = deliveryScroller(roomRef.current);
        if (sheet) sheet.scrollTop = scrollTop;
      });
    }
    setBooted(true);
  }, [released?.jobId]);

  useEffect(() => {
    if (!booted || restoredRef.current) return;
    if (reducedMotion) {
      setPhase("ready");
      return;
    }
    const node = packageRef.current;
    if (!node) return;
    function onArriveEnd(event: AnimationEvent) {
      if (event.animationName !== "fdr-arrive") return;
      setPhase("ready");
    }
    node.addEventListener("animationend", onArriveEnd);
    const fallback = window.setTimeout(() => setPhase("ready"), 2800);
    return () => {
      node.removeEventListener("animationend", onArriveEnd);
      window.clearTimeout(fallback);
    };
  }, [booted, reducedMotion]);

  useEffect(() => {
    document.body.dataset.finalDeliveryRoom = "1";
    return () => {
      delete document.body.dataset.finalDeliveryRoom;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeSheet();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // closeSheet reads the current group; Escape should always dismiss the open sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  useEffect(() => {
    const plate = plateRef.current;
    const root = roomRef.current;
    if (!plate || !root) return;

    function fitPaintedBox() {
      const image = plateRef.current;
      const host = roomRef.current;
      if (!image || !host) return;
      const view = image.getBoundingClientRect();
      const plateW = image.naturalWidth || 1024;
      const plateH = image.naturalHeight || 576;
      const scale = Math.max(view.width / plateW, view.height / plateH);
      const drawW = plateW * scale;
      const drawH = plateH * scale;
      const offsetX = view.width * 0.5 - drawW * 0.5;
      const offsetY = view.height * 0.58 - drawH * 0.58;
      const face = { x: 410, y: 364, w: 380, h: 72 };
      const hostBox = host.getBoundingClientRect();
      let left = view.left - hostBox.left + offsetX + face.x * scale;
      const top = view.top - hostBox.top + offsetY + face.y * scale;
      let width = face.w * scale;
      const height = face.h * scale;
      const maxWidth = hostBox.width * 0.72;
      if (width > maxWidth) {
        const center = left + width / 2;
        width = maxWidth;
        left = center - width / 2;
      }
      host.style.setProperty("--fdr-box-left", `${left}px`);
      host.style.setProperty("--fdr-box-top", `${top}px`);
      host.style.setProperty("--fdr-box-width", `${width}px`);
      host.style.setProperty("--fdr-box-height", `${height}px`);
      host.dataset.boxFit = "1";
    }

    fitPaintedBox();
    if (plate.complete) {
      window.requestAnimationFrame(fitPaintedBox);
    }
    plate.addEventListener("load", fitPaintedBox);
    window.addEventListener("resize", fitPaintedBox);
    const watch = window.visualViewport;
    watch?.addEventListener("resize", fitPaintedBox);
    return () => {
      plate.removeEventListener("load", fitPaintedBox);
      window.removeEventListener("resize", fitPaintedBox);
      watch?.removeEventListener("resize", fitPaintedBox);
    };
  }, []);

  function greetOnce() {
    if (greetedRef.current) return;
    greetedRef.current = true;
    setGroup("studio");
  }

  useEffect(() => {
    if (!group) return;
    if (restoredRef.current) {
      restoredRef.current = false;
      return;
    }
    const sheet = deliveryScroller(roomRef.current);
    if (sheet) sheet.scrollTop = 0;
  }, [group]);

  function closeSheet() {
    const leavingThanks = group === "studio";
    setGroup(null);
    if (!leavingThanks) return;
    setThanksSeen(true);
    window.requestAnimationFrame(() => {
      const shorts = railRef.current?.querySelector<HTMLElement>('[data-group="videos"]');
      shorts?.scrollIntoView({ inline: "start", block: "nearest", behavior: "auto" });
    });
  }

  const sourceGroups = released
    ? ([
        { id: "studio" as const, label: "Thank you", hint: "What you received" },
        { id: "files" as const, label: "Your files", hint: "The versions released for this project" },
        { id: "feedback" as const, label: "How this went", hint: "A note for The Studio" },
        { id: "support" as const, label: "Support", hint: "Help and your Studio Board" },
      ] as const)
    : proof.groups;
  const boardGroups = thanksSeen
    ? [...sourceGroups.filter((item) => item.id !== "studio"), sourceGroups[0]!]
    : sourceGroups;
  const serviceName = released?.serviceName ?? proof.customerFacing.serviceName;
  const customerName = released?.customerName ?? proof.customerFacing.customerName;

  function leaveForHelp(event: MouseEvent<HTMLAnchorElement>) {
    if (!released) return;
    event.preventDefault();
    const scrollTop = deliveryScroller(roomRef.current)?.scrollTop ?? 0;
    rememberFinalDeliveryHelpReturn({
      jobId: released.jobId,
      campaignId: released.campaignId,
      group,
      returnHref: `${window.location.pathname}${window.location.search}`,
      scrollTop,
    });
    router.push("/help-center?from=deliverables");
  }

  function openPackage() {
    if (phase !== "ready") return;
    if (reducedMotion) {
      setPhase("open");
      greetOnce();
      return;
    }
    setPhase("opening");
    window.setTimeout(() => {
      setPhase("open");
      greetOnce();
    }, 520);
  }

  const short = proof.shorts[shortIndex]!;
  const ready = phase === "ready";
  const opened = phase === "open" || phase === "opening";

  if (released && plateFailed) {
    return (
      <main className="fdr fdr--fallback" data-final-delivery-room="" data-proof="customer-delivery-fallback">
        <section className="fdr-fallback" aria-label="Your released files">
          <p className="fdr__sheet-kicker">Your delivery</p>
          <h1>Your files are ready</h1>
          <p>The delivery room artwork did not load. Your released files are still here.</p>
          <p>
            <strong>{released.serviceName}</strong>
            <span> · {released.customerName}</span>
          </p>
          <ReleasedFileList files={released.files} />
          <DeliveryObservationForm campaignId={released.campaignId} jobId={released.jobId} />
        </section>
      </main>
    );
  }

  return (
    <main
      ref={roomRef}
      className={`fdr ${studioBuildManrope.className} fdr--${phase}${group ? " fdr--reading" : ""}${reducedMotion ? " fdr--reduced" : ""}${booted ? "" : " fdr--boot"}`}
      data-final-delivery-room=""
      data-proof={released ? "customer-delivery" : live ? "clip-549-live" : "clip-549"}
      data-live-clip={live && !released ? "true" : undefined}
    >
      <style>{`
        [data-final-delivery-room] :is(.fdr__tile, .fdr__sheet, .fdr__cue, .fdr__chip) {
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          [data-final-delivery-room] :is(.fdr__tile, .fdr__sheet, .fdr__cue, .fdr__chip) {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={plateRef}
        className="fdr__plate"
        src={`${room.roomPlateRelativePath}?v=studio-holo-plate-1`}
        alt=""
        draggable={false}
        onError={() => setPlateFailed(true)}
      />
      <p className="fdr__chip">
        <strong>{serviceName}</strong>
        <span>{customerName}</span>
      </p>

      <div className="fdr__stage">
        <button
          ref={packageRef}
          type="button"
          className="fdr__package"
          onClick={openPackage}
          disabled={phase !== "ready"}
          aria-labelledby={labelId}
          aria-expanded={opened}
        >
          <span className="fdr__lid" aria-hidden />
          {ready ? <span className="fdr__open">Open</span> : null}
        </button>
      </div>
      <p id={labelId} className="fdr__cue">
        {phase === "arriving" ? (
          "Your package is on the way."
        ) : ready ? (
          <>
            <strong>Your package is ready.</strong>
            <span>Tap the package to open.</span>
          </>
        ) : (
          <>
            <strong>Your package is open.</strong>
            <span>Choose what you want to explore.</span>
          </>
        )}
      </p>

      {phase === "open" ? (
        <section className="fdr__reveal" aria-label="What you received">
          <div className="fdr__rail" ref={railRef}>
            {boardGroups.map((item) => (
              <button
                key={item.id}
                type="button"
                data-group={item.id}
                className={`fdr__tile${group === item.id ? " is-on" : ""}`}
                onClick={() => setGroup(item.id)}
                aria-label={`${item.label}. ${item.hint}`}
              >
                <span className="fdr__glyph" aria-hidden>
                  {item.id === "studio" ? (
                    <svg className="fdr__heart" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : (
                    glyphFor(item.id)
                  )}
                </span>
                <strong>{item.label}</strong>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>
          <p className="fdr__rail-cue">Swipe to see the rest of the package.</p>
        </section>
      ) : null}

      {group ? (
        <>
        <button
          type="button"
          className="fdr__scrim"
          aria-label="Close"
          onClick={closeSheet}
        />
        <div
          className={`fdr__sheet${group === "videos" ? " fdr__sheet--video" : ""}${group === "guide" ? " fdr__sheet--guide" : ""}${group === "studio" ? " fdr__sheet--guide fdr__sheet--studio" : ""}${group === "feedback" ? " fdr__sheet--feedback" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={sourceGroups.find((item) => item.id === group)?.label}
        >
          <button type="button" className="fdr__close" onClick={closeSheet}>
            Close
          </button>
          <div className="fdr__sheet-body">
          {group === "studio" ? (
            released ? (
              <article className="fdr__article">
                <p className="fdr__sheet-kicker">Your delivery</p>
                <h2>Thank you</h2>
                <div className="fdr__prose">
                  {released.thanks.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </article>
            ) : (
            <article className="fdr__article">
              <p className="fdr__sheet-kicker">{proof.studioCard.kicker}</p>
              <h2>{proof.studioCard.title}</h2>
              <div className="fdr__prose">
                {proof.studioCard.thanks.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <h3>{proof.studioCard.contactTitle}</h3>
              <div className="fdr__prose">
                {proof.studioCard.contact.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p className="fdr__cta">
                <a href={proof.studioCard.helpHref} target="_blank" rel="noopener noreferrer">
                  {proof.studioCard.helpLabel}
                </a>
              </p>
              <h3>{proof.studioCard.feedbackTitle}</h3>
              <div className="fdr__prose">
                {proof.studioCard.feedback.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p className="fdr__cta">
                <a href={proof.studioCard.boardHref}>{proof.studioCard.boardLabel}</a>
              </p>
            </article>
            )
          ) : null}
          {group === "videos" ? (
            <>
              <div className="fdr__video">
                <video key={short.src} controls playsInline preload="metadata" src={short.src} />
                <p className="fdr__sheet-kicker">
                  Short {shortIndex + 1} of {proof.shorts.length}
                </p>
                <h2>{short.title}</h2>
                <p className="fdr__save">
                  <a href={short.src} download={short.downloadName}>
                    Save this short
                  </a>
                  <span>{short.durationLabel}</span>
                </p>
              </div>
              <div className="fdr__sheet-actions">
                <div className={`fdr__pager${shortIndex === 0 ? " fdr__pager--first" : ""}`}>
                  {shortIndex > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShortIndex((index) => Math.max(0, index - 1))}
                    >
                      Previous short
                    </button>
                  ) : null}
                  {shortIndex < proof.shorts.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setShortIndex((index) => Math.min(proof.shorts.length - 1, index + 1))
                      }
                    >
                      Next short
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
          {group === "captions" ? (
            <CopyPager
              title="Matching post captions"
              websiteHref={proof.studioCard.websiteHref}
              items={proof.shorts.map((row) => ({ heading: row.title, body: row.caption }))}
            />
          ) : null}
          {group === "titles" ? (
            <CopyPager
              title="Suggested titles"
              websiteHref={proof.studioCard.websiteHref}
              items={proof.shorts.map((row, index) => ({
                heading: `Short ${index + 1}`,
                body: row.title,
              }))}
            />
          ) : null}
          {group === "hashtags" ? (
            <CopyPager
              title="Suggested tags"
              websiteHref={proof.studioCard.websiteHref}
              items={proof.shorts.map((row, index) => ({
                heading: `Short ${index + 1}`,
                body: `${row.hashtags.join(" ")}\n${row.keywords.join(" · ")}`,
              }))}
            />
          ) : null}
          {group === "guide" ? (
            <article className="fdr__article">
              <h2>{proof.companionTitle}</h2>
              <p>{proof.companionReminder}</p>
              <ol>
                {proof.companionOrder.map((fileName) => (
                  <li key={fileName}>{fileName}</li>
                ))}
              </ol>
              <ul>
                {proof.companionNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          ) : null}
          {group === "files" && released ? (
            <article className="fdr__article">
              <h2>Your files</h2>
              <p>These are the current released versions for this project.</p>
              <ReleasedFileList files={released.files} />
            </article>
          ) : null}
          {group === "feedback" && released ? (
            <article className="fdr__article fdr__feedback">
              <DeliveryObservationForm campaignId={released.campaignId} jobId={released.jobId} />
            </article>
          ) : null}
          {group === "support" ? (
            released ? (
              <article className="fdr__article">
                <h2>Support</h2>
                <p>
                  If a released file needs a correction, that request belongs in Review Room. A note here does not start a revision, a refund, or a new service.
                </p>
                <p className="fdr__cta">
                  <a href="/help-center?from=deliverables" onClick={leaveForHelp}>
                    Open the Help Center
                  </a>
                </p>
                <p className="fdr__cta">
                  <Link href="/studio-board">Return to Studio Board</Link>
                </p>
                <p className="fdr__cta">
                  <Link href="/studio-lobby">Lobby</Link>
                </p>
              </article>
            ) : (
            <article className="fdr__article">
              <h2>Support and revisions</h2>
              {proof.revision.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p className="fdr__cta">
                <a href={proof.studioCard.helpHref} target="_blank" rel="noopener noreferrer">
                  {proof.studioCard.helpLabel}
                </a>
              </p>
              <p className="fdr__cta">
                <a href={proof.studioCard.boardHref}>{proof.studioCard.boardLabel}</a>
              </p>
            </article>
            )
          ) : null}
          {group === "extras" ? <article className="fdr__article">{extras}</article> : null}
          {group === "pathway" ? (
            <article className="fdr__article">
              <p className="fdr__sheet-kicker">{proof.pathway.eyebrow}</p>
              <h2>{proof.pathway.title}</h2>
              <p>{proof.pathway.lead}</p>
              {proof.pathway.services.map((service) => (
                <section key={service.skuId}>
                  <h3>
                    {live || !service.priceLabel.trim()
                      ? service.name
                      : `${service.name} · ${service.priceLabel}`}
                  </h3>
                  <p>{service.definition}</p>
                  <p>{service.whatItProvides}</p>
                  <p>{service.howItMayComplement}</p>
                </section>
              ))}
              <p className="fdr__pathway-close">{proof.pathway.closing}</p>
            </article>
          ) : null}
          </div>
        </div>
        </>
      ) : null}
    </main>
  );
}

function deliveryScroller(root: ParentNode | null): HTMLElement | null {
  return (
    root?.querySelector<HTMLElement>(
      ".fdr__sheet-body > .fdr__article, .fdr__sheet-body > .fdr__video",
    ) ?? null
  );
}

function glyphFor(id: FinalRoomGroupId): string {
  switch (id) {
    case "studio":
      return "◇";
    case "videos":
      return "▶";
    case "captions":
      return "≡";
    case "titles":
      return "✦";
    case "hashtags":
      return "#";
    case "guide":
      return "◎";
    case "support":
      return "?";
    case "pathway":
      return "→";
    case "extras":
      return "+";
    case "files":
      return "↓";
    case "feedback":
      return "✎";
  }
}

function ReleasedFileList({
  files,
}: {
  files: ReleasedDeliveryPresentation["files"];
}) {
  return (
    <ul className="fdr__files">
      {files.map((file) => (
        <li key={file.id} className="fdr__file">
          <strong>{file.label}</strong>
          <span>{file.fileName}</span>
          <span>
            {file.versionLabel} · {file.formatLabel}
          </span>
          {file.instructions ? <p>{file.instructions}</p> : null}
          <a href={file.href} download={file.fileName}>
            Download {file.fileName}
          </a>
        </li>
      ))}
    </ul>
  );
}

function presentCopy(heading: string, body: string) {
  const ctaPattern = /(?:Start at|Visit)\s+thestudiocompany7\.com/i;
  const cta = body.match(ctaPattern)?.[0] ?? null;
  const lines = body
    .split("\n")
    .map((line) => line.replace(ctaPattern, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const headingClean = heading.replace(/\s+/g, " ").trim();
  if (headingClean && lines[0] && lines[0].toLowerCase().startsWith(headingClean.toLowerCase())) {
    const stripped = lines[0].slice(headingClean.length).replace(/^[\s.]+/, "").trim();
    if (stripped) lines[0] = stripped;
    else lines.shift();
  }
  return { blocks: lines, cta };
}

function CopyPager(input: {
  title: string;
  websiteHref: string;
  items: readonly { heading: string; body: string }[];
}) {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const item = input.items[index]!;
  const presented = presentCopy(item.heading, item.body);
  const copyText = [...presented.blocks, presented.cta].filter(Boolean).join("\n\n");

  async function copyPage() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
      } else {
        throw new Error("clipboard-unavailable");
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      const field = document.createElement("textarea");
      field.value = copyText;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      setCopied(ok);
      if (ok) window.setTimeout(() => setCopied(false), 1600);
    }
  }

  useEffect(() => {
    if (articleRef.current) articleRef.current.scrollTop = 0;
  }, [index]);

  return (
    <>
    <article className="fdr__article" ref={articleRef}>
      <p className="fdr__sheet-kicker">
        {index + 1} of {input.items.length}
      </p>
      <h2>{input.title}</h2>
      <h3>{item.heading}</h3>
      <div className="fdr__prose">
        {presented.blocks.map((block) => (
          <p key={block}>{block}</p>
        ))}
      </div>
      {presented.cta ? (
        <p className="fdr__cta">
          <a href={input.websiteHref} target="_blank" rel="noopener noreferrer">
            {presented.cta}
          </a>
        </p>
      ) : null}
    </article>
    <div className="fdr__sheet-actions">
      <button type="button" className="fdr__copy" onClick={copyPage}>
        {copied ? "Copied" : "Copy"}
      </button>
      <div className={`fdr__pager${index === 0 ? " fdr__pager--first" : ""}`}>
        {index > 0 ? (
          <button type="button" onClick={() => setIndex((value) => value - 1)}>
            Previous
          </button>
        ) : null}
        {index < input.items.length - 1 ? (
          <button type="button" onClick={() => setIndex((value) => value + 1)}>
            Next
          </button>
        ) : null}
      </div>
    </div>
    </>
  );
}
