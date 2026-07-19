"use client";

import { useMemo, type CSSProperties } from "react";

import { studioPresenceV1 } from "@/config/studio-presence-v1";
import { usePresenceBlink } from "@/components/studio-presence/hooks/usePresenceBlink";
import { useReducedMotion } from "@/components/studio-presence/hooks/useReducedMotion";
import styles from "@/components/studio-presence/studio-presence.module.css";

type StudioPresenceProps = {
  state: "idle" | "listening" | "thinking" | "speaking" | "guiding";
  look: { x: number; y: number };
  floating: boolean;
};

/** Soft squircle / rounded-rect — locked frame foundation. */
function softSquirclePath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  bow = 1.5,
): string {
  const t = Math.min(r, w / 2, h / 2);
  const x2 = x + w;
  const y2 = y + h;
  const mx = x + w / 2;
  const my = y + h / 2;
  const k = 0.64;
  const c = t * (1 - k);
  return [
    `M ${x + t} ${y}`,
    `C ${mx - w * 0.08} ${y - bow} ${mx + w * 0.08} ${y - bow} ${x2 - t} ${y}`,
    `C ${x2 - c} ${y} ${x2} ${y + c} ${x2} ${y + t}`,
    `C ${x2 + bow} ${my - h * 0.08} ${x2 + bow} ${my + h * 0.08} ${x2} ${y2 - t}`,
    `C ${x2} ${y2 - c} ${x2 - c} ${y2} ${x2 - t} ${y2}`,
    `C ${mx + w * 0.08} ${y2 + bow} ${mx - w * 0.08} ${y2 + bow} ${x + t} ${y2}`,
    `C ${x + c} ${y2} ${x} ${y2 - c} ${x} ${y2 - t}`,
    `C ${x - bow} ${my + h * 0.08} ${x - bow} ${my - h * 0.08} ${x} ${y + t}`,
    `C ${x} ${y + c} ${x + c} ${y} ${x + t} ${y}`,
    "Z",
  ].join(" ");
}

const ALMOND_K = 0.58;

/**
 * Soft relaxed almond — rounded corners, fuller upper lid, softer lower.
 * Calm attentiveness · not pointed cat-eye · not a circle.
 * @see docs/studio-presence-visual-direction-v1.md
 */
function softAlmondOpeningPath(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
): string {
  const k = ALMOND_K;
  return [
    `M ${cx - halfW} ${cy}`,
    `C ${cx - halfW} ${cy - halfH * k} ${cx - halfW * 0.42} ${cy - halfH} ${cx} ${cy - halfH}`,
    `C ${cx + halfW * 0.42} ${cy - halfH} ${cx + halfW} ${cy - halfH * k} ${cx + halfW} ${cy}`,
    `C ${cx + halfW} ${cy + halfH * 0.48} ${cx + halfW * 0.48} ${cy + halfH} ${cx} ${cy + halfH}`,
    `C ${cx - halfW * 0.48} ${cy + halfH} ${cx - halfW} ${cy + halfH * 0.48} ${cx - halfW} ${cy}`,
    "Z",
  ].join(" ");
}

function almondHalfWAtY(
  cy: number,
  halfW: number,
  halfH: number,
  y: number,
): number {
  const t = (y - cy) / halfH;
  if (Math.abs(t) >= 1) return 0;
  return halfW * Math.sqrt(1 - t * t);
}

/** Resting lid — follows almond · ~10–15% iris cover. */
function almondLidRestPath(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  lidBottomY: number,
): string {
  const k = ALMOND_K;
  const hwBot = almondHalfWAtY(cy, halfW, halfH, lidBottomY);
  const crease = 1.35;
  return [
    `M ${cx - hwBot} ${lidBottomY}`,
    `C ${cx - halfW} ${(lidBottomY + cy - halfH * k) / 2} ${cx - halfW} ${cy - halfH * k} ${cx - halfW * 0.42} ${cy - halfH}`,
    `C ${cx - halfW * 0.2} ${cy - halfH} ${cx + halfW * 0.2} ${cy - halfH} ${cx + halfW * 0.42} ${cy - halfH}`,
    `C ${cx + halfW} ${cy - halfH * k} ${cx + halfW} ${(lidBottomY + cy - halfH * k) / 2} ${cx + hwBot} ${lidBottomY}`,
    `Q ${cx} ${lidBottomY + crease} ${cx - hwBot} ${lidBottomY}`,
    "Z",
  ].join(" ");
}

/**
 * Integrated brow — thin, close to frames, subtle curve.
 * Thick inward · disappears into the illusion until expression needs it.
 */
