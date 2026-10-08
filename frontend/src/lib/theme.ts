import type { CSSProperties } from "react";
import type { Theme } from "./types";

export const DEFAULT_THEME: Required<Theme> = {
  background: "#FFFFFF",
  question: "#191919",
  answer: "#0445AF",
  button: "#0445AF",
  button_text: "#FFFFFF",
  font: "Inter",
};

export const THEME_PRESETS: { name: string; theme: Required<Theme> }[] = [
  { name: "Default", theme: DEFAULT_THEME },
  { name: "Midnight", theme: { background: "#0B1F3A", question: "#FFFFFF", answer: "#7DD3FC", button: "#7DD3FC", button_text: "#0B1F3A", font: "Inter" } },
  { name: "Peach", theme: { background: "#FDEBE3", question: "#3D1F14", answer: "#C2410C", button: "#C2410C", button_text: "#FFFFFF", font: "Karla" } },
  { name: "Forest", theme: { background: "#1E3A2F", question: "#F2EFE6", answer: "#B9E4C9", button: "#B9E4C9", button_text: "#1E3A2F", font: "Karla" } },
  { name: "Lavender", theme: { background: "#EEE8FF", question: "#2A1B5C", answer: "#6D28D9", button: "#6D28D9", button_text: "#FFFFFF", font: "Space Grotesk" } },
  { name: "Ink", theme: { background: "#111111", question: "#FAFAFA", answer: "#F5D547", button: "#F5D547", button_text: "#111111", font: "Playfair Display" } },
];

export const FONTS = ["Inter", "Karla", "Space Grotesk", "Playfair Display"];

export const resolveTheme = (t?: Theme): Required<Theme> => ({ ...DEFAULT_THEME, ...(t ?? {}) });

/** Theme -> CSS custom properties consumed by .tf-* classes in globals.css */
export function themeVars(t?: Theme): CSSProperties {
  const th = resolveTheme(t);
  return {
    "--tf-bg": th.background,
    "--tf-q": th.question,
    "--tf-a": th.answer,
    "--tf-btn": th.button,
    "--tf-btn-text": th.button_text,
    "--tf-font": `"${th.font}", ui-sans-serif, system-ui, sans-serif`,
  } as CSSProperties;
}
