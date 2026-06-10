/**
 * Studio Squishy design tokens — warm industrial innovation studio.
 * Used by CSS variables and future scene components.
 */
export const studioPalette = {
  denimBlue: "#2C3E50",
  tealGreen: "#008080",
  walnut: "#6B4423",
  cream: "#F5F0E8",
  matteBlack: "#1A1A1A",
  burntOrange: "#CC5500",
  goldenYellow: "#DAA520",
  coral: "#FF7F50",
  warmGrayFloor: "#9A9590",
  warmGrayFloorLight: "#B5B0AA",
  ceiling: "#3D3835",
  pipeTeal: "#007A7A",
} as const;

export type StudioPaletteKey = keyof typeof studioPalette;