function presenceBrowPath(
  innerX: number,
  outerX: number,
  y: number,
  archLift = 3.2,
  innerThick = 2.8,
  tipThick = 0.7,
): string {
  const dir = Math.sign(outerX - innerX) || -1;
  const span = Math.abs(outerX - innerX);
  const peakX = innerX + dir * span * 0.36;
  const peakY = y - archLift;
  const tipY = y - 0.9;
  const shoulderX = innerX + dir * span * 0.68;

  return [
    `M ${innerX} ${y}`,
    `C ${innerX - dir * 0.4} ${y - innerThick * 0.45} ${innerX + dir * 2.5} ${peakY + 0.6} ${peakX} ${peakY}`,
    `C ${peakX + dir * span * 0.2} ${peakY - 0.4} ${shoulderX} ${tipY - 0.35} ${outerX} ${tipY}`,
    `C ${outerX - dir * 0.25} ${tipY + tipThick} ${outerX - dir * 3.5} ${y + 0.35} ${shoulderX} ${y + 0.25}`,
    `C ${peakX + dir * 3} ${y + 0.85} ${innerX + dir * 3.5} ${y + innerThick * 0.4} ${innerX + dir * 0.4} ${y + innerThick * 0.28}`,
    `C ${innerX - dir * 0.2} ${y + 0.15} ${innerX + dir * 0.2} ${y + 0.35} ${innerX} ${y}`,
    "Z",
  ].join(" ");
}

type EyeGeom = {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
  irisCy: number;
  irisR: number;
  pupilR: number;
  eyeClipId: string;
};

/**
 * Studio Presence — eyes live behind the glasses.
 * Visual order: frame → lens → recessed eyes.
 * @see docs/studio-presence-visual-direction-v1.md
 */
