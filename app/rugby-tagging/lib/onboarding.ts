import { ONBOARDING_COMPLETE_KEY } from "../constants";
import { getSquadProfile, type SquadProfile } from "./team";

// Scope the onboarding flag per team so each new team can trigger its own setup.
const ACTIVE_TEAM_ID_KEY = "fynlwhistle-active-team-id";
function scopedOnboardingKey(): string {
  try {
    const t = localStorage.getItem(ACTIVE_TEAM_ID_KEY) ?? "";
    return t ? `${ONBOARDING_COMPLETE_KEY}-${t}` : ONBOARDING_COMPLETE_KEY;
  } catch { return ONBOARDING_COMPLETE_KEY; }
}

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(scopedOnboardingKey()) === "1";
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(scopedOnboardingKey(), "1");
}

export function hasNamedSquadProfile(profile: SquadProfile | null): boolean {
  return Boolean(profile?.teamName.trim());
}

export function shouldStartCoachOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  if (hasCompletedOnboarding()) return false;
  return !hasNamedSquadProfile(getSquadProfile());
}
