"use client";

import { useRef, useState, useCallback } from "react";
import { UploadCloud } from "lucide-react";

type VideoDropzoneProps = {
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadStatus?: string;
  uploadTone?: "idle" | "uploading" | "success" | "error";
  disabled?: boolean;
  acceptedFormats?: string;
  maxFileSizeLabel?: string;
  className?: string;
};

export function VideoDropzone({
  onFileSelected,
  isUploading = false,
  uploadProgress = 0,
  uploadStatus,
  uploadTone = "idle",
  disabled = false,
  acceptedFormats = "video/*",
  maxFileSizeLabel,
  className,
}: VideoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      if (!file.type.startsWith("video/")) return;
      onFileSelected(file);
    },
    [onFileSelected, disabled],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const showProgress = isUploading || uploadTone === "success" || uploadTone === "error";

  const borderClass = isDragOver
    ? "border-accent bg-accent/5"
    : "border-border";

  const interactiveClass = disabled || isUploading
    ? "pointer-events-none opacity-60 cursor-default"
    : "cursor-pointer hover:border-border-light";

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload a video file"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-xl border-2 border-dashed ${borderClass} bg-panel-2 py-12 px-6 flex flex-col items-center gap-2 text-center transition-colors ${interactiveClass} ${className ?? ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex items-center justify-center rounded-full bg-panel p-3">
        <UploadCloud size={40} className="text-muted-2" />
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Drag a match video here</p>
        <p className="text-xs text-muted">or click to browse</p>
      </div>

      {maxFileSizeLabel && (
        <p className="text-xs text-muted-2">{maxFileSizeLabel}</p>
      )}

      {showProgress && uploadStatus && (
        <div className="mt-2 w-full max-w-xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {uploadTone === "uploading" && (
            <>
              <p className="text-xs text-amber-400">{uploadStatus}</p>
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          )}
          {uploadTone === "success" && (
            <p className="text-xs text-success">{uploadStatus}</p>
          )}
          {uploadTone === "error" && (
            <p className="text-xs text-danger">{uploadStatus}</p>
          )}
        </div>
      )}
    </div>
  );
}
