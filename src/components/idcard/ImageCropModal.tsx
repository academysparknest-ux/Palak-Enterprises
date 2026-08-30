import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { useScrollLock } from '../../hooks/useScrollLock';

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

  // Multi-touch pinch tracking
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Constants
  const DEFAULT_CROP_BOX_SIZE = 260; // default px on desktop
  const MIN_ZOOM = 0; // Allows user to set zoom starting from 0%
  const MAX_ZOOM = 3.5; // 350%

  // Handle remote URL converting to local blob URL if needed to avoid canvas CORS taint
  const [safeImageSrc, setSafeImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdBlobUrl: string | null = null;

    if (!isOpen || !imageSrc) {
      setSafeImageSrc(null);
      return;
    }

    if (imageSrc.startsWith('blob:') || imageSrc.startsWith('data:')) {
      setSafeImageSrc(imageSrc);
      return;
    }

    // Remote URL: fetch as blob to prevent tainted canvas issues
    fetch(imageSrc, { mode: 'cors' })
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        createdBlobUrl = URL.createObjectURL(blob);
        setSafeImageSrc(createdBlobUrl);
      })
      .catch((err) => {
        console.warn('Could not fetch image as blob, falling back to direct URL:', err);
        if (!cancelled) setSafeImageSrc(imageSrc);
      });

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [isOpen, imageSrc]);

  // Reset parameters when image changes or modal opens
  useEffect(() => {
    if (isOpen && (safeImageSrc || imageSrc)) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(false);
      setError(null);
      setShape(cropShape);
    }
  }, [isOpen, safeImageSrc, imageSrc, cropShape]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);

    // Initial smart fit zoom relative to displayed container
    const currentBoxSize = containerRef.current?.clientWidth || DEFAULT_CROP_BOX_SIZE;
    const containerRatio = currentBoxSize / Math.min(img.naturalWidth, img.naturalHeight);
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

  // Touch handlers for mobile / touch screens (including pinch-to-zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
      pinchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      // Pinch gesture
      setIsDragging(false);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const ratio = currentDist / pinchStartDistRef.current;
      const newZoom = Number((pinchStartZoomRef.current * ratio).toFixed(2));
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartDistRef.current = null;
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

      // Measure displayed crop box size for pixel-perfect scale
      const displayedCropBoxSize = containerRef.current?.clientWidth || DEFAULT_CROP_BOX_SIZE;
      const scale = OUTPUT_SIZE / displayedCropBoxSize;
      const effectiveZoom = Math.max(0.01, zoom);

      ctx.save();
      // Move to center of canvas
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      // Apply pan offset scaled (in screen space)
      ctx.translate(offset.x * scale, offset.y * scale);
      // Apply rotation around the center
      ctx.rotate((rotation * Math.PI) / 180);
      // Apply zoom
      ctx.scale(effectiveZoom * scale, effectiveZoom * scale);

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

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || (!safeImageSrc && !imageSrc) || typeof document === 'undefined') return null;

  const effectiveZoom = Math.max(0.01, zoom);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-xs overflow-hidden"
    >
      <div
        className="flex w-full max-w-lg max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-40px)] flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header (Sticky / Shrink-0) */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-5 sm:py-3.5 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{title}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              Drag to position & zoom for circular I-Card photo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Middle Body (Workspace + Controls) */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 divide-y divide-slate-100">
          {/* Workspace & Interactive Canvas */}
          <div className="flex flex-col items-center justify-center bg-slate-900 px-3 py-4 sm:p-5 select-none shrink-0">
            {/* Crop Container - Responsive sizing */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className="relative cursor-grab active:cursor-grabbing overflow-hidden border border-slate-700 bg-slate-950 shadow-inner w-[210px] h-[210px] xs:w-[240px] xs:h-[240px] sm:w-[260px] sm:h-[260px] touch-none"
              style={{
                borderRadius: shape === 'circle' ? '50%' : '12px',
              }}
            >
              {/* Image Layer */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${effectiveZoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
              >
                <img
                  ref={imageRef}
                  src={safeImageSrc || imageSrc || undefined}
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
              <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[8px] sm:text-[9px] font-semibold text-white/90 backdrop-blur-xs whitespace-nowrap">
                <Move size={10} /> Drag to center face
              </div>
            </div>

            {/* Quick Shape Selector */}
            <div className="mt-3 flex items-center gap-1 rounded-lg bg-slate-800/80 p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setShape('circle')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                  shape === 'circle' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Circle size={12} /> Circle I-Card
              </button>
              <button
                type="button"
                onClick={() => setShape('rect')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                  shape === 'rect' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Square size={12} /> Rounded Card
              </button>
            </div>
          </div>

          {/* Controls Toolbar */}
          <div className="space-y-3 bg-white p-3.5 sm:p-5">
            {/* Zoom Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <ZoomIn size={14} className="text-slate-500" /> Zoom Level (0% – {Math.round(MAX_ZOOM * 100)}%)
                </span>
                <span className="font-mono font-bold text-amber-700">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.05).toFixed(2))))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title="Zoom out (down to 0%)"
                >
                  <ZoomOut size={13} />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.05).toFixed(2))))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn size={13} />
                </button>
              </div>

              {/* Quick Zoom Presets */}
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-1 text-[10px]">
                <span className="text-slate-400 font-medium">Quick:</span>
                {[0, 0.5, 1, 1.5, 2].map((presetVal) => {
                  const percent = Math.round(presetVal * 100);
                  const isActive = Math.round(zoom * 100) === percent;
                  return (
                    <button
                      key={percent}
                      type="button"
                      onClick={() => setZoom(presetVal)}
                      className={`px-2 py-0.5 rounded border font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {percent}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Rotate & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <RotateCw size={13} /> Rotate 90°
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
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
        </div>

        {/* Footer Actions (Sticky / Shrink-0) */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 border-t border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-5 sm:py-3.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] px-5 py-2 text-xs font-bold text-white hover:bg-[#0e2f5a] shadow-xs transition cursor-pointer"
          >
            <Check size={14} /> Crop & Save Photo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
