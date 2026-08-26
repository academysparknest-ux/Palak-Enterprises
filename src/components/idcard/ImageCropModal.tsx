import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Circle,
  Square,
  AlertCircle,
  Move,
} from 'lucide-react';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
  cropShape?: 'circle' | 'rect';
  title?: string;
  fileName?: string;
}

export function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  cropShape = 'circle',
  title = 'Crop & Align Student Photo',
  fileName = 'student-photo.jpg',
}: ImageCropModalProps) {
  const [shape, setShape] = useState<'circle' | 'rect'>(cropShape);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Constants
  const CROP_BOX_SIZE = 260; // px on screen
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3.5;

  // Reset parameters when image changes or modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(false);
      setError(null);
      setShape(cropShape);
    }
  }, [isOpen, imageSrc, cropShape]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);

    // Initial smart fit zoom
    const containerRatio = CROP_BOX_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
    if (containerRatio > 1) {
      setZoom(Math.min(MAX_ZOOM, Math.max(1, containerRatio)));
    } else {
      setZoom(1);
    }
  };

  // Mouse / Touch Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile / touch screens
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((prev + delta).toFixed(2)))));
  };

  // Rotate clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset zoom & pan
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped canvas
  const handleApplyCrop = () => {
    if (!imageRef.current || !imageLoaded) return;

    try {
      const OUTPUT_SIZE = 600; // 600x600 px high-res ID headshot
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Enable high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const scale = OUTPUT_SIZE / CROP_BOX_SIZE;

      ctx.save();
      // Move to center of canvas
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);
      // Apply pan offset scaled
      ctx.translate(offset.x * scale, offset.y * scale);
      // Apply zoom
      ctx.scale(zoom * scale, zoom * scale);

      const img = imageRef.current;
      // Draw image centered
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);
      ctx.restore();

      // Convert canvas to Blob & File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError('Failed to generate cropped image.');
            return;
          }
          const cleanName = fileName.replace(/\.[^/.]+$/, '') + '-cropped.jpg';
          const croppedFile = new File([blob], cleanName, { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(blob);
          onCropComplete(croppedFile, previewUrl);
          onClose();
        },
        'image/jpeg',
        0.92
      );
    } catch (err: any) {
      console.error('Crop export error:', err);
      setError(err?.message || 'Error creating cropped image.');
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-500">Drag to position & zoom for circular I-Card photo</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace & Interactive Canvas */}
        <div className="flex flex-col items-center bg-slate-900 p-6 select-none">
          {/* Crop Container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="relative cursor-grab active:cursor-grabbing overflow-hidden border border-slate-700 bg-slate-950 shadow-inner"
            style={{
              width: CROP_BOX_SIZE,
              height: CROP_BOX_SIZE,
              borderRadius: shape === 'circle' ? '50%' : '12px',
            }}
          >
            {/* Image Layer */}
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                width: CROP_BOX_SIZE,
                height: CROP_BOX_SIZE,
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Source to crop"
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
                className="max-w-none"
                style={{
                  maxHeight: 'none',
                  maxWidth: 'none',
                }}
              />
            </div>

            {/* Circular Grid & Mask Guide */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {shape === 'circle' ? (
                <div className="h-full w-full rounded-full border-2 border-dashed border-amber-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]" />
              ) : (
                <div className="h-full w-full rounded-xl border-2 border-dashed border-amber-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]" />
              )}
              {/* Centering crosshairs */}
              <div className="absolute h-3 w-3 border-t border-l border-amber-400/60" />
              <div className="absolute h-3 w-3 border-b border-r border-amber-400/60" />
            </div>

            {/* Drag hint badge */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 text-[9px] font-semibold text-white/90 backdrop-blur-xs">
              <Move size={10} /> Drag to center face
            </div>
          </div>

          {/* Quick Shape Selector */}
          <div className="mt-3.5 flex items-center gap-1 rounded-lg bg-slate-800/80 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setShape('circle')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                shape === 'circle' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Circle size={13} /> Circle I-Card
            </button>
            <button
              type="button"
              onClick={() => setShape('rect')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                shape === 'rect' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Square size={13} /> Rounded Card
            </button>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="space-y-3 bg-white p-5 border-t border-slate-100">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1.5">
                <ZoomIn size={14} className="text-slate-500" /> Zoom Level
              </span>
              <span className="font-mono text-slate-500">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.1).toFixed(2))))}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-amber-500"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.1).toFixed(2))))}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>

          {/* Action Buttons: Rotate & Reset */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <RotateCw size={13} /> Rotate 90°
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                <RefreshCw size={13} /> Reset
              </button>
            </div>

            {naturalSize.width > 0 && (
              <span className="text-[10px] text-slate-400 font-mono">
                {naturalSize.width}×{naturalSize.height}px
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 border border-rose-200">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="flex items-center gap-1.5 rounded-xl bg-[#123B70] px-5 py-2 text-xs font-bold text-white hover:bg-[#0e2f5a] shadow-xs transition"
          >
            <Check size={14} /> Crop & Save Photo
          </button>
        </div>
      </div>
    </div>
  );
}
