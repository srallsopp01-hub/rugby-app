"use client";

import { useSyncExternalStore } from "react";

type ThemeScheme = "dark" | "bright";

const STORAGE_KEY = "fynlwhistle-theme-scheme";
const SCHEME_EVENT = "fynlwhistle-scheme-changed";

function applyScheme(scheme: ThemeScheme) {
  document.documentElement.setAttribute("data-theme-scheme", scheme);
}

function getStoredScheme(): ThemeScheme {
  return localStorage.getItem(STORAGE_KEY) === "bright" ? "bright" : "dark";
}

function subscribeScheme(cb: () => void) {
  window.addEventListener(SCHEME_EVENT, cb);
  return () => window.removeEventListener(SCHEME_EVENT, cb);
}

export default function ThemeSchemeToggle({
  compact = false,
}: {
  compact?: boolean;
}) {
  const scheme = useSyncExternalStore(subscribeScheme, getStoredScheme, () => "dark" as ThemeScheme);

  function chooseScheme(nextScheme: ThemeScheme) {
    localStorage.setItem(STORAGE_KEY, nextScheme);
    applyScheme(nextScheme);
    window.dispatchEvent(new Event(SCHEME_EVENT));
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border border-border bg-panel-2 p-1 ${
        compact ? "gap-0.5" : "gap-1"
      }`}
      aria-label="Colour scheme"
      role="group"
      suppressHydrationWarning
    >
      {(["dark", "bright"] as ThemeScheme[]).map((option) => {
        const active = scheme === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => chooseScheme(option)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase transition ${
              active
                ? "bg-foreground-strong text-background"
                : "text-muted hover:text-foreground-strong"
            } ${compact ? "px-2" : ""}`}
          >
            {compact ? option.slice(0, 1) : option}
          </button>
        );
      })}
    </div>
  );
}
