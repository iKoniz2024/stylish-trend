"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Eye, Trophy, Sparkles, Star, Flame } from "lucide-react";
import { getProducts, getBestSellingProducts, getNewArrivals } from "@/services/product.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/utils/currency";

function RelatedProductsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative aspect-square w-full p-2">
            <Skeleton className="h-full w-full rounded-lg" />
            <Skeleton className="absolute bottom-2 left-1/2 h-6 w-20 -translate-x-1/2 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-full rounded-none" />
        </div>
      ))}
    </div>
  );
}

const badgeConfig = {
  "best-seller": {
    label: "Best Seller",
    icon: Trophy,
    className: "bg-foreground text-background",
  },
  "new-arrival": {
    label: "New Arrival",
    icon: Sparkles,
    className: "bg-foreground text-background",
  },
  "top-rated": {
    label: "Top Pick",
    icon: Sparkles,
    className: "bg-foreground text-background",
  },
  popular: {
    label: "Popular",
    icon: Flame,
    className: "bg-foreground text-background",
  },
};

function CompactProductCard({ product, index }) {
  const hasDiscount = product.discountPercentage > 0;
  const discountedPrice = hasDiscount
    ? (product.price * (1 - product.discountPercentage / 100)).toFixed(2)
    : null;
  const isOutOfStock = product.stock === 0;
  const activeBadgeKey = product.badge;
  const activeBadgeInfo = activeBadgeKey ? badgeConfig[activeBadgeKey] : null;

  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: (i) => ({
          opacity: 1,
          y: 0,
          transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        }),
      }}
      className="w-[270px] max-w-full aspect-square h-[270px] mx-auto"
    >
      <div className="group relative h-[270px] w-full aspect-square overflow-hidden rounded-2xl border border-border bg-card shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col">
        <Link href={`/product/${product._id}`} className="relative h-[64%] w-full overflow-hidden bg-muted/40 block shrink-0 p-2 flex items-center justify-center">
          <img
            src={product.thumbnail || product.images?.[0] || undefined}
            alt={product.title}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Badges Container */}
          <div className="absolute left-2 top-2 z-10 flex flex-wrap items-center gap-1 max-w-[calc(100%-12px)]">
            {hasDiscount && (
              <div className="rounded-full badge-gold px-2 py-0.5 text-[8px] sm:text-[9px] font-black tracking-tight shadow-sm">
                -{Math.round(product.discountPercentage)}%
              </div>
            )}
            {activeBadgeInfo && (
              <Badge className="text-[8px] sm:text-[9px] font-bold px-2 py-0.5 shadow-xs flex items-center gap-1 badge-gold border-none">
                {(() => {
                  const Icon = activeBadgeInfo.icon;
                  return <Icon className="size-2.5 text-white dark:text-black" />;
                })()}
                <span>{activeBadgeInfo.label}</span>
              </Badge>
            )}
          </div>

          {isOutOfStock && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-xs">
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-semibold text-white">
                Stock Out
              </span>
            </div>
          )}
        </Link>

        <div className="flex h-[36%] flex-col justify-between p-2.5 bg-card shrink-0">
          <div className="space-y-0.5">
            <Link href={`/product/${product._id}`} className="block">
              <h3 className="line-clamp-1 text-xs font-bold text-foreground group-hover:text-primary dark:group-hover:text-accent transition-colors">
                {product.title}
              </h3>
            </Link>

            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-xs font-extrabold text-primary dark:text-accent">
                {formatBDT(hasDiscount ? discountedPrice : product.price)}
              </span>
              {hasDiscount && (
                <span className="text-[9px] text-muted-foreground line-through">
                  {formatBDT(product.price)}
                </span>
              )}
            </div>
          </div>

          <div className="pt-0.5">
            <Link
              href={`/product/${product._id}`}
              className="flex w-full items-center justify-center gap-1 rounded-full border border-border bg-secondary hover:bg-secondary/80 py-1 text-[10px] font-extrabold text-secondary-foreground transition-all"
            >
              <Eye className="size-3 text-secondary-foreground" />
              <span>View Details</span>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function RelatedProducts({ currentProduct }) {
  const categoryRaw = currentProduct?.category || currentProduct?.primaryCategory;
  const categoryParam = typeof categoryRaw === "object"
    ? categoryRaw?.slug || categoryRaw?.name || categoryRaw?._id
    : categoryRaw;
  const currentId = currentProduct?._id;

  const { data: relatedProducts = [], isLoading } = useQuery({
    queryKey: ["related-products", categoryParam, currentId],
    queryFn: async () => {
      let result = [];

      if (categoryParam) {
        try {
          const response = await getProducts({ category: categoryParam, limit: 12 });
          const prods = response?.products || (Array.isArray(response) ? response : []);
          result = prods.filter((p) => p._id && p._id.toString() !== currentId?.toString());
        } catch (err) {
          console.error("Error fetching category related products:", err);
        }
      }

      // If fewer than 4 products found in category, fill up with New Arrivals / Best Sellers
      if (result.length < 4) {
        try {
          const [newRes, bestRes] = await Promise.all([
            getNewArrivals().catch(() => ({})),
            getBestSellingProducts().catch(() => ({})),
          ]);

          const newProds = (newRes?.products || (Array.isArray(newRes) ? newRes : []))
            .filter((p) => p._id && p._id.toString() !== currentId?.toString())
            .map((p) => ({ ...p, badge: p.badge || "new-arrival" }));

          const bestProds = (bestRes?.products || (Array.isArray(bestRes) ? bestRes : []))
            .filter((p) => p._id && p._id.toString() !== currentId?.toString())
            .map((p) => ({ ...p, badge: p.badge || "best-seller" }));

          const mixed = [...result];
          const seenIds = new Set([currentId?.toString(), ...result.map(r => r._id?.toString())]);
          const maxLength = Math.max(newProds.length, bestProds.length);

          for (let i = 0; i < maxLength; i++) {
            if (i < newProds.length && !seenIds.has(newProds[i]._id?.toString())) {
              seenIds.add(newProds[i]._id?.toString());
              mixed.push(newProds[i]);
            }
            if (i < bestProds.length && !seenIds.has(bestProds[i]._id?.toString())) {
              seenIds.add(bestProds[i]._id?.toString());
              mixed.push(bestProds[i]);
            }
          }

          result = mixed;
        } catch (e) {
          console.error("Fallback mixed products fetch error:", e);
        }
      }

      return result.slice(0, 12);
    },
    enabled: !!currentProduct,
    staleTime: 1000 * 60 * 5,
  });

  if (!isLoading && relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 border-t border-border/80 pt-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-6 text-center sm:mb-8"
      >
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Related Products
        </h2>
      </motion.div>

      {isLoading ? (
        <RelatedProductsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {relatedProducts.map((product, i) => (
            <CompactProductCard
              key={product._id}
              product={product}
              index={i}
            />
          ))}
        </div>
      )}
    </section>
  );
}
