"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

import ProductImageZoom from "@/components/ui/ProductImageZoom";

export default function ProductImageModal({ open, onClose, image, title, images = [] }) {
  const allImages = images && images.length > 0 ? images : image ? [image] : [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [image, open]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, allImages]);

  if (!open || allImages.length === 0) return null;

  const currentImage = allImages[selectedIndex] || image;

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setSelectedIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setSelectedIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex flex-col items-center justify-between bg-black/90 p-4 sm:p-6 backdrop-blur-md select-none"
          onClick={onClose}
        >
          {/* Top Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between z-10 py-2 px-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Maximize2 className="size-4" />
              </span>
              <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1 max-w-[60vw]">
                {title || "Product Image Preview"}
              </h4>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Main Image Container */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center overflow-hidden my-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            {allImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 z-20 flex size-10 sm:size-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/80 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg border border-white/10"
                title="Previous Image"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {/* Enlarged Image with Interactive Zoom & Drag */}
            <motion.div
              key={currentImage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative max-h-[75vh] max-w-[85vw] flex items-center justify-center z-10"
            >
              <ProductImageZoom
                src={currentImage}
                alt={title || "Enlarged view"}
                showLightboxButton={false}
                containerClassName="max-h-[70vh] max-w-[80vw] w-auto h-auto min-h-[280px]"
                className="max-h-[70vh] max-w-[80vw]"
              />
            </motion.div>

            {/* Next Button */}
            {allImages.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-4 z-20 flex size-10 sm:size-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/80 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-lg border border-white/10"
                title="Next Image"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {allImages.length > 1 && (
            <div
              className="w-full max-w-2xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`relative size-12 sm:size-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedIndex === idx
                      ? "border-primary scale-105 shadow-md shadow-primary/30"
                      : "border-white/20 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
