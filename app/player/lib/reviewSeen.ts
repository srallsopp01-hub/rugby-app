const REVIEW_SEEN_KEY_PREFIX = "fynlwhistle-player-review-last-seen-";
export const REVIEW_SEEN_CHANGED_EVENT = "fynlwhistle-player-review-seen-changed";

function reviewSeenKey(playerId: string) {
  return `${REVIEW_SEEN_KEY_PREFIX}${playerId}`;
}

export function getLastSeenAt(playerId: string): string | null {
  if (typeof window === "undefined" || !playerId) return null;
  return localStorage.getItem(reviewSeenKey(playerId));
}

export function markReviewAsSeen(playerId: string) {
  if (typeof window === "undefined" || !playerId) return;
  localStorage.setItem(reviewSeenKey(playerId), new Date().toISOString());
  window.dispatchEvent(new Event(REVIEW_SEEN_CHANGED_EVENT));
}

export function subscribeReviewSeenChanged(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REVIEW_SEEN_CHANGED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(REVIEW_SEEN_CHANGED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
