/**
 * Multi-match comparison workbook export.
 *
 * Takes multiple saved matches and produces a 3-sheet .xlsx:
 *   1. Grading Reference
 *   2. Team Comparison  (rounds as columns, KPIs as rows, Δ column)
 *   3. Player Progression  (player × round grid with populated Δ columns)
 *
 * Reuses the shared helpers from helpers.ts so the numbers line up
 * exactly with the Team Analytics page and the single-match export.
 */

import ExcelJS from "exceljs";
import type { SavedMatchRecord } from "../savedMatches";
import {
  buildReportRowsFromMatch,
  buildSetPieceSummary,
  buildTeamEventSummary,
  buildTeamTotals,
  teamTacklePctFromTotals,
} from "../../helpers";
import type { ReportRow } from "../../types";

// ── Colour palette (matches single-match export) ───────────────────────────
const C_DOMINANT    = "FFC6EFCE";
const C_COMPETITIVE = "FFE2F0D9";
const C_BELOW       = "FFFFF2CC";
const C_POOR        = "FFF4CCCC";

const C_UP   = "FFC6EFCE"; // positive delta
const C_DOWN = "FFF4CCCC"; // negative delta
const C_FLAT = "FFF2F2F2"; // no change

const C_SECTION_BG = "FF1F4E78";
const C_SUBHDR_BG  = "FFD9E1F2";
const C_ALT_ROW    = "FFF2F2F2";

const FONT_NAME = "Arial";

