"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTeamButton({ organisationId }: { organisationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId, name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create team");
      setOpen(false);
      setName("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-foreground-strong text-background text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        + New team
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        autoFocus
        required
        placeholder="Team name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-foreground-strong outline-none focus:border-border-light w-48"
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="px-4 py-2 rounded-xl bg-foreground-strong text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saving ? "Creating…" : "Create"}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setName(""); setError(null); }}
        className="px-3 py-2 rounded-xl text-sm text-muted hover:text-foreground transition-colors"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
