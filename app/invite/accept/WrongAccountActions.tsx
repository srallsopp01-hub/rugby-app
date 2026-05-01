"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function WrongAccountActions({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSwitchAccount() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/invite/accept?token=${token}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleSwitchAccount()}
      disabled={loading}
      className="mt-5 inline-flex items-center justify-center rounded-xl bg-foreground-strong px-5 py-3 text-sm font-black uppercase text-background transition hover:opacity-90 disabled:opacity-50"
    >
      {loading ? "Signing out..." : "Not me - continue as invited player"}
    </button>
  );
}