// ── Small style helpers ────────────────────────────────────────────────────
function applyBorders(cell: ExcelJS.Cell) {
  cell.border = {
    top:    { style: "thin", color: { argb: "FFBFBFBF" } },
    left:   { style: "thin", color: { argb: "FFBFBFBF" } },
    right:  { style: "thin", color: { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  };
}

function applyFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function sectionHeader(
  ws: ExcelJS.Worksheet,
  row: number,
  startCol: number,
  endCol: number,
  text: string
) {
  ws.mergeCells(row, startCol, row, endCol);
  const cell = ws.getCell(row, startCol);
  cell.value = text;
  cell.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  applyFill(cell, C_SECTION_BG);
  cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
}

function colHeader(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { name: FONT_NAME, size: 10, bold: true };
  applyFill(cell, C_SUBHDR_BG);
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyBorders(cell);
}

// Pick a readable label for a round column.
// Prefers matchTitle, falls back to "vs Opponent", then "Round N".
function roundLabel(match: SavedMatchRecord, index: number): string {
  if (match.matchTitle?.trim()) return match.matchTitle.trim();
  if (match.opponent?.trim()) return `vs ${match.opponent.trim()}`;
  return `Round ${index + 1}`;
}

// Sort matches by match date (oldest first), with a safe fallback
// to updatedAt for matches that have no matchDate set.
function sortByMatchDate(matches: SavedMatchRecord[]): SavedMatchRecord[] {
  return [...matches].sort((a, b) => {
    const aKey = (a.matchDate || a.updatedAt || a.createdAt || "").trim();
    const bKey = (b.matchDate || b.updatedAt || b.createdAt || "").trim();
    return aKey.localeCompare(bKey);
  });
}

// Formats a Δ value with an arrow and colour fill.
function applyDeltaStyle(cell: ExcelJS.Cell, delta: number, numFmt: string) {
  cell.numFmt = numFmt;
  cell.font = { name: FONT_NAME, size: 10, bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  applyBorders(cell);
  if (delta > 0.0001) applyFill(cell, C_UP);
  else if (delta < -0.0001) applyFill(cell, C_DOWN);
  else applyFill(cell, C_FLAT);
}

// ── Per-match computed snapshot ────────────────────────────────────────────
type MatchSnapshot = {
  label: string;
  matchDate: string;
  reportRows: ReportRow[];
  tacklePct: number;
  totalTackles: number;
  totalMissed: number;
  totalCarries: number;
  totalTurnovers: number;
  scrumPct: number;
  lineoutPct: number;
  triesScored: number;
  triesConceded: number;
  penaltiesConceded: number;
};

function snapshotForMatch(match: SavedMatchRecord, index: number): MatchSnapshot {
  const rows = buildReportRowsFromMatch(match.rosterRows, match.events);
  const totals = buildTeamTotals(rows);
  const setPiece = buildSetPieceSummary(match.events);
  const teamEvents = buildTeamEventSummary(match.events);

  return {
    label: roundLabel(match, index),
    matchDate: match.matchDate || "",
    reportRows: rows,
    tacklePct: teamTacklePctFromTotals(totals),
    totalTackles: totals.tackles,
    totalMissed: totals.missed,
    totalCarries: totals.carries,
    totalTurnovers: totals.turnovers,
    scrumPct: setPiece.ownScrumSuccessPct,
    lineoutPct: setPiece.ownLineoutSuccessPct,
    triesScored: teamEvents.triesScored,
    triesConceded: teamEvents.triesConceded,
    penaltiesConceded: teamEvents.penaltiesConceded,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────────────────────────────────

export async function generateMultiMatchWorkbook(
  matches: SavedMatchRecord[]
): Promise<Blob> {
  if (matches.length < 2) {
    throw new Error("Multi-match export requires at least 2 matches.");
  }

  const sorted = sortByMatchDate(matches);
  const snapshots = sorted.map((m, i) => snapshotForMatch(m, i));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Rugby Analysis App";
  wb.created = new Date();

  buildGradingReferenceSheet(wb);
  buildTeamComparisonSheet(wb, snapshots);
  buildPlayerProgressionSheet(wb, snapshots);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ── Sheet 1: Grading Reference ─────────────────────────────────────────────

function buildGradingReferenceSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Grading Reference", {
    views: [{ showGridLines: false }],
  });

  ws.getCell("A1").value = "GRADING REFERENCE";
  ws.getCell("A1").font = { name: FONT_NAME, size: 16, bold: true, color: { argb: "FF1F4E78" } };
  ws.mergeCells("A1:F1");

  ws.getCell("A2").value =
    "Bands applied to all rounds in this workbook. Use Tackle Count for raw output and Tackles/Min for work rate.";
  ws.getCell("A2").font = { name: FONT_NAME, size: 10, italic: true, color: { argb: "FF595959" } };
  ws.mergeCells("A2:F2");

  sectionHeader(ws, 4, 1, 6, "METRIC GRADING BANDS");
  ["Metric", "Dominant", "Competitive", "Below", "Poor", "What it means"].forEach(
    (h, i) => colHeader(ws.getCell(5, i + 1), h)
  );

  const metricRows: string[][] = [
    ["Tackle %",                "90%+",  "80–89%",    "70–79%",    "<70%",  "Tackle accuracy and reliability."],
    ["Tackles per minute",      "0.20+", "0.15–0.20", "0.10–0.15", "<0.10", "Defensive work rate."],
    ["Carries per minute",      "0.18+", "0.12–0.18", "0.08–0.12", "<0.08", "Attacking work rate."],
    ["Involvements per minute", "0.30+", "0.22–0.30", "0.15–0.22", "<0.15", "Overall work rate."],
    ["Turnovers won",           "2+",    "1",         "0",         "0",     "Breakdown impact."],
  ];

  metricRows.forEach((row, rIdx) => {
    const r = 6 + rIdx;
    row.forEach((val, cIdx) => {
      const cell = ws.getCell(r, cIdx + 1);
      cell.value = val;
      cell.font = { name: FONT_NAME, size: 10 };
      cell.alignment = { vertical: "middle", wrapText: true };
      applyBorders(cell);
    });
    applyFill(ws.getCell(r, 2), C_DOMINANT);
    applyFill(ws.getCell(r, 3), C_COMPETITIVE);
    applyFill(ws.getCell(r, 4), C_BELOW);
    applyFill(ws.getCell(r, 5), C_POOR);
  });

  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 52;
}

// ── Sheet 2: Team Comparison ───────────────────────────────────────────────

function buildTeamComparisonSheet(
  wb: ExcelJS.Workbook,
  snapshots: MatchSnapshot[]
) {
  const ws = wb.addWorksheet("Team Comparison", {
    views: [{ showGridLines: false }],
  });

  const totalCols = 1 + snapshots.length + 1; // Metric + N rounds + Δ(first→last)

  ws.getCell("A1").value = "TEAM COMPARISON ACROSS ROUNDS";
  ws.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: "FF1F4E78" } };
  ws.getRow(1).height = 28;
  ws.mergeCells(1, 1, 1, totalCols);

  const firstLabel = snapshots[0].label;
  const lastLabel = snapshots[snapshots.length - 1].label;
  ws.getCell("A2").value =
    `Comparing ${snapshots.length} rounds. Δ column = change from ${firstLabel} to ${lastLabel}. ` +
    `Green = improvement, red = decline, grey = no change.`;
  ws.getCell("A2").font = { name: FONT_NAME, size: 10, italic: true, color: { argb: "FF595959" } };
  ws.mergeCells(2, 1, 2, totalCols);

  // Header row
  sectionHeader(ws, 4, 1, totalCols, "TEAM KPI COMPARISON");
  colHeader(ws.getCell(5, 1), "Metric");
  snapshots.forEach((snap, i) => {
    const cell = ws.getCell(5, 2 + i);
    colHeader(cell, snap.matchDate ? `${snap.label}\n${snap.matchDate}` : snap.label);
  });
  colHeader(ws.getCell(5, totalCols), `Δ ${firstLabel} → ${lastLabel}`);
  ws.getRow(5).height = 40;

  // KPI rows
  type KpiRow = {
    label: string;
    values: number[];         // one per round, in order
    numFmt: string;
    deltaNumFmt: string;
    higherIsBetter: boolean;  // controls delta colour direction
    isPct: boolean;           // if true, values are percentages (0–100)
  };

  const kpiRows: KpiRow[] = [
    { label: "Tackle %",            values: snapshots.map((s) => s.tacklePct / 100), numFmt: "0.0%", deltaNumFmt: "+0.0%;-0.0%;-", higherIsBetter: true,  isPct: true },
    { label: "Total tackles",       values: snapshots.map((s) => s.totalTackles),    numFmt: "0",    deltaNumFmt: "+0;-0;-",        higherIsBetter: true,  isPct: false },
    { label: "Missed tackles",      values: snapshots.map((s) => s.totalMissed),     numFmt: "0",    deltaNumFmt: "+0;-0;-",        higherIsBetter: false, isPct: false },
    { label: "Total carries",       values: snapshots.map((s) => s.totalCarries),    numFmt: "0",    deltaNumFmt: "+0;-0;-",        higherIsBetter: true,  isPct: false },
    { label: "Turnovers won",       values: snapshots.map((s) => s.totalTurnovers),  numFmt: "0",    deltaNumFmt: "+0;-0;-",        higherIsBetter: true,  isPct: false },
    { label: "Scrum success %",     values: snapshots.map((s) => s.scrumPct / 100),  numFmt: "0.0%", deltaNumFmt: "+0.0%;-0.0%;-", higherIsBetter: true,  isPct: true },
    { label: "Lineout success %",   values: snapshots.map((s) => s.lineoutPct / 100),numFmt: "0.0%", deltaNumFmt: "+0.0%;-0.0%;-", higherIsBetter: true,  isPct: true },
    { label: "Tries scored",        values: snapshots.map((s) => s.triesScored),     numFmt: "0",    deltaNumFmt: "+0;-0;-",        higherIsBetter: true,  isPct: false },
    { label: "Tries conceded",      values: snapshots.map((s) => s.triesConceded),   numFmt: "0",    deltaNumFmt: "+0;-0;-",        higherIsBetter: false, isPct: false },
    { label: "Penalties conceded", values: snapshots.map((s) => s.penaltiesConceded),numFmt: "0",    deltaNumFmt: "+0;-0;-",        higherIsBetter: false, isPct: false },
  ];

  kpiRows.forEach((kpi, rIdx) => {
    const r = 6 + rIdx;

    // Metric label
    const labelCell = ws.getCell(r, 1);
    labelCell.value = kpi.label;
    labelCell.font = { name: FONT_NAME, size: 10, bold: true };
    labelCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    applyBorders(labelCell);
    if (rIdx % 2 === 1) applyFill(labelCell, C_ALT_ROW);

    // Per-round values
    kpi.values.forEach((val, vIdx) => {
      const cell = ws.getCell(r, 2 + vIdx);
      cell.value = val;
      cell.numFmt = kpi.numFmt;
      cell.font = { name: FONT_NAME, size: 10 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      applyBorders(cell);
      if (rIdx % 2 === 1) applyFill(cell, C_ALT_ROW);
    });

    // Delta from first round to last round
    const firstVal = kpi.values[0];
    const lastVal = kpi.values[kpi.values.length - 1];
    const rawDelta = lastVal - firstVal;
    const deltaCell = ws.getCell(r, totalCols);
    deltaCell.value = rawDelta;

    // For colouring: flip the sign if lower is better, so the colour helper
    // treats "improvement" as positive regardless of metric direction.
    const colourDelta = kpi.higherIsBetter ? rawDelta : -rawDelta;
    applyDeltaStyle(deltaCell, colourDelta, kpi.deltaNumFmt);
  });

  // Column widths
  ws.getColumn(1).width = 24;
  for (let i = 0; i < snapshots.length; i++) {
    ws.getColumn(2 + i).width = 18;
  }
  ws.getColumn(totalCols).width = 22;

  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 5, showGridLines: false }];
}

