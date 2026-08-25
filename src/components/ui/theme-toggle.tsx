"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "soundshelf-theme";
const CHANGE_EVENT = "soundshelf:theme";

type Theme = "light" | "dark" | "system";

const ORDER: Theme[] = ["system", "light", "dark"];

const LABELS: Record<Theme, string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

/** `matchMedia` is missing in jsdom and in some embedded webviews. */
function prefersDark(): boolean {
  if (typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(theme: Theme): void {
  const isDark = theme === "dark" || (theme === "system" && prefersDark());

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.dataset.theme = theme;
}

/**
 * The stored preference is external state, so it is read through a store
 * rather than mirrored into React state by an effect. `getServerSnapshot`
 * reports "system" during SSR and hydration; the inline script in the root
 * layout has already painted the correct colours by then, so the only thing
 * that settles on the client is which icon this button shows.
 */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function getSnapshot(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
  } catch {
    return "system";
  }
}

function getServerSnapshot(): Theme {
  return "system";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // While following the system, track it live rather than only on load.
  useEffect(() => {
    if (theme !== "system" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const advance = useCallback(() => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

    if (next === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }

    apply(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [theme]);

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      className={`control control-icon ${className}`.trim()}
      // Name the current setting rather than the next one: a control that
      // announces "Dark" while the page is light is a riddle.
      aria-label={`Theme: ${LABELS[theme]}. Change theme.`}
      title={LABELS[theme]}
      onClick={advance}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}
