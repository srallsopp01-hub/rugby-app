import { Document, Page, View, Text, StyleSheet, pdf } from "@react-pdf/renderer";
import type { TeamAnalyticsExportInput } from "./teamAnalyticsExport";
import type { Grade } from "../../types";

// ── Palette ────────────────────────────────────────────────────────────────
const GRADE_COLORS: Record<Grade, { bg: string; text: string }> = {
  Dominant:    { bg: "#dcfce7", text: "#166534" },
  Competitive: { bg: "#dbeafe", text: "#1e40af" },
  Below:       { bg: "#fef9c3", text: "#854d0e" },
  Poor:        { bg: "#fee2e2", text: "#991b1b" },
};
const ACCENT = "#1d4ed8";
const MUTED  = "#6b7280";
const BORDER = "#e5e7eb";
const STRIP  = "#f9fafb";

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
  },

  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  headerLeft: { flexDirection: "column", gap: 2 },
  wordmark: { fontSize: 11, fontFamily: "Helvetica-Bold", color: ACCENT, letterSpacing: 0.5 },
  matchTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 3 },
  matchMeta: { fontSize: 9, color: MUTED, marginTop: 2 },
  headerRight: { fontSize: 8, color: MUTED, textAlign: "right", marginTop: 4 },

  // Section headings
  sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: ACCENT, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },

  // KPI grid
  kpiGrid: { flexDirection: "row", gap: 6, marginBottom: 4 },
  kpiCard: { flex: 1, backgroundColor: STRIP, borderRadius: 6, border: `1 solid ${BORDER}`, padding: "8 10" },
  kpiLabel: { fontSize: 7.5, color: MUTED, marginBottom: 3 },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111827" },
  kpiSub: { fontSize: 7, color: MUTED, marginTop: 2 },

  // Two-column layout
  twoCol: { flexDirection: "row", gap: 10 },
  colLeft: { flex: 1 },
  colRight: { flex: 1 },

  // Summary box
  summaryBox: { backgroundColor: STRIP, border: `1 solid ${BORDER}`, borderRadius: 6, padding: "8 10" },
  summaryText: { fontSize: 8.5, color: "#374151", lineHeight: 1.55 },

  // Key players
  playerCard: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, borderBottom: `1 solid ${BORDER}` },
  playerRank: { fontSize: 8, color: MUTED, width: 16 },
  playerName: { fontSize: 8.5, fontFamily: "Helvetica-Bold", flex: 1 },
  playerMeta: { fontSize: 7.5, color: MUTED, flex: 2 },
  gradePill: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  gradePillText: { fontSize: 7, fontFamily: "Helvetica-Bold" },
  attentionComment: { fontSize: 7.5, color: MUTED, marginTop: 1, flex: 3 },

  // Player table
  tableHeader: { flexDirection: "row", backgroundColor: "#1e3a5f", paddingVertical: 5, paddingHorizontal: 4, borderRadius: "4 4 0 0" },
  tableHeaderCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#ffffff", textAlign: "center" },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottom: `1 solid ${BORDER}` },
  tableRowAlt: { backgroundColor: STRIP },
  tableCell: { fontSize: 7.5, textAlign: "center", color: "#374151" },
  tableCellLeft: { fontSize: 7.5, textAlign: "left", color: "#111827" },
  tableGradeCell: { borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, alignSelf: "center" },
  tableGradeText: { fontSize: 6.5, fontFamily: "Helvetica-Bold" },

  // Divider
  divider: { borderBottom: `1 solid ${BORDER}`, marginVertical: 8 },

  // Footer
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: MUTED },
});

