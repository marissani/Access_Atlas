import { useEffect, useState } from "react";

import {
  DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  activeTheme,
  applyTheme,
  preferredTheme,
  saveTheme,
  storedTheme,
  type Theme,
} from "~/lib/theme";

const LABEL_TO_DARK = "Switch to dark theme";
const LABEL_TO_LIGHT = "Switch to light theme";

/**
 * Header theme switch.
 *
 * Hydration-safe by design: the server cannot know the visitor's theme, so the
 * first client render matches the server exactly (`theme` is null → the button
 * renders as it would for a light-theme visitor) and the real value is applied
 * in an effect afterwards. Only the accessible name and `aria-pressed` change
 * after mount — never during render — so React has nothing to complain about.
 * The sun/moon glyph is chosen purely in CSS from the `dark` class, which the
 * pre-paint script in __root.tsx has already set, so the icon is correct from
 * the very first paint.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(activeTheme());

    // No explicit choice? Then keep following the OS while the page is open.
    const media = window.matchMedia(DARK_MEDIA_QUERY);
    const followSystem = (event: MediaQueryListEvent) => {
      if (storedTheme()) return;
      const next: Theme = event.matches ? "dark" : "light";
      applyTheme(next);
      setTheme(next);
    };

    // A choice made in another tab is a choice here too.
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = preferredTheme();
      applyTheme(next);
      setTheme(next);
    };

    media.addEventListener("change", followSystem);
    window.addEventListener("storage", syncAcrossTabs);
    return () => {
      media.removeEventListener("change", followSystem);
      window.removeEventListener("storage", syncAcrossTabs);
    };
  }, []);

  const isDark = theme === "dark";

  function toggleTheme() {
    const next: Theme = isDark ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? LABEL_TO_LIGHT : LABEL_TO_DARK}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-stone-300 bg-white text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-500 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 dark:hover:text-white"
    >
      <span aria-hidden="true" className="text-base leading-none dark:hidden">
        🌙
      </span>
      <span aria-hidden="true" className="hidden text-base leading-none dark:block">
        ☀️
      </span>
    </button>
  );
}
