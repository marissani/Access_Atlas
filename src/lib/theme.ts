/**
 * Theme handling for Access Atlas.
 *
 * Rules:
 *  1. First visit → follow the operating system (`prefers-color-scheme`).
 *  2. Once a visitor uses the header toggle, that choice is stored in
 *     localStorage and always wins; system changes are ignored from then on.
 *  3. The `dark` class on <html> is the single switch every `dark:` utility
 *     keys off (see the `@custom-variant` in src/styles/app.css).
 *
 * The rules exist in two places on purpose:
 *  - THEME_INIT_SCRIPT is inlined into <head> by __root.tsx so the class is set
 *    before the first paint. It has to be a tiny dependency-free string (it
 *    cannot import this module), so it is written out in plain ES5.
 *  - the typed helpers below run after hydration (the React toggle).
 * Keep the two in sync when either changes.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "access-atlas-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Pre-paint bootstrap: class on <html> only, nothing else, never throws. */
export const THEME_INIT_SCRIPT =
  "(function(){try{" +
  "var s=window.localStorage.getItem('" +
  THEME_STORAGE_KEY +
  "');" +
  "var d=s==='dark'||(s!=='light'&&window.matchMedia('" +
  DARK_QUERY +
  "').matches);" +
  "document.documentElement.classList.toggle('dark',d);" +
  "}catch(e){}})();";

function canUseDom(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** The visitor's explicit choice, or null when they have never chosen. */
export function storedTheme(): Theme | null {
  if (!canUseDom()) return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    // Storage can throw (private mode, blocked cookies) — treat as "no choice".
    return null;
  }
}

/** What the operating system currently asks for. */
export function systemTheme(): Theme {
  if (!canUseDom() || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** The theme the document is actually showing right now. */
export function activeTheme(): Theme {
  if (!canUseDom()) return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Apply a theme to the document. Does not touch storage. */
export function applyTheme(theme: Theme): void {
  if (!canUseDom()) return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Remember an explicit choice (survives reloads; outranks the OS). */
export function saveTheme(theme: Theme): void {
  if (!canUseDom()) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Nothing to do: the theme still applies for this page view.
  }
}

/** The theme a fresh visitor should get: explicit choice, else the OS. */
export function preferredTheme(): Theme {
  return storedTheme() ?? systemTheme();
}

export const DARK_MEDIA_QUERY = DARK_QUERY;