// ── Column widths (must sum to ~100% of available width) ───────────────────
const COL = {
  name:      "18%",
  pos:       "9%",
  unit:      "10%",
  min:       "6%",
  tackles:   "6%",
  missed:    "6%",
  carries:   "6%",
  turnovers: "7%",
  tacklePct: "8%",
  grade:     "9%",
  comment:   "15%",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function GradePill({ grade, small = false }: { grade: Grade; small?: boolean }) {
  const { bg, text } = GRADE_COLORS[grade] ?? GRADE_COLORS.Poor;
  return (
    <View style={[s.gradePill, { backgroundColor: bg }]}>
      <Text style={[s.gradePillText, { color: text, fontSize: small ? 6 : 7 }]}>{grade}</Text>
    </View>
  );
}

function fmt(n: number, dec = 0) {
  return isNaN(n) ? "—" : n.toFixed(dec);
}

// ── Document ───────────────────────────────────────────────────────────────
function MatchReportDocument({ input }: { input: TeamAnalyticsExportInput }) {
  const {
    matchTitle, opponent, matchDate, reportRows, teamTotals,
    teamTacklePct, setPieceSummary, teamEventSummary,
    bestDefender, bestCarrier, mostInvolved,
    gameCoachingComment, gameFlowSummary,
    topPerformers, needsAttention,
  } = input as TeamAnalyticsExportInput & { topPerformers?: typeof reportRows; needsAttention?: typeof reportRows };

  const generatedAt = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const lineoutPct = setPieceSummary.ownLineouts.length > 0 ? setPieceSummary.ownLineoutSuccessPct : null;
  const scrumPct   = setPieceSummary.ownScrums.length   > 0 ? setPieceSummary.ownScrumSuccessPct   : null;

  const topThree = topPerformers ?? [...reportRows]
    .filter((r) => r.minutes > 0)
    .sort((a, b) => {
      const score = (r: typeof reportRows[0]) => ({ Dominant: 4, Competitive: 3, Below: 2, Poor: 1 }[r.overallGrade] ?? 0);
      return score(b) - score(a);
    })
    .slice(0, 3);

  const attention = needsAttention ?? [...reportRows]
    .filter((r) => r.minutes > 0 && (r.overallGrade === "Below" || r.overallGrade === "Poor"))
    .slice(0, 4);

  const safeMatchTitle = matchTitle || "Match Report";
  const metaParts = [opponent ? `vs ${opponent}` : null, matchDate || null].filter(Boolean).join(" · ");

  return (
    <Document title={safeMatchTitle} author="FYNL Whistle" creator="FYNL Whistle">
      <Page size="A4" orientation="portrait" style={s.page}>

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.wordmark}>FYNL WHISTLE</Text>
            <Text style={s.matchTitle}>{safeMatchTitle}</Text>
            {metaParts ? <Text style={s.matchMeta}>{metaParts}</Text> : null}
          </View>
          <Text style={s.headerRight}>{"Match Report\n" + generatedAt}</Text>
        </View>

        <View style={s.divider} />

        {/* Team KPIs — row 1 */}
        <Text style={s.sectionTitle}>Team Performance</Text>
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Tackle %</Text>
            <Text style={s.kpiValue}>{fmt(teamTacklePct, 0)}%</Text>
            <Text style={s.kpiSub}>{teamTotals.tackles} made · {teamTotals.missed} missed</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Tries Scored</Text>
            <Text style={[s.kpiValue, { color: teamEventSummary.triesScored > 0 ? "#166534" : "#111827" }]}>
              {teamEventSummary.triesScored}
            </Text>
            <Text style={s.kpiSub}>this match</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Tries Conceded</Text>
            <Text style={[s.kpiValue, { color: teamEventSummary.triesConceded > 0 ? "#991b1b" : "#166534" }]}>
              {teamEventSummary.triesConceded}
            </Text>
            <Text style={s.kpiSub}>this match</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Penalties Conceded</Text>
            <Text style={[s.kpiValue, {
              color: teamEventSummary.penaltiesConceded <= 4 ? "#166534"
                   : teamEventSummary.penaltiesConceded <= 8 ? "#854d0e"
                   : "#991b1b",
            }]}>
              {teamEventSummary.penaltiesConceded}
            </Text>
            <Text style={s.kpiSub}>this match</Text>
          </View>
        </View>

        {/* KPIs — row 2 */}
        <View style={[s.kpiGrid, { marginTop: 6, marginBottom: 0 }]}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Lineout %</Text>
            <Text style={s.kpiValue}>{lineoutPct !== null ? `${fmt(lineoutPct, 0)}%` : "—"}</Text>
            <Text style={s.kpiSub}>{setPieceSummary.ownLineouts.length} own lineouts</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Scrum %</Text>
            <Text style={s.kpiValue}>{scrumPct !== null ? `${fmt(scrumPct, 0)}%` : "—"}</Text>
            <Text style={s.kpiSub}>{setPieceSummary.ownScrums.length} own scrums</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Total Carries</Text>
            <Text style={s.kpiValue}>{teamTotals.carries}</Text>
            <Text style={s.kpiSub}>attacking carries</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Turnovers Won</Text>
            <Text style={s.kpiValue}>{teamTotals.turnovers}</Text>
            <Text style={s.kpiSub}>breakdown wins</Text>
          </View>
        </View>

        {/* Game Summary */}
        <Text style={s.sectionTitle}>Game Summary</Text>
        <View style={s.twoCol}>
          <View style={[s.colLeft, s.summaryBox]}>
            <Text style={[s.summaryText, { fontFamily: "Helvetica-Bold", marginBottom: 3, fontSize: 7.5 }]}>Coaching Comment</Text>
            <Text style={s.summaryText}>{gameCoachingComment || "No comment generated."}</Text>
          </View>
          <View style={[s.colRight, s.summaryBox]}>
            <Text style={[s.summaryText, { fontFamily: "Helvetica-Bold", marginBottom: 3, fontSize: 7.5 }]}>Game Flow</Text>
            <Text style={s.summaryText}>{gameFlowSummary || "No game events logged yet."}</Text>
          </View>
        </View>

        {/* Key Players */}
        {(topThree.length > 0 || attention.length > 0) && (
          <>
            <Text style={s.sectionTitle}>Key Players</Text>
            <View style={s.twoCol}>
              {/* Top performers */}
              <View style={s.colLeft}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#374151", marginBottom: 4 }}>Top Performers</Text>
                {topThree.length === 0 ? (
                  <Text style={{ fontSize: 7.5, color: MUTED }}>No data yet.</Text>
                ) : topThree.map((p, i) => (
                  <View key={p.name} style={s.playerCard}>
                    <Text style={s.playerRank}>#{i + 1}</Text>
                    <Text style={s.playerName}>{p.name}</Text>
                    <GradePill grade={p.overallGrade} small />
                    <Text style={[s.playerMeta, { textAlign: "right" }]}>
                      {p.position} · {p.minutes}m · {p.tackles}T · {fmt(p.tacklePct, 0)}%
                    </Text>
                  </View>
                ))}
                {(bestDefender || bestCarrier || mostInvolved) && (
                  <View style={{ marginTop: 6 }}>
                    {bestDefender && (
                      <Text style={{ fontSize: 7.5, color: MUTED, marginBottom: 2 }}>
                        Best Defender: <Text style={{ color: "#111827" }}>{bestDefender.name} ({bestDefender.tackles} tackles)</Text>
                      </Text>
                    )}
                    {bestCarrier && (
                      <Text style={{ fontSize: 7.5, color: MUTED, marginBottom: 2 }}>
                        Best Carrier: <Text style={{ color: "#111827" }}>{bestCarrier.name} ({bestCarrier.carries} carries)</Text>
                      </Text>
                    )}
                    {mostInvolved && (
                      <Text style={{ fontSize: 7.5, color: MUTED }}>
                        Most Involved: <Text style={{ color: "#111827" }}>{mostInvolved.name} ({mostInvolved.involvements} inv.)</Text>
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Needs attention */}
              <View style={s.colRight}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#374151", marginBottom: 4 }}>Needs Attention</Text>
                {attention.length === 0 ? (
                  <Text style={{ fontSize: 7.5, color: MUTED }}>All players graded Competitive or above.</Text>
                ) : attention.map((p) => (
                  <View key={p.name} style={s.playerCard}>
                    <Text style={s.playerName}>{p.name}</Text>
                    <GradePill grade={p.overallGrade} small />
                    <Text style={s.attentionComment}>{p.coachComment}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Player Stats Table */}
        {reportRows.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Player Stats</Text>
            {/* Table header */}
            <View style={s.tableHeader}>
              {(["Player", "Pos", "Unit", "Min", "T", "MT", "C", "TO", "Tkl%", "Grade", "Comment"] as const).map(
                (col, i) => (
                  <Text
                    key={col}
                    style={[s.tableHeaderCell, {
                      width: Object.values(COL)[i],
                      textAlign: i === 0 || i === 10 ? "left" : "center",
                    }]}
                  >
                    {col}
                  </Text>
                )
              )}
            </View>
            {/* Table rows */}
            {reportRows.map((row, i) => {
              const isAlt = i % 2 === 1;
              const { bg: gradeBg, text: gradeText } = GRADE_COLORS[row.overallGrade] ?? GRADE_COLORS.Poor;
              return (
                <View key={row.name} style={[s.tableRow, isAlt ? s.tableRowAlt : {}]}>
                  <Text style={[s.tableCellLeft, { width: COL.name }]}>{row.name}</Text>
                  <Text style={[s.tableCell, { width: COL.pos }]}>{row.position}</Text>
                  <Text style={[s.tableCell, { width: COL.unit }]}>{row.unit}</Text>
                  <Text style={[s.tableCell, { width: COL.min }]}>{row.minutes}</Text>
                  <Text style={[s.tableCell, { width: COL.tackles }]}>{row.tackles}</Text>
                  <Text style={[s.tableCell, { width: COL.missed }]}>{row.missed}</Text>
                  <Text style={[s.tableCell, { width: COL.carries }]}>{row.carries}</Text>
                  <Text style={[s.tableCell, { width: COL.turnovers }]}>{row.turnovers}</Text>
                  <Text style={[s.tableCell, { width: COL.tacklePct }]}>{fmt(row.tacklePct, 0)}%</Text>
                  <View style={[s.tableGradeCell, { width: COL.grade, backgroundColor: gradeBg }]}>
                    <Text style={[s.tableGradeText, { color: gradeText }]}>{row.overallGrade}</Text>
                  </View>
                  <Text style={[s.tableCellLeft, { width: COL.comment, color: MUTED }]}>
                    {row.coachComment}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by FYNL Whistle · fynlwhistle.com</Text>
          <Text style={s.footerText}>{safeMatchTitle}{metaParts ? ` · ${metaParts}` : ""}</Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function generateMatchReportPdf(
  input: TeamAnalyticsExportInput
): Promise<Blob> {
  const blob = await pdf(<MatchReportDocument input={input} />).toBlob();
  return blob;
}
