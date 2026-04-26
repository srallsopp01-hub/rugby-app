"use client";

import { useState, useEffect, useCallback } from "react";

export type HelpStep = {
  title: string;
  body: string;
};

export type PageHelpProps = {
  title: string;
  description: string;
  steps: HelpStep[];
  tips?: string[];
};

export function PageHelp({ title, description, steps, tips }: PageHelpProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Page help"
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-panel-2 text-sm font-semibold text-muted transition-colors hover:border-border-light hover:text-foreground"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={close}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              aria-label="Close help"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted hover:text-foreground"
            >
              ✕
            </button>

            <h2 className="mb-1 text-base font-semibold text-foreground-strong">
              {title}
            </h2>
            <p className="mb-5 text-sm text-muted">{description}</p>

            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-panel-3 text-[10px] font-bold text-muted">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                    <p className="text-xs text-muted">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {tips && tips.length > 0 && (
              <div className="mt-5 rounded-xl border border-border bg-panel-2 p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-2">
                  Best Practices
                </p>
                <ul className="space-y-1.5">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted">
                      <span className="mt-0.5 flex-shrink-0 text-success">✓</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
