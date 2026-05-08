"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { POSITION_OPTIONS } from "@/app/rugby-tagging/constants";
import { markOnboardingComplete } from "@/app/rugby-tagging/lib/onboarding";
import {
  createDefaultSquadProfile,
  createPlayerId,
  saveSquadProfile,
  type SquadPlayer,
  type SquadProfile,
} from "@/app/rugby-tagging/lib/team";

type PlayerDraft = {
  fullName: string;
  jerseyNumber: string;
  primaryPosition: string;
};

const BLANK_DRAFT: PlayerDraft = { fullName: "", jerseyNumber: "", primaryPosition: "" };

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<SquadProfile>(
    () => createDefaultSquadProfile()
  );
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [draft, setDraft] = useState<PlayerDraft>(BLANK_DRAFT);

  const updateField = (
    field: "teamName" | "coachName" | "primaryColour" | "secondaryColour",
    value: string
  ) => {
    setProfile((p) => ({ ...p, [field]: value, updatedAt: new Date().toISOString() }));
  };

  const addPlayer = () => {
    if (!draft.fullName.trim()) return;
    const player: SquadPlayer = {
      id: createPlayerId(),
      fullName: draft.fullName.trim(),
      preferredName: "",
      nicknames: [],
      primaryPosition: draft.primaryPosition,
      secondaryPositions: [],
      jerseyNumber: draft.jerseyNumber ? Number(draft.jerseyNumber) : null,
      voiceSamples: [],
      status: "active",
    };
    setProfile((p) => ({
      ...p,
      players: [...p.players, player],
      updatedAt: new Date().toISOString(),
    }));
    setDraft(BLANK_DRAFT);
    setShowPlayerForm(false);
  };

  const removePlayer = (id: string) => {
    setProfile((p) => ({
      ...p,
      players: p.players.filter((pl) => pl.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  };

  const goNext = (nextStep: 2 | 3) => {
    saveSquadProfile(profile);
    setStep(nextStep);
  };

  const finish = () => {
    saveSquadProfile(profile);
    markOnboardingComplete();
    router.replace("/coach");
  };

  const skip = () => {
    markOnboardingComplete();
    router.replace("/coach");
  };

  const sortedPlayers = [...profile.players].sort(
    (a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
  );

  return (
    <div className="min-h-full bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex max-w-3xl justify-end">
        <button
          type="button"
          onClick={skip}
          className="text-xs text-muted hover:text-foreground transition-colors duration-150"
        >
          Skip for now
        </button>
      </div>

      <div className="mx-auto max-w-xl py-10">
        {/* Step dots */}
        <div className="flex items-center gap-2 mb-10">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                s === step ? "w-6 bg-foreground-strong" : "w-3 bg-border"
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Team Details ── */}
        {step === 1 && (
          <div>
            <div className="mb-7">
              <p className="text-xs text-muted mb-1.5">Step 1 of 3</p>
              <h1 className="text-2xl font-semibold text-foreground-strong">Set up your team</h1>
              <p className="mt-1.5 text-sm text-muted">
                Give your squad an identity. You can change these any time in Team Setup.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-muted">Team name</label>
                <input
                  value={profile.teamName}
                  onChange={(e) => updateField("teamName", e.target.value)}
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground focus:border-border-light focus:outline-none transition-colors duration-150"
                  placeholder="e.g. Easts Rugby"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && goNext(2)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Coach name</label>
                <input
                  value={profile.coachName}
                  onChange={(e) => updateField("coachName", e.target.value)}
                  className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground focus:border-border-light focus:outline-none transition-colors duration-150"
                  placeholder="e.g. Tom Smith"
                  onKeyDown={(e) => e.key === "Enter" && goNext(2)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-muted">Primary colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={profile.primaryColour || "#000000"}
                      onChange={(e) => updateField("primaryColour", e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-panel-2 p-1"
                    />
                    <input
                      value={profile.primaryColour}
                      onChange={(e) => updateField("primaryColour", e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-panel-2 px-3 py-2 font-mono text-xs text-foreground focus:border-border-light focus:outline-none transition-colors duration-150"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Secondary colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={profile.secondaryColour || "#ffffff"}
                      onChange={(e) => updateField("secondaryColour", e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-panel-2 p-1"
                    />
                    <input
                      value={profile.secondaryColour}
                      onChange={(e) => updateField("secondaryColour", e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-panel-2 px-3 py-2 font-mono text-xs text-foreground focus:border-border-light focus:outline-none transition-colors duration-150"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => goNext(2)}
                className="rounded-xl border border-border-light bg-panel-3 px-6 py-2.5 text-sm font-medium text-foreground-strong hover:bg-panel-2 transition-colors duration-150"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Add Players ── */}
        {step === 2 && (
          <div>
            <div className="mb-7">
              <p className="text-xs text-muted mb-1.5">Step 2 of 3</p>
              <h1 className="text-2xl font-semibold text-foreground-strong">Add your squad</h1>
              <p className="mt-1.5 text-sm text-muted">
                Add players now or skip — you can always add them later in Team Setup.
              </p>
            </div>

            {sortedPlayers.length > 0 && (
              <div className="mb-4 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-panel-2">
                    <tr>
                      <th className="p-3 text-left text-xs text-muted">No.</th>
                      <th className="p-3 text-left text-xs text-muted">Name</th>
                      <th className="p-3 text-left text-xs text-muted">Position</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-3 text-muted">{p.jerseyNumber ?? "—"}</td>
                        <td className="p-3 text-foreground">{p.fullName}</td>
                        <td className="p-3 text-muted">{p.primaryPosition || "—"}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => removePlayer(p.id)}
                            className="text-xs text-muted hover:text-foreground transition-colors duration-150"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {sortedPlayers.length === 0 && !showPlayerForm && (
              <div className="mb-4 rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted">No players added yet.</p>
              </div>
            )}

            {showPlayerForm ? (
              <div className="mb-4 rounded-xl border border-border bg-panel p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-muted">Full name *</label>
                    <input
                      value={draft.fullName}
                      onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                      className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground focus:border-border-light focus:outline-none transition-colors duration-150"
                      placeholder="e.g. James Williams"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Jersey number</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={draft.jerseyNumber}
                      onChange={(e) => setDraft({ ...draft, jerseyNumber: e.target.value })}
                      className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground focus:border-border-light focus:outline-none transition-colors duration-150"
                      placeholder="e.g. 6"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Position</label>
                    <select
                      value={draft.primaryPosition}
                      onChange={(e) => setDraft({ ...draft, primaryPosition: e.target.value })}
                      className="w-full rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-foreground focus:border-border-light focus:outline-none transition-colors duration-150"
                    >
                      <option value="">Select…</option>
                      {POSITION_OPTIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={addPlayer}
                    disabled={!draft.fullName.trim()}
                    className="rounded-xl border border-border-light bg-panel-3 px-4 py-2 text-sm font-medium text-foreground disabled:opacity-40 transition-colors duration-150"
                  >
                    Add to squad
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowPlayerForm(false); setDraft(BLANK_DRAFT); }}
                    className="text-sm text-muted hover:text-foreground transition-colors duration-150"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPlayerForm(true)}
                className="mb-4 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted hover:border-border-light hover:text-foreground transition-colors duration-150"
              >
                + Add player
              </button>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-muted hover:text-foreground transition-colors duration-150"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => goNext(3)}
                className="rounded-xl border border-border-light bg-panel-3 px-6 py-2.5 text-sm font-medium text-foreground-strong hover:bg-panel-2 transition-colors duration-150"
              >
                {sortedPlayers.length > 0 ? "Next →" : "Skip →"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Voice Recognition ── */}
        {step === 3 && (
          <div>
            <div className="mb-7">
              <p className="text-xs text-muted mb-1.5">Step 3 of 3</p>
              <h1 className="text-2xl font-semibold text-foreground-strong">Voice recognition</h1>
              <p className="mt-1.5 text-sm text-muted">
                FYNL Whistle uses AI to transcribe your voice tags during matches. It learns from every correction you make.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-panel p-5 space-y-4 mb-6">
              {[
                {
                  title: "Automatic transcription",
                  body: "Hold spacebar and call out player names and actions — Whisper AI transcribes them in real time.",
                },
                {
                  title: "Gets better with use",
                  body: "Every correction in the Needs Review queue trains the app to recognise your squad better over time.",
                },
                {
                  title: "Player names and nicknames",
                  body: "Add preferred names and nicknames in Team Setup so voice tags match the way you call players on the pitch.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="mt-0.5 text-success text-sm">✓</span>
                  <div>
                    <p className="text-sm font-medium text-foreground-strong">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-sm text-muted hover:text-foreground transition-colors duration-150"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={finish}
                className="rounded-xl border border-border-light bg-panel-3 px-6 py-2.5 text-sm font-medium text-foreground-strong hover:bg-panel-2 transition-colors duration-150"
              >
                Start coaching →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
