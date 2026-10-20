/** Brand colours a business can pick for its invoice. All meet WCAG AA (4.5:1) on white. */
export const ACCENTS = [
  { id: "forest", label: "Forest", color: "#2f5d50", soft: "#e8f0ec" },
  { id: "ink", label: "Ink", color: "#2d4a8a", soft: "#e9edf7" },
  { id: "clay", label: "Clay", color: "#a2441c", soft: "#f8ebe4" },
  { id: "plum", label: "Plum", color: "#6b3a69", soft: "#f2e9f1" },
  { id: "graphite", label: "Graphite", color: "#2f2f2f", soft: "#ededeb" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export const ACCENT_IDS = ACCENTS.map((accent) => accent.id) as [AccentId, ...AccentId[]];

export const DEFAULT_ACCENT: AccentId = "forest";

export function getAccent(id: AccentId) {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}
