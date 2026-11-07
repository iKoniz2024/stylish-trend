"use client";

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useMemo, useEffect } from "react";
import RelatedProducts from "@/components/sections/RelatedProducts";

import { useQuery } from "@tanstack/react-query";
import {
  Minus,
  Plus,
  Truck,
  Shield,
  RotateCcw,
  ChevronRight,
  Home,
  ShoppingCart,
} from "lucide-react";
import toast from "react-hot-toast";
import { getProductById } from "@/services/product.api";
import { useAddToCart } from "@/hooks/useAddToCart";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBDT } from "@/utils/currency";
import { setDirectCheckoutItem } from "@/utils/localCart";
import { Helmet } from "react-helmet-async";
import useSettings from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { event as trackPixelEvent } from "@/utils/fpixel";
import ProductImageZoom from "@/components/ui/ProductImageZoom";
import SizeChartModal from "@/components/ui/SizeChartModal";



function extractSizes(prod) {
  if (!prod) return [];
  const found = new Set();
  if (Array.isArray(prod.sizes)) {
    prod.sizes.forEach((s) => typeof s === "string" && s.trim() && found.add(s.trim()));
  } else if (typeof prod.sizes === "string" && prod.sizes.trim()) {
    prod.sizes.split(",").forEach((s) => s.trim() && found.add(s.trim()));
  }
  if (typeof prod.size === "string" && prod.size.trim()) {
    prod.size.split(",").forEach((s) => s.trim() && found.add(s.trim()));
  }
  if (Array.isArray(prod.sizeMeasurements)) {
    prod.sizeMeasurements.forEach((sm) => {
      if (typeof sm === "string" && sm.trim()) found.add(sm.trim());
      else if (sm && typeof sm.size === "string" && sm.size.trim()) found.add(sm.size.trim());
    });
  }
  if (Array.isArray(prod.variants)) {
    prod.variants.forEach((v) => {
      if (v && typeof v.size === "string" && v.size.trim()) found.add(v.size.trim());
      if (v && v.options && typeof v.options.size === "string" && v.options.size.trim()) found.add(v.options.size.trim());
    });
  }
  if (prod.attributes && typeof prod.attributes === "object") {
    Object.entries(prod.attributes).forEach(([k, v]) => {
      const keyLower = k.toLowerCase().replace(/_/g, " ");
      if (keyLower.includes("size")) {
        if (Array.isArray(v)) {
          v.forEach((val) => typeof val === "string" && val.trim() && found.add(val.trim()));
        } else if (typeof v === "string" && v.trim()) {
          v.split(",").forEach((val) => val.trim() && found.add(val.trim()));
        }
      }
    });
  }
  return Array.from(found);
}

function ProductSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <Skeleton className="aspect-square w-full rounded-xl lg:w-1/2" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

import usePageTitle from "@/hooks/usePageTitle";