// ── Sheet 3: Player Progression ────────────────────────────────────────────

function buildPlayerProgressionSheet(
  wb: ExcelJS.Workbook,
  snapshots: MatchSnapshot[]
) {
  const ws = wb.addWorksheet("Player Progression", {
    views: [{ showGridLines: false }],
  });

  ws.getCell("A1").value = "PLAYER PROGRESSION ACROSS ROUNDS";
  ws.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: "FF1F4E78" } };
  ws.getRow(1).height = 28;
  ws.mergeCells("A1:H1");

  ws.getCell("A2").value =
    "Each row is one player in one round. Δ columns compare to that player's previous round. Green = up, red = down.";
  ws.getCell("A2").font = { name: FONT_NAME, size: 10, italic: true, color: { argb: "FF595959" } };
  ws.mergeCells("A2:H2");

  sectionHeader(ws, 4, 1, 8, "PROGRESSION TABLE");

  const headers = [
    "Player", "Round", "Minutes",
    "Tackles", "Tackles Δ",
    "Carries", "Carries Δ",
    "Inv/Min",
  ];
  headers.forEach((h, i) => colHeader(ws.getCell(5, i + 1), h));
  ws.getRow(5).height = 30;

  // Build a unique, sorted list of player names seen in any round
  const playerSet = new Set<string>();
  snapshots.forEach((snap) => {
    snap.reportRows.forEach((row) => playerSet.add(row.name));
  });
  const players = Array.from(playerSet).sort();

  let r = 6;
  players.forEach((playerName, playerIdx) => {
    // One row per round the player appears in
    let previousRow: ReportRow | null = null;

    snapshots.forEach((snap) => {
      const row = snap.reportRows.find((pr) => pr.name === playerName);
      if (!row) return;

      const tacklesDelta = previousRow ? row.tackles - previousRow.tackles : null;
      const carriesDelta = previousRow ? row.carries - previousRow.carries : null;

      ws.getCell(r, 1).value = playerName;
      ws.getCell(r, 2).value = snap.label;
      ws.getCell(r, 3).value = row.minutes;
      ws.getCell(r, 4).value = row.tackles;
      ws.getCell(r, 5).value = tacklesDelta === null ? "New" : tacklesDelta;
      ws.getCell(r, 6).value = row.carries;
      ws.getCell(r, 7).value = carriesDelta === null ? "New" : carriesDelta;
      ws.getCell(r, 8).value = row.involvementsPerMin;
      ws.getCell(r, 8).numFmt = "0.00";

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { name: FONT_NAME, size: 10 };
        applyBorders(cell);
        if (c === 1 || c === 2) {
          cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
        } else {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
        if (playerIdx % 2 === 1) applyFill(cell, C_ALT_ROW);
      }

      // Δ cells — style based on value
      if (tacklesDelta !== null) {
        applyDeltaStyle(ws.getCell(r, 5), tacklesDelta, "+0;-0;-");
      } else {
        ws.getCell(r, 5).font = { name: FONT_NAME, size: 9, italic: true, color: { argb: "FF595959" } };
        applyFill(ws.getCell(r, 5), C_FLAT);
      }
      if (carriesDelta !== null) {
        applyDeltaStyle(ws.getCell(r, 7), carriesDelta, "+0;-0;-");
      } else {
        ws.getCell(r, 7).font = { name: FONT_NAME, size: 9, italic: true, color: { argb: "FF595959" } };
        applyFill(ws.getCell(r, 7), C_FLAT);
      }

      previousRow = row;
      r += 1;
    });

    // Make the Δ cell bold-highlight the player's overall trajectory on
    // the last row of their block (optional visual emphasis).
  });

  // Column widths
  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 10;
  ws.getColumn(7).width = 12;
  ws.getColumn(8).width = 10;

  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 5, showGridLines: false }];
}