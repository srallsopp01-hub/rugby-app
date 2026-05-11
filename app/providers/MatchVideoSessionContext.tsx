"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type MatchVideoSession = {
  videoUrl: string | null;
  setVideoFile: (file: File) => string;
  clearSession: () => void;
};

const Ctx = createContext<MatchVideoSession | null>(null);

export function MatchVideoSessionProvider({ children }: { children: ReactNode }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const setVideoFile = (file: File): string => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return url;
  };

  const clearSession = () => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
  };

  return <Ctx.Provider value={{ videoUrl, setVideoFile, clearSession }}>{children}</Ctx.Provider>;
}

export function useMatchVideoSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMatchVideoSession must be used within MatchVideoSessionProvider");
  return ctx;
}
