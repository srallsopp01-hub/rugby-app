"use client";

import { useState } from "react";
import {
  DEFAULT_BUILTIN_TARGETS,
  type BuiltinKpiTarget,
  type BuiltinKpiId,
  type CustomKpiConfig,
  type ManualKpi,
  type SquadProfile,
} from "@/app/rugby-tagging/lib/team";

const BUILTIN_KPI_LABELS: Record<BuiltinKpiId, { label: string; unit: string; hint: string }> = {
  tackle_pct: { label: "Tackle %", unit: "%", hint: "% of attempted tackles completed" },
  tackles_per_min: { label: "Tackles / min", unit: "/min", hint: "Tackles per minute on field" },
  carries_per_min: { label: "Carries / min", unit: "/min", hint: "Ball carries per minute on field" },
  inv_per_min: { label: "Work Rate (Inv/min)", unit: "/min", hint: "Total involvements per minute" },
  lineout_pct: { label: "Lineout %", unit: "%", hint: "Own lineout success rate" },
  scrum_pct: { label: "Scrum %", unit: "%", hint: "Own scrum success rate" },
};

function getBuiltinTargets(kpiTargets: CustomKpiConfig[] | undefined): BuiltinKpiTarget[] {
  const stored = (kpiTargets ?? []).filter((k): k is BuiltinKpiTarget => k.type === "builtin-target");
  return DEFAULT_BUILTIN_TARGETS.map((def) => stored.find((s) => s.id === def.id) ?? def);
}

function getManualKpis(kpiTargets: CustomKpiConfig[] | undefined): ManualKpi[] {
  return (kpiTargets ?? []).filter((k): k is ManualKpi => k.type === "manual");
}

