"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; erasing: boolean };

type Props = {
  active: boolean;
  erasing: boolean;
  onStroke: () => void;
};

/** Direct finger/stylus marks on the currently visible proof. */
export default function FeedbackStudioDrawLayer({ active, erasing, onStroke }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const onStrokeRef = useRef(onStroke);
  onStrokeRef.current = onStroke;

  function paint(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#d94e2b";
    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const point of stroke.points.slice(1)) {
        ctx.lineTo(point.x, point.y);
      }
      if (stroke.erasing) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = 16;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.stroke();
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
      const nextHeight = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
      paint(canvas);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const pointerPos = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onDown = (event: PointerEvent) => {
      event.preventDefault();
      drawingRef.current = true;
      canvas.setPointerCapture(event.pointerId);
      currentRef.current = { points: [pointerPos(event)], erasing };
      strokesRef.current = [...strokesRef.current, currentRef.current];
    };

    const onMove = (event: PointerEvent) => {
      if (!drawingRef.current || !currentRef.current) return;
      event.preventDefault();
      currentRef.current.points.push(pointerPos(event));
      paint(canvas);
    };

    const onUp = (event: PointerEvent) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      if ((currentRef.current?.points.length ?? 0) > 1) {
        onStrokeRef.current();
      }
      currentRef.current = null;
    };

    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove, { passive: false });
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [active, erasing]);

  return (
    <canvas
      ref={canvasRef}
      className={`fs-draw-layer${active ? " fs-draw-layer--active" : ""}`}
      aria-hidden={!active}
    />
  );
}
