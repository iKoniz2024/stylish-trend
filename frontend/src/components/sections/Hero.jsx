"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight, ChevronRight as ArrowRightIcon, Zap, Store, Sparkles, Layers, ArrowUpRight, Flame, ShoppingBag, ShieldCheck, LayoutGrid } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBanners } from "@/services/banner.api";
import { getFlashSaleProducts } from "@/services/product.api";
import { getFeaturedVendor } from "@/services/vendor.api";
import { getCategoriesWithCounts } from "@/services/category.api";
import { buildCategoryTree } from "@/utils/categoryTree";
import CountdownTimer from "./CountdownTimer";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const heroStyles = `
  .hero-swiper .swiper-pagination-bullet {
    width: 8px;
    height: 8px;
    background: rgba(255, 255, 255, 0.5);
    opacity: 1;
    transition: all 0.3s;
  }
  .hero-swiper .swiper-pagination-bullet-active {
    background: #ffffff;
    width: 20px;
    border-radius: 4px;
  }
`;

export default function Hero({ initialData, categoriesData, flashSaleData }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Banners query
  const { data: bannerData, isLoading: isBannerLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: getBanners,
    initialData,
    staleTime: 1000 * 60 * 1, // 1 minute cache
    gcTime: 1000 * 60 * 30,
  });

  // Flash Sale query for Right Promo Card
  const { data: flashData, isLoading: isFlashLoading } = useQuery({
    queryKey: ["flash-sale"],
    queryFn: getFlashSaleProducts,
    initialData: flashSaleData,
    staleTime: 1000 * 60 * 1, // 1 minute cache
    gcTime: 1000 * 60 * 30,
  });

  // Featured Vendor query
  const { data: featuredVendorData } = useQuery({
    queryKey: ["featured-vendor"],
    queryFn: getFeaturedVendor,
    staleTime: 1000 * 60 * 1, // 1 minute cache
    gcTime: 1000 * 60 * 30,
  });

  // Top Categories with Product Counts query (Live Dynamic Sync)
  const { data: topCategoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories-with-counts"],
    queryFn: getCategoriesWithCounts,
    initialData: (Array.isArray(categoriesData) && categoriesData.length > 0) ? categoriesData : undefined,
    staleTime: 1000 * 60 * 1,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const topCategories = useMemo(() => {
    const raw = Array.isArray(topCategoriesData) ? topCategoriesData : (topCategoriesData?.categories || []);
    const tree = buildCategoryTree(raw);
    return [...tree]
      .sort((a, b) => (b.productCount || 0) - (a.productCount || 0))
      .slice(0, 8);
  }, [topCategoriesData]);

  const banners = useMemo(() => {
    const data = Array.isArray(bannerData) ? bannerData : bannerData?.banners || [];
    return data.filter((b) => b.isActive !== false && b.isActive !== "false" && (b.image || b.images?.length > 0 || b.thumbnail));
  }, [bannerData]);

  const flashProducts = useMemo(() => {
    return flashData?.products || [];
  }, [flashData]);

  const featuredVendor = featuredVendorData?.vendor || null;

  return (
    <section id="hero" className="relative overflow-hidden py-4 sm:py-5">
      <style>{heroStyles}</style>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ================= 3-COLUMN HERO GRID (Structure 3: Left Menu + Center Slider + Right Flash Deal) ================= */}
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 lg:items-stretch">

          {/* ================= COLUMN 1 (LEFT): CATEGORY & DEPARTMENT MENU ================= */}
          <div className="hidden lg:flex lg:col-span-3 flex-col justify-between rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white dark:bg-zinc-950 p-4 shadow-sm h-[440px]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-gradient-to-tr from-amber-500/20 via-amber-400/25 to-amber-500/10 border border-amber-400/40 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                  <LayoutGrid className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Categories
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium">Browse department</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800">
                {topCategories.length} Active
              </span>
            </div>

            {/* Category Rows */}
            <div className="flex-1 py-2 overflow-y-auto no-scrollbar space-y-1.5">
              {/* Dynamic Root Categories */}
              {isCategoriesLoading && topCategories.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                      <div className="h-3.5 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                    <div className="h-3 w-5 rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                ))
              ) : (
                <div className="space-y-1">
                  {topCategories.map((cat) => {
                    const childrenCount = (cat.children || []).reduce((acc, c) => acc + (c.productCount || 0), 0);
                    const totalProducts = Math.max(cat.productCount || 0, childrenCount);

                    return (
                      <div key={cat._id || cat.slug} className="space-y-1">
                        <Link
                          href={`/products?category=${cat.slug}`}
                          className="group flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-all text-xs font-bold text-slate-900 dark:text-zinc-100"
                        >
                          <div className="flex items-center gap-2.5 truncate min-w-0">
                            {cat.image ? (
                              <img
                                src={cat.image}
                                alt={cat.name}
                                className="size-8 rounded-lg object-cover bg-zinc-100 dark:bg-zinc-800 shrink-0 group-hover:scale-105 transition-transform border border-zinc-200/50 dark:border-zinc-800"
                              />
                            ) : (
                              <div className="size-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xs font-black text-slate-900 dark:text-zinc-200 shrink-0 border border-zinc-200/60 dark:border-zinc-800">
                                {(cat.name || "C").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="truncate">
                              <span className="truncate block font-bold text-xs group-hover:text-amber-500 transition-colors">
                                {cat.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-medium truncate block">
                                {totalProducts} {totalProducts === 1 ? "Product" : "Products"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center shrink-0 text-zinc-400 group-hover:text-amber-500 transition-colors">
                            <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </Link>

                        {/* Subcategories tags with individual product count */}
                        {Array.isArray(cat.children) && cat.children.length > 0 && (
                          <div className="pl-11 pr-2 pb-0.5 flex flex-wrap gap-1.5">
                            {cat.children.map((sub) => (
                              <Link
                                key={sub._id || sub.slug}
                                href={`/products?category=${sub.slug}`}
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 hover:text-black dark:text-zinc-300 dark:hover:text-white transition-all border border-zinc-200/60 dark:border-zinc-800/80"
                              >
                                <span className="capitalize">{sub.name}</span>
                                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
                                  ({sub.productCount || 0})
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer: View All */}
            <Link
              href="/products"
              className="pt-2.5 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-bold text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors px-1 shrink-0 group"
            >
              <span>Explore All Products</span>
              <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          {/* ================= COLUMN 2 (CENTER): MAIN BANNER SLIDER ================= */}
          <div className="col-span-12 lg:col-span-6 flex flex-col justify-center h-[200px] xs:h-[240px] sm:h-[340px] lg:h-[440px] w-full">
            {isBannerLoading ? (
              <div className="flex size-full items-center justify-center rounded-2xl border border-border bg-muted/30">
                <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : banners.length > 0 ? (
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-white/[0.08] shadow-xs size-full group">
                <Swiper
                  modules={[Autoplay, Pagination, Navigation]}
                  speed={800}
                  autoplay={{ delay: 4000, disableOnInteraction: false }}
                  pagination={{ clickable: true }}
                  navigation={{
                    prevEl: ".hero-prev",
                    nextEl: ".hero-next",
                  }}
                  loop={banners.length > 1}
                  className="hero-swiper size-full"
                >
                  {banners.map((banner) => (
                    <SwiperSlide key={banner._id}>
                      <Link href={banner.link || "/products"} className="block size-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
                        <img
                          src={banner.image || banner.images?.[0] || banner.thumbnail}
                          alt={banner.title || "Promotional Banner"}
                          className="size-full object-cover object-center"
                        />
                      </Link>
                    </SwiperSlide>
                  ))}

                  {banners.length > 1 && (
                    <>
                      <button className="hero-prev absolute left-3 top-1/2 z-10 hidden sm:flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md border border-white/20 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer">
                        <ChevronLeft className="size-5" />
                      </button>
                      <button className="hero-next absolute right-3 top-1/2 z-10 hidden sm:flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-black/75 text-white backdrop-blur-md border border-white/20 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer">
                        <ChevronRight className="size-5" />
                      </button>
                    </>
                  )}
                </Swiper>
              </div>
            ) : null}
          </div>

          {/* ================= COLUMN 3 (RIGHT): FLASH DEAL SHOWCASE CARD ================= */}
          <div className="hidden lg:flex lg:col-span-3 flex-col justify-between rounded-2xl border border-zinc-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md p-4 shadow-sm h-[440px] overflow-hidden relative">

            {/* Header: Glassmorphism Pill Countdown + Hot Deal Badge */}
            <div className="flex items-center justify-between gap-2 shrink-0 pb-2 border-b border-zinc-100 dark:border-white/[0.06]">
              <CountdownTimer variant="pill" />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/25">
                <Flame className="size-3 fill-rose-500 text-rose-500 animate-pulse" /> Hot Deal
              </span>
            </div>

            {/* Dynamic Product Showcase */}
            {isFlashLoading ? (
              <div className="my-auto space-y-3 animate-pulse">
                <div className="w-full h-44 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ) : flashProducts.length > 0 ? (
              <div className="my-auto py-1 overflow-hidden w-full">
                <Swiper
                  modules={[Autoplay]}
                  speed={700}
                  autoplay={{ delay: 3500, disableOnInteraction: false }}
                  loop={flashProducts.length > 1}
                  className="w-full"
                >
                  {flashProducts.map((fp) => {
                    const hasDiscount = fp.discountPercentage > 0;
                    const discountedPrice = hasDiscount
                      ? Math.round(fp.price * (1 - fp.discountPercentage / 100))
                      : fp.price;
                    const stockCount = typeof fp.stock === "number" ? fp.stock : 8;
                    const soldPercentage = Math.min(95, Math.max(30, 100 - (stockCount * 5)));

                    return (
                      <SwiperSlide key={fp._id || fp.id}>
                        <Link href={`/product/${fp._id}`} className="group block w-full space-y-2">
                          {/* Large Product Image with Floating Discount Badge */}
                          <div className="relative w-full h-[190px] rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/[0.06]">
                            <img
                              src={fp.thumbnail || fp.images?.[0] || fp.image}
                              alt={fp.title || fp.name}
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {hasDiscount && (
                              <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm backdrop-blur-xs">
                                -{Math.round(fp.discountPercentage)}%
                              </span>
                            )}
                          </div>

                          {/* Product Title & Prices */}
                          <div className="space-y-0.5">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                              {fp.title || fp.name}
                            </h4>
                            <div className="flex items-baseline gap-2">
                              <span className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight">
                                ৳{discountedPrice}
                              </span>
                              {hasDiscount && (
                                <span className="text-xs text-slate-400 line-through">
                                  ৳{fp.price}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dynamic Stock Urgency Meter */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <Flame className="size-3 fill-rose-500" /> Only {stockCount} left!
                              </span>
                              <span className="text-slate-400 text-[10px] uppercase font-semibold">
                                Selling Fast
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                                style={{ width: `${soldPercentage}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            ) : (
              <div className="my-auto py-4 text-center space-y-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Daily Flash Drops</p>
                <p className="text-[11px] text-slate-400">Exclusive limited-time deals live now</p>
              </div>
            )}

            {/* Bottom Action Button */}
            <Link
              href="/flash-sale"
              className="w-full rounded-xl bg-zinc-950 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200 py-2.5 px-3 text-center text-xs font-black text-white flex items-center justify-center gap-1.5 transition-all shadow-sm hover:scale-[1.01] active:scale-95 cursor-pointer group shrink-0"
            >
              <span>View Flash Sale</span>
              <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

          </div>

        </div>
      </div>
    </section>
  );
}
