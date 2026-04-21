/**
 * Team Analytics workbook export.
 *
 * Builds a 4-sheet .xlsx report from already-computed team dashboard values:
 *   1. Grading Reference
 *   2. Team Stats
 *   3. Round X Forwards
 *   4. Player Progression
 *
 * IMPORTANT: This function does NOT recompute stats or grades.
 * The caller (TeamDashboardPage) passes in already-computed values so the
 * spreadsheet numbers exactly match what the page shows on screen.
 *
 * Stage B will extract the page's computation into a shared helper so
 * multiple pages and the export all use the same function.
 */

import ExcelJS from "exceljs";
import type {
  Grade,
  ReportRow,
  UnitSummaryRow,
  EventItem,
} from "../../types";

// ── Colour palette (matches the original Easts workbook) ────────────────────
const C_DOMINANT    = "FFC6EFCE";
const C_COMPETITIVE = "FFE2F0D9";
const C_BELOW       = "FFFFF2CC";
const C_POOR        = "FFF4CCCC";

const C_BAND_PLAYER  = "FF1F4E78";
const C_BAND_DEFENCE = "FF2E75B6";
const C_BAND_ATTACK  = "FFC65911";
const C_BAND_BREAK   = "FF548235";
const C_BAND_SUMMARY = "FF7030A0";

const C_SECTION_BG = "FF1F4E78";
const C_SUBHDR_BG  = "FFD9E1F2";
const C_ALT_ROW    = "FFF2F2F2";

const FONT_NAME = "Arial";

// ── Input type — exactly what TeamDashboardPage already has in state ────────
export type TeamAnalyticsExportInput = {
  matchTitle: string;
  opponent: string;
  matchDate: string;
  reportRows: ReportRow[];
  forwardsRows: ReportRow[];
  unitSummaryRows: UnitSummaryRow[];
  teamTotals: {
    minutes: number;
    tackles: number;
    missed: number;
    carries: number;
    turnovers: number;
    involvements: number;
  };
  teamTacklePct: number;
  setPieceSummary: {
    ownLineouts: EventItem[];
    ownScrums: EventItem[];
    ownLineoutSuccessPct: number;
    ownScrumSuccessPct: number;
  };
  teamEventSummary: {
    penaltiesConceded: number;
    triesScored: number;
    triesConceded: number;
  };
  bestDefender: ReportRow | null;
  bestCarrier: ReportRow | null;
  mostInvolved: ReportRow | null;
  gameCoachingComment: string;
  gameFlowSummary: string;
  headlineInsights: string[];
};

// ── Small style helpers ────────────────────────────────────────────────────
function gradeFill(grade: Grade): string {
  if (grade === "Dominant") return C_DOMINANT;
  if (grade === "Competitive") return C_COMPETITIVE;
  if (grade === "Below") return C_BELOW;
  return C_POOR;
}

function applyBorders(cell: ExcelJS.Cell) {
  cell.border = {
    top:    { style: "thin", color: { argb: "FFBFBFBF" } },
    left:   { style: "thin", color: { argb: "FFBFBFBF" } },
    right:  { style: "thin", color: { argb: "FFBFBFBF" } },
    bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
  };
}

function applyFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb },
  };
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

