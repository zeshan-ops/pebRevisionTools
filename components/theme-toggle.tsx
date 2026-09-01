"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "system" | "light" | "dark";
const STORAGE_KEY = "peb-theme";
const ORDER: Theme[] = ["system", "light", "dark"];
// Same-tab localStorage writes don't fire the native "storage" event (only
// other tabs get that), so a custom event carries the change to
// useSyncExternalStore's subscribers in this tab too.
const THEME_EVENT = "peb-theme-change";

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorage unavailable — fall through to system */
  }
  return "system";
}

// Matches the server-rendered (and first client-hydration-pass) output
// exactly, so there is no hydration mismatch to paper over with a "mounted"
// flag — useSyncExternalStore's contract handles that swap for us.
function getServerSnapshot(): Theme {
  return "system";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function writeTheme(theme: Theme) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* best-effort persistence only */
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  function cycle() {
    writeTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]);
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : SunMoon;
  const label =
    theme === "light" ? "Light theme" : theme === "dark" ? "Dark theme" : "System theme";

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${label} — click to change`}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-muted",
        "hover:text-ink hover:bg-paper-sunk transition-colors duration-(--dur-fast)",
        className,
      )}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
