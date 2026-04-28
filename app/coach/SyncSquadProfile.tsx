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

      saveSquadProfile(merged);

      if (!cloud || merged.updatedAt !== cloud.updatedAt) {
        void upsertCloudSquadProfile(merged);
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
