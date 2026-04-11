"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileAudio, X, Clock } from "lucide-react";

interface UploadedFile {
  name: string;
  duration: string;
  size: string;
}

export function UploadPanel() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    // Simulate duration extraction (no real audio decode needed for demo)
    const fakeDuration = (Math.random() * 8 + 1).toFixed(2);
    const sizeKB = (f.size / 1024).toFixed(1);
    setFile({ name: f.name, duration: `${fakeDuration}s`, size: `${sizeKB} KB` });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">
          Upload WAV File
        </h2>
        {file && (
          <button
            onClick={() => setFile(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!file ? (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 ${
            dragging
              ? "border-primary bg-primary/10 glow-cyan"
              : "border-border hover:border-primary/50 hover:bg-primary/5"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload WAV file by clicking or dragging"
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".wav,audio/wav"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className={`p-3 rounded-full bg-primary/10 transition-all ${dragging ? "scale-110" : ""}`}>
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm text-foreground font-medium">
              {dragging ? "Release to upload" : "Drag & drop a WAV file"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
          </div>
          <div className="flex gap-2 mt-1">
            {["WAV", "AIFF", "FLAC"].map((ext) => (
              <span
                key={ext}
                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono"
              >
                .{ext.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20 glow-cyan">
          <div className="p-2 rounded-lg bg-primary/20">
            <FileAudio className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <div className="flex gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> {file.duration}
              </span>
              <span className="text-xs text-muted-foreground">{file.size}</span>
            </div>
          </div>
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      )}

      <div className="flex gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-0.5 rounded-full bg-muted/50 font-mono">48 kHz</span>
        <span className="px-2 py-0.5 rounded-full bg-muted/50 font-mono">16-bit</span>
        <span className="px-2 py-0.5 rounded-full bg-muted/50 font-mono">Mono / Stereo</span>
      </div>
    </div>
  );
}
