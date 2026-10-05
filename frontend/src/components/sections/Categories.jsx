"use client";

import Link from 'next/link';
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronDown, Sparkles, FolderTree } from "lucide-react";
import { getCategoriesWithCounts } from "@/services/category.api";
import { buildCategoryTree } from "@/utils/categoryTree";
import { Skeleton } from "@/components/ui/skeleton";

function CategoriesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border p-4 bg-muted/40 h-28" />
      ))}
    </div>
  );
}

export default function Categories({ initialData }) {
  const { data: categoriesData, isLoading, isFetching } = useQuery({
    queryKey: ["categories-with-counts"],
    queryFn: getCategoriesWithCounts,
    initialData: (Array.isArray(initialData) && initialData.length > 0) ? initialData : undefined,
    staleTime: 1000 * 60 * 1,
    gcTime: 1000 * 60 * 30,
  });

  const categories = useMemo(() => {
    const raw = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.categories || []);
    return buildCategoryTree(raw);
  }, [categoriesData]);

  const [openSections, setOpenSections] = useState({});

  const toggleSection = (slug) => {
    setOpenSections((prev) => ({
      ...prev,
      [slug]: prev[slug] === undefined ? false : !prev[slug],
    }));
  };

  const showSkeleton = isLoading || (isFetching && categories.length === 0);

  return (
    <section id="categories" className="bg-background py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl flex items-center gap-2">
              All Categories
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold text-primary hover:text-accent transition-colors shrink-0"
          >
            View All Products &rarr;
          </Link>
        </motion.div>

        {showSkeleton ? (
          <CategoriesSkeleton />
        ) : categories.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No categories found.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-4 sm:gap-4 md:grid-cols-6 lg:grid-cols-9">
            {categories.map((cat, i) => {
              return (
                <motion.div
                  key={`${cat.slug}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <Link
                    href={`/products?category=${cat.slug}`}
                    className="group block text-center"
                  >
                    <div className="aspect-square overflow-hidden rounded-3xl border-2 border-border group-hover:border-accent bg-secondary/50 p-1.5 transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1">
                      <div className="h-full w-full overflow-hidden rounded-2xl bg-card p-1 flex items-center justify-center">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="h-full w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="mt-2 text-[11px] font-extrabold text-foreground sm:text-xs group-hover:text-primary transition-colors line-clamp-1">
                      {cat.name}
                    </h3>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
