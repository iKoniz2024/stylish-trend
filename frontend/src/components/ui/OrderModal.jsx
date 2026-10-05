"use client";

import { useRouter } from 'next/navigation';
import { useState } from "react";
import { X, Minus, Plus, ShoppingCart, Zap } from "lucide-react";

import toast from "react-hot-toast";
import { useAddToCart } from "@/hooks/useAddToCart";
import { formatBDT } from "@/utils/currency";

export default function OrderModal({ product, open, onClose, mode = "checkout" }) {
  const router = useRouter();
  const { addToCart } = useAddToCart();
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

  if (!open || !product) return null;

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
      selectedColor?.image || ""
    );
    onClose();
    window.dispatchEvent(new Event("open-cart-drawer"));
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
      selectedColor?.image || ""
    );
    onClose();
    router.push("/checkout");
  };

  const previewImage = activeDisplayImage || product.thumbnail || product.images?.[0] || null;
  const productAttrs = product.attributes || {};
  const attrEntries = Object.entries(productAttrs).filter(([k, v]) => v !== undefined && v !== null && v !== "" && k !== "sizes" && k !== "size");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-bold text-foreground">
            {isCheckoutMode ? "Select Options & Order Now" : "Select Options"}
          </h3>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6 sm:flex-row">
          <div className="shrink-0">
            <div className="size-40 overflow-hidden rounded-xl border border-border bg-muted sm:size-48">
              <img
                src={previewImage}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div>
              <h4 className="text-base font-semibold text-foreground sm:text-lg">
                {product.title}
              </h4>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-foreground">
                  {formatBDT(hasDiscount ? discountedPrice : product.price)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatBDT(product.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Render dynamic specification badges if any attributes exist */}
            {attrEntries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {attrEntries.map(([k, v]) => (
                  <span key={k} className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-foreground font-medium">
                    <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}:</span> {Array.isArray(v) ? v.join(", ") : String(v)}
                  </span>
                ))}
              </div>
            )}

            {product.colors?.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
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
                        className={`flex items-center gap-2 rounded-lg border-2 p-1.5 transition-all ${
                          isSelected
                            ? "border-foreground bg-muted/40 ring-1 ring-foreground"
                            : "border-border hover:border-foreground/50 bg-background"
                        }`}
                      >
                        <div className="size-8 overflow-hidden rounded border border-border bg-muted shrink-0">
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
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Select Size <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedSize || ""}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground shadow-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    <option value="">-- Choose Size --</option>
                    {availableSizes.map((size) => (
                      <option key={size} value={size}>
                        Size: {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
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

            {/* Dynamic Selectable Attribute Options (e.g. Age Range, Shoe Size, RAM, Storage, etc.) */}
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
                    <p className="mb-2 text-sm font-medium text-foreground">
                      Choose {label} : <span className="font-normal text-muted-foreground">{selectedVal || `Select ${label}`}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
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
              <p className="mb-2 text-sm font-medium text-foreground">Choose Quantity</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex size-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
                >
                  <Minus className="size-4" />
                </button>
                <span className="flex size-10 items-center justify-center rounded-lg border border-border text-sm font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="flex size-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 sm:px-6 py-3.5 gap-2.5 bg-muted/20">
          <button
            onClick={handleAddToCartOnly}
            disabled={isOutOfStock}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary text-secondary-foreground px-3 py-2 text-xs sm:text-sm font-bold transition-all hover:bg-secondary/80 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <ShoppingCart className="size-4 shrink-0 text-secondary-foreground" />
            <span className="truncate">Add to cart</span>
          </button>
          <button
            onClick={handleOrderNowOnly}
            disabled={isOutOfStock}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl btn-action-gold px-3 py-2.5 text-xs sm:text-sm font-extrabold shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Zap className="size-4 fill-current shrink-0" />
            <span className="truncate">Order Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
