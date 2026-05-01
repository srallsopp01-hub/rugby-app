"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SquadPlayerPublic } from "./page";

type Props = {
  token: string;
  role: string;
  squadPlayers: SquadPlayerPublic[];
  preFilledSquadPlayerId: string | null;
};

type View = "pick" | "notify" | "notified" | "joined";

export default function JoinForm({ token, role, squadPlayers, preFilledSquadPlayerId }: Props) {
  const router = useRouter();
  const isPlayer = role === "player";

  const [view, setView] = useState<View>("pick");
  const [selectedPlayerId, setSelectedPlayerId] = useState(preFilledSquadPlayerId ?? "");
  const [requestedName, setRequestedName] = useState("");
  const [requestedPosition, setRequestedPosition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Joined confirmation ─────────────────────────────────────────────────────

  if (view === "joined") {
    return (
      <div className="mt-6 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-border bg-panel-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M8 12L11 15L16 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-lg font-black uppercase text-foreground-strong">You&apos;re in!</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Redirecting you now…</p>
      </div>
    );
  }

  // ── Coach notified ──────────────────────────────────────────────────────────

  if (view === "notified") {
    return (
      <div className="mt-6 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-border bg-panel-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M8 12L11 15L16 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-lg font-black uppercase text-foreground-strong">
          We&apos;ve let your coach know
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your coach will add you to the squad and share a personal link with you.
        </p>
      </div>
    );
  }

  // ── Notify coach view ───────────────────────────────────────────────────────

  if (view === "notify") {
    async function handleNotify(e: React.FormEvent) {
      e.preventDefault();
      if (!requestedName.trim()) return;
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch("/api/invite/notify-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            requestedName: requestedName.trim(),
            requestedPosition: requestedPosition.trim() || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Something went wrong. Please try again.");
          setSubmitting(false);
          return;
        }
        setView("notified");
      } catch {
        setError("Something went wrong. Please try again.");
        setSubmitting(false);
      }
    }

    return (
      <form onSubmit={handleNotify} className="mt-6 space-y-4">
        <div>
          <button
            type="button"
            onClick={() => { setView("pick"); setError(null); }}
            className="mb-4 flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <p className="mb-4 text-sm text-muted">
            Let your coach know and they&apos;ll add you to the squad.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
            Your name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={requestedName}
            onChange={(e) => setRequestedName(e.target.value)}
            placeholder="e.g. Jamie Smith"
            className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
            Position <span className="text-muted-2 font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={requestedPosition}
            onChange={(e) => setRequestedPosition(e.target.value)}
            placeholder="e.g. Flanker"
            className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !requestedName.trim()}
          className="w-full rounded-xl bg-foreground-strong px-4 py-3 text-sm font-black uppercase text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Notify coach"}
        </button>
      </form>
    );
  }

  // ── Pick squad slot (or coach confirm) ─────────────────────────────────────

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isPlayer && !selectedPlayerId) {
      setError("Select your slot from the squad list.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/invite/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, squadPlayerId: isPlayer ? selectedPlayerId : undefined }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        role?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to join. Please try again.");
        setSubmitting(false);
        return;
      }

      setView("joined");
      const destination = data.role === "assistant_coach" ? "/coach" : "/player";
      setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 800);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const hasUnclaimed = squadPlayers.some((p) => !p.claimed);

  return (
    <form onSubmit={handleJoin} className="mt-6 space-y-4">
      {isPlayer && squadPlayers.length > 0 && (
        <div className="space-y-2">
          <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
            Select yourself
          </label>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
            {squadPlayers.map((player) => {
              const isSelected = selectedPlayerId === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  disabled={player.claimed}
                  onClick={() => {
                    if (!player.claimed) setSelectedPlayerId(player.id);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    player.claimed
                      ? "cursor-not-allowed border-border bg-panel opacity-40"
                      : isSelected
                      ? "border-foreground-strong bg-foreground-strong/10"
                      : "border-border bg-panel-2 hover:border-border-light"
                  }`}
                >
                  <span className="font-semibold text-foreground-strong">{player.fullName}</span>
                  {player.primaryPosition && (
                    <span className="ml-2 text-xs text-muted">{player.primaryPosition}</span>
                  )}
                  {player.claimed && (
                    <span className="ml-2 text-xs text-muted-2">Linked</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || (isPlayer && !selectedPlayerId)}
        className="w-full rounded-xl bg-foreground-strong px-4 py-3 text-sm font-black uppercase text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Joining…" : "Join team"}
      </button>

      {isPlayer && hasUnclaimed && (
        <button
          type="button"
          onClick={() => { setView("notify"); setError(null); }}
          className="w-full text-center text-xs text-muted hover:text-foreground"
        >
          Don&apos;t see yourself on the squad?
        </button>
      )}

      {isPlayer && !hasUnclaimed && squadPlayers.length > 0 && (
        <button
          type="button"
          onClick={() => { setView("notify"); setError(null); }}
          className="w-full text-center text-xs text-muted hover:text-foreground"
        >
          All slots are taken — let your coach know you&apos;re here
        </button>
      )}
    </form>
  );
}
