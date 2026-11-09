"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const MAX_AVATAR_BYTES = 512 * 1024;
const PREVIEW_WIDTH = 240;

interface CropOffset {
  x: number;
  y: number;
}

interface ImageSize {
  width: number;
  height: number;
}

function clampOffset(offset: CropOffset, zoom: number, imageSize: ImageSize | null): CropOffset {
  if (!imageSize) return offset;
  const coverScale = Math.max(PREVIEW_WIDTH / imageSize.width, PREVIEW_WIDTH / imageSize.height);
  const maxX = Math.max(0, (imageSize.width * coverScale * zoom - PREVIEW_WIDTH) / 2);
  const maxY = Math.max(0, (imageSize.height * coverScale * zoom - PREVIEW_WIDTH) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}

async function createCroppedAvatar(file: File, zoom: number, offset: CropOffset) {
  const image = await createImageBitmap(file);
  try {
    const width = 512;
    const height = 512;
    const scale = Math.max(width / image.width, height / image.height) * zoom;
    const drawnWidth = image.width * scale;
    const drawnHeight = image.height * scale;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process this image");

    context.drawImage(
      image,
      (width - drawnWidth) / 2 + offset.x * (width / PREVIEW_WIDTH),
      (height - drawnHeight) / 2 + offset.y * (width / PREVIEW_WIDTH),
      drawnWidth,
      drawnHeight
    );

    for (const quality of [0.88, 0.78, 0.68, 0.58, 0.48, 0.38, 0.28]) {
      const avatarUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = avatarUrl.slice(avatarUrl.indexOf(",") + 1);
      if (Math.ceil(base64.length * 3 / 4) <= MAX_AVATAR_BYTES) return avatarUrl;
    }
    throw new Error("Could not compress this image enough. Try a different picture.");
  } finally {
    image.close();
  }
}

export function AvatarCropModal({
  file,
  previewUrl,
  onClose,
  onSave,
}: {
  file: File | null;
  previewUrl: string;
  onClose: () => void;
  onSave: (avatarUrl: string) => Promise<void>;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const dragStart = useRef<{ pointerId: number; x: number; y: number; offset: CropOffset } | null>(null);
  const previewScale = imageSize
    ? Math.max(PREVIEW_WIDTH / imageSize.width, PREVIEW_WIDTH / imageSize.height) * zoom
    : 1;

  async function save() {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const avatarUrl = await createCroppedAvatar(file, zoom, offset);
      await onSave(avatarUrl);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not process this image");
    } finally {
      setSaving(false);
    }
  }

  function startDragging(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offset };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setOffset(clampOffset({
      x: start.offset.x + event.clientX - start.x,
      y: start.offset.y + event.clientY - start.y,
    }, zoom, imageSize));
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current?.pointerId === event.pointerId) dragStart.current = null;
  }

  function updateZoom(nextZoom: number) {
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current, nextZoom, imageSize));
  }

  return (
    <Modal
      open={!!file}
      onClose={onClose}
      size="sm"
      title="Fit your profile picture"
      description="Drag and zoom to frame your photo inside the circle."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={() => void save()} loading={saving}>Save picture</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex justify-center py-2">
          <div
            className="relative size-60 shrink-0 touch-none select-none overflow-hidden rounded-full bg-slate-100"
            onPointerDown={startDragging}
            onPointerMove={drag}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onLostPointerCapture={stopDragging}
            aria-label="Drag to reposition profile picture"
          >
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="Profile picture crop preview"
                width={imageSize?.width ?? PREVIEW_WIDTH}
                height={imageSize?.height ?? PREVIEW_WIDTH}
                unoptimized
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none"
                style={{
                  left: "50%",
                  top: "50%",
                  width: imageSize ? imageSize.width * previewScale : PREVIEW_WIDTH,
                  height: imageSize ? imageSize.height * previewScale : PREVIEW_WIDTH,
                  objectFit: imageSize ? "fill" : "cover",
                  transform: `translate3d(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px), 0)`,
                  willChange: "transform",
                }}
                onLoad={(event) => {
                  const size = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight };
                  setPreviewError(false);
                  setImageSize(size);
                  setOffset((current) => clampOffset(current, zoom, size));
                }}
                onError={() => setPreviewError(true)}
              />
            )}
          </div>
        </div>
        {previewError && <p role="alert" className="text-center text-sm text-red-600">Could not preview this image. Choose a valid JPEG, PNG, or WebP file.</p>}
        <p className="-mt-3 text-center text-xs text-slate-500">Drag the photo to position it inside the circle.</p>
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(event) => updateZoom(Number(event.target.value))}
            className="w-full accent-brand-600"
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
