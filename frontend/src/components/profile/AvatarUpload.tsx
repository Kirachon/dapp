"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { uploadPhotoDirect } from "@/lib/uploads";

function dataURLToBlob(dataURL: string): Blob {
  const [header, data] = dataURL.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/png";
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

export type AvatarUploadResult = {
  url: string;
  thumbnailUrl?: string;
  filename: string;
};

export function AvatarUpload({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: (r: AvatarUploadResult) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [zoom, setZoom] = useState<number>(1);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  const handleFile = (f: File) => {
    setError("");
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File is too large. Max 10MB");
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => setImageEl(img);
    img.src = url;
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const drawPreview = useCallback(() => {
    if (!imageEl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 512; // output size
    canvas.width = size;
    canvas.height = size;

    const iw = imageEl.width;
    const ih = imageEl.height;
    const aspect = iw / ih;

    // Base scale so that the shortest side fits the canvas
    const baseScale = aspect > 1 ? size / ih : size / iw;
    const scale = baseScale * zoom;

    const drawW = iw * scale;
    const drawH = ih * scale;

    // Centered crop (no pan for simplicity)
    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;

    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageEl, dx, dy, drawW, drawH);
  }, [imageEl, zoom]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  const upload = async () => {
    try {
      setError("");
      setUploadProgress(10); // indeterminate-like
      if (!canvasRef.current) return;
      // Export canvas to blob
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
      const blob = dataURLToBlob(dataUrl);
      const filename = `avatar_${Date.now()}.jpg`;
      const form = new FormData();
      form.append("file", blob, filename);

      const res = await uploadPhotoDirect(form);
      if (!res.success || !res.data) throw new Error(res.error || "Upload failed");

      onUploaded(res.data);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploadProgress(0);
    }
  };

  return (
    <div className="p-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Upload Avatar</h2>
        <p className="text-[var(--color-text-secondary)] text-sm">PNG or JPG up to 10MB. Image will be cropped to a square.</p>

        {!file && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="rounded-xl border-2 border-dashed border-[var(--color-border)] p-8 text-center cursor-pointer hover:bg-[var(--color-surface)]"
          >
            <input
              type="file"
              accept="image/*"
              aria-label="Choose image"
              onChange={onSelect}
              className="hidden"
              id="avatar-file-input"
            />
            <label htmlFor="avatar-file-input" className="block">
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl">📷</span>
                <span className="font-medium">Drag & drop an image, or click to select</span>
              </div>
            </label>
          </div>
        )}

        {file && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="w-[256px] h-[256px] rounded-xl overflow-hidden border border-[var(--color-border)]">
                <canvas ref={canvasRef} className="w-[256px] h-[256px]" aria-label="Avatar preview" />
              </div>
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <label htmlFor="zoom" className="text-sm font-medium">Zoom</label>
                  <input
                    id="zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">
                  {file.name} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            </div>

            {error && (
              <div role="alert" className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--color-border)]" aria-label="Cancel upload">Cancel</button>
              <button onClick={upload} className="px-4 py-2 rounded-lg bg-[var(--color-primary-500)] text-white disabled:opacity-60" aria-label="Upload" disabled={!file}>
                {uploadProgress > 0 ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