function bandHeader(
  ws: ExcelJS.Worksheet,
  row: number,
  startCol: number,
  endCol: number,
  text: string,
  argb: string
) {
  ws.mergeCells(row, startCol, row, endCol);
  const cell = ws.getCell(row, startCol);
  cell.value = text;
  cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  applyFill(cell, argb);
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

function colHeader(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { name: FONT_NAME, size: 10, bold: true };
  applyFill(cell, C_SUBHDR_BG);
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyBorders(cell);
}

// Count lineouts/scrums by result type. Uses the same filter shape
// TeamDashboardPage uses, so numbers will line up.
function countLineoutResults(lineouts: EventItem[]) {
  const counts = { Won: 0, Lost: 0, Penalty: 0, "Not Straight": 0, Steal: 0 };
  for (const e of lineouts) {
    const r = e.lineoutResult;
    if (r && r in counts) counts[r as keyof typeof counts] += 1;
  }
  return counts;
}

function countScrumResults(scrums: EventItem[]) {
  const counts = {
    Won: 0,
    Lost: 0,
    "Penalty For": 0,
    "Penalty Against": 0,
    "Free Kick": 0,
  };
  for (const e of scrums) {
    const r = e.scrumResult;
    if (r && r in counts) counts[r as keyof typeof counts] += 1;
  }
  return counts;
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────────────────────────────────

export async function generateTeamAnalyticsWorkbook(
  input: TeamAnalyticsExportInput
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Rugby Analysis App";
  wb.created = new Date();

  buildGradingReferenceSheet(wb);
  buildTeamStatsSheet(wb, input);
  buildForwardsSheet(wb, input);
  buildPlayerProgressionSheet(wb, input);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
    "Use Tackle Count Grade for raw role output, and Tackles/Min Grade for how active a player was during their minutes.";
  ws.getCell("A2").font = { name: FONT_NAME, size: 10, italic: true, color: { argb: "FF595959" } };
  ws.mergeCells("A2:F2");

  sectionHeader(ws, 4, 1, 6, "METRIC GRADING BANDS");
  ["Metric", "Dominant", "Competitive", "Below", "Poor", "What it means"].forEach(
    (h, i) => colHeader(ws.getCell(5, i + 1), h)
  );

  const metricRows: (string | number)[][] = [
    ["Tackle %",                "90%+",  "80–89%",    "70–79%",    "<70%",  "Tackle accuracy and reliability."],
    ["Tackles per minute",      "0.20+", "0.15–0.20", "0.10–0.15", "<0.10", "Defensive work rate."],
    ["Carries per minute",      "0.18+", "0.12–0.18", "0.08–0.12", "<0.08", "Attacking work rate."],
    ["Involvements per minute", "0.30+", "0.22–0.30", "0.15–0.22", "<0.15", "Overall work rate across tackles, carries, and turnovers."],
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

// ── Sheet 2: Team Stats ────────────────────────────────────────────────────

function buildTeamStatsSheet(wb: ExcelJS.Workbook, input: TeamAnalyticsExportInput) {
  const ws = wb.addWorksheet("Team Stats", {
    views: [{ showGridLines: false }],
  });

  const title = input.matchTitle || "Match Report";
  ws.getCell("A1").value = `${title.toUpperCase()} — TEAM STATS & POST-GAME REVIEW`;
  ws.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: "FF1F4E78" } };
  ws.getRow(1).height = 28;
  ws.mergeCells("A1:I1");

  const metaParts = [
    input.opponent ? `Opponent: ${input.opponent}` : "",
    input.matchDate ? `Date: ${input.matchDate}` : "",
    `Score: ${input.teamEventSummary.triesScored} tries scored – ${input.teamEventSummary.triesConceded} tries conceded`,
  ].filter(Boolean);
  ws.getCell("A2").value = metaParts.join("   |   ");
  ws.getCell("A2").font = { name: FONT_NAME, size: 10, italic: true, color: { argb: "FF595959" } };
  ws.mergeCells("A2:I2");

  // Raw player table
  sectionHeader(ws, 4, 1, 9, "FULL TEAM RAW STATS");
  ["No.", "Player", "Position", "Unit", "Minutes", "Tackles", "Missed", "Carries", "Turnovers"].forEach(
    (h, i) => colHeader(ws.getCell(5, i + 1), h)
  );

  const rawStart = 6;
  input.reportRows.forEach((row, rIdx) => {
    const r = rawStart + rIdx;
    const values = [
      row.number,
      row.name,
      row.position,
      row.unit,
      row.minutes,
      row.tackles,
      row.missed,
      row.carries,
      row.turnovers,
    ];
    values.forEach((v, cIdx) => {
      const cell = ws.getCell(r, cIdx + 1);
      cell.value = v;
      cell.font = { name: FONT_NAME, size: 10 };
      applyBorders(cell);
      cell.alignment =
        cIdx <= 3
          ? { horizontal: "left", indent: 1, vertical: "middle" }
          : { horizontal: "center", vertical: "middle" };
      if (rIdx % 2 === 1) applyFill(cell, C_ALT_ROW);
    });
  });

  const rawEnd = rawStart + input.reportRows.length - 1;
  const totalsRow = rawEnd + 1;

  // Totals
  const totalsCell = ws.getCell(totalsRow, 1);
  totalsCell.value = "TOTALS";
  totalsCell.font = { name: FONT_NAME, size: 10, bold: true };
  applyFill(totalsCell, C_SUBHDR_BG);
  applyBorders(totalsCell);

  [5, 6, 7, 8, 9].forEach((col) => {
    const letter = String.fromCharCode(64 + col);
    const cell = ws.getCell(totalsRow, col);
    cell.value = { formula: `SUM(${letter}${rawStart}:${letter}${rawEnd})` };
    cell.font = { name: FONT_NAME, size: 10, bold: true };
    applyFill(cell, C_SUBHDR_BG);
    applyBorders(cell);
    cell.alignment = { horizontal: "center" };
  });
  [2, 3, 4].forEach((col) => {
    const cell = ws.getCell(totalsRow, col);
    applyFill(cell, C_SUBHDR_BG);
    applyBorders(cell);
  });

  // Round summary / KPI / Discipline
  const blk = totalsRow + 2;
  sectionHeader(ws, blk, 1, 3, "ROUND SUMMARY");
  sectionHeader(ws, blk, 4, 5, "TEAM KPI SNAPSHOT");
  sectionHeader(ws, blk, 7, 9, "DISCIPLINE");

  const summaryItems: [string, string][] = [
    ["Best Defender",    input.bestDefender  ? `${input.bestDefender.name} (${input.bestDefender.tackles} tackles)` : "—"],
    ["Best Carrier",     input.bestCarrier   ? `${input.bestCarrier.name} (${input.bestCarrier.carries} carries)`  : "—"],
    ["Most Involved",    input.mostInvolved  ? `${input.mostInvolved.name} (${input.mostInvolved.involvements} involvements)` : "—"],
    ["Coaching Comment", input.gameCoachingComment || "—"],
    ["Game Flow",        input.gameFlowSummary || "—"],
  ];

  summaryItems.forEach(([k, v], i) => {
    const r = blk + 1 + i;
    const keyCell = ws.getCell(r, 1);
    keyCell.value = k;
    keyCell.font = { name: FONT_NAME, size: 10, bold: true };
    applyBorders(keyCell);
    keyCell.alignment = { horizontal: "left", indent: 1, vertical: "middle" };

    ws.mergeCells(r, 2, r, 3);
    const valCell = ws.getCell(r, 2);
    valCell.value = v;
    valCell.font = { name: FONT_NAME, size: 10 };
    valCell.alignment = { wrapText: true, vertical: "middle" };
    applyBorders(valCell);
    ws.getRow(r).height = 28;
  });

  // KPI snapshot
  colHeader(ws.getCell(blk + 1, 4), "Metric");
  colHeader(ws.getCell(blk + 1, 5), "Value");

  const kpiRows: [string, string | number, string][] = [
    ["Total tackles",       input.teamTotals.tackles,                     "0"],
    ["Missed tackles",      input.teamTotals.missed,                      "0"],
    ["Tackle %",            input.teamTacklePct / 100,                    "0.0%"],
    ["Total carries",       input.teamTotals.carries,                     "0"],
    ["Turnovers won",       input.teamTotals.turnovers,                   "0"],
    ["Penalties conceded",  input.teamEventSummary.penaltiesConceded,     "0"],
    ["Scrum success %",     input.setPieceSummary.ownScrumSuccessPct/100, "0.0%"],
    ["Lineout success %",   input.setPieceSummary.ownLineoutSuccessPct/100,"0.0%"],
    ["Tries scored",        input.teamEventSummary.triesScored,           "0"],
    ["Tries conceded",      input.teamEventSummary.triesConceded,         "0"],
  ];
  kpiRows.forEach(([label, val, fmt], i) => {
    const r = blk + 2 + i;
    const a = ws.getCell(r, 4);
    a.value = label;
    a.font = { name: FONT_NAME, size: 10 };
    applyBorders(a);
    a.alignment = { horizontal: "left", indent: 1, vertical: "middle" };

    const b = ws.getCell(r, 5);
    b.value = val;
    b.numFmt = fmt;
    b.font = { name: FONT_NAME, size: 10, bold: true };
    applyBorders(b);
    b.alignment = { horizontal: "center", vertical: "middle" };

    if (i % 2 === 1) { applyFill(a, C_ALT_ROW); applyFill(b, C_ALT_ROW); }
  });

  // Discipline
  ["Metric", "Value", "Note"].forEach((h, i) => colHeader(ws.getCell(blk + 1, 7 + i), h));
  const discRows: [string, string | number, string][] = [
    ["Total penalties",      input.teamEventSummary.penaltiesConceded, "Worth tracking week to week."],
    ["Tries scored",         input.teamEventSummary.triesScored,       "Attacking finish count."],
    ["Tries conceded",       input.teamEventSummary.triesConceded,     "Defensive breakdown count."],
  ];
  discRows.forEach(([m, v, n], i) => {
    const r = blk + 2 + i;
    const a = ws.getCell(r, 7); a.value = m; a.font = { name: FONT_NAME, size: 10 }; applyBorders(a);
    a.alignment = { horizontal: "left", indent: 1, vertical: "middle" };
    const b = ws.getCell(r, 8); b.value = v; b.font = { name: FONT_NAME, size: 10, bold: true }; applyBorders(b);
    b.alignment = { horizontal: "center", vertical: "middle" };
    const c = ws.getCell(r, 9); c.value = n; c.font = { name: FONT_NAME, size: 10, italic: true }; applyBorders(c);
    c.alignment = { wrapText: true, vertical: "middle" };
    if (i % 2 === 1) { applyFill(a, C_ALT_ROW); applyFill(b, C_ALT_ROW); applyFill(c, C_ALT_ROW); }
  });

  // Headline insights
  const hiRow = blk + 7;
  sectionHeader(ws, hiRow, 1, 9, "HEADLINE INSIGHTS");
  input.headlineInsights.forEach((insight, i) => {
    const r = hiRow + 1 + i;
    ws.mergeCells(r, 1, r, 9);
    const cell = ws.getCell(r, 1);
    cell.value = `• ${insight}`;
    cell.font = { name: FONT_NAME, size: 10 };
    cell.alignment = { wrapText: true, vertical: "middle" };
    applyBorders(cell);
    if (i % 2 === 1) applyFill(cell, C_ALT_ROW);
  });

  // Set piece detail
  const spRow = hiRow + 2 + input.headlineInsights.length;
  sectionHeader(ws, spRow, 1, 4, "SCRUMS");
  sectionHeader(ws, spRow, 6, 9, "LINEOUTS");

  ["Result", "Count", "Total", "Success %"].forEach((h, i) => colHeader(ws.getCell(spRow + 1, 1 + i), h));
  const scrumCounts = countScrumResults(input.setPieceSummary.ownScrums);
  const scrumTotal = input.setPieceSummary.ownScrums.length;
  Object.entries(scrumCounts).forEach(([label, count], i) => {
    const r = spRow + 2 + i;
    const a = ws.getCell(r, 1); a.value = label; a.font = { name: FONT_NAME, size: 10 }; applyBorders(a);
    a.alignment = { horizontal: "left", indent: 1, vertical: "middle" };
    const b = ws.getCell(r, 2); b.value = count; b.font = { name: FONT_NAME, size: 10 }; applyBorders(b);
    b.alignment = { horizontal: "center", vertical: "middle" };
    const c = ws.getCell(r, 3); c.value = scrumTotal; c.font = { name: FONT_NAME, size: 10 }; applyBorders(c);
    c.alignment = { horizontal: "center", vertical: "middle" };
    const d = ws.getCell(r, 4);
    d.value = scrumTotal > 0 ? count / scrumTotal : 0;
    d.numFmt = "0%";
    d.font = { name: FONT_NAME, size: 10, bold: true };
    applyBorders(d);
    d.alignment = { horizontal: "center", vertical: "middle" };
    if (i % 2 === 1) { applyFill(a, C_ALT_ROW); applyFill(b, C_ALT_ROW); applyFill(c, C_ALT_ROW); applyFill(d, C_ALT_ROW); }
  });

  ["Result", "Count", "Total", "Success %"].forEach((h, i) => colHeader(ws.getCell(spRow + 1, 6 + i), h));
  const lineoutCounts = countLineoutResults(input.setPieceSummary.ownLineouts);
  const lineoutTotal = input.setPieceSummary.ownLineouts.length;
  Object.entries(lineoutCounts).forEach(([label, count], i) => {
    const r = spRow + 2 + i;
    const a = ws.getCell(r, 6); a.value = label; a.font = { name: FONT_NAME, size: 10 }; applyBorders(a);
    a.alignment = { horizontal: "left", indent: 1, vertical: "middle" };
    const b = ws.getCell(r, 7); b.value = count; b.font = { name: FONT_NAME, size: 10 }; applyBorders(b);
    b.alignment = { horizontal: "center", vertical: "middle" };
    const c = ws.getCell(r, 8); c.value = lineoutTotal; c.font = { name: FONT_NAME, size: 10 }; applyBorders(c);
    c.alignment = { horizontal: "center", vertical: "middle" };
    const d = ws.getCell(r, 9);
    d.value = lineoutTotal > 0 ? count / lineoutTotal : 0;
    d.numFmt = "0%";
    d.font = { name: FONT_NAME, size: 10, bold: true };
    applyBorders(d);
    d.alignment = { horizontal: "center", vertical: "middle" };
    if (i % 2 === 1) { applyFill(a, C_ALT_ROW); applyFill(b, C_ALT_ROW); applyFill(c, C_ALT_ROW); applyFill(d, C_ALT_ROW); }
  });

  // Column widths
  [22, 20, 18, 16, 12, 12, 12, 22, 40].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];
}

// ── Sheet 3: Forwards (grouped column bands) ───────────────────────────────

function buildForwardsSheet(wb: ExcelJS.Workbook, input: TeamAnalyticsExportInput) {
  const ws = wb.addWorksheet("Forwards", {
    views: [{ showGridLines: false }],
  });

  ws.getCell("A1").value = "IN-DEPTH FORWARDS TRACKER";
  ws.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: "FF1F4E78" } };
  ws.getRow(1).height = 28;
  ws.mergeCells("A1:V1");

  ws.getCell("A2").value =
    "Tackle % Grade / Tackles/Min Grade = defensive quality and work rate. Overall Grade averages all bands.";
  ws.getCell("A2").font = { name: FONT_NAME, size: 10, italic: true, color: { argb: "FF595959" } };
  ws.mergeCells("A2:V2");

  bandHeader(ws, 3, 1, 3,   "PLAYER",                C_BAND_PLAYER);
  bandHeader(ws, 3, 4, 10,  "DEFENCE",               C_BAND_DEFENCE);
  bandHeader(ws, 3, 11, 14, "ATTACK",                C_BAND_ATTACK);
  bandHeader(ws, 3, 15, 18, "BREAKDOWN / WORK RATE", C_BAND_BREAK);
  bandHeader(ws, 3, 19, 22, "SUMMARY",               C_BAND_SUMMARY);

  const colHeads = [
    "Player", "Position", "Unit",
    "Min", "Tackles", "Missed", "Tackle %", "Tackle % Grade", "Tackles/Min", "Tackles/Min Grade",
    "Carries", "Carries/Min", "Carries/Min Grade", "Carry Count",
    "Turnovers", "Involvements", "Inv/Min", "Work Rate Grade",
    "Overall Grade", "Coach Comment", "", "",
  ];
  colHeads.forEach((h, i) => {
    if (h) colHeader(ws.getCell(4, i + 1), h);
  });
  ws.getRow(4).height = 32;

  const fwdStart = 5;
  input.forwardsRows.forEach((row, i) => {
    const r = fwdStart + i;
    ws.getCell(r, 1).value  = row.name;
    ws.getCell(r, 2).value  = row.position;
    ws.getCell(r, 3).value  = row.unit;
    ws.getCell(r, 4).value  = row.minutes;
    ws.getCell(r, 5).value  = row.tackles;
    ws.getCell(r, 6).value  = row.missed;
    ws.getCell(r, 7).value  = row.tacklePct / 100;  ws.getCell(r, 7).numFmt = "0%";
    ws.getCell(r, 8).value  = row.tacklePctGrade;
    ws.getCell(r, 9).value  = row.tacklesPerMin;    ws.getCell(r, 9).numFmt = "0.00";
    ws.getCell(r, 10).value = row.tacklesPerMinGrade;
    ws.getCell(r, 11).value = row.carries;
    ws.getCell(r, 12).value = row.carriesPerMin;    ws.getCell(r, 12).numFmt = "0.00";
    ws.getCell(r, 13).value = row.carriesPerMinGrade;
    ws.getCell(r, 14).value = row.carries;
    ws.getCell(r, 15).value = row.turnovers;
    ws.getCell(r, 16).value = row.involvements;
    ws.getCell(r, 17).value = row.involvementsPerMin; ws.getCell(r, 17).numFmt = "0.00";
    ws.getCell(r, 18).value = row.workRateGrade;
    ws.getCell(r, 19).value = row.overallGrade;
    ws.getCell(r, 20).value = row.coachComment;

    for (let c = 1; c <= 20; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { name: FONT_NAME, size: 10 };
      applyBorders(cell);
      if (c <= 3)      cell.alignment = { horizontal: "left", indent: 1, vertical: "middle" };
      else if (c === 20) cell.alignment = { wrapText: true, vertical: "middle" };
      else             cell.alignment = { horizontal: "center", vertical: "middle" };
    }

    applyFill(ws.getCell(r, 8),  gradeFill(row.tacklePctGrade));
    applyFill(ws.getCell(r, 10), gradeFill(row.tacklesPerMinGrade));
    applyFill(ws.getCell(r, 13), gradeFill(row.carriesPerMinGrade));
    applyFill(ws.getCell(r, 18), gradeFill(row.workRateGrade));
    applyFill(ws.getCell(r, 19), gradeFill(row.overallGrade));
    ws.getCell(r, 19).font = { name: FONT_NAME, size: 10, bold: true };

    ws.getRow(r).height = 42;
  });

  // Unit summary below forwards
  const usRow = fwdStart + input.forwardsRows.length + 2;
  sectionHeader(ws, usRow, 1, 5, "FORWARD UNIT SUMMARY");
  ["Unit", "Players", "Avg T/Min", "Avg C/Min", "Avg Inv/Min"].forEach((h, i) =>
    colHeader(ws.getCell(usRow + 1, 1 + i), h)
  );

  const forwardUnits = input.unitSummaryRows.filter((u) =>
    ["Front Row", "Locks", "Back Row"].includes(u.unit)
  );
  forwardUnits.forEach((row, i) => {
    const r = usRow + 2 + i;
    ws.getCell(r, 1).value = row.unit;
    ws.getCell(r, 2).value = row.players;
    ws.getCell(r, 3).value = row.avgTacklesPerMin;        ws.getCell(r, 3).numFmt = "0.00";
    ws.getCell(r, 4).value = row.avgCarriesPerMin;        ws.getCell(r, 4).numFmt = "0.00";
    ws.getCell(r, 5).value = row.avgInvolvementsPerMin;   ws.getCell(r, 5).numFmt = "0.00";
    for (let c = 1; c <= 5; c++) {
      const cell = ws.getCell(r, c);
      cell.font = { name: FONT_NAME, size: 10 };
      applyBorders(cell);
      cell.alignment = c === 1
        ? { horizontal: "left", indent: 1, vertical: "middle" }
        : { horizontal: "center", vertical: "middle" };
      if (i % 2 === 1) applyFill(cell, C_ALT_ROW);
    }
  });

  const widths = [18, 18, 12, 6, 9, 8, 10, 14, 11, 14, 9, 11, 14, 12, 11, 12, 10, 14, 14, 48];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.views = [{ state: "frozen", xSplit: 3, ySplit: 4, showGridLines: false }];
}