function createManualKpiId() {
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const BLANK_MANUAL: Omit<ManualKpi, "id" | "type"> = {
  name: "",
  unit: "%",
  targetValue: 80,
  description: "",
};

type Props = {
  profile: SquadProfile;
  persist: (updated: SquadProfile) => void;
};

export function KpiTargetsSection({ profile, persist }: Props) {
  const builtinTargets = getBuiltinTargets(profile.kpiTargets);
  const manualKpis = getManualKpis(profile.kpiTargets);

  const [editingBuiltin, setEditingBuiltin] = useState<BuiltinKpiId | null>(null);
  const [builtinDraft, setBuiltinDraft] = useState<BuiltinKpiTarget | null>(null);

  const [showManualForm, setShowManualForm] = useState(false);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState<Omit<ManualKpi, "id" | "type">>(BLANK_MANUAL);

  function saveKpiTargets(updated: CustomKpiConfig[]) {
    persist({ ...profile, kpiTargets: updated, updatedAt: new Date().toISOString() });
  }

  function openBuiltinEdit(target: BuiltinKpiTarget) {
    setEditingBuiltin(target.id);
    setBuiltinDraft({ ...target });
  }

  function saveBuiltin() {
    if (!builtinDraft) return;
    const others = (profile.kpiTargets ?? []).filter(
      (k) => !(k.type === "builtin-target" && k.id === builtinDraft.id)
    );
    saveKpiTargets([...others, builtinDraft]);
    setEditingBuiltin(null);
    setBuiltinDraft(null);
  }

  function resetBuiltin(id: BuiltinKpiId) {
    const defaults = DEFAULT_BUILTIN_TARGETS.find((d) => d.id === id);
    if (!defaults) return;
    const others = (profile.kpiTargets ?? []).filter(
      (k) => !(k.type === "builtin-target" && k.id === id)
    );
    saveKpiTargets(others);
    if (editingBuiltin === id) {
      setEditingBuiltin(null);
      setBuiltinDraft(null);
    }
  }

  function openAddManual() {
    setEditingManualId(null);
    setManualForm(BLANK_MANUAL);
    setShowManualForm(true);
  }

  function openEditManual(kpi: ManualKpi) {
    setEditingManualId(kpi.id);
    setManualForm({ name: kpi.name, unit: kpi.unit, targetValue: kpi.targetValue, description: kpi.description ?? "" });
    setShowManualForm(true);
  }

  function saveManual() {
    if (!manualForm.name.trim()) return;
    const kpi: ManualKpi = {
      type: "manual",
      id: editingManualId ?? createManualKpiId(),
      name: manualForm.name.trim(),
      unit: manualForm.unit,
      targetValue: manualForm.targetValue,
      description: manualForm.description?.trim() || undefined,
    };
    const withoutThis = (profile.kpiTargets ?? []).filter(
      (k) => !(k.type === "manual" && k.id === editingManualId)
    );
    saveKpiTargets([...withoutThis, kpi]);
    setShowManualForm(false);
    setEditingManualId(null);
  }

  function deleteManual(id: string) {
    saveKpiTargets((profile.kpiTargets ?? []).filter((k) => !(k.type === "manual" && k.id === id)));
  }

  return (
    <div className="space-y-4">
      {/* Built-in thresholds */}
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground-strong">Performance Thresholds</h2>
          <p className="mt-1 text-sm text-muted">
            Set what counts as Dominant, Competitive, or Below for each built-in metric. The defaults reflect elite rugby benchmarks — adjust to match your team&apos;s context.
          </p>
        </div>

        <div className="space-y-2">
          {builtinTargets.map((target) => {
            const meta = BUILTIN_KPI_LABELS[target.id];
            const isDefault = !profile.kpiTargets?.some(
              (k) => k.type === "builtin-target" && k.id === target.id
            );
            const isEditing = editingBuiltin === target.id;

            return (
              <div key={target.id} className="rounded-xl border border-border bg-panel-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted">{meta.hint}</p>
                  </div>
                  <div className="flex gap-2">
                    {!isDefault && (
                      <button
                        onClick={() => resetBuiltin(target.id)}
                        className="text-[11px] text-muted hover:text-foreground"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => isEditing ? (setEditingBuiltin(null), setBuiltinDraft(null)) : openBuiltinEdit(target)}
                      className="text-[11px] text-muted hover:text-foreground"
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>

                {!isEditing && (
                  <div className="mt-2 flex gap-4">
                    <span className="flex items-center gap-1 text-xs">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-muted">Dominant ≥ {target.dominantThreshold}{meta.unit}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="h-2 w-2 rounded-full bg-warning" />
                      <span className="text-muted">Competitive ≥ {target.competitiveThreshold}{meta.unit}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="h-2 w-2 rounded-full bg-danger" />
                      <span className="text-muted">Below ≥ {target.belowThreshold}{meta.unit}</span>
                    </span>
                    {isDefault && (
                      <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-2">default</span>
                    )}
                  </div>
                )}

                {isEditing && builtinDraft && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {(["dominantThreshold", "competitiveThreshold", "belowThreshold"] as const).map((field) => {
                        const labels = { dominantThreshold: "Dominant ≥", competitiveThreshold: "Competitive ≥", belowThreshold: "Below ≥" };
                        return (
                          <div key={field}>
                            <label className="mb-1 block text-[10px] text-muted">{labels[field]}</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step={meta.unit === "%" ? 1 : 0.01}
                                value={builtinDraft[field]}
                                onChange={(e) =>
                                  setBuiltinDraft({ ...builtinDraft, [field]: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full rounded-lg border border-border bg-panel-3 px-2 py-1.5 text-sm text-foreground focus:border-border-light focus:outline-none"
                              />
                              <span className="text-xs text-muted">{meta.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={saveBuiltin}
                      className="rounded-lg border border-border bg-panel-3 px-3 py-1.5 text-xs font-medium text-foreground hover:border-border-light"
                    >
                      Save thresholds
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual KPIs */}
      <div className="rounded-2xl border border-border bg-panel p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground-strong">Custom Tracking KPIs</h2>
            <p className="mt-1 text-sm text-muted">
              Add metrics you track manually that the app can&apos;t calculate automatically — e.g. ruck arrival rate, dominant tackles, metres per carry.
            </p>
          </div>
          {!showManualForm && (
            <button
              onClick={openAddManual}
              className="rounded-xl border border-border bg-panel-2 px-4 py-2.5 text-sm font-medium text-foreground hover:border-border-light"
            >
              + Add KPI
            </button>
          )}
        </div>

        {manualKpis.length > 0 && (
          <div className="mt-4 space-y-2">
            {manualKpis.map((kpi) => (
              <div key={kpi.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{kpi.name}</p>
                  <p className="text-xs text-muted">
                    Target: {kpi.targetValue}{kpi.unit === "%" ? "%" : kpi.unit === "per_min" ? "/min" : ""}
                    {kpi.description ? ` · ${kpi.description}` : ""}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEditManual(kpi)} className="text-xs text-muted hover:text-foreground">Edit</button>
                  <button onClick={() => deleteManual(kpi.id)} className="text-xs text-muted hover:text-foreground">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {manualKpis.length === 0 && !showManualForm && (
          <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center">
            <p className="text-sm text-muted">No custom KPIs yet. Add one to track additional metrics alongside the built-in stats.</p>
          </div>
        )}

        {showManualForm && (
          <div className="mt-4 rounded-xl border border-border bg-panel-2 p-4">
            <h3 className="mb-3 text-sm font-medium text-foreground-strong">
              {editingManualId ? "Edit KPI" : "New KPI"}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-muted">KPI name *</label>
                <input
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                  placeholder="e.g. Ruck Arrival Rate"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Unit</label>
                <select
                  value={manualForm.unit}
                  onChange={(e) => setManualForm({ ...manualForm, unit: e.target.value as ManualKpi["unit"] })}
                  className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                >
                  <option value="%">% (percentage)</option>
                  <option value="number">Number (count)</option>
                  <option value="per_min">Per minute rate</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Target value</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={manualForm.unit === "%" ? 1 : 0.01}
                    value={manualForm.targetValue}
                    onChange={(e) => setManualForm({ ...manualForm, targetValue: parseFloat(e.target.value) || 0 })}
                    className="flex-1 rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                  />
                  <span className="text-sm text-muted">
                    {manualForm.unit === "%" ? "%" : manualForm.unit === "per_min" ? "/min" : ""}
                  </span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-muted">Description (optional)</label>
                <input
                  value={manualForm.description ?? ""}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  className="w-full rounded-xl border border-border bg-panel-3 px-3 py-2.5 text-sm text-foreground"
                  placeholder="Brief note on what this measures"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={saveManual}
                disabled={!manualForm.name.trim()}
                className="rounded-xl border border-border bg-panel-3 px-4 py-2 text-sm font-medium text-foreground disabled:opacity-40 hover:border-border-light"
              >
                {editingManualId ? "Save changes" : "Add KPI"}
              </button>
              <button
                onClick={() => { setShowManualForm(false); setEditingManualId(null); }}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
