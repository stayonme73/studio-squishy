/**
 * Shared 9:16 phone-safe area for short-form video type.
 * Motion may move the photograph. Type must stay inside this rectangle.
 */

export const VIDEO_SAFE_AREA_9X16 = {
  canvasWidth: 1080,
  canvasHeight: 1920,
  insetLeft: 72,
  insetRight: 72,
  insetTop: 168,
  insetBottom: 220,
} as const;

export type VideoSafeArea = typeof VIDEO_SAFE_AREA_9X16;

export type PixelBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function safeAreaRect(area: VideoSafeArea = VIDEO_SAFE_AREA_9X16): PixelBox {
  return {
    left: area.insetLeft,
    top: area.insetTop,
    right: area.canvasWidth - area.insetRight,
    bottom: area.canvasHeight - area.insetBottom,
  };
}

export function boxInsideSafeArea(
  box: PixelBox,
  area: VideoSafeArea = VIDEO_SAFE_AREA_9X16,
): boolean {
  const safe = safeAreaRect(area);
  return (
    box.left >= safe.left &&
    box.top >= safe.top &&
    box.right <= safe.right &&
    box.bottom <= safe.bottom
  );
}

export function beatSampleFractions(): readonly number[] {
  return [0, 0.25, 0.5, 0.75, 1];
}

export function sampleTimesForBeat(
  startSeconds: number,
  endSeconds: number,
): number[] {
  const span = Math.max(0.04, endSeconds - startSeconds);
  return beatSampleFractions().map((fraction) => {
    if (fraction === 0) return Number((startSeconds + 0.04).toFixed(3));
    if (fraction === 1) return Number(Math.max(startSeconds, endSeconds - 0.08).toFixed(3));
    return Number((startSeconds + span * fraction).toFixed(3));
  });
}
