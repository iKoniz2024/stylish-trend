"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, ShoppingCart, Zap } from "lucide-react";

import toast from "react-hot-toast";
import { useAddToCart } from "@/hooks/useAddToCart";
import { formatBDT } from "@/utils/currency";

export default function OrderModal({ product, open, onClose, mode = "checkout" }) {
  const router = useRouter();
  const { addToCart } = useAddToCart();
  const [mounted, setMounted] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(() => product?.colors?.[0] || null);
  const [selectedDynamicAttrs, setSelectedDynamicAttrs] = useState(() => {
    const initialAttrs = {};
    if (product?.attributes && typeof product.attributes === "object") {
      Object.entries(product.attributes).forEach(([k, v]) => {
        if (k === "sizes" || k === "size" || k === "colors" || k === "color") return;
        let options = [];
        if (Array.isArray(v)) options = v.filter(Boolean);
        else if (typeof v === "string" && v.includes(",")) options = v.split(",").map(s => s.trim()).filter(Boolean);
        if (options.length > 0) initialAttrs[k] = options[0];
      });
    }
    return initialAttrs;
  });
  const [activeDisplayImage, setActiveDisplayImage] = useState(() => product?.colors?.[0]?.image || null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !product || !mounted) return null;

  const isCheckoutMode = mode === "checkout";
  const hasDiscount = product.discountPercentage > 0;
  const discountedPrice = hasDiscount
    ? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
    : null;
  const isOutOfStock = product.stock === 0;

  const extractSizes = (prod) => {
    if (!prod) return [];
    const found = new Set();
    if (Array.isArray(prod.sizes)) {
      prod.sizes.forEach(s => typeof s === 'string' && s.trim() && found.add(s.trim()));
    } else if (typeof prod.sizes === 'string' && prod.sizes.trim()) {
      prod.sizes.split(',').forEach(s => s.trim() && found.add(s.trim()));
    }
    if (typeof prod.size === 'string' && prod.size.trim()) {
      prod.size.split(',').forEach(s => s.trim() && found.add(s.trim()));
    }
    if (Array.isArray(prod.sizeMeasurements)) {
      prod.sizeMeasurements.forEach(sm => {
        if (typeof sm === 'string' && sm.trim()) found.add(sm.trim());
        else if (sm && typeof sm.size === 'string' && sm.size.trim()) found.add(sm.size.trim());
      });
    }
    if (Array.isArray(prod.variants)) {
      prod.variants.forEach(v => {
        if (v && typeof v.size === 'string' && v.size.trim()) found.add(v.size.trim());
        if (v && v.options && typeof v.options.size === 'string' && v.options.size.trim()) found.add(v.options.size.trim());
      });
    }
    if (Array.isArray(prod.options)) {
      prod.options.forEach(opt => {
        if (opt && opt.name && opt.name.toLowerCase().includes('size') && Array.isArray(opt.values)) {
          opt.values.forEach(val => typeof val === 'string' && val.trim() && found.add(val.trim()));
        }
      });
    }
    if (prod.attributes && typeof prod.attributes === 'object') {
      Object.entries(prod.attributes).forEach(([k, v]) => {
        const keyLower = k.toLowerCase().replace(/_/g, ' ');
        if (keyLower.includes('size')) {
          if (Array.isArray(v)) {
            v.forEach(val => typeof val === 'string' && val.trim() && found.add(val.trim()));
          } else if (typeof v === 'string' && v.trim()) {
            v.split(',').forEach(val => val.trim() && found.add(val.trim()));
          }
        }
      });
    }

    return Array.from(found);
  };

  const availableSizes = extractSizes(product);
  const hasSizes = availableSizes.length > 0;

  if (availableSizes.length === 1 && !selectedSize) {
    setSelectedSize(availableSizes[0]);
  }

  const getFinalVariantLabel = () => {
    const dynamicSpecs = Object.entries(selectedDynamicAttrs)
      .map(([k, v]) => {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return `${label}: ${v}`;
      })
      .filter(Boolean)
      .join(", ");
    return [selectedSize, dynamicSpecs].filter(Boolean).join(" | ");
  };

  const handleAddToCartOnly = async () => {
    if (hasSizes && !selectedSize) {
      toast.error("Please select size");
      return;
    }
    if (product.colors?.length > 0 && !selectedColor) {
      toast.error("Please select a color");
      return;
    }
    await addToCart(
      product,
      quantity,
      getFinalVariantLabel() || "",
      selectedColor?.name || "",
      selectedColor?.image || "",
      true
    );
    onClose();
  };

  const handleOrderNowOnly = async () => {
    if (hasSizes && !selectedSize) {
      toast.error("Please select size");
      return;
    }
    if (product.colors?.length > 0 && !selectedColor) {
      toast.error("Please select a color");
      return;
    }
    await addToCart(
      product,
      quantity,
      getFinalVariantLabel() || "",
      selectedColor?.name || "",
      selectedColor?.image || "",
      false
    );
    onClose();
    router.push("/checkout");
  };

  const previewImage = activeDisplayImage || product.thumbnail || product.images?.[0] || null;
  const productAttrs = product.attributes || {};
  const attrEntries = Object.entries(productAttrs).filter(([k, v]) => v !== undefined && v !== null && v !== "" && k !== "sizes" && k !== "size");

  const modalContent = (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-xl sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col rounded-2xl bg-background border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-md px-4 sm:px-6 py-3.5">
          <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
            {isCheckoutMode ? "Select Options & Order Now" : "Select Options"}
          </h3>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="size-36 sm:size-44 overflow-hidden rounded-xl border border-border bg-muted shadow-xs">
                <img
                  src={previewImage}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3.5">
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                  {product.title}
                </h4>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg sm:text-xl font-bold text-foreground">
                    {formatBDT(hasDiscount ? discountedPrice : product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-xs sm:text-sm text-muted-foreground line-through">
                      {formatBDT(product.price)}
                    </span>
                  )}
                </div>
              </div>

              {/* Render dynamic specification badges if any attributes exist */}
              {attrEntries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {attrEntries.map(([k, v]) => (
                    <span key={k} className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-foreground font-medium">
                      <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}:</span> {Array.isArray(v) ? v.join(", ") : String(v)}
                    </span>
                  ))}
                </div>
              )}

              {product.colors?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs sm:text-sm font-semibold text-foreground">
                    Choose Color : <span className="font-normal text-muted-foreground">{selectedColor?.name}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((colorObj, index) => {
                      const isSelected = selectedColor?.name === colorObj.name;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setSelectedColor(colorObj);
                            if (colorObj.image) {
                              setActiveDisplayImage(colorObj.image);
                            }
                          }}
                          className={`flex items-center gap-2 rounded-lg border-2 p-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "border-foreground bg-muted/40 ring-1 ring-foreground"
                              : "border-border hover:border-foreground/50 bg-background"
                          }`}
                        >
                          <div className="size-7 sm:size-8 overflow-hidden rounded border border-border bg-muted shrink-0">
                            <img
                              src={colorObj.image || product.thumbnail}
                              alt={colorObj.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="pr-1.5 text-xs font-semibold text-foreground">
                            {colorObj.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasSizes && (
                <div>
                  <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-foreground">
                    Select Size <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSize || ""}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground shadow-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    >
                      <option value="">-- Choose Size --</option>
                      {availableSizes.map((size) => (
                        <option key={size} value={size}>
                          Size: {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
                    {availableSizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                            : "border-border bg-card text-foreground hover:border-foreground/50"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Selectable Attribute Options (e.g. Age Range, RAM, Storage, etc.) */}
              {product?.attributes && typeof product.attributes === "object" && (() => {
                const selectableEntries = Object.entries(product.attributes).filter(([key, val]) => {
                  if (key === "sizes" || key === "size" || key === "colors" || key === "color") return false;
                  if (Array.isArray(val) && val.length > 0) return true;
                  if (typeof val === "string" && val.includes(",")) return true;
                  return false;
                });

                if (selectableEntries.length === 0) return null;

                return selectableEntries.map(([key, val]) => {
                  const options = Array.isArray(val)
                    ? val
                    : String(val).split(",").map((s) => s.trim()).filter(Boolean);
                  if (options.length === 0) return null;

                  const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                  const selectedVal = selectedDynamicAttrs[key] || options[0];

                  return (
                    <div key={key}>
                      <p className="mb-1.5 text-xs sm:text-sm font-semibold text-foreground">
                        Choose {label} : <span className="font-normal text-muted-foreground">{selectedVal || `Select ${label}`}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {options.map((opt) => {
                          const isSelected = selectedVal === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSelectedDynamicAttrs((prev) => ({ ...prev, [key]: opt }))}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                                  : "border-border bg-card text-foreground hover:border-foreground/50"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}

              <div>
                <p className="mb-2 text-xs sm:text-sm font-semibold text-foreground">Choose Quantity</p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex size-9 sm:size-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted cursor-pointer"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="flex size-9 sm:size-10 items-center justify-center rounded-lg border border-border text-xs sm:text-sm font-semibold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex size-9 sm:size-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted cursor-pointer"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="sticky bottom-0 z-10 shrink-0 flex items-center justify-between border-t border-border bg-background/95 backdrop-blur-md px-4 sm:px-6 py-3.5 gap-3">
          <button
            onClick={handleAddToCartOnly}
            disabled={isOutOfStock}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-secondary-foreground px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all hover:bg-secondary/80 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <ShoppingCart className="size-4 shrink-0" />
            <span className="truncate">Add to cart</span>
          </button>
          <button
            onClick={handleOrderNowOnly}
            disabled={isOutOfStock}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl btn-action-gold px-3.5 py-2.5 text-xs sm:text-sm font-extrabold shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Zap className="size-4 fill-current shrink-0" />
            <span className="truncate">Order Now</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

