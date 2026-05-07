import type { SavedMatchRecord } from "@/app/rugby-tagging/lib/savedMatches";
import type { SquadPlayer } from "@/app/rugby-tagging/lib/team";

function playerNameSet(player: SquadPlayer): Set<string> {
  return new Set([
    player.fullName.toLowerCase().trim(),
    player.preferredName.toLowerCase().trim(),
    ...player.nicknames.map((n) => n.toLowerCase().trim()),
  ]);
}

function matchHasPlayer(match: SavedMatchRecord, player: SquadPlayer, names: Set<string>) {
  return match.rosterRows.some(
    (r) => (r.playerId && r.playerId === player.id) || names.has(r.name.toLowerCase().trim())
  );
}

export function countUnseenClips(
  matches: SavedMatchRecord[],
  currentPlayer: SquadPlayer | null,
  lastSeenAt: string | null
): number {
  if (!currentPlayer) return 0;
  const names = playerNameSet(currentPlayer);
  const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : null;

  let count = 0;
  for (const match of matches) {
    if (!matchHasPlayer(match, currentPlayer, names)) continue;
    for (const clip of match.clips ?? []) {
      if (!clip.createdAt) {
        if (lastSeenMs === null) count++;
        continue;
      }
      const clipMs = new Date(clip.createdAt).getTime();
      if (Number.isNaN(clipMs)) continue;
      if (lastSeenMs === null || clipMs > lastSeenMs) count++;
    }
  }
  return count;
}
