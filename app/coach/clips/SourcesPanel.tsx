"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/app/components/EmptyState";
import { VideoDropzone } from "@/app/components/VideoDropzone";
import { VideoPlayer } from "@/app/components/VideoPlayer";
import { Film, Trash2, Play, X } from "lucide-react";
import type { MyTeamContext } from "@/lib/teamContext";
import {
  fetchVideoSources,
  uploadVideoSource,
  deleteVideoSource,
  getVideoSourceSignedUrl,
  formatFileSize,
  formatDuration,
  type VideoSource,
} from "@/lib/clipSourcesCloud";

export function SourcesPanel({ context }: { context: MyTeamContext }) {
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [previewSource, setPreviewSource] = useState<VideoSource | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { sources: fetched, error } = await fetchVideoSources(context.teamId);
    if (error) {
      console.error("[SourcesPanel] fetch error:", error);
    }
    setSources(fetched);
    setLoading(false);
  }, [context.teamId]);

  useEffect(() => {
    let cancelled = false;
    fetchVideoSources(context.teamId).then(({ sources: fetched, error }) => {
      if (cancelled) return;
      if (error) console.error("[SourcesPanel] fetch error:", error);
      setSources(fetched);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [context.teamId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted text-sm">
        Loading source videos…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">{sources.length} of 20 source videos used</div>
        {context.canManageTeam && !showUploadForm && (
          <button
            type="button"
            onClick={() => setShowUploadForm(true)}
            className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
          >
            Upload source video
          </button>
        )}
      </div>

      {showUploadForm && (
        <UploadForm
          teamId={context.teamId}
          onCancel={() => setShowUploadForm(false)}
          onUploaded={() => {
            setShowUploadForm(false);
            void refresh();
          }}
        />
      )}

      {sources.length === 0 && !showUploadForm && (
        <EmptyState
          icon={Film}
          title="No source videos yet"
          description={
            context.canManageTeam
              ? "Upload opposition footage, training video, or any external clip source to get started."
              : "Your head coach hasn't uploaded any source videos yet."
          }
        />
      )}

      {sources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              canDelete={context.canManageTeam}
              onPreview={() => setPreviewSource(source)}
              onDeleted={() => void refresh()}
            />
          ))}
        </div>
      )}

      {previewSource && (
        <PreviewModal source={previewSource} onClose={() => setPreviewSource(null)} />
      )}
    </div>
  );
}

function UploadForm({
  teamId,
  onCancel,
  onUploaded,
}: {
  teamId: string;
  onCancel: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [context, setContext] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file || !title.trim()) {
      setError("Please select a file and enter a title");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);

    const result = await uploadVideoSource({
      teamId,
      file,
      title: title.trim(),
      opponent: opponent.trim() || undefined,
      context: context.trim() || undefined,
      onProgress: setProgress,
    });

    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUploaded();
  };

  return (
    <div className="bg-panel border border-border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground-strong">Upload source video</h3>
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="text-muted hover:text-foreground"
        >
          <X size={18} />
        </button>
      </div>

      <VideoDropzone
        onFileSelected={setFile}
        isUploading={uploading}
        uploadProgress={progress}
        uploadTone={error ? "error" : "idle"}
        uploadStatus={
          uploading
            ? progress < 100
              ? `Uploading… ${progress}%`
              : "Finalising…"
            : file
              ? file.name
              : undefined
        }
        maxFileSizeLabel="up to 5 GB"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            placeholder="e.g. Wests U18 — Round 4"
            className="w-full bg-panel-2 border border-border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Opponent (optional)</label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            disabled={uploading}
            placeholder="e.g. Wests U18"
            className="w-full bg-panel-2 border border-border rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1">Context (optional)</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          disabled={uploading}
          rows={2}
          placeholder="e.g. Their lineout moves from the 2026 GF — bring into our setup"
          className="w-full bg-panel-2 border border-border rounded-md px-3 py-2 text-sm resize-none"
        />
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 text-sm border border-border rounded-md hover:bg-panel-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={uploading || !file || !title.trim()}
          className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}

function SourceCard({
  source,
  canDelete,
  onPreview,
  onDeleted,
}: {
  source: VideoSource;
  canDelete: boolean;
  onPreview: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { ok, error } = await deleteVideoSource(source);
    setDeleting(false);
    if (!ok) {
      alert(`Could not delete: ${error}`);
      return;
    }
    onDeleted();
  };

  return (
    <div className="bg-panel border border-border rounded-lg overflow-hidden group hover:border-border-light transition-colors">
      <button
        type="button"
        onClick={onPreview}
        className="w-full aspect-video bg-panel-3 flex items-center justify-center hover:bg-panel-2 transition-colors"
      >
        <Play size={32} className="text-muted group-hover:text-foreground" />
      </button>
      <div className="p-4 space-y-2">
        <div className="font-medium text-foreground-strong text-sm truncate">{source.title}</div>
        {source.opponent && (
          <div className="text-xs text-muted">vs {source.opponent}</div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{formatDuration(source.durationSeconds)}</span>
          <span>•</span>
          <span>{formatFileSize(source.fileSizeBytes)}</span>
        </div>
        {source.context && (
          <div className="text-xs text-muted line-clamp-2">{source.context}</div>
        )}
        {canDelete && (
          <div className="pt-2 flex justify-end">
            {confirmingDelete ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted">Delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-danger hover:underline disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="text-muted hover:underline"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-xs text-muted hover:text-danger flex items-center gap-1"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewModal({
  source,
  onClose,
}: {
  source: VideoSource;
  onClose: () => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { signedUrl: url, error: err } = await getVideoSourceSignedUrl(source.r2Path);
      if (cancelled) return;
      if (err) {
        setError(err);
        return;
      }
      setSignedUrl(url);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [source.r2Path]);

  const refreshUrl = useCallback(async () => {
    const { signedUrl: url } = await getVideoSourceSignedUrl(source.r2Path);
    if (url) setSignedUrl(url);
  }, [source.r2Path]);

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border rounded-lg max-w-4xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <div className="font-medium text-foreground-strong text-sm">{source.title}</div>
            {source.opponent && (
              <div className="text-xs text-muted">vs {source.opponent}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        <div className="aspect-video bg-black">
          {error ? (
            <div className="h-full flex items-center justify-center text-sm text-danger">
              {error}
            </div>
          ) : !signedUrl ? (
            <div className="h-full flex items-center justify-center text-sm text-muted">
              Loading…
            </div>
          ) : (
            <VideoPlayer
              src={signedUrl}
              enableFullscreen
              enableSkipButtons
              onError={() => {
                void refreshUrl();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
