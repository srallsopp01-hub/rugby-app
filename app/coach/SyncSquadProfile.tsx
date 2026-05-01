"use client";

import { useEffect } from "react";
import {
  getSquadProfile,
  saveSquadProfile,
} from "@/app/rugby-tagging/lib/squadProfile";
import {
  fetchCloudSquadProfile,
  mergeSquadProfiles,
  upsertCloudSquadProfile,
} from "@/lib/squadProfileCloud";

export function SyncSquadProfile() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const local = getSquadProfile();
      const { profile: cloud } = await fetchCloudSquadProfile();

      if (cancelled) return;

      const merged = mergeSquadProfiles(cloud, local);
      if (!merged) return;

      // Availability responses are player-owned — always use the cloud version
      // so coach saves never overwrite what players have submitted.
      const finalProfile = cloud
        ? { ...merged, availabilityResponses: cloud.availabilityResponses ?? [] }
        : merged;

      saveSquadProfile(finalProfile);

      if (!cloud || finalProfile.updatedAt !== cloud.updatedAt) {
        void upsertCloudSquadProfile(finalProfile);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
