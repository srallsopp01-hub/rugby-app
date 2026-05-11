"use client";

import { useEffect, useState } from "react";
import type { MatchQuota } from "@/app/api/matches/quota/route";

export function useTrialQuota() {
  const [quota, setQuota] = useState<MatchQuota | null>(null);

  useEffect(() => {
    fetch("/api/matches/quota")
      .then((r) => r.json())
      .then((data: MatchQuota) => setQuota(data))
      .catch(() => {});
  }, []);

  return quota;
}
