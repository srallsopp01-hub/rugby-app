import type { EventItem, SetPieceType } from "../types";

export type SetPieceReviewSide = "Own" | "Opposition";

export type SetPieceReviewMoment = {
  id: number;
  timestamp: number;
  type: SetPieceType;
  typeLabel: "Lineout" | "Scrum";
  side: SetPieceReviewSide;
  result: string;
  notes: string;
  label: string;
};

export type SetPieceTypeFilter = "All" | "Scrum" | "Lineout";

export type SetPieceSideFilters = {
  own: boolean;
  opposition: boolean;
};

function formatType(type: SetPieceType): SetPieceReviewMoment["typeLabel"] {
  return type === "lineout" ? "Lineout" : "Scrum";
}

function formatSide(event: EventItem): SetPieceReviewSide {
  return event.setPieceSide === "Opposition" ? "Opposition" : "Own";
}

export function buildSetPieceReviewMoments(events: EventItem[]): SetPieceReviewMoment[] {
  return events
    .filter(
      (event) =>
        !event.isPending &&
        event.category === "set-piece" &&
        (event.setPieceType === "lineout" || event.setPieceType === "scrum")
    )
    .map((event) => {
      const type = event.setPieceType as SetPieceType;
      const typeLabel = formatType(type);
      const side = formatSide(event);
      const result =
        type === "lineout"
          ? event.lineoutResult ?? "Logged"
          : event.scrumResult ?? "Logged";
      const notes = event.notes?.trim() ?? "";

      return {
        id: event.id,
        timestamp: event.timestamp,
        type,
        typeLabel,
        side,
        result,
        notes,
        label: `${side} ${typeLabel} - ${result}`,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function filterSetPieceReviewMoments(
  moments: SetPieceReviewMoment[],
  typeFilter: SetPieceTypeFilter,
  sideFilters: SetPieceSideFilters
) {
  return moments.filter((moment) => {
    const typeMatches = typeFilter === "All" || moment.typeLabel === typeFilter;
    const sideMatches =
      (moment.side === "Own" && sideFilters.own) ||
      (moment.side === "Opposition" && sideFilters.opposition);
    return typeMatches && sideMatches;
  });
}
