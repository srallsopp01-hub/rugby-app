"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginDropdown() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Resolved authed state
  if (authed) {
    return (
      <Link
        href="/coach"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-4 py-2 text-xs font-black uppercase text-foreground-strong transition hover:border-border-light hover:bg-panel-3"
      >
        Dashboard
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6h7M6.5 3l3 3-3 3"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="text-xs font-bold uppercase text-muted transition-colors hover:text-foreground-strong"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center rounded-md border border-border bg-panel-2 px-4 py-2 text-xs font-black uppercase text-foreground-strong transition hover:border-border-light hover:bg-panel-3"
      >
        Try free
      </Link>
    </div>
  );
}
