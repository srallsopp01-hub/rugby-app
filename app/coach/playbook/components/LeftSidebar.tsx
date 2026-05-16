'use client';

import { useState, useEffect, useRef } from 'react';
import useEditorStore from '../lib/editorStore';
import { FORMATIONS, FORMATION_CATEGORY_LABELS } from '../lib/formations';
import {
  getCustomPresets, getHiddenBuiltinIds, subscribePresetsChanged,
  createCustomPreset, updateCustomPreset,
  duplicateCustomPreset, deleteCustomPreset,
  hideBuiltinPreset, restoreAllBuiltins,
  reorderCustomPresets,
} from '../lib/presetStore';
import CreatePresetModal from './CreatePresetModal';
import type { Tool, FormationCategory, FormationPreset, CustomFormationPreset } from '../lib/types';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest text-muted-2 uppercase px-3 mt-4 mb-1">
      {children}
    </p>
  );
}

function ToolBtn({
  active, onClick, children, title, count, accent = 'bg-panel-3/60 text-foreground',
}: {
  active?: boolean; onClick: () => void; children: React.ReactNode;
  title?: string; count?: number; accent?: string;
}) {
  return (
    <button
      onClick={onClick} title={title}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
        ${active ? accent : 'text-muted hover:text-foreground bg-panel-2/40 hover:bg-panel-2 border border-border hover:border-border'}`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-panel-3 text-muted min-w-[20px] text-center">
          {count}
        </span>
      )}
    </button>
  );
}

const ZONE_COLORS = [
  { label: 'Blue',   value: 'rgba(59,130,246,0.9)',   bg: '#3b82f6' },
  { label: 'Red',    value: 'rgba(239,68,68,0.9)',    bg: '#ef4444' },
  { label: 'Green',  value: 'rgba(34,197,94,0.9)',    bg: '#22c55e' },
  { label: 'Yellow', value: 'rgba(234,179,8,0.9)',    bg: '#eab308' },
  { label: 'Purple', value: 'rgba(168,85,247,0.9)',   bg: '#a855f7' },
  { label: 'White',  value: 'rgba(255,255,255,0.85)', bg: '#ffffff' },
];

const CATEGORY_ORDER: FormationCategory[] = ['kickoff', 'lineout', 'scrum', 'penalty', 'open', 'custom'];

// ─── Delete confirmation modal ────────────────────────────────────────────────

interface DeleteTarget {
  id: string;
  name: string;
  type: 'custom' | 'builtin';
}

function DeleteModal({ target, onConfirm, onCancel }: {
  target: DeleteTarget;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isBuiltin = target.type === 'builtin';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-panel p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-foreground-strong mb-2">
          {isBuiltin ? `Delete built-in preset?` : `Delete preset?`}
        </h2>
        <p className="text-sm text-muted mb-5">
          {isBuiltin
            ? `Delete the built-in "${target.name}" preset? You can restore default presets from Settings, but it will be removed from your sidebar until then.`
            : `Delete "${target.name}"? This can't be undone.`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-border text-muted hover:text-foreground hover:bg-panel-2 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-all"
          >
            {isBuiltin ? 'Delete preset' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Three-dot menu ───────────────────────────────────────────────────────────

interface PresetMenuProps {
  preset: FormationPreset | CustomFormationPreset;
  isCustom: boolean;
  onRename: () => void;
  onDuplicate: () => void;
  onMoveCategory: (cat: FormationCategory) => void;
  onDelete: () => void;
}

function PresetMenu({ preset, isCustom, onRename, onDuplicate, onMoveCategory, onDelete }: PresetMenuProps) {
  const [open, setOpen] = useState(false);
  const [subView, setSubView] = useState<'main' | 'move'>('main');

  function close() { setOpen(false); setSubView('main'); }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setSubView('main'); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-2 hover:text-foreground hover:bg-panel-3 transition-all"
        title="Options"
      >
        <DotsIcon />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 top-6 z-20 bg-panel border border-border rounded-lg shadow-lg py-1 min-w-[150px]">
            {subView === 'main' ? (
              <>
                {isCustom && (
                  <>
                    <button type="button" onClick={() => { close(); onRename(); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-panel-2 transition-colors text-left">
                      Rename
                    </button>
                    <button type="button" onClick={() => { close(); onDuplicate(); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-panel-2 transition-colors text-left">
                      Duplicate
                    </button>
                    <button type="button" onClick={() => setSubView('move')}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-panel-2 transition-colors text-left">
                      <span>Move to category</span>
                      <span className="text-muted-2">›</span>
                    </button>
                    <div className="my-1 border-t border-border" />
                  </>
                )}
                <button type="button" onClick={() => { close(); onDelete(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 transition-colors text-left">
                  Delete{!isCustom ? ' (built-in)' : ''}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setSubView('main')}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-panel-2 transition-colors text-left">
                  <span className="text-muted-2">‹</span> Back
                </button>
                <div className="my-1 border-t border-border" />
                {CATEGORY_ORDER.filter((c) => c !== preset.category).map((cat) => (
                  <button key={cat} type="button"
                    onClick={() => { close(); onMoveCategory(cat); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-panel-2 transition-colors text-left">
                    {FORMATION_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function LeftSidebar() {
  const {
    addActor, scenes, currentSceneId, selectedTool, setSelectedTool,
    setSelectedActor, clearSceneActors, applyFormation,
    activeZoneColor, setActiveZoneColor,
  } = useEditorStore();

  const scene = scenes.find((s) => s.id === currentSceneId);
  const actors = scene?.actors ?? [];
  const arrows = scene?.arrows ?? [];
  const zones  = scene?.zones  ?? [];

  const homeCount  = actors.filter((a) => a.team === 'home'  && a.type === 'player').length;
  const awayCount  = actors.filter((a) => a.team === 'away'  && a.type === 'player').length;
  const ballCount  = actors.filter((a) => a.type === 'ball').length;
  const coneCount  = actors.filter((a) => a.type === 'cone').length;
  const arrowCount = arrows.length;
  const zoneCount  = zones.length;

  const tool = (t: Tool) => selectedTool === t;

  // ── Preset store (reactive) ──────────────────────────────────────────────
  const [customPresets, setCustomPresets] = useState<CustomFormationPreset[]>([]);
  const [hiddenIds,     setHiddenIds]     = useState<string[]>([]);

  useEffect(() => {
    setCustomPresets(getCustomPresets());
    setHiddenIds(getHiddenBuiltinIds());
    return subscribePresetsChanged(() => {
      setCustomPresets(getCustomPresets());
      setHiddenIds(getHiddenBuiltinIds());
    });
  }, []);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [formationsOpen, setFormationsOpen] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CustomFormationPreset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Drag state
  const dragId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ── Merged category list ─────────────────────────────────────────────────
  const byCategory = CATEGORY_ORDER.map((cat) => {
    const builtins = FORMATIONS.filter((f) => f.category === cat && !hiddenIds.includes(f.id));
    const custom   = customPresets.filter((p) => p.category === cat).sort((a, b) => a.order - b.order);
    return { cat, label: FORMATION_CATEGORY_LABELS[cat], builtins, custom };
  }).filter((g) => g.builtins.length + g.custom.length > 0);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleCreatePreset(name: string, category: FormationCategory, direction?: '↑' | '↓') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const actorData = actors.map(({ id: _id, ...rest }) => rest);
    const preset = createCustomPreset(name, category, actorData, direction);
    applyFormation(preset); // apply so the coach sees it confirmed
  }

  function handleRename(name: string, category: FormationCategory, direction?: '↑' | '↓') {
    if (!renameTarget) return;
    updateCustomPreset(renameTarget.id, { name, category, direction });
    setRenameTarget(null);
  }

  function handleDuplicate(id: string) {
    duplicateCustomPreset(id);
  }

  function handleMoveCategory(id: string, category: FormationCategory) {
    updateCustomPreset(id, { category });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'custom') {
      deleteCustomPreset(deleteTarget.id);
    } else {
      hideBuiltinPreset(deleteTarget.id);
    }
    setDeleteTarget(null);
  }

  // ── Drag handlers (custom presets only) ──────────────────────────────────
  function onDragStart(id: string) {
    dragId.current = id;
  }
  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }
  function onDrop(e: React.DragEvent, cat: FormationCategory) {
    e.preventDefault();
    const srcId = dragId.current;
    const dstId = dragOverId;
    dragId.current = null;
    setDragOverId(null);
    if (!srcId || srcId === dstId) return;

    const catPresets = customPresets.filter((p) => p.category === cat).sort((a, b) => a.order - b.order);
    const srcIdx = catPresets.findIndex((p) => p.id === srcId);
    const dstIdx = catPresets.findIndex((p) => p.id === dstId);
    if (srcIdx === -1 || dstIdx === -1) return;

    const next = [...catPresets];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(dstIdx, 0, moved);
    reorderCustomPresets(cat, next.map((p) => p.id));
  }
  function onDragEnd() {
    dragId.current = null;
    setDragOverId(null);
  }

  return (
    <>
      <aside className="w-52 bg-panel border-r border-border flex flex-col shrink-0 overflow-y-auto py-3">

        {/* ── Tools ── */}
        <SectionLabel>Tools</SectionLabel>
        <div className="px-2">
          <ToolBtn
            active={tool('select')} accent="bg-panel-3/60 text-foreground"
            onClick={() => { setSelectedTool('select'); setSelectedActor(null); }} title="Select (V)"
          >
            <SelectIcon /> Select
          </ToolBtn>
        </div>

        {/* ── Formations ── */}
        <div className="mt-3">
          <button
            onClick={() => setFormationsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-1 group"
          >
            <span className="text-[10px] font-semibold tracking-widest text-muted-2 uppercase group-hover:text-muted transition-colors">
              Formations
            </span>
            <span className={`text-muted-2 text-[9px] transition-transform duration-200 ${formationsOpen ? 'rotate-90' : ''}`}>▶</span>
          </button>

          {formationsOpen && (
            <div className="px-2 mt-1 space-y-2.5">
              {byCategory.map(({ cat, label, builtins, custom }) => (
                <div key={cat}>
                  <p className="text-[9px] font-semibold tracking-widest text-muted-2 uppercase px-1 mb-1">{label}</p>
                  <div className="space-y-1">

                    {/* Built-in presets */}
                    {builtins.map((preset) => (
                      <div key={preset.id} className="group relative flex items-center gap-1">
                        <button
                          onClick={() => applyFormation(preset)}
                          title={preset.description}
                          className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium
                            text-muted hover:text-foreground bg-panel-2/40 hover:bg-success/10
                            border border-border hover:border-success/30 transition-all text-left min-w-0"
                        >
                          <FormationIcon category={cat} />
                          <span className="flex-1 truncate">{preset.name}</span>
                          <span className="text-[9px] text-muted-2 shrink-0">
                            {preset.actors.filter((a) => a.team === 'home').length}v
                            {preset.actors.filter((a) => a.team === 'away').length}
                          </span>
                        </button>
                        <PresetMenu
                          preset={preset}
                          isCustom={false}
                          onRename={() => {}}
                          onDuplicate={() => {}}
                          onMoveCategory={() => {}}
                          onDelete={() => setDeleteTarget({ id: preset.id, name: preset.name, type: 'builtin' })}
                        />
                      </div>
                    ))}

                    {/* Custom presets */}
                    {custom.map((preset) => (
                      <div
                        key={preset.id}
                        draggable
                        onDragStart={() => onDragStart(preset.id)}
                        onDragOver={(e) => onDragOver(e, preset.id)}
                        onDrop={(e) => onDrop(e, cat)}
                        onDragEnd={onDragEnd}
                        className={`group relative flex items-center gap-1 rounded-lg transition-all ${
                          dragOverId === preset.id ? 'ring-1 ring-accent/50 bg-accent/5' : ''
                        }`}
                      >
                        {/* Drag handle */}
                        <span className="opacity-0 group-hover:opacity-40 text-muted-2 text-[10px] cursor-grab pl-0.5 shrink-0 select-none">
                          ⠿
                        </span>
                        <button
                          onClick={() => applyFormation(preset)}
                          title={preset.description}
                          className="flex-1 flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium
                            text-muted hover:text-foreground bg-panel-2/40 hover:bg-accent/10
                            border border-border hover:border-accent/30 transition-all text-left min-w-0"
                        >
                          <FormationIcon category={cat} />
                          <span className="flex-1 truncate">{preset.name}</span>
                          {preset.direction && (
                            <span className="text-[9px] text-muted-2 shrink-0">{preset.direction}</span>
                          )}
                          <span className="text-[8px] bg-accent/15 text-accent px-1 rounded shrink-0">Custom</span>
                          <span className="text-[9px] text-muted-2 shrink-0">
                            {preset.actors.filter((a) => a.team === 'home').length}v
                            {preset.actors.filter((a) => a.team === 'away').length}
                          </span>
                        </button>
                        <PresetMenu
                          preset={preset}
                          isCustom
                          onRename={() => setRenameTarget(preset)}
                          onDuplicate={() => handleDuplicate(preset.id)}
                          onMoveCategory={(cat) => handleMoveCategory(preset.id, cat)}
                          onDelete={() => setDeleteTarget({ id: preset.id, name: preset.name, type: 'custom' })}
                        />
                      </div>
                    ))}

                  </div>
                </div>
              ))}

              {/* ── Utility row ── */}
              <div className="space-y-1.5 pt-0.5">
                {/* Create new preset */}
                <button
                  type="button"
                  onClick={() => setCreateModal(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium
                    text-muted hover:text-foreground bg-panel-2/40 hover:bg-panel-2
                    border border-dashed border-border hover:border-border-light transition-all text-left"
                >
                  <span className="text-accent font-bold text-sm leading-none">+</span>
                  Save formation as preset
                </button>

                {/* Restore defaults */}
                {hiddenIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => restoreAllBuiltins()}
                    className="w-full text-center text-[10px] text-muted-2 hover:text-muted transition-colors py-0.5"
                  >
                    Restore {hiddenIds.length} default preset{hiddenIds.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>

              <p className="text-[10px] text-muted-2 px-1 pb-1 leading-relaxed">
                Replaces actors. Undo with ⌘Z.
              </p>
            </div>
          )}
        </div>

        {/* ── Home team ── */}
        <SectionLabel>Home Team</SectionLabel>
        <div className="px-2">
          <ToolBtn onClick={() => addActor('player', 'home')} title="Add home player" count={homeCount}>
            <PlayerDot color="#3b82f6" /> Add Player
          </ToolBtn>
        </div>

        {/* ── Away team ── */}
        <SectionLabel>Away Team</SectionLabel>
        <div className="px-2">
          <ToolBtn onClick={() => addActor('player', 'away')} title="Add away player" count={awayCount}>
            <PlayerDot color="#ef4444" /> Add Player
          </ToolBtn>
        </div>

        {/* ── Objects ── */}
        <SectionLabel>Objects</SectionLabel>
        <div className="px-2 space-y-1">
          <ToolBtn onClick={() => addActor('ball', 'neutral')} title="Add ball" count={ballCount}>
            <BallDot /> Add Ball
          </ToolBtn>
          <ToolBtn onClick={() => addActor('cone', 'neutral')} title="Add cone" count={coneCount}>
            <ConeDot /> Add Cone
          </ToolBtn>
        </div>

        {/* ── Arrows ── */}
        <SectionLabel>Draw Arrows</SectionLabel>
        <div className="px-2 space-y-1">
          <ToolBtn active={tool('arrow-run')}  accent="bg-panel-3/60 text-foreground border border-border-light" onClick={() => setSelectedTool('arrow-run')}  title="Draw run path — drag on pitch">
            <RunArrowIcon /> Run Path
          </ToolBtn>
          <ToolBtn active={tool('arrow-pass')} accent="bg-panel-3/60 text-foreground border border-border-light" onClick={() => setSelectedTool('arrow-pass')} title="Draw pass — drag on pitch">
            <PassArrowIcon /> Pass
          </ToolBtn>
          <ToolBtn active={tool('arrow-kick')} accent="bg-panel-3/60 text-foreground border border-border-light" onClick={() => setSelectedTool('arrow-kick')} title="Draw kick — drag on pitch">
            <KickArrowIcon /> Kick
          </ToolBtn>
        </div>
        {arrowCount > 0 && (
          <div className="px-3 mt-1.5">
            <p className="text-[10px] text-muted-2">{arrowCount} arrow{arrowCount !== 1 ? 's' : ''} on this scene</p>
          </div>
        )}

        {/* ── Zones ── */}
        <SectionLabel>Draw Zones</SectionLabel>
        <div className="px-2 space-y-1.5">
          <ToolBtn active={tool('zone')} accent="bg-panel-3/60 text-foreground border border-border-light" onClick={() => setSelectedTool('zone')} title="Draw a zone — drag on pitch">
            <ZoneIcon /> Zone
          </ToolBtn>
          <div className="flex gap-1.5 px-0.5 flex-wrap">
            {ZONE_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setActiveZoneColor(c.value)}
                title={c.label}
                className={`w-5 h-5 rounded-full border-2 transition-all ${activeZoneColor === c.value ? 'border-white scale-110 shadow-lg' : 'border-border hover:border-border-light'}`}
                style={{ background: c.bg }}
              />
            ))}
          </div>
          {zoneCount > 0 && (
            <p className="text-[10px] text-muted-2 px-0.5">{zoneCount} zone{zoneCount !== 1 ? 's' : ''} on this scene</p>
          )}
        </div>

        {/* ── Danger zone ── */}
        <div className="px-2 mt-4">
          <button
            onClick={() => { if (actors.length === 0 && arrowCount === 0 && zoneCount === 0) return; clearSceneActors(); }}
            disabled={actors.length === 0 && arrowCount === 0 && zoneCount === 0}
            className="w-full py-2 rounded-lg text-xs font-medium text-muted-2 hover:text-danger hover:bg-danger/10 border border-border hover:border-danger/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear Scene
          </button>
        </div>

        {/* ── Keyboard shortcuts ── */}
        <div className="mt-auto mx-3 mb-2 rounded-xl bg-panel-2/50 border border-border/40 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/40">
            <p className="text-[10px] font-semibold tracking-widest text-muted-2 uppercase">Shortcuts</p>
          </div>
          <div className="px-3 py-2 space-y-1.5">
            {[['Space','Play / Stop'],['⌘Z','Undo'],['⌘⇧Z','Redo'],['⌫','Delete selected'],['Esc','Deselect / cancel']].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-2">{desc}</span>
                <kbd className="text-[9px] font-mono bg-panel-3/80 text-muted px-1.5 py-0.5 rounded shrink-0">{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Modals (rendered outside the aside so z-index works correctly) ── */}
      {createModal && (
        <CreatePresetModal
          mode="create"
          initialCategory="custom"
          onSave={(name, category, direction) => {
            handleCreatePreset(name, category, direction);
            setCreateModal(false);
          }}
          onClose={() => setCreateModal(false)}
        />
      )}

      {renameTarget && (
        <CreatePresetModal
          mode="rename"
          initialName={renameTarget.name}
          initialCategory={renameTarget.category}
          initialDirection={renameTarget.direction}
          onSave={handleRename}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SelectIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 4.702z" /></svg>;
}
function PlayerDot({ color }: { color: string }) {
  return <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill={color} stroke="white" strokeWidth="1.5" /><text x="9" y="13" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">#</text></svg>;
}
function BallDot() {
  return <svg width="18" height="18" viewBox="0 0 18 18"><ellipse cx="9" cy="9" rx="5" ry="8" fill="#f59e0b" stroke="white" strokeWidth="1.2" transform="rotate(-20 9 9)" /></svg>;
}
function ConeDot() {
  return <svg width="18" height="18" viewBox="0 0 18 18"><polygon points="9,2 2,16 16,16" fill="#f97316" stroke="white" strokeWidth="1.2" /></svg>;
}
function RunArrowIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><path d="M2 7 L13 7" stroke="white" strokeWidth="2" strokeLinecap="round" /><path d="M10 3 L15 7 L10 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
}
function PassArrowIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><path d="M2 7 L13 7" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 2.5" /><path d="M10 3 L15 7 L10 11" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
}
function KickArrowIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><path d="M2 7 L13 7" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="5 3" /><path d="M10 3 L15 7 L10 11" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
}
function ZoneIcon() {
  return <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><rect x="2" y="2" width="14" height="10" rx="1.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeDasharray="3 2" fill="rgba(255,255,255,0.12)" /></svg>;
}
function DotsIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>;
}
function FormationIcon({ category }: { category: FormationCategory }) {
  if (category === 'kickoff' || category === 'restart') {
    return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.35)" strokeWidth="1" /><circle cx="7" cy="7" r="1.5" fill="rgba(255,255,255,0.5)" /></svg>;
  }
  if (category === 'lineout') {
    return <svg width="14" height="14" viewBox="0 0 14 14" fill="none">{[2,5,8,11].map((y) => <circle key={y} cx="7" cy={y} r="1.3" fill="rgba(255,255,255,0.45)" />)}</svg>;
  }
  if (category === 'scrum') {
    return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="7" r="2.5" stroke="rgba(59,130,246,0.6)" strokeWidth="1.2" fill="none" /><circle cx="10" cy="7" r="2.5" stroke="rgba(239,68,68,0.6)" strokeWidth="1.2" fill="none" /></svg>;
  }
  if (category === 'custom') {
    return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="rgba(237,106,31,0.6)" strokeWidth="1.5" strokeLinecap="round" /></svg>;
  }
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="1" stroke="rgba(255,255,255,0.35)" strokeWidth="1" /></svg>;
}
