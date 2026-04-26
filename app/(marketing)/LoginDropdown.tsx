"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function LoginDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-4 py-2 text-xs font-black uppercase text-foreground-strong transition hover:border-border-light hover:bg-panel-3"
      >
        Log in
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 3.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-panel shadow-[0_12px_32px_rgba(0,0,0,0.36)]">
          <Link
            href="/coach"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-3 text-xs font-bold uppercase text-foreground transition-colors hover:bg-panel-2 hover:text-foreground-strong"
          >
            <span>Coach</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6h7M6.5 3l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div className="mx-3 border-t border-border" />
          <Link
            href="/player"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-3 text-xs font-bold uppercase text-foreground transition-colors hover:bg-panel-2 hover:text-foreground-strong"
          >
            <span>Player</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6h7M6.5 3l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
