"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Move } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductImageZoom({
  src,
  alt = "Product image",
  discountBadge = null,
  showLightboxButton = true,
  className = "",
  containerClassName = "aspect-square w-full",
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showLightbox, setShowLightbox] = useState(false);

  // Reset zoom & pan when image source changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 50, y: 50 });
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setIsHovered(false);
  }, [src]);

  // Handle Mouse Move for Cursor Tracking or Dragging
  const handleMouseMove = useCallback(
    (e) => {
      if (!containerRef.current) return;

      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (zoom > 1 || isHovered) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setPosition({ x, y });
      }
    },
    [isDragging, dragStart, zoom, isHovered]
  );

  // Mouse Down for Dragging
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Start / Move / End for Mobile Panning
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Scroll Wheel Zooming
  const handleWheel = (e) => {
    if (!isHovered) return;
    // Prevent page scroll when wheeling over image
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.35 : -0.35;
    setZoom((prev) => {
      const next = Math.min(Math.max(1, +(prev + delta).toFixed(2)), 4.5);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  // Double Click / Tap to Toggle Zoom
  const handleDoubleClick = (e) => {
    if (zoom > 1) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } else {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        setPosition({ x, y });
      }
      setZoom(2.5);
    }
  };

  // Button Handlers
  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(+(prev + 0.5).toFixed(2), 4.5));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoom((prev) => {
      const next = Math.max(1, +(prev - 0.5).toFixed(2));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e) => {
    if (e) e.stopPropagation();
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setPosition({ x: 50, y: 50 });
  };

  const activeScale = zoom > 1 ? zoom : isHovered ? 2.2 : 1;
  const isTransformed = activeScale > 1;

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsDragging(false);
          if (zoom === 1) setOffset({ x: 0, y: 0 });
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        className={`group relative overflow-hidden rounded-2xl border border-border bg-secondary/30 select-none ${
          isDragging
            ? "cursor-grabbing"
            : isTransformed
            ? "cursor-grab"
            : "cursor-zoom-in"
        } ${className}`}
      >
        {/* Main Image Container */}
        <div className={`relative ${containerClassName} overflow-hidden rounded-xl flex items-center justify-center`}>
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="h-full w-full object-contain transition-transform duration-200 ease-out will-change-transform"
            style={{
              transform: `scale(${activeScale}) translate(${offset.x / activeScale}px, ${
                offset.y / activeScale
              }px)`,
              transformOrigin:
                offset.x !== 0 || offset.y !== 0 ? "center center" : `${position.x}% ${position.y}%`,
            }}
          />
        </div>

        {/* Discount Badge */}
        {discountBadge && (
          <div className="absolute left-3 top-3 z-10 pointer-events-none badge-gold px-2.5 py-1 text-xs sm:text-sm font-bold shadow-xs">
            {discountBadge}
          </div>
        )}

        {/* Helper Instructions Pill */}
        {(isHovered || zoom > 1) && (
          <div className="absolute top-3 right-3 z-20 pointer-events-none rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[10px] font-semibold text-foreground backdrop-blur-md shadow-xs hidden sm:flex items-center gap-1.5 transition-opacity">
            <Move className="size-3 text-primary animate-pulse" />
            <span>{isDragging ? "Panning..." : zoom > 1 ? "Drag to move | Wheel to zoom" : "Hover to zoom | Drag to pan"}</span>
          </div>
        )}

        {/* Zoom Controls Bar Overlay */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-full border border-border/60 bg-background/85 p-1.5 shadow-md backdrop-blur-md transition-opacity duration-200 opacity-90 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex size-7 items-center justify-center rounded-full text-foreground hover:bg-muted active:scale-95 transition-all"
            title="Zoom In (+)"
          >
            <ZoomIn className="size-4" />
          </button>

          <span className="text-[10px] font-mono font-bold text-muted-foreground px-1 min-w-[28px] text-center">
            {activeScale.toFixed(1)}x
          </span>

          <button
            type="button"
            onClick={handleZoomOut}
            disabled={activeScale <= 1}
            className={`flex size-7 items-center justify-center rounded-full transition-all ${
              activeScale <= 1
                ? "text-muted-foreground/40 cursor-not-allowed"
                : "text-foreground hover:bg-muted active:scale-95"
            }`}
            title="Zoom Out (-)"
          >
            <ZoomOut className="size-4" />
          </button>

          {(zoom > 1 || offset.x !== 0 || offset.y !== 0) && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="flex size-7 items-center justify-center rounded-full text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 active:scale-95 transition-all"
              title="Reset Zoom"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}

          {showLightboxButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(true);
              }}
              className="flex size-7 items-center justify-center rounded-full text-foreground hover:bg-muted active:scale-95 transition-all ml-0.5 border-l border-border/50 pl-1"
              title="Fullscreen Mode"
            >
              <Maximize2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 p-4 backdrop-blur-lg select-none"
            onClick={() => setShowLightbox(false)}
          >
            <div
              className="relative max-h-[92vh] max-w-[95vw] w-full h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <ProductImageZoom
                src={src}
                alt={alt}
                showLightboxButton={false}
                containerClassName="max-h-[85vh] max-w-[90vw] w-auto h-auto"
                className="max-h-[85vh] max-w-[90vw]"
              />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full bg-white/20 text-white shadow-xl backdrop-blur-md hover:bg-white/30 active:scale-95 transition-all cursor-pointer border border-white/20"
                title="Close Lightbox"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
