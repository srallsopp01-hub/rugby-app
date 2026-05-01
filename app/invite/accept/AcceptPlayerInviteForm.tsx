"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SquadPlayer = {
  id: string;
  fullName: string;
  preferredName?: string;
  primaryPosition?: string;
};

type Props = {
  token: string;
  invitedPlayerId: string | null;
  squadPlayers: SquadPlayer[];
};

export default function AcceptPlayerInviteForm({
  token,
  invitedPlayerId,
  squadPlayers,
}: Props) {
  const router = useRouter();
  const initialPlayerId = useMemo(() => {
    if (invitedPlayerId && squadPlayers.some((player) => player.id === invitedPlayerId)) {
      return invitedPlayerId;
    }
    return squadPlayers[0]?.id ?? "";
  }, [invitedPlayerId, squadPlayers]);

  const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId);
  const [notInList, setNotInList] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shouldCreateProfile = notInList || squadPlayers.length === 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!shouldCreateProfile && !selectedPlayerId) {
      setError("Choose your player profile, or create one if you are not listed.");
      return;
    }

    if (shouldCreateProfile && !displayName.trim()) {
      setError("Enter your name so we can create your player profile.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/invite/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        playerSquadId: shouldCreateProfile ? undefined : selectedPlayerId,
        displayName: shouldCreateProfile ? displayName.trim() : undefined,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not accept this invite. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/player");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {squadPlayers.length > 0 && (
        <div className="space-y-3">
          <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
            Choose your player profile
          </label>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {squadPlayers.map((player) => {
              const isInvitedPlayer = player.id === invitedPlayerId;
              const isSelected = selectedPlayerId === player.id && !notInList;
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlayerId(player.id);
                    setNotInList(false);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    isSelected
                      ? "border-foreground-strong bg-foreground-strong/10"
                      : "border-border bg-panel-2 hover:border-border-light"
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground-strong">
                      {player.preferredName || player.fullName}
                    </span>
                    {isInvitedPlayer && (
                      <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-success">
                        Invited
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {player.primaryPosition || "Position not set"}
                    {player.preferredName && player.preferredName !== player.fullName
                      ? ` · ${player.fullName}`
                      : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {squadPlayers.length > 0 && (
        <label className="flex items-center gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={notInList}
            onChange={(event) => {
              setNotInList(event.target.checked);
              if (event.target.checked) setSelectedPlayerId("");
              else setSelectedPlayerId(initialPlayerId);
            }}
            className="h-4 w-4 rounded accent-foreground"
          />
          I&apos;m not in this list
        </label>
      )}

      {shouldCreateProfile && (
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] font-bold uppercase text-muted-2">
            Your name
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="e.g. Jamie Smith"
            className="rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground-strong outline-none transition focus:border-border-light"
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-foreground-strong px-4 py-3 text-sm font-black uppercase text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Connecting..." : "Connect player account"}
      </button>
    </form>
  );
}
