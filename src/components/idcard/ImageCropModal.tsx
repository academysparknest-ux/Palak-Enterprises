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
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
  optimizeCroppedCanvas,
  type PhotoOptimizationResult,
} from '../../lib/idcard/photoOptimizer';
import type { PhotoCropState } from '../../lib/idcard/types';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  initialCropState?: PhotoCropState | null;
  onClose: () => void;
  onCropComplete: (
    croppedFile: File,
    previewUrl: string,
    optimizationResult?: PhotoOptimizationResult,
    cropState?: PhotoCropState
  ) => void;
  cropShape?: 'circle' | 'rect';
  title?: string;
  fileName?: string;
  originalSizeBytes?: number;
}

export function ImageCropModal({
  isOpen,
  imageSrc,
  initialCropState,
  onClose,
  onCropComplete,
  cropShape = 'circle',
  title = 'Crop & Align Student Photo',
  fileName = 'student-photo.jpg',
  originalSizeBytes,
}: ImageCropModalProps) {
  const [shape, setShape] = useState<'circle' | 'rect'>(initialCropState?.shape || cropShape);
  const [zoom, setZoom] = useState<number>(initialCropState?.scale ?? 1);
  const [rotation, setRotation] = useState<number>(initialCropState?.rotation ?? 0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({
    x: initialCropState?.x ?? 0,
    y: initialCropState?.y ?? 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: initialCropState?.naturalWidth ?? 0,
    height: initialCropState?.naturalHeight ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  // Multi-touch pinch tracking
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const prevOpenRef = useRef<boolean>(false);
  const prevImageSrcRef = useRef<string | null>(null);

  // Constants
  const DEFAULT_CROP_BOX_SIZE = 260; // default px on desktop
  const MIN_ZOOM = 0.1; // 10%
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

  // Restore previous saved state or initialize cleanly when modal opens
  useEffect(() => {
    if (isOpen && (!prevOpenRef.current || prevImageSrcRef.current !== imageSrc)) {
      if (initialCropState) {
        setShape(initialCropState.shape || cropShape);
        setZoom(initialCropState.scale ?? 1);
        setRotation(initialCropState.rotation ?? 0);
        setOffset({ x: initialCropState.x ?? 0, y: initialCropState.y ?? 0 });
      } else {
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
        setShape(cropShape);
      }
      setImageLoaded(false);
      setError(null);
      setIsProcessing(false);
      setShowDiscardConfirm(false);
    }
    prevOpenRef.current = isOpen;
    prevImageSrcRef.current = imageSrc;
  }, [isOpen, imageSrc, cropShape, initialCropState]);

  // Synchronously detect if image is already cached/complete in DOM
  useEffect(() => {
    if (isOpen && imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
      setImageLoaded(true);
      setNaturalSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
  }, [isOpen, safeImageSrc, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);

      // Smart initial fit if no prior crop state existed and zoom is at 1
      if (!initialCropState) {
        const currentBoxSize = containerRef.current?.clientWidth || DEFAULT_CROP_BOX_SIZE;
        const containerRatio = currentBoxSize / Math.min(img.naturalWidth, img.naturalHeight);
        if (containerRatio > 1 && zoom === 1) {
          setZoom(Math.min(MAX_ZOOM, Math.max(1, containerRatio)));
        }
      }
    }
  };

  // Track if user made dirty edits relative to initial state
  const isDirty = (() => {
    const origShape = initialCropState?.shape || cropShape;
    const origZoom = initialCropState?.scale ?? 1;
    const origRot = initialCropState?.rotation ?? 0;
    const origX = initialCropState?.x ?? 0;
    const origY = initialCropState?.y ?? 0;

    return (
      shape !== origShape ||
      Math.abs(zoom - origZoom) > 0.01 ||
      rotation !== origRot ||
      Math.abs(offset.x - origX) > 1 ||
      Math.abs(offset.y - origY) > 1
    );
  })();

  const handleRequestClose = useCallback(() => {
    if (isDirty && !showDiscardConfirm) {
      setShowDiscardConfirm(true);
      return;
    }
    setShowDiscardConfirm(false);
    onClose();
  }, [isDirty, showDiscardConfirm, onClose]);

  // Mouse / Touch Dragging with window-level handlers to prevent stuck drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  useEffect(() => {
    if (!isDragging) return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const onGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [isDragging, dragStart]);

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

  // Reset zoom & pan without touching original source
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setShape(cropShape);
  };

  // Keyboard navigation for precision fine-tuning
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
        return;
      }

      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setOffset((prev) => ({ ...prev, y: prev.y - step }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setOffset((prev) => ({ ...prev, y: prev.y + step }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setOffset((prev) => ({ ...prev, x: prev.x - step }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setOffset((prev) => ({ ...prev, x: prev.x + step }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleRequestClose]);

  // Export cropped canvas & optimize client-side from ORIGINAL source
  const handleApplyCrop = async () => {
    if (isProcessing) return;
    setError(null);

    const img = imageRef.current;
    if (!img) {
      setError('Image element is not available.');
      return;
    }

    const isReady = imageLoaded || img.complete || (img.naturalWidth > 0 && img.naturalHeight > 0);
    if (!isReady || img.naturalWidth === 0 || img.naturalHeight === 0) {
      setError('Image is still loading. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);

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

      const naturalW = img.naturalWidth || naturalSize.width;
      const naturalH = img.naturalHeight || naturalSize.height;

      // Draw original image centered
      ctx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
      ctx.restore();

      // Optimize cropped canvas locally (Resize -> Compress -> <=250KB)
      const optResult = await optimizeCroppedCanvas(canvas, fileName, {
        originalSizeBytes,
      });

      const finalCropState: PhotoCropState = {
        shape,
        x: offset.x,
        y: offset.y,
        scale: zoom,
        rotation,
        naturalWidth: naturalW,
        naturalHeight: naturalH,
        viewportWidth: displayedCropBoxSize,
        viewportHeight: displayedCropBoxSize,
      };

      optResult.cropState = finalCropState;

      onCropComplete(optResult.file, optResult.previewUrl, optResult, finalCropState);
      onClose();
    } catch (err: any) {
      console.error('Crop & optimize error:', err);
      setError(err?.message || 'We could not process this photo. Please try again. Your existing photo is still safe.');
    } finally {
      setIsProcessing(false);
    }
  };

  useScrollLock(isOpen);

  if (!isOpen || (!safeImageSrc && !imageSrc) || typeof document === 'undefined') return null;

  const effectiveZoom = Math.max(0.01, zoom);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-xs overflow-hidden"
    >
      <div
        className="flex w-full max-w-lg max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-40px)] flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative"
      >
        {/* Discard Changes Prompt overlay */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <h4 className="text-sm font-bold text-slate-900">Discard unsaved crop changes?</h4>
              <p className="text-xs text-slate-600">
                You have adjusted the framing. Your previous saved crop and original photo will remain untouched.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 shadow-xs transition cursor-pointer"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header (Sticky / Shrink-0) */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-5 sm:py-3.5 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{title}</h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              Adjust framing without permanently cropping your original photo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Middle Body (Workspace + Controls) */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 divide-y divide-slate-100">
          {/* Workspace & Interactive Canvas */}
          <div className="flex flex-col items-center justify-center bg-slate-900 px-3 py-3.5 sm:p-4 select-none shrink-0">
            {/* Crop Container - Responsive sizing */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className="relative cursor-grab active:cursor-grabbing overflow-hidden border border-slate-700 bg-slate-950 shadow-inner w-[210px] h-[210px] xs:w-[230px] xs:h-[230px] sm:w-[250px] sm:h-[250px] touch-none"
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

              {/* Circular / Rounded Grid & Mask Guide */}
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

            {/* Non-destructive guarantee badge */}
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <CheckCircle2 size={12} className="shrink-0" />
              <span>Your original photo is preserved. You can reposition or zoom again anytime.</span>
            </div>

            {/* Quick Shape Selector */}
            <div className="mt-2.5 flex items-center gap-1 rounded-lg bg-slate-800/80 p-1 border border-slate-700">
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
          <div className="space-y-2.5 bg-white p-3.5 sm:p-4">
            {/* Zoom Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1.5">
                  <ZoomIn size={14} className="text-slate-500" /> Zoom Level (10% – {Math.round(MAX_ZOOM * 100)}%)
                </span>
                <span className="font-mono font-bold text-amber-700">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.05).toFixed(2))))}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title="Zoom out"
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
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5 text-[10px]">
                <span className="text-slate-400 font-medium">Quick:</span>
                {[0.5, 1, 1.2, 1.5, 2, 3.5].map((presetVal) => {
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

            {/* Action Buttons: Rotate & Reset & Status metrics */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
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

              {/* Status Metrics Bar */}
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                  Shape: {shape === 'circle' ? 'Circle' : 'Rounded'}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                  Zoom: {Math.round(zoom * 100)}%
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5">
                  Rotation: {rotation}°
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                  Output: 600×600 px
                </span>
              </div>
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
            onClick={handleRequestClose}
            disabled={isProcessing}
            className="flex-1 sm:flex-none justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isProcessing}
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] px-5 py-2 text-xs font-bold text-white hover:bg-[#0e2f5a] shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Optimizing Photo...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Crop & Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
