"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import ThemeSchemeToggle from "@/app/components/ThemeSchemeToggle";
import { PageHelp } from "@/app/components/PageHelp";
import { PageHeader } from "@/app/components/PageHeader";
import { StatusPill } from "@/app/components/StatusPill";
import type { ComponentProps } from "react";
import { COACH_PAGE_HELP } from "../help-content";
import {
  CORRECTION_MEMORY_KEY,
  ONBOARDING_COMPLETE_KEY,
  PLAYER_IDENTITY_KEY,
  STORAGE_KEY,
} from "@/app/rugby-tagging/constants";
import {
  getCurrentMatchId,
  CLOUD_SYNC_ERROR_EVENT,
} from "@/app/rugby-tagging/lib/savedMatches";
import { fetchCloudSavedMatches } from "@/lib/savedMatchesCloud";
import { checkCloudSchema, type CloudSchemaHealth } from "@/lib/cloudHealth";
import { clearTeamContextCache, getMyTeamContext } from "@/lib/teamContext";
import { useTeam } from "@/app/providers/TeamContext";
import { useMatches } from "@/app/providers/MatchesContext";
import {
  getCustomPresets,
  getHiddenBuiltinIds,
  restoreAllBuiltins,
  subscribePresetsChanged,
} from "@/app/coach/playbook/lib/presetStore";

const THEME_SCHEME_KEY = "fynlwhistle-theme-scheme";
const COACH_SIDEBAR_KEY = "coach-sidebar-collapsed";
const PLAYER_SIDEBAR_KEY = "player-sidebar-collapsed";
const HELP_DISMISSED_KEY = "rugby-tagging-help-dismissed";
const CLOUD_SYNC_LAST_AT_KEY = "rugby-cloud-sync-last-at";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

const KNOWN_LOCAL_STORAGE_KEYS = [
  STORAGE_KEY,
  CORRECTION_MEMORY_KEY,
  ONBOARDING_COMPLETE_KEY,
  PLAYER_IDENTITY_KEY,
  THEME_SCHEME_KEY,
  COACH_SIDEBAR_KEY,
  PLAYER_SIDEBAR_KEY,
  HELP_DISMISSED_KEY,
  CLOUD_SYNC_LAST_AT_KEY,
];

type StorageSnapshot = Record<string, string | null>;

const emptyStorageSnapshot = "{}";
const storageChangedEvent = "fynlwhistle-settings-storage-changed";

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
  return `fynlwhistle-local-data-${date}.json`;
}