export default function StudioPresence({ state, look, floating }: StudioPresenceProps) {
  const { colors, sizePx, stillVisualCert, identityFocus, motion } =
    studioPresenceV1;
  const showEyes = identityFocus === "glassesFace";
  const showMouth = !stillVisualCert && state === "speaking";
  const reducedMotion = useReducedMotion();
  const lidsClosed = usePresenceBlink(showEyes, reducedMotion);
  const blinkMs = motion.blinkCloseMs;
  const breathe = floating && !reducedMotion && !stillVisualCert;

  const lookT = useMemo(() => {
    const max = motion.pupilMaxOffsetPx;
    return { x: look.x * max * 0.65, y: look.y * max * 0.5 };
  }, [look.x, look.y, motion.pupilMaxOffsetPx]);

  /* Locked frame geometry — do not redesign silhouette. */
  const L = {
    ox: 20,
    oy: 40,
    ow: 90,
    oh: 74,
    ix: 26,
    iy: 42,
    iw: 78,
    ih: 66,
    orx: 24,
    irx: 20,
  };
  const R = {
    ox: 130,
    oy: 40,
    ow: 90,
    oh: 74,
    ix: 136,
    iy: 42,
    iw: 78,
    ih: 66,
    orx: 24,
    irx: 20,
  };

  const buildEye = (
    lensIx: number,
    lensIy: number,
    lensIw: number,
    lensIh: number,
    clipId: string,
    /** Positive = toward face center — one shared eye line. */
    inwardPx: number,
  ): EyeGeom => {
    const cx = lensIx + lensIw / 2 + inwardPx;
    /* Shared eye line · centered behind the lenses (not hanging low). */
    const cy = lensIy + lensIh * 0.58;
    const halfW = 23.5;
    const halfH = 13.2;
    const irisR = 8.5;
    const irisCy = cy + 1.5;
    return {
      cx,
      cy,
      halfW,
      halfH,
      irisCy,
      irisR,
      pupilR: 3.4,
      eyeClipId: clipId,
    };
  };

  /* Pull toward the bridge — one face, not two floating eyes. */
  const eyeL = buildEye(L.ix, L.iy, L.iw, L.ih, "sp-eye-l", 7);
  const eyeR = buildEye(R.ix, R.iy, R.iw, R.ih, "sp-eye-r", -7);

  const renderEye = (eye: EyeGeom, lensClipId: string) => {
    const openingTop = eye.cy - eye.halfH;
    const irisTop = eye.irisCy - eye.irisR;
    /* ~12% iris cover — calm (guide: 10–15%). */
    const lidRestY = irisTop + eye.irisR * 0.12;
    const closeAnimMs = Math.min(260, Math.max(160, Math.floor(blinkMs * 0.7)));
    const openingPath = softAlmondOpeningPath(
      eye.cx,
      eye.cy,
      eye.halfW,
      eye.halfH,
    );

    return (
      <g clipPath={`url(#${lensClipId})`}>
        {/* Recess — eyes sit behind the glass plane */}
        <path
          d={softAlmondOpeningPath(
            eye.cx,
            eye.cy + 1.6,
            eye.halfW + 3.8,
            eye.halfH * 1.08,
          )}
          fill="#06100e"
          opacity="0.26"
          filter="url(#sp-eye-recess)"
        />
        <path
          d={softAlmondOpeningPath(
            eye.cx,
            eye.cy + 0.7,
            eye.halfW + 1.8,
            eye.halfH,
          )}
          fill="#0a1412"
          opacity="0.16"
        />

        <g clipPath={`url(#${eye.eyeClipId})`}>
          <path d={openingPath} fill="url(#sp-sphere)" />

          <g transform={`translate(${lookT.x} ${lookT.y})`}>
            <circle
              cx={eye.cx}
              cy={eye.irisCy}
              r={eye.irisR}
              fill="url(#sp-iris)"
              filter="url(#sp-iris-inset)"
            />
            <circle
              cx={eye.cx}
              cy={eye.irisCy}
              r={eye.pupilR}
              fill={colors.pupil}
            />
            <circle
              cx={eye.cx - 2.5}
              cy={eye.irisCy - 2.6}
              r="1.2"
              fill="#fff"
              opacity="0.48"
            />
            <circle
              cx={eye.cx + 2.6}
              cy={eye.irisCy + 1.7}
              r="0.55"
              fill="#fff"
              opacity="0.18"
            />
          </g>

          {/* Soft shadow under upper lid */}
          <path
            fill="url(#sp-lid-shade)"
            opacity={lidsClosed ? 0 : 0.9}
            d={almondLidRestPath(
              eye.cx,
              eye.cy,
              eye.halfW,
              eye.halfH,
              lidRestY + 2.2,
            )}
          />

          <path
            fill="url(#sp-lid-rest)"
            opacity={lidsClosed ? 0 : 1}
            d={almondLidRestPath(
              eye.cx,
              eye.cy,
              eye.halfW,
              eye.halfH,
              lidRestY,
            )}
          />

          <path
            className={styles.eyelid}
            d={openingPath}
            fill="url(#sp-lid-fill)"
            style={{
              transformOrigin: `${eye.cx}px ${openingTop}px`,
              transform: lidsClosed ? "scaleY(1)" : "scaleY(0)",
              transitionDuration: `${closeAnimMs}ms`,
              transitionTimingFunction: lidsClosed
                ? "cubic-bezier(0.4, 0, 0.7, 1)"
                : "cubic-bezier(0.3, 0, 0.2, 1)",
            }}
          />
        </g>

        {/* Frame casts a soft top shade onto the eye — depth cue */}
        <ellipse
          cx={eye.cx}
          cy={openingTop - 1}
          rx={eye.halfW * 1.15}
          ry={4.5}
          fill="url(#sp-frame-cast)"
          opacity="0.55"
        />
      </g>
    );
  };

  const lensReflection = (ix: number, iy: number, iw: number, ih: number) => (
    <g pointerEvents="none">
      <ellipse
        cx={ix + iw * 0.32}
        cy={iy + ih * 0.26}
        rx={iw * 0.2}
        ry={ih * 0.12}
        fill="url(#sp-lens-glint)"
        opacity="0.4"
      />
      <path
        d={`M ${ix + iw * 0.14} ${iy + ih * 0.16}
            Q ${ix + iw * 0.36} ${iy + ih * 0.07} ${ix + iw * 0.52} ${iy + ih * 0.18}`}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.65"
      />
    </g>
  );

  return (
    <div
      className={`${styles.face}${breathe ? ` ${styles.faceFloat}` : ""}`}
      style={
        breathe
          ? ({
              ["--presence-float-ms" as string]: `${motion.floatDurationMs}ms`,
              ["--presence-float-amp" as string]: motion.floatAmplitudePx,
            } as CSSProperties)
          : undefined
      }
      aria-hidden
    >
      <svg
        className={styles.svg}
        viewBox="0 0 240 160"
        width={sizePx}
        height={sizePx * (160 / 240)}
        role="presentation"
      >
        <defs>
          <linearGradient id="sp-frame" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor={colors.glassesHighlight} />
            <stop offset="55%" stopColor={colors.glasses} />
            <stop offset="100%" stopColor={colors.glassesDeep} />
          </linearGradient>
          <linearGradient id="sp-disc" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop
              offset="0%"
              stopColor={colors.glassesHighlight}
              stopOpacity="0.28"
            />
            <stop
              offset="45%"
              stopColor={colors.glasses}
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor={colors.glassesDeep}
              stopOpacity="0.26"
            />
          </linearGradient>
          <radialGradient id="sp-iris" cx="34%" cy="30%" r="70%">
            <stop offset="0%" stopColor={colors.irisInner} />
            <stop offset="40%" stopColor={colors.irisMid} />
            <stop offset="82%" stopColor={colors.irisOuter} />
            <stop offset="100%" stopColor="#043840" />
          </radialGradient>
          <radialGradient id="sp-sphere" cx="42%" cy="36%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor={colors.sclera} />
            <stop offset="100%" stopColor="#b8c4be" />
          </radialGradient>
          <radialGradient id="sp-lens-glint" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sp-lid-rest" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c8d0cc" stopOpacity="0.38" />
            <stop offset="65%" stopColor="#b8c4c0" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#b8c4c0" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="sp-lid-shade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a221f" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#1a221f" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#1a221f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sp-frame-cast" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a1210" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#0a1210" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0a1210" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sp-lid-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d6e0dc" stopOpacity="0.72" />
            <stop offset="40%" stopColor="#c4d0cc" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#aebcba" stopOpacity="0.5" />
          </linearGradient>
          <filter id="sp-soft" x="-12%" y="-18%" width="124%" height="145%">
            <feDropShadow
              dx="0"
              dy="2.5"
              stdDeviation="2"
              floodColor="#0a140e"
              floodOpacity="0.26"
            />
          </filter>
          <filter id="sp-iris-inset" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow
              dx="0"
              dy="0.6"
              stdDeviation="0.7"
              floodColor="#000"
              floodOpacity="0.18"
            />
          </filter>
          <filter id="sp-eye-recess" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
          <clipPath id="sp-clip-l">
            <path d={softSquirclePath(L.ix, L.iy, L.iw, L.ih, L.irx, 1.1)} />
          </clipPath>
          <clipPath id="sp-clip-r">
            <path d={softSquirclePath(R.ix, R.iy, R.iw, R.ih, R.irx, 1.1)} />
          </clipPath>
          <clipPath id="sp-eye-l">
            <path
              d={softAlmondOpeningPath(
                eyeL.cx,
                eyeL.cy,
                eyeL.halfW,
                eyeL.halfH,
              )}
            />
          </clipPath>
          <clipPath id="sp-eye-r">
            <path
              d={softAlmondOpeningPath(
                eyeR.cx,
                eyeR.cy,
                eyeR.halfW,
                eyeR.halfH,
              )}
            />
          </clipPath>
        </defs>

        {showEyes ? (
          <g fill="#1a1a1a" opacity="0.52">
            {/* Thin brows · sit naturally just above the frames */}
            <path d={presenceBrowPath(88, 48, 36.2, 2.8, 2.4, 0.6)} />
            <path
              d={presenceBrowPath(88, 48, 36.2, 2.8, 2.4, 0.6)}
              transform="translate(240 0) scale(-1 1)"
            />
          </g>
        ) : null}

        <g filter="url(#sp-soft)">
          {/* Eyes first — behind the frames */}
          {showEyes ? (
            <>
              {renderEye(eyeL, "sp-clip-l")}
              {renderEye(eyeR, "sp-clip-r")}
            </>
          ) : null}

          {/* Locked glasses foundation */}
          <path
            fill="url(#sp-frame)"
            fillRule="evenodd"
            d={`${softSquirclePath(L.ox, L.oy, L.ow, L.oh, L.orx, 1.1)} ${softSquirclePath(L.ix, L.iy, L.iw, L.ih, L.irx, 0.85)}`}
          />
          <path
            fill="url(#sp-frame)"
            fillRule="evenodd"
            d={`${softSquirclePath(R.ox, R.oy, R.ow, R.oh, R.orx, 1.1)} ${softSquirclePath(R.ix, R.iy, R.iw, R.ih, R.irx, 0.85)}`}
          />
          {showEyes ? (
            <>
              {/* Defined glass — readable as lenses, not just green outlines */}
              <path
                d={softSquirclePath(L.ix, L.iy, L.iw, L.ih, L.irx, 1.1)}
                fill={colors.glassesGlass}
              />
              <path
                d={softSquirclePath(R.ix, R.iy, R.iw, R.ih, R.irx, 1.1)}
                fill={colors.glassesGlass}
              />
              <path
                d={softSquirclePath(L.ix, L.iy, L.iw, L.ih, L.irx, 1.1)}
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1.1"
              />
              <path
                d={softSquirclePath(R.ix, R.iy, R.iw, R.ih, R.irx, 1.1)}
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1.1"
              />
              <g clipPath="url(#sp-clip-l)">
                {lensReflection(L.ix, L.iy, L.iw, L.ih)}
              </g>
              <g clipPath="url(#sp-clip-r)">
                {lensReflection(R.ix, R.iy, R.iw, R.ih)}
              </g>
            </>
          ) : null}

          {/* Bridge S hidden — eyes lead; mark can return on hover later */}
        </g>

        {showMouth ? (
          <path
            className={styles.mouthIn}
            d="M 98 138 C 108 145 132 145 142 138"
            fill="none"
            stroke={colors.mouth}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
        ) : null}
      </svg>
    </div>
  );
}
