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
  FlipHorizontal,
  Crop,
  Layers,
} from 'lucide-react';

export type CropShapeOption = 'circle' | 'square' | 'rect' | 'passport' | '3:4' | '4:3' | '16:9' | '3:2' | 'free';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
  cropShape?: CropShapeOption;
  title?: string;
  fileName?: string;
  allowShapeChange?: boolean;
  aspectRatio?: number; // Custom width/height ratio if specified
}

const PRESET_RATIOS: { id: CropShapeOption; label: string; ratio: number; isCircle?: boolean }[] = [
  { id: 'free', label: 'Original', ratio: 1 },
  { id: 'square', label: '1:1 Square', ratio: 1 },
  { id: 'passport', label: 'Passport (7:9)', ratio: 35 / 45 },
  { id: '3:4', label: '3:4 Portrait', ratio: 3 / 4 },
  { id: '4:3', label: '4:3 Photo', ratio: 4 / 3 },
  { id: '16:9', label: '16:9 Banner', ratio: 16 / 9 },
  { id: 'circle', label: 'Circle ID', ratio: 1, isCircle: true },
];

export function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  cropShape = 'free',
  title = 'Crop & Adjust Image',
  fileName = 'image.jpg',
  allowShapeChange = true,
  aspectRatio: customRatio,
}: ImageCropModalProps) {
  const [currentShape, setCurrentShape] = useState<CropShapeOption>(cropShape);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Viewport Box constants
  const MAX_BOX_WIDTH = 320;
  const MAX_BOX_HEIGHT = 280;
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 4.0;

  // Calculate dynamic crop box dimensions based on chosen shape/ratio
  const getCropBoxDimensions = useCallback(() => {
    let targetRatio = 1;

    if (customRatio && customRatio > 0) {
      targetRatio = customRatio;
    } else if (currentShape === 'free') {
      if (naturalSize.width > 0 && naturalSize.height > 0) {
        targetRatio = naturalSize.width / naturalSize.height;
      } else {
        targetRatio = 1;
      }
    } else {
      const found = PRESET_RATIOS.find((r) => r.id === currentShape);
      targetRatio = found ? found.ratio : 1;
    }

    let w = MAX_BOX_WIDTH;
    let h = w / targetRatio;

    if (h > MAX_BOX_HEIGHT) {
      h = MAX_BOX_HEIGHT;
      w = h * targetRatio;
    }

    return {
      width: Math.round(w),
      height: Math.round(h),
      ratio: targetRatio,
    };
  }, [currentShape, customRatio, naturalSize]);

  const boxDim = getCropBoxDimensions();

  // Reset parameters when image changes or modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setFlipH(false);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(false);
      setError(null);
      setCurrentShape(cropShape);
    }
  }, [isOpen, imageSrc, cropShape]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);

    // Smart initial fit: ensure image fills the crop box nicely
    const currentDim = getCropBoxDimensions();
    const scaleX = currentDim.width / img.naturalWidth;
    const scaleY = currentDim.height / img.naturalHeight;
    const coverScale = Math.max(scaleX, scaleY);

    if (coverScale > 0.05) {
      setZoom(Math.max(1, Number(coverScale.toFixed(2))));
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

  // Rotate 90 deg clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Flip horizontal
  const handleFlipH = () => {
    setFlipH((prev) => !prev);
  };

  // Reset zoom & pan & rotation
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped canvas
  const handleApplyCrop = () => {
    if (!imageRef.current || !imageLoaded) return;

    try {
      // High-res output dimensions for sharp printing
      const BASE_RES = 1200;
      const targetRatio = boxDim.ratio;

      let outWidth = BASE_RES;
      let outHeight = Math.round(BASE_RES / targetRatio);

      if (outHeight > BASE_RES) {
        outHeight = BASE_RES;
        outWidth = Math.round(BASE_RES * targetRatio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Enable high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Background fill (white for JPG compatibility)
      const isPng = fileName.toLowerCase().endsWith('.png');
      if (!isPng) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outWidth, outHeight);
      }

      // If circle crop, clip canvas
      if (currentShape === 'circle') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(outWidth / 2, outHeight / 2, Math.min(outWidth, outHeight) / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }

      const scaleMultiplier = outWidth / boxDim.width;

      ctx.save();
      // Move to center of canvas
      ctx.translate(outWidth / 2, outHeight / 2);

      // Rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Flip horizontal
      if (flipH) {
        ctx.scale(-1, 1);
      }

      // Pan offset scaled
      ctx.translate(offset.x * scaleMultiplier, offset.y * scaleMultiplier);

      // Zoom
      ctx.scale(zoom * scaleMultiplier, zoom * scaleMultiplier);

      const img = imageRef.current;
      // Draw image centered
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);

      ctx.restore();

      if (currentShape === 'circle') {
        ctx.restore();
      }

      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const fileExt = isPng ? '.png' : '.jpg';
      const cleanName = fileName.replace(/\.[^/.]+$/, '') + '-cropped' + fileExt;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError('Failed to generate cropped image.');
            return;
          }
          const croppedFile = new File([blob], cleanName, { type: mimeType });
          const previewUrl = URL.createObjectURL(blob);
          onCropComplete(croppedFile, previewUrl);
          onClose();
        },
        mimeType,
        0.95
      );
    } catch (err: any) {
      console.error('Crop export error:', err);
      setError(err?.message || 'Error creating cropped image.');
    }
  };

  if (!isOpen || !imageSrc) return null;

  const isCircleMask = currentShape === 'circle';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-xs">
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#123B70]/10 text-[#123B70]">
              <Crop size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">Drag to position, scroll or slide to zoom & align</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace & Interactive Canvas */}
        <div className="flex flex-col items-center justify-center bg-slate-900 p-4 sm:p-6 select-none overflow-hidden min-h-[310px]">
          {/* Crop Container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="relative cursor-grab active:cursor-grabbing overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl transition-[width,height] duration-200"
            style={{
              width: boxDim.width,
              height: boxDim.height,
              borderRadius: isCircleMask ? '50%' : '10px',
            }}
          >
            {/* Image Layer */}
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                width: boxDim.width,
                height: boxDim.height,
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${flipH ? -zoom : zoom}, ${zoom})`,
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

            {/* Grid & Mask Guide */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {isCircleMask ? (
                <div className="h-full w-full rounded-full border-2 border-dashed border-amber-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]" />
              ) : (
                <div className="h-full w-full rounded-lg border-2 border-dashed border-amber-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]">
                  {/* Rule of thirds grid lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-amber-400/25" />
                    <div className="border-r border-b border-amber-400/25" />
                    <div className="border-b border-amber-400/25" />
                    <div className="border-r border-b border-amber-400/25" />
                    <div className="border-r border-b border-amber-400/25" />
                    <div className="border-b border-amber-400/25" />
                    <div className="border-r border-b border-amber-400/25" />
                    <div className="border-r border-b border-amber-400/25" />
                    <div className="" />
                  </div>
                </div>
              )}
              {/* Centering crosshairs */}
              <div className="absolute h-3 w-3 border-t border-l border-amber-400/80" />
              <div className="absolute h-3 w-3 border-b border-r border-amber-400/80" />
            </div>

            {/* Drag hint badge */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 text-[9px] font-semibold text-white/90 backdrop-blur-xs">
              <Move size={10} /> Drag to adjust position
            </div>
          </div>

          {/* Aspect Ratio Switcher */}
          {allowShapeChange && (
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/80 max-w-full">
              {PRESET_RATIOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentShape(item.id)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    currentShape === item.id
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {item.isCircle ? <Circle size={11} /> : <Square size={11} />}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="space-y-3 bg-white p-4 sm:p-5 border-t border-slate-100">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1.5 font-semibold">
                <ZoomIn size={14} className="text-[#123B70]" /> Zoom Level
              </span>
              <span className="font-mono text-slate-500 font-semibold">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - 0.1).toFixed(2))))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
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
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#123B70]"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + 0.1).toFixed(2))))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>

          {/* Action Buttons: Rotate, Flip, Reset & Resolution */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotate}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw size={13} className="text-[#123B70]" /> Rotate 90°
              </button>
              <button
                type="button"
                onClick={handleFlipH}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                title="Flip Horizontally"
              >
                <FlipHorizontal size={13} className="text-[#123B70]" /> Flip
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                title="Reset adjustments"
              >
                <RefreshCw size={13} /> Reset
              </button>
            </div>

            {naturalSize.width > 0 && (
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                <Layers size={11} className="text-slate-400" />
                {naturalSize.width}×{naturalSize.height}px
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
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
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="flex items-center gap-1.5 rounded-xl bg-[#123B70] px-5 py-2 text-xs font-bold text-white hover:bg-[#0e2f5a] shadow-sm hover:shadow transition active:scale-95 cursor-pointer"
          >
            <Check size={14} /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
