export type HighlightColor = {
  hex: string;     // stored in DB, used everywhere
  bg: string;      // transparent version for text backgrounds
  label: string;
};

// Preset palette for the manual UI (7 colors)
export const HighlightColors: HighlightColor[] = [
  { hex: "#C8902E", bg: "rgba(200,144,46,0.25)", label: "Gold" },
  { hex: "#B75064", bg: "rgba(183,80,100,0.22)", label: "Rose" },
  { hex: "#7A8B5C", bg: "rgba(122,139,92,0.25)", label: "Olive" },
  { hex: "#5A96C8", bg: "rgba(90,150,200,0.22)", label: "Sky" },
  { hex: "#DCA064", bg: "rgba(220,160,100,0.25)", label: "Peach" },
  { hex: "#9678B4", bg: "rgba(150,120,180,0.22)", label: "Lavender" },
  { hex: "#50B496", bg: "rgba(80,180,150,0.22)", label: "Mint" },
];

/**
 * Convert any hex color to a transparent background suitable for text highlighting.
 * Works for both preset palette colors and arbitrary hex from the AI.
 */
export function hexToBg(hex: string, alpha = 0.25): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(200,144,46,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}
