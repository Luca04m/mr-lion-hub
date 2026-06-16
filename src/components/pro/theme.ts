/**
 * theme.ts — helper do toggle light/dark (independente do next-themes).
 * Tema é aplicado via classe 'theme-dark' no document.documentElement.
 * Default = light (sem classe). Persistido em localStorage 'mrlion_theme'.
 */
export type HubTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "mrlion_theme";

export function getStoredTheme(): HubTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  // Migra valores antigos: warm -> light, navy -> dark.
  if (stored === "dark" || stored === "navy") return "dark";
  return "light";
}

export function applyTheme(theme: HubTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("theme-dark", theme === "dark");
}

/** Lê o localStorage e aplica antes do render. Chamar em main.tsx. */
export function initTheme() {
  applyTheme(getStoredTheme());
}

export function setTheme(theme: HubTheme) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  applyTheme(theme);
}
