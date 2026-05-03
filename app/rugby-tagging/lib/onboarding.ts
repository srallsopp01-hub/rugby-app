import { ONBOARDING_COMPLETE_KEY } from "../constants";
import { getSquadProfile, type SquadProfile } from "./team";

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "1";
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_COMPLETE_KEY, "1");
}

export function hasNamedSquadProfile(profile: SquadProfile | null): boolean {
  return Boolean(profile?.teamName.trim());
}

export function shouldStartCoachOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  if (hasCompletedOnboarding()) return false;
  return !hasNamedSquadProfile(getSquadProfile());
}
