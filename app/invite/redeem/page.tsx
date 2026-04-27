"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

export default function RedeemPage() {
  return (
    <Suspense fallback={<RedeemingInvite />}>
      <RedeemContent />
    </Suspense>
  );
}

function RedeemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"redeeming" | "error">("redeeming");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No token provided.");
      return;
    }

    async function redeem() {
      const res = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMessage((data as { error?: string }).error ?? "Failed to accept invite.");
        return;
      }

      const data = await res.json() as { role: string; ownerUserId: string; playerSquadId?: string | null };
      router.replace(data.role === "player" ? "/player" : "/coach");
    }

    void redeem();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-sm font-medium text-danger">Could not accept invite</p>
          <p className="mt-2 text-xs text-muted">{errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <RedeemingInvite />
  );
}

function RedeemingInvite() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-sm text-muted">Accepting your invite…</p>
      </div>
    </main>
  );
}