export default function ProductDetails({ children }) {
  const { siteName } = useSettings();
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useAddToCart();
  const { user } = useAuth();
  const isAdminOrVendor = user?.role === "admin" || user?.role === "vendor";
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedDynamicAttrs, setSelectedDynamicAttrs] = useState({});
  const [activeDisplayImage, setActiveDisplayImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [showSizeChartModal, setShowSizeChartModal] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  usePageTitle(product?.title || "Product Details");

  useEffect(() => {
    if (product?._id) {
      const price = product.discountPercentage > 0
        ? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
        : product.price;

      trackPixelEvent("ViewContent", {
        content_name: product.title,
        content_ids: [product._id],
        content_type: "product",
        value: Number(price),
        currency: "BDT",
      });
    }
  }, [product]);

  // Sync color & dynamic attributes when product loads
  const [prevProductId, setPrevProductId] = useState(null);
  if (product && product._id !== prevProductId) {
    setPrevProductId(product._id);
    if (product.colors?.length > 0) {
      setSelectedColor(product.colors[0]);
      if (product.colors[0].image) {
        setActiveDisplayImage(product.colors[0].image);
      }
    } else {
      setSelectedColor(null);
      setActiveDisplayImage(null);
    }

    // Auto-initialize first option for selectable dynamic attributes
    if (product.attributes && typeof product.attributes === "object") {
      const initialAttrs = {};
      Object.entries(product.attributes).forEach(([k, v]) => {
        if (k === "sizes" || k === "size" || k === "colors" || k === "color") return;
        let options = [];
        if (Array.isArray(v)) {
          options = v.filter(Boolean);
        } else if (typeof v === "string" && v.includes(",")) {
          options = v.split(",").map(s => s.trim()).filter(Boolean);
        }
        if (options.length > 0) {
          initialAttrs[k] = options[0];
        }
      });
      setSelectedDynamicAttrs(initialAttrs);
    }
  }

  useEffect(() => {
    if (id) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [id]);

  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs = [];
    if (product.thumbnail) imgs.push(product.thumbnail);
    if (product.images?.length) {
      product.images.forEach((img) => {
        if (img !== product.thumbnail) imgs.push(img);
      });
    }
    return imgs.length > 0 ? imgs : [product.thumbnail];
  }, [product]);

  const hasDiscount = product?.discountPercentage > 0;
  const discountedPrice = hasDiscount
    ? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
    : null;

  const availableSizes = useMemo(() => extractSizes(product), [product]);

  const handleAddToCart = async () => {
    if (availableSizes.length > 0 && !selectedSize) {
      toast.error("Please select size");
      return false;
    }
    if (product?.colors?.length > 0 && !selectedColor) {
      toast.error("Please select a color");
      return false;
    }

    const dynamicSpecs = Object.entries(selectedDynamicAttrs)
      .map(([k, v]) => {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return `${label}: ${v}`;
      })
      .filter(Boolean)
      .join(", ");

    const finalSizeVariant = [selectedSize, dynamicSpecs].filter(Boolean).join(" | ");

    await addToCart(
      product,
      quantity,
      finalSizeVariant || "",
      selectedColor?.name || "",
      selectedColor?.image || ""
    );
    return true;
  };

  const handleDirectOrderNow = () => {
    if (availableSizes.length > 0 && !selectedSize) {
      toast.error("Please select size");
      return;
    }
    if (product?.colors?.length > 0 && !selectedColor) {
      toast.error("Please select a color");
      return;
    }

    const dynamicSpecs = Object.entries(selectedDynamicAttrs)
      .map(([k, v]) => {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return `${label}: ${v}`;
      })
      .filter(Boolean)
      .join(", ");

    const finalSizeVariant = [selectedSize, dynamicSpecs].filter(Boolean).join(" | ");

    const directItem = {
      productId: product._id,
      title: product.title,
      thumbnail: selectedColor?.image || product.thumbnail || product.images?.[0] || "",
      price: hasDiscount ? Number(discountedPrice) : Number(product.price),
      quantity,
      size: finalSizeVariant || "",
      color: selectedColor?.name || "",
      colorImage: selectedColor?.image || "",
      stock: product.stock,
      category: product.category || "",
      attributes: selectedDynamicAttrs || {},
    };

    setDirectCheckoutItem(directItem);
    router.push("/checkout?direct=1");
  };

  if (isLoading) return <ProductSkeleton />;

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Product not found.</p>
        <Button className="mt-4" onClick={() => router.push(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const mainDisplayImage = activeDisplayImage || allImages[selectedImage] || product.thumbnail;

  return (
    <>
      <Helmet>
        <title>{`${product.title} | ${siteName}`}</title>
      </Helmet>

      {/* Breadcrumb */}
      <div className="border-b border-border bg-background">
        <div className="container mx-auto flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            <Home className="size-4" />
          </Link>
          <ChevronRight className="size-3" />
          <Link href="/products" className="hover:text-foreground">
            Shop
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{product.title}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-full overflow-hidden sm:overflow-visible">
        <div className="flex flex-col gap-6 lg:flex-row min-w-0 w-full">
          {/* Left - Images lg:w-[35%] */}
          <div className="flex flex-col gap-3 w-full lg:w-[35%] min-w-0">
            <ProductImageZoom
              src={mainDisplayImage}
              alt={product.title}
              discountBadge={hasDiscount ? `-${Math.round(product.discountPercentage)}%` : null}
            />

            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedImage(i);
                      setActiveDisplayImage(img);
                    }}
                    className={`size-16 shrink-0 overflow-hidden rounded border transition-colors sm:size-20 ${img === mainDisplayImage
                      ? "border-primary"
                      : "border-border hover:border-muted-foreground/50"
                      }`}
                  >
                    <img
                      src={img}
                      alt={`${product.title} ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Middle - Product Info lg:w-[35%] */}
          <div className="flex flex-1 flex-col gap-4 w-full lg:w-[35%] min-w-0">
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl break-words [overflow-wrap:anywhere]">
              {product.title}
            </h1>

            {product.sku && (
              <p className="text-sm font-medium text-muted-foreground">
                SKU : {product.sku}
              </p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-foreground">
                {formatBDT(hasDiscount ? discountedPrice : product.price)}
              </span>
              {hasDiscount && (
                <span className="text-base text-muted-foreground line-through">
                  {formatBDT(product.price)}
                </span>
              )}
            </div>

            {/* Color Family Selection */}
            {product?.colors?.length > 0 && (
              <div className="space-y-2 border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    Color Family : <span className="font-normal text-muted-foreground">{selectedColor?.name || "Select a color"}</span>
                  </span>
                </div>
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
                        className={`group relative flex items-center gap-2 rounded-lg border-2 p-1.5 transition-all ${isSelected
                          ? "border-primary bg-secondary text-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50 bg-background"
                          }`}
                      >
                        <div className="size-10 overflow-hidden rounded border border-border bg-muted shrink-0">
                          <img
                            src={colorObj.image || product.thumbnail}
                            alt={colorObj.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="pr-2 text-xs font-semibold text-foreground">
                          {colorObj.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {availableSizes.length > 0 && (
              <div className="space-y-2 border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    Select Size : {selectedSize && <span className="font-normal text-muted-foreground">{selectedSize}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSizeChartModal(true)}
                    className="rounded bg-secondary text-primary hover:bg-secondary/80 border border-border px-3 py-1.5 text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    Size Chart
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-10 border px-3.5 py-1.5 text-sm font-bold rounded-lg transition-all ${selectedSize === size
                        ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Selectable Attribute Options */}
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
                  <div key={key} className="space-y-2 border-b border-border pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">
                        Select {label} :{" "}
                        <span className="font-normal text-muted-foreground">{selectedVal || `Select ${label}`}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt) => {
                        const isSelected = selectedVal === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setSelectedDynamicAttrs((prev) => ({ ...prev, [key]: opt }))}
                            className={`rounded-lg border px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all ${isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                              : "border-border bg-background text-foreground hover:border-primary/50"
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

            {/* Quantity and Order */}
            <div className="space-y-2">
              <span className="text-sm font-bold text-foreground">
                Select Quantity :
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <span className="text-xs font-semibold text-muted-foreground sm:hidden">Quantity:</span>
                  <div className="flex items-center rounded border border-border">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="flex size-10 items-center justify-center text-foreground transition-colors hover:bg-muted"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="flex size-10 items-center justify-center border-x border-border text-sm font-medium text-foreground">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex size-10 items-center justify-center text-foreground transition-colors hover:bg-muted"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>

                {!isAdminOrVendor && (
                  <div className="flex flex-1 items-center gap-2 w-full">
                    <button
                      type="button"
                      disabled={product.stock === 0}
                      onClick={async () => {
                        await handleAddToCart();
                      }}
                      className="flex-1 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground py-3 text-sm font-extrabold transition-all border border-border active:scale-[0.98] cursor-pointer"
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      disabled={product.stock === 0}
                      onClick={handleDirectOrderNow}
                      className="btn-action-gold flex-1 rounded-full py-3 text-sm shrink-0"
                    >
                      Order Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Find in Store */}
            <div className="pt-2">
              <button
                className="w-full flex items-center justify-center gap-2 rounded bg-muted/30 border border-border py-2 text-sm font-medium hover:bg-muted/50"
                onClick={() => toast("Find in Store feature coming soon!")}
              >
                Find in Store <ShoppingCart className="size-4" />
              </button>
            </div>

            {/* Social Share */}
            <div className="flex items-center gap-2 pt-2 justify-center">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${product.title}&url=${window.location.href}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
              >
                <svg className="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a
                href={`https://instagram.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
              >
                <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
            </div>
          </div>

          {/* Right - Extra Info lg:w-[30%] */}
          <div className="flex flex-col gap-4 w-full lg:w-[30%] min-w-0">
            {/* Dynamic Size Measurement Block */}
            {product?.sizeMeasurements && product.sizeMeasurements.length > 0 && (() => {
              const columnKeysSet = new Set();
              product.sizeMeasurements.forEach((m) => {
                Object.keys(m || {}).forEach((k) => {
                  if (k !== "size" && k !== "_id" && m[k]) columnKeysSet.add(k);
                });
              });
              const columnKeys = Array.from(columnKeysSet);

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

              return (
                <div className="overflow-hidden rounded border border-border bg-card w-full max-w-full">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
                    Size Measurement (Inches)
                  </div>
                  <div className="overflow-x-auto w-full max-w-full">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                          <th className="px-2.5 py-1.5 font-medium">Size</th>
                          {columnKeys.map((key) => (
                            <th key={key} className="px-2.5 py-1.5 font-medium text-center">
                              {FIELD_LABELS[key] || key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {product.sizeMeasurements.map((m, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-2.5 py-1.5 font-semibold text-foreground">{m.size}</td>
                            {columnKeys.map((key) => (
                              <td key={key} className="px-2.5 py-1.5 text-muted-foreground text-center">
                                {m[key] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Policies */}
            <div className="rounded border-2 border-dashed border-foreground p-4 text-xs font-medium text-foreground">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 size-3 shrink-0 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  <span>Cash on delivery available</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 size-3 shrink-0 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  <span>7 days return policy</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 size-3 shrink-0 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  <span>Fast home delivery across Bangladesh</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 size-3 shrink-0 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  <span>24/7 Customer Support: <a href="/orders" className="text-foreground hover:underline">Order Tracking</a></span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <Truck className="size-6 text-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Fast Shipping
              </p>
              <p className="text-xs text-muted-foreground">
                {product.shippingInformation || "Receive products in amazing time"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <Shield className="size-6 text-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Always Authentic Product
              </p>
              <p className="text-xs text-muted-foreground">
                100% authentic products
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <RotateCcw className="size-6 text-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                7 Day Returns
              </p>
              <p className="text-xs text-muted-foreground">
                {product.returnPolicy || "Return within 7 days"}
              </p>
            </div>
          </div>
        </div>

        {/* Description & Detailed Specifications Section */}
        <div className="mt-12 border-t border-border pt-8 space-y-8 w-full min-w-0">
          {/* Description Section */}
          {product.description && (
            <div className="w-full min-w-0">
              <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                Product Description
              </h3>
              <div className="prose prose-sm max-w-none text-muted-foreground bg-card/40 rounded-xl border border-border p-4 sm:p-6 shadow-2xs w-full min-w-0 overflow-hidden">
                <p className="whitespace-pre-line leading-relaxed break-words [overflow-wrap:anywhere]">{product.description}</p>
              </div>
            </div>
          )}

          {/* Dynamic Product Specifications Table */}
          {product?.attributes && Object.keys(product.attributes).length > 0 && (() => {
            const validAttrs = Object.entries(product.attributes).filter(
              ([key, val]) => val !== undefined && val !== null && val !== "" && key !== "sizes" && key !== "size"
            );
            if (validAttrs.length === 0) return null;

            return (
              <div className="w-full min-w-0">
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  Specifications & Details
                </h3>
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs w-full min-w-0">
                  <div className="divide-y divide-border/60">
                    {validAttrs.map(([key, val], idx) => {
                      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                      const displayVal = Array.isArray(val) ? val.join(", ") : String(val);
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between gap-4 px-4 sm:px-6 py-3 text-xs sm:text-sm ${
                            idx % 2 === 0 ? "bg-muted/25" : "bg-card"
                          }`}
                        >
                          <span className="font-medium text-muted-foreground shrink-0">{label}</span>
                          <span className="font-bold text-foreground text-right break-words [overflow-wrap:anywhere]">{displayVal}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Related Products Section */}
        <RelatedProducts currentProduct={product} />
      </div>

      {/* Size Chart Modal */}
      <SizeChartModal
        open={showSizeChartModal}
        onClose={() => setShowSizeChartModal(false)}
        product={product}
        selectedSize={selectedSize}
        onSelectSize={(size) => setSelectedSize(size)}
      />
    </>
  );
}