export default function CoachSettingsPage() {
  const router = useRouter();
  const { team } = useTeam();
  const { matches } = useMatches();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(CLOUD_SYNC_LAST_AT_KEY) : null
  );
  const [schemaHealth, setSchemaHealth] = useState<CloudSchemaHealth | null>(null);
  const [cloudDiag, setCloudDiag] = useState<{
    userId: string;
    cloudMatchCount: number;
    localMatchCount: number;
    error?: string;
  } | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleChangePassword() {
    if (!userEmail) return;
    const appUrl = typeof window !== "undefined" ? window.location.origin : "";
    await createClient().auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });
    setPasswordResetSent(true);
  }

  async function handleSyncNow() {
    setSyncStatus("syncing");
    setSyncErrors([]);
    clearTeamContextCache();
    try {
      const now = new Date().toISOString();
      localStorage.setItem(CLOUD_SYNC_LAST_AT_KEY, now);
      setLastSyncedAt(now);
      setSyncedCount(matches.length);
      setSyncErrors([]);
      setSyncStatus("synced");
      emitStorageChanged();
    } catch (e) {
      setSyncErrors([String(e)]);
      setSyncStatus("error");
    }
  }

  const snapshotJson = useSyncExternalStore(
    subscribeToStorage,
    getKnownStorageSnapshotJson,
    () => emptyStorageSnapshot
  );

  const customPresetCount = useSyncExternalStore(subscribePresetsChanged, () => getCustomPresets().length, () => 0);
  const hiddenBuiltinCount = useSyncExternalStore(subscribePresetsChanged, () => getHiddenBuiltinIds().length, () => 0);

  const [statusMessage, setStatusMessage] = useState("Settings loaded");

  useEffect(() => {
    checkCloudSchema().then(setSchemaHealth);
  }, []);

  useEffect(() => {
    function onSyncError(e: Event) {
      const errors = (e as CustomEvent<string[]>).detail ?? [];
      if (errors.length > 0) {
        setSyncErrors((prev) => [...new Set([...prev, ...errors])]);
        setSyncStatus("error");
      }
    }
    window.addEventListener(CLOUD_SYNC_ERROR_EVENT, onSyncError);
    return () => window.removeEventListener(CLOUD_SYNC_ERROR_EVENT, onSyncError);
  }, []);

  async function handleSignOut() {
    clearTeamContextCache();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleCheckCloud() {
    setDiagLoading(true);
    setCloudDiag(null);
    clearTeamContextCache();
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const ctx = await getMyTeamContext();
      const { records, error } = await fetchCloudSavedMatches(ctx?.teamId ?? "");
      setCloudDiag({
        userId: user?.id ?? "not signed in",
        cloudMatchCount: records.length,
        localMatchCount: matches.length,
        error: error ?? (ctx ? undefined : "Could not resolve team context — check Supabase connection"),
      });
    } finally {
      setDiagLoading(false);
    }
  }

  const snapshot = useMemo(
    () => parseJson<StorageSnapshot>(snapshotJson, {}),
    [snapshotJson]
  );

  const currentSession = useMemo(
    () => parseJson<Record<string, unknown> | null>(snapshot[STORAGE_KEY], null),
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

  const savedMatchCount = matches.length;
  const squadPlayerCount = team?.players?.length ?? 0;
  const correctionCount = Object.keys(correctionMemory).length;
  const activeMatchId = getCurrentMatchId();
  const hasCurrentMatch = Boolean(snapshot[STORAGE_KEY] || activeMatchId);
  const teamName = team?.teamName?.trim() || "No team profile";
  const onboardingComplete =
    snapshot[ONBOARDING_COMPLETE_KEY] === "1" ? "Complete" : "Not complete";
  const playerIdentity = snapshot[PLAYER_IDENTITY_KEY] || "No player selected";

  const exportRawJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "FYNL Whistle",
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
      "Factory reset FYNL Whistle data on this browser? This removes saved matches, current match data, team setup, onboarding state, corrections, display preference, and sidebar preferences. This cannot be undone."
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
        <PageHeader
          title="Coach Settings"
          subtitle="Manage local FYNL Whistle data, cloud-backed coach account storage, display preference, and beta setup shortcuts."
          helpButton={<PageHelp {...COACH_PAGE_HELP["/coach/settings"]} />}
          status={
            <span className="rounded-xl border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
              {statusMessage}
            </span>
          }
        />

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

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
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

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
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
              FYNL Whistle keeps this browser fast with local data, then syncs
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
                label="Saved matches (cloud)"
                value={`${savedMatchCount} match${savedMatchCount === 1 ? "" : "es"}`}
                detail="Stored in Supabase — no local copy"
              />
            </div>
          </div>
        </section>

        {schemaHealth && !schemaHealth.ok && (
          <section className="rounded-2xl border border-warning/40 bg-warning/5 p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-warning" aria-hidden>⚠</span>
              <div>
                <h2 className="text-sm font-semibold text-warning">
                  Cloud database not fully set up
                </h2>
                {schemaHealth.missingTables.length > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    Missing tables:{" "}
                    <span className="font-mono text-warning">
                      {schemaHealth.missingTables.join(", ")}
                    </span>
                  </p>
                )}
                {schemaHealth.missingColumns.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    Missing columns:{" "}
                    <span className="font-mono text-warning">
                      {schemaHealth.missingColumns.join(", ")}
                    </span>
                  </p>
                )}
                {!schemaHealth.videoStorageConfigured && (
                  <p className="mt-1 text-xs text-muted">
                    Cloudflare R2 video storage is not configured
                    {schemaHealth.missingVideoStorageEnv.length > 0 ? (
                      <>
                        :{" "}
                        <span className="font-mono text-warning">
                          {schemaHealth.missingVideoStorageEnv.join(", ")}
                        </span>
                      </>
                    ) : null}
                    . Video uploads will fail until this is set in Vercel.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
                Cloud
              </div>
              <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
                Cloud sync
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Pushes saved matches and squad profile to your coach account.
                Runs automatically on login — use this to force a sync now.
              </p>
              {lastSyncedAt && (
                <p className="mt-1 text-xs text-muted">
                  Last synced:{" "}
                  {new Date(lastSyncedAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {syncedCount !== null && ` — ${syncedCount} match${syncedCount === 1 ? "" : "es"}`}
                </p>
              )}
              {syncErrors.length > 0 && (
                <p className="mt-2 max-w-md truncate text-xs text-danger" title={syncErrors[0]}>
                  {syncErrors[0]}
                  {syncErrors.length > 1 && ` (+${syncErrors.length - 1} more)`}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <SyncStatusPill status={syncStatus} />
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncStatus === "syncing"}
                className="rounded-xl border border-border bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncStatus === "syncing" ? "Syncing…" : "Sync Now"}
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">
                Check what this account currently sees in the cloud database.
              </p>
              <button
                type="button"
                onClick={handleCheckCloud}
                disabled={diagLoading}
                className="rounded-lg border border-border bg-panel-2 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-border-light hover:bg-panel-3 disabled:opacity-50"
              >
                {diagLoading ? "Checking…" : "Check cloud"}
              </button>
            </div>
            {cloudDiag && (
              <div className="mt-3 rounded-xl border border-border bg-panel-2 p-4 font-mono text-xs leading-6 text-muted">
                <div>User ID: <span className="text-foreground">{cloudDiag.userId}</span></div>
                <div>Local matches: <span className="text-foreground">{cloudDiag.localMatchCount}</span></div>
                <div>Cloud matches: <span className={cloudDiag.cloudMatchCount > 0 ? "text-success" : "text-warning"}>{cloudDiag.cloudMatchCount}</span></div>
                {cloudDiag.error && (
                  <div className="mt-1 text-danger">Error: {cloudDiag.error}</div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr]">
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
                  Download a readable snapshot of the known FYNL Whistle
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

            <div className="mt-4 rounded-xl border border-border bg-panel-2 p-4 text-xs leading-5 text-muted">
              The export is for inspection and backup only. Import/restore is
              not part of Settings v1.
            </div>
          </div>

          {/* ── Playbook Presets ── */}
          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
              Playbook
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
              Formation Presets
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Manage your custom formation presets and restore any built-in presets you have hidden.
            </p>

            <div className="mt-4 flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-2">Custom presets</p>
                <p className="text-2xl font-bold text-foreground-strong">{customPresetCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-2">Hidden built-in presets</p>
                <p className="text-2xl font-bold text-foreground-strong">{hiddenBuiltinCount}</p>
              </div>
            </div>

            {hiddenBuiltinCount > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => restoreAllBuiltins()}
                  className="rounded-lg border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-panel-3 transition-all"
                >
                  Restore {hiddenBuiltinCount} default preset{hiddenBuiltinCount !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-danger">
              Danger zone
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground-strong">
              Data management
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              These actions only touch known FYNL Whistle browser data on this
              device. Cloud copies may sync back after login unless deleted
              from their source screen.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
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
                description="Remove all known FYNL Whistle local data on this browser."
                onClick={factoryReset}
                danger
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">
            Account
          </div>
          {userEmail && (
            <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-border bg-panel-2 px-4 py-3">
              <p className="truncate text-sm text-foreground">{userEmail}</p>
              <div className="shrink-0">
                {passwordResetSent ? (
                  <span className="text-xs text-success">Check your email</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-border-light hover:text-foreground"
                  >
                    Change password
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground-strong">
                Sign out
              </h2>
              <p className="mt-1 text-sm text-muted">
                Sign out of FYNL Whistle on this device.
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

type StatusPillVariant = ComponentProps<typeof StatusPill>["variant"];

const SYNC_VARIANTS: Record<SyncStatus, StatusPillVariant> = {
  idle: "neutral",
  syncing: "warning",
  synced: "success",
  error: "danger",
};

const SYNC_LABELS: Record<SyncStatus, string> = {
  idle: "",
  syncing: "Syncing…",
  synced: "Synced",
  error: "Sync failed",
};

function SyncStatusPill({ status }: { status: SyncStatus }) {
  if (status === "idle") return null;

  return (
    <StatusPill variant={SYNC_VARIANTS[status]} size="md">
      {SYNC_LABELS[status]}
    </StatusPill>
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