// ── Sheet 4: Player Progression ────────────────────────────────────────────

function buildPlayerProgressionSheet(wb: ExcelJS.Workbook, input: TeamAnalyticsExportInput) {
  const ws = wb.addWorksheet("Player Progression", {
    views: [{ showGridLines: false }],
  });

  ws.getCell("A1").value = "PLAYER PROGRESSION TRACKER";
  ws.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: "FF1F4E78" } };
  ws.getRow(1).height = 28;
  ws.mergeCells("A1:O1");

  ws.getCell("A2").value =
    "Δ columns show change vs the player's previous round. First round logged has Δ = New.";
  ws.getCell("A2").font = { name: FONT_NAME, size: 10, italic: true, color: { argb: "FF595959" } };
  ws.mergeCells("A2:O2");

  sectionHeader(ws, 4, 1, 15, "ROUND-BY-ROUND PROGRESSION");

  const headers = [
    "Player", "Round", "Position", "Unit", "Minutes",
    "Tackles", "Tackles Δ", "Carries", "Carries Δ",
    "Turnovers", "Turnovers Δ", "Penalties", "Inv/Min", "Inv/Min Δ", "Note",
  ];
  headers.forEach((h, i) => colHeader(ws.getCell(5, i + 1), h));
  ws.getRow(5).height = 32;

  const roundLabel = input.matchTitle || "Round 1";

  input.reportRows.forEach((row, i) => {
    const r = 6 + i;
    const note =
      row.overallGrade === "Dominant"     ? "Dominant baseline — hold this standard." :
      row.overallGrade === "Competitive"  ? "Competitive baseline — one step from dominant." :
      row.tacklePctGrade === "Poor"       ? "Tackle accuracy is the priority area." :
      row.workRateGrade === "Poor"        ? "Work rate for minutes played is the priority area." :
                                            "Baseline set — target lifting involvements next round.";

    const values: (string | number)[] = [
      row.name, roundLabel, row.position, row.unit, row.minutes,
      row.tackles, "New", row.carries, "New",
      row.turnovers, "New", 0, row.involvementsPerMin, "New", note,
    ];
    values.forEach((v, cIdx) => {
      const cell = ws.getCell(r, cIdx + 1);
      cell.value = v;
      cell.font = { name: FONT_NAME, size: 10 };
      applyBorders(cell);
      if ([0, 2, 3, 14].includes(cIdx)) {
        cell.alignment = { horizontal: "left", indent: 1, vertical: "middle", wrapText: true };
      } else {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
    });
    ws.getCell(r, 13).numFmt = "0.00";

    // Style the Δ cells
    [7, 9, 11, 14].forEach((col) => {
      const cell = ws.getCell(r, col);
      applyFill(cell, C_ALT_ROW);
      cell.font = { name: FONT_NAME, size: 9, italic: true, color: { argb: "FF595959" } };
    });

    if (i % 2 === 1) {
      for (let c = 1; c <= 15; c++) {
        const cell = ws.getCell(r, c);
        if (![7, 9, 11, 14].includes(c)) applyFill(cell, C_ALT_ROW);
      }
    }
    ws.getRow(r).height = 30;
  });

  // Guidance block
  const guideRow = 6 + input.reportRows.length + 2;
  sectionHeader(ws, guideRow, 1, 15, "HOW TO ADD THE NEXT ROUND");
  ws.mergeCells(guideRow + 1, 1, guideRow + 1, 15);
  const guide = ws.getCell(guideRow + 1, 1);
  guide.value =
    "• Export the next round after tagging, copy its Player Progression rows below this block.\n" +
    "• For Δ columns, use a formula like =F{row} - F{previous_row_for_same_player}.\n" +
    "• Keep notes short — 1 line per player focused on development direction.\n" +
    "• Positive Δ good for Tackles / Carries / Turnovers / Inv/Min. Negative Δ good for Penalties.";
  guide.alignment = { wrapText: true, vertical: "top" };
  guide.font = { name: FONT_NAME, size: 10 };
  ws.getRow(guideRow + 1).height = 72;

  const widths = [20, 12, 18, 14, 10, 10, 10, 10, 10, 12, 12, 10, 10, 10, 42];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];
}