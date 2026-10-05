"use client";

import Link from 'next/link';
import { useRef } from "react";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getNewArrivals } from "@/services/product.api";
import { Skeleton } from "@/components/ui/skeleton";
import NewArrivalsProductCard from "./NewArrivalsProductCard";

function NewArrivalsSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="shrink-0 w-40 sm:w-45">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NewArrivals({ initialData }) {
  const scrollRef = useRef(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: getNewArrivals,
    initialData: (initialData?.products?.length > 0) ? initialData : undefined,
    staleTime: 1000 * 60 * 1, // 1 minute cache
    gcTime: 1000 * 60 * 30,
  });

  const products = data?.products ?? [];
  const showSkeleton = isLoading || (isFetching && products.length === 0);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section id="new-arrivals" className="bg-background py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-4 flex items-center justify-between sm:mb-6"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => scroll("left")}
              className="hidden sm:flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="size-4" />
            </button>
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl md:text-2xl">
              New Arrivals
            </h2>
            <button
              onClick={() => scroll("right")}
              className="hidden sm:flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <Link
            href="/products"
            className="rounded-lg border-2 border-primary px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:text-sm"
          >
            SHOP MORE
          </Link>
        </motion.div>

        {showSkeleton ? (
          <NewArrivalsSkeleton />
        ) : products.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No products found.
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="-mx-4 -my-3 flex gap-3.5 overflow-x-auto overflow-y-hidden px-4 py-3 sm:gap-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {products.map((product, i) => (
              <NewArrivalsProductCard key={product._id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
