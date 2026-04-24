"use client";

import { useEffect, useState } from "react";

type ThemeScheme = "dark" | "bright";

const STORAGE_KEY = "rugbycoach-theme-scheme";

function applyScheme(scheme: ThemeScheme) {
  document.documentElement.setAttribute("data-theme-scheme", scheme);
}

function getStoredScheme(): ThemeScheme {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(STORAGE_KEY) === "bright" ? "bright" : "dark";
}

export default function ThemeSchemeToggle({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [scheme, setScheme] = useState<ThemeScheme>(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-theme-scheme") === "bright"
      ? "bright"
      : "dark";
  });

  useEffect(() => {
    applyScheme(getStoredScheme());
  }, []);

  function chooseScheme(nextScheme: ThemeScheme) {
    setScheme(nextScheme);
    localStorage.setItem(STORAGE_KEY, nextScheme);
    applyScheme(nextScheme);
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
