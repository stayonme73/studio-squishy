/**
 * Weather Portal types — cutout/layering model for environmental windows.
 * Same architecture for Welcome Hall windows and Studio tall portal.
 */

export type TimePeriod =
  | "dawn"
  | "morning"
  | "afternoon"
  | "golden"
  | "dusk"
  | "night";

export type WeatherPortalShape = "wide" | "tall";

export type WeatherPortalProps = {
  /** wide = embedded aperture; tall = architectural vertical portal */
  shape?: WeatherPortalShape;
  /** Visual offset for multi-window compositions (0–2) */
  sceneOffset?: 0 | 1 | 2;
  className?: string;
};
