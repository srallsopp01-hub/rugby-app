"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import ThemeSchemeToggle from "@/app/components/ThemeSchemeToggle";
import { PageHelp } from "@/app/components/PageHelp";
import { COACH_PAGE_HELP } from "../help-content";
import {
  CORRECTION_MEMORY_KEY,
  ONBOARDING_COMPLETE_KEY,
  PLAYER_IDENTITY_KEY,
  SQUAD_PROFILE_KEY,
  STORAGE_KEY,
} from "@/app/rugby-tagging/constants";
import {
  CURRENT_MATCH_ID_KEY,
  SAVED_MATCHES_KEY,
} from "@/app/rugby-tagging/lib/savedMatches";

const THEME_SCHEME_KEY = "rugbycoach-theme-scheme";
const COACH_SIDEBAR_KEY = "coach-sidebar-collapsed";
const PLAYER_SIDEBAR_KEY = "player-sidebar-collapsed";
const HELP_DISMISSED_KEY = "rugby-tagging-help-dismissed";

const KNOWN_LOCAL_STORAGE_KEYS = [
  STORAGE_KEY,
  SAVED_MATCHES_KEY,
  CURRENT_MATCH_ID_KEY,
  SQUAD_PROFILE_KEY,
  CORRECTION_MEMORY_KEY,
  ONBOARDING_COMPLETE_KEY,
  PLAYER_IDENTITY_KEY,
  THEME_SCHEME_KEY,
  COACH_SIDEBAR_KEY,
  PLAYER_SIDEBAR_KEY,
  HELP_DISMISSED_KEY,
];

type StorageSnapshot = Record<string, string | null>;

const emptyStorageSnapshot = "{}";
const storageChangedEvent = "rugbycoach-settings-storage-changed";

function getKnownStorageSnapshot(): StorageSnapshot {
  if (typeof window === "undefined") return {};

  return KNOWN_LOCAL_STORAGE_KEYS.reduce<StorageSnapshot>((snapshot, key) => {
    snapshot[key] = localStorage.getItem(key);
    return snapshot;
  }, {});
}

function getKnownStorageSnapshotJson(): string {
  if (typeof window === "undefined") return emptyStorageSnapshot;
  return JSON.stringify(getKnownStorageSnapshot());
}

function subscribeToStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(storageChangedEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(storageChangedEvent, callback);
  };
}

