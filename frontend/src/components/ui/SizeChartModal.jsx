"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Ruler, Check } from "lucide-react";

const DEFAULT_MEASUREMENTS = [
  { size: "S", chest: "38", long: "27", shoulder: "17" },
  { size: "M", chest: "40", long: "28", shoulder: "18" },
  { size: "L", chest: "42", long: "29", shoulder: "19" },
  { size: "XL", chest: "44", long: "30", shoulder: "20" },
  { size: "XXL", chest: "46", long: "31", shoulder: "21" },
];

const FIELD_LABELS = {
  chest: "Chest",
  long: "Length",
  body: "Body",
  shoulder: "Shoulder",
  sleeve: "Sleeve",
  waist: "Waist",
  hip: "Hip",
  thigh: "Thigh",
  ageGroup: "Age",
  footLength: "Foot Length",
  euSize: "EU/UK Size",
};

export default function SizeChartModal({
  open,
  onClose,
  product,
  selectedSize,
  onSelectSize,
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const hasCustomMeasurements =
    Array.isArray(product?.sizeMeasurements) && product.sizeMeasurements.length > 0;

  const measurements = hasCustomMeasurements
    ? product.sizeMeasurements
    : DEFAULT_MEASUREMENTS;

  const columnKeysSet = new Set();
  measurements.forEach((m) => {
    Object.keys(m || {}).forEach((k) => {
      if (k !== "size" && k !== "_id" && m[k]) {
        columnKeysSet.add(k);
      }
    });
  });
  const columnKeys = Array.from(columnKeysSet);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Ruler className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Size Guide & Measurements
                </h3>
                <p className="text-xs text-muted-foreground">
                  All measurements are in inches (Inches)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                      <th className="px-3.5 py-2.5 text-center">Size</th>
                      {columnKeys.map((key) => (
                        <th key={key} className="px-3.5 py-2.5 text-center whitespace-nowrap">
                          {FIELD_LABELS[key] || key.toUpperCase()}
                        </th>
                      ))}
                      {onSelectSize && (
                        <th className="px-3 py-2.5 text-center">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {measurements.map((m, idx) => {
                      const isSelected = selectedSize === m.size;
                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-primary/5 font-bold"
                              : idx % 2 === 0
                              ? "bg-muted/15 hover:bg-muted/30"
                              : "bg-card hover:bg-muted/30"
                          }`}
                        >
                          <td className="px-3.5 py-2.5 font-bold text-center text-foreground">
                            {m.size}
                          </td>
                          {columnKeys.map((key) => (
                            <td
                              key={key}
                              className="px-3.5 py-2.5 text-center text-foreground font-medium"
                            >
                              {m[key] || "-"}
                            </td>
                          ))}
                          {onSelectSize && (
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectSize(m.size);
                                  onClose();
                                }}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted hover:bg-primary hover:text-primary-foreground text-foreground border border-border"
                                }`}
                              >
                                {isSelected ? (
                                  <span className="flex items-center gap-1">
                                    <Check className="size-3" /> Selected
                                  </span>
                                ) : (
                                  "Select"
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

