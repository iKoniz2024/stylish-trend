"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, ShoppingCart, Zap, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/utils/currency";
import OrderModal from "@/components/ui/OrderModal";
import ProductImageModal from "@/components/ui/ProductImageModal";
import { useAuth } from "@/hooks/useAuth";
import { useAddToCart } from "@/hooks/useAddToCart";
import useSettings from "@/hooks/useSettings";

export default function BestSellingProductCard({ product, index }) {
  const router = useRouter();
  const { addToCart } = useAddToCart();
  const { siteName } = useSettings();
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
      <div className="w-full h-auto mx-auto transition-opacity duration-300">
        <div className="group flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <Link href={`/product/${product._id}`} className="relative aspect-[4/3] w-full overflow-hidden bg-muted/30 block shrink-0 p-2.5 flex items-center justify-center group/img">
            <img
              src={product.thumbnail || product.images?.[0] || undefined}
              alt={product.title}
              className="h-full max-h-36 sm:max-h-40 w-auto object-contain transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95 group-hover:drop-shadow-md mx-auto"
              loading="lazy"
            />

            {/* Quick View Side Eye Button */}
            <button
              type="button"
              onClick={handleOpenImageModal}
              className="absolute bottom-2 right-2 z-20 flex size-7 sm:size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur-md hover:bg-primary hover:text-primary-foreground active:scale-90 transition-all duration-300 opacity-0 group-hover/img:opacity-100 transform translate-y-2 group-hover/img:translate-y-0 cursor-pointer border border-border/60"
              title="Enlarge Image"
            >
              <Eye className="size-3.5 sm:size-4" />
            </button>

            {hasDiscount && (
              <div className="absolute left-2 top-2 z-10 rounded-full badge-gold px-2 py-0.5 text-[10px] font-black tracking-tight shadow-sm">
                -{Math.round(product.discountPercentage)}%
              </div>
            )}

            <div className="absolute right-2 top-2 z-10">
              <Badge className="gap-1 badge-gold text-[8px] sm:text-[9px] font-bold px-2 py-0.5 border-none shadow-xs">
                <Trophy className="size-2.5 shrink-0 text-white dark:text-black" />
                <span>Best Seller</span>
              </Badge>
            </div>

            {isOutOfStock && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-xs">
                <Badge variant="destructive" className="text-[9px] font-semibold px-2 py-0.5">
                  Out of Stock
                </Badge>
              </div>
            )}
          </Link>

          <div className="flex flex-1 flex-col justify-between p-2 sm:p-2.5 bg-card gap-2">
            <div className="space-y-1">
              <Link href={`/product/${product._id}`} className="block">
                <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground leading-snug group-hover:text-primary dark:group-hover:text-accent transition-colors min-h-[2.25rem]">
                  {product.title}
                </h3>
              </Link>

              {/* Price & Stock in 1 Line */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
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

            <div className="flex items-center gap-1.5 pt-0.5 w-full mt-auto">
              <button
                disabled={isOutOfStock || isAdminOrVendor}
                onClick={handleDirectAddToCart}
                title={isAdminOrVendor ? "Admins cannot purchase" : "Add to Cart"}
                className={`hidden sm:flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground py-1.5 px-2 text-[10px] font-extrabold transition-all active:scale-95 ${isOutOfStock || isAdminOrVendor ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} shadow-2xs`}
              >
                <ShoppingCart className="size-3 shrink-0 text-secondary-foreground" />
                <span className="truncate whitespace-nowrap">Add to Cart</span>
              </button>
              <button
                disabled={isOutOfStock || isAdminOrVendor}
                onClick={handleDirectOrderNow}
                title={isAdminOrVendor ? "Admins cannot purchase" : "Order Now"}
                className={`w-full sm:flex-1 flex items-center justify-center gap-1.5 rounded-full btn-action-gold py-1.5 px-3 text-[11px] sm:text-[10px] font-extrabold transition-all duration-200 active:scale-[0.98] ${isOutOfStock || isAdminOrVendor ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} shadow-xs`}
              >
                <Zap className="size-3.5 sm:size-3 fill-current shrink-0" />
                <span className="whitespace-nowrap">{isOutOfStock ? "Unavailable" : "Order Now"}</span>
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