function emitStorageChanged() {
  window.dispatchEvent(new Event(storageChangedEvent));
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatBytes(value: string | null) {
  if (!value) return "0 B";
  const bytes = new Blob([value]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function buildDownloadFilename() {
  const date = new Date().toISOString().slice(0, 10);
  return `rugbycoach-local-data-${date}.json`;
}

export default function CoachSettingsPage() {
  const router = useRouter();
  const snapshotJson = useSyncExternalStore(
    subscribeToStorage,
    getKnownStorageSnapshotJson,
    () => emptyStorageSnapshot
  );
  const [statusMessage, setStatusMessage] = useState("Settings loaded");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const snapshot = useMemo(
    () => parseJson<StorageSnapshot>(snapshotJson, {}),
    [snapshotJson]
  );

  const savedMatches = useMemo(
    () => parseJson<unknown[]>(snapshot[SAVED_MATCHES_KEY], []),
    [snapshot]
  );
  const currentSession = useMemo(
    () => parseJson<Record<string, unknown> | null>(snapshot[STORAGE_KEY], null),
    [snapshot]
  );
  const squadProfile = useMemo(
    () =>
      parseJson<{
        teamName?: string;
        coachName?: string;
        players?: unknown[];
        correctionMemory?: unknown[];
      } | null>(snapshot[SQUAD_PROFILE_KEY], null),
    [snapshot]
  );
  const correctionMemory = useMemo(
    () => parseJson<Record<string, unknown>>(snapshot[CORRECTION_MEMORY_KEY], {}),
    [snapshot]
  );

  const knownDataSize = KNOWN_LOCAL_STORAGE_KEYS.reduce((total, key) => {
    const value = snapshot[key];
    return total + (value ? new Blob([value]).size : 0);
  }, 0);

  const savedMatchCount = Array.isArray(savedMatches) ? savedMatches.length : 0;
  const squadPlayerCount = Array.isArray(squadProfile?.players)
    ? squadProfile.players.length
    : 0;
  const correctionCount = Object.keys(correctionMemory).length;
  const hasCurrentMatch = Boolean(snapshot[STORAGE_KEY] || snapshot[CURRENT_MATCH_ID_KEY]);
  const activeMatchId = snapshot[CURRENT_MATCH_ID_KEY] || "";
  const teamName = squadProfile?.teamName?.trim() || "No team profile";
  const onboardingComplete =
    snapshot[ONBOARDING_COMPLETE_KEY] === "1" ? "Complete" : "Not complete";
  const playerIdentity = snapshot[PLAYER_IDENTITY_KEY] || "No player selected";

  const exportRawJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "RugbyCoach",
      scope: "known-local-storage-keys",
      keys: KNOWN_LOCAL_STORAGE_KEYS,
      localStorage: getKnownStorageSnapshot(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildDownloadFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatusMessage("Raw JSON export downloaded");
    emitStorageChanged();
  };

  const clearCurrentMatch = () => {
    const confirmed = window.confirm(
      "Clear the current match session on this browser? Saved matches will stay intact."
    );
    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CURRENT_MATCH_ID_KEY);
    emitStorageChanged();
    setStatusMessage("Current match session cleared");
  };

  const resetCorrectionMemory = () => {
    const confirmed = window.confirm(
      "Reset learned voice correction memory on this browser?"
    );
    if (!confirmed) return;

    localStorage.removeItem(CORRECTION_MEMORY_KEY);
    emitStorageChanged();
    setStatusMessage("Correction memory reset");
  };

  const clearPlayerIdentity = () => {
    const confirmed = window.confirm(
      "Clear the selected player identity for the player platform?"
    );
    if (!confirmed) return;

    localStorage.removeItem(PLAYER_IDENTITY_KEY);
    emitStorageChanged();
    setStatusMessage("Player identity cleared");
  };

  const factoryReset = () => {
    const confirmed = window.confirm(
      "Factory reset RugbyCoach data on this browser? This removes saved matches, current match data, team setup, onboarding state, corrections, display preference, and sidebar preferences. This cannot be undone."
    );
    if (!confirmed) return;

    KNOWN_LOCAL_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
    emitStorageChanged();
    setStatusMessage("Factory reset complete");
  };

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground-strong md:text-3xl">
                  Coach Settings
                </h1>
                <PageHelp {...COACH_PAGE_HELP["/coach/settings"]} />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Manage local RugbyCoach data, cloud-backed coach account
                storage, display preference, and beta setup shortcuts.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              {statusMessage}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <StatusTile label="Saved matches" value={String(savedMatchCount)} />
          <StatusTile
            label="Current match"
            value={hasCurrentMatch ? "Present" : "Empty"}
            tone={hasCurrentMatch ? "success" : "muted"}
          />
          <StatusTile label="Team" value={teamName} detail={`${squadPlayerCount} players`} />
          <StatusTile
            label="Corrections"
            value={correctionCount > 0 ? String(correctionCount) : "None"}
          />
          <StatusTile label="Onboarding" value={onboardingComplete} />
          <StatusTile
            label="Known data"
            value={
              knownDataSize < 1024
                ? `${knownDataSize} B`
                : `${(knownDataSize / 1024).toFixed(1)} KB`
            }
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                  Setup
                </div>
                <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
                  Team and platform shortcuts
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Jump to the screens that shape the local beta experience.
                </p>
              </div>
              <ThemeSchemeToggle />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <SettingsLink
                href="/coach/team-setup"
                label="Team Setup"
                description="Edit squad profile, player names, positions, and voice samples."
              />
              <SettingsLink
                href="/coach/onboarding"
                label="Onboarding"
                description="Revisit the first-time setup flow for coach and team details."
              />
              <SettingsLink
                href="/coach/saved-matches"
                label="Saved Matches"
                description="Reopen, compare, export, or delete saved matches."
              />
              <SettingsLink
                href="/player"
                label="Player Platform"
                description="Open the player-facing local view and selected player picker."
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
              Browser storage
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
              Local data snapshot
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              RugbyCoach keeps this browser fast with local data, then syncs
              squad profile and saved match records to your coach account.
            </p>

            <div className="mt-5 space-y-3">
              <StorageRow
                label="Current match session"
                value={currentSession ? "Stored" : "Empty"}
                detail={activeMatchId ? `Active ID: ${activeMatchId}` : "No active saved-match ID"}
              />
              <StorageRow
                label="Squad profile"
                value={teamName}
                detail={`${squadPlayerCount} squad player${squadPlayerCount === 1 ? "" : "s"}`}
              />
              <StorageRow
                label="Player identity"
                value={playerIdentity}
                detail="Used by the player platform picker"
              />
              <StorageRow
                label="Saved matches JSON"
                value={formatBytes(snapshot[SAVED_MATCHES_KEY])}
                detail={`${savedMatchCount} saved match${savedMatchCount === 1 ? "" : "es"}`}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                  Export
                </div>
                <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
                  Raw JSON backup
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Download a readable snapshot of the known RugbyCoach
                  localStorage keys on this browser.
                </p>
              </div>
              <button
                type="button"
                onClick={exportRawJson}
                className="rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Download JSON
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-panel-2 p-4 text-xs leading-5 text-muted">
              The export is for inspection and backup only. Import/restore is
              not part of Settings v1.
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-danger">
              Danger zone
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
              Data management
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              These actions only touch known RugbyCoach browser data on this
              device. Cloud copies may sync back after login unless deleted
              from their source screen.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <ActionButton
                label="Clear Current Match"
                description="Remove active Capture session data and active match ID."
                onClick={clearCurrentMatch}
              />
              <ActionButton
                label="Reset Corrections"
                description="Remove learned voice correction memory."
                onClick={resetCorrectionMemory}
              />
              <ActionButton
                label="Clear Player Identity"
                description="Remove the selected player from the player platform."
                onClick={clearPlayerIdentity}
              />
              <ActionButton
                label="Factory Reset"
                description="Remove all known RugbyCoach local data on this browser."
                onClick={factoryReset}
                danger
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                Account
              </div>
              <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
                Sign out
              </h2>
              <p className="mt-1 text-sm text-muted">
                Sign out of RugbyCoach on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="shrink-0 rounded-lg border border-danger/40 bg-danger/10 px-5 py-2.5 text-sm font-bold uppercase text-danger transition hover:border-danger/60 hover:bg-danger/20"
            >
              Sign out
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusTile({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "success" | "muted";
}) {
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "muted"
        ? "text-muted"
        : "text-foreground-strong";

  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">
        {label}
      </div>
      <div className={`mt-2 truncate text-base font-semibold ${valueClass}`}>
        {value}
      </div>
      {detail && <div className="mt-1 truncate text-xs text-muted">{detail}</div>}
    </div>
  );
}

function SettingsLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-panel-2 p-4 transition hover:border-border-light hover:bg-panel-3"
    >
      <div className="text-sm font-semibold text-foreground-strong">{label}</div>
      <div className="mt-1 text-xs leading-5 text-muted">{description}</div>
    </Link>
  );
}

function StorageRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-panel-2 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-sm font-medium text-foreground-strong">{label}</div>
        <div className="mt-1 text-xs text-muted">{detail}</div>
      </div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ActionButton({
  label,
  description,
  onClick,
  danger = false,
}: {
  label: string;
  description: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        danger
          ? "border-danger/35 bg-danger/10 hover:border-danger/60"
          : "border-border bg-panel-2 hover:border-border-light hover:bg-panel-3"
      }`}
    >
      <div
        className={`text-sm font-semibold ${
          danger ? "text-danger" : "text-foreground-strong"
        }`}
      >
        {label}
      </div>
      <div className="mt-1 text-xs leading-5 text-muted">{description}</div>
    </button>
  );
}
