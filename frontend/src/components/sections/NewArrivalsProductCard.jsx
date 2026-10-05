"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from "react";

import { motion } from "framer-motion";
import { ShoppingCart, Eye, Zap } from "lucide-react";
import { formatBDT } from "@/utils/currency";
import OrderModal from "@/components/ui/OrderModal";
import ProductImageModal from "@/components/ui/ProductImageModal";
import { useAuth } from "@/hooks/useAuth";
import { useAddToCart } from "@/hooks/useAddToCart";

export default function NewArrivalsProductCard({ product, index }) {
  const router = useRouter();
  const { addToCart } = useAddToCart();
  const [showImageModal, setShowImageModal] = useState(false);
  const { user } = useAuth();
  const isAdminOrVendor = user?.role === "admin" || user?.role === "vendor";
  const hasDiscount = product.discountPercentage > 0;
  const discountedPrice = hasDiscount
    ? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
    : null;
  const isOutOfStock = product.stock === 0;
  const sizeMeasurementSizes = Array.isArray(product.sizeMeasurements)
    ? product.sizeMeasurements.map(sm => typeof sm === 'string' ? sm : sm?.size).filter(Boolean)
    : [];
  const hasOptions =
    (Array.isArray(product.sizes) && product.sizes.length > 0) ||
    sizeMeasurementSizes.length > 0 ||
    (Array.isArray(product.colors) && product.colors.length > 0) ||
    (Array.isArray(product.variants) && product.variants.length > 0) ||
    (product.attributes && typeof product.attributes === "object" && Object.entries(product.attributes).some(([k, v]) => Array.isArray(v) && v.length > 0));

  const handleDirectAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasOptions) {
      router.push(`/product/${product._id}`);
      return;
    }
    addToCart(product, 1);
  };

  const handleDirectOrderNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasOptions) {
      router.push(`/product/${product._id}`);
      return;
    }
    addToCart(product, 1);
    router.push("/checkout");
  };

  const handleOpenImageModal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowImageModal(true);
  };

  return (
    <>
      <div className="shrink-0 w-[165px] xs:w-[185px] sm:w-[220px] md:w-[250px] transition-opacity duration-300">
        <div className="group flex flex-col h-auto w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xs transition-all duration-300 hover:shadow-md">
          <Link href={`/product/${product._id}`} className="relative aspect-square w-full overflow-hidden bg-muted/40 block shrink-0 p-2 flex items-center justify-center group/img">
            <img
              src={product.thumbnail || product.images?.[0] || null}
              alt={product.title}
              className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-110 hover:scale-110 active:scale-105 group-active:scale-105 group-hover:drop-shadow-md"
              loading="lazy"
            />

            {/* Quick View Side Eye Button */}
            <button
              type="button"
              onClick={handleOpenImageModal}
              className="absolute bottom-2 right-2 z-20 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur-md hover:bg-primary hover:text-primary-foreground active:scale-90 transition-all duration-300 opacity-0 group-hover/img:opacity-100 transform translate-y-2 group-hover/img:translate-y-0 cursor-pointer border border-border/60"
              title="Enlarge Image"
            >
              <Eye className="size-4" />
            </button>

            {hasDiscount && (
              <div className="absolute left-2 top-2 z-10 rounded-full badge-gold px-2 py-0.5 text-[10px] font-black tracking-tight shadow-sm">
                -{Math.round(product.discountPercentage)}%
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-xs">
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[9px] font-semibold text-white">
                  Out of Stock
                </span>
              </div>
            )}
          </Link>

          <div className="flex shrink-0 flex-col p-2.5 sm:p-3 bg-card gap-1.5">
            <div className="space-y-0.5 sm:space-y-1">
              <Link href={`/product/${product._id}`} className="block">
                <h3 className="line-clamp-1 text-xs sm:text-sm font-bold text-foreground group-hover:text-primary dark:group-hover:text-accent transition-colors">
                  {product.title}
                </h3>
              </Link>

              {/* Price & Stock in 1 Line */}
              <div className="flex items-center justify-between gap-1 pt-0">
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-xs sm:text-sm font-extrabold text-primary dark:text-accent">
                    {formatBDT(hasDiscount ? discountedPrice : product.price)}
                  </span>
                  {hasDiscount && (
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground line-through font-normal">
                      {formatBDT(product.price)}
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-semibold shrink-0">
                  {product.stock || 0} in stock
                </span>
              </div>
            </div>

            <div className="pt-0">
              <button
                disabled={isOutOfStock || isAdminOrVendor}
                onClick={handleDirectAddToCart}
                title={isAdminOrVendor ? "Admins cannot purchase" : "Order Now"}
                className={`w-full flex items-center justify-center gap-1.5 rounded-full btn-action-gold py-1.5 px-3 text-[10px] sm:text-xs font-extrabold transition-all ${isOutOfStock || isAdminOrVendor ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} shadow-xs`}
              >
                <Zap className="size-3.5 fill-current shrink-0" />
                <span>{isOutOfStock ? "Unavailable" : "Order Now"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ProductImageModal
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        image={product.thumbnail || product.images?.[0]}
        images={product.images && product.images.length > 0 ? product.images : [product.thumbnail].filter(Boolean)}
        title={product.title}
      />
    </>
  );
}
