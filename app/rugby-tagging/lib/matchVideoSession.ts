// Migrated to app/providers/MatchVideoSessionContext.tsx — use useMatchVideoSession() hook instead.
// These stubs exist only to surface missed callsites at build time.

export function setMatchVideoFile(_file: File): string {
  throw new Error("setMatchVideoFile is removed — use useMatchVideoSession().setVideoFile()");
}

export function getMatchVideoUrl(): string {
  throw new Error("getMatchVideoUrl is removed — use useMatchVideoSession().videoUrl");
}

export function clearMatchVideoSession(): void {
  throw new Error("clearMatchVideoSession is removed — use useMatchVideoSession().clearSession()");
}
