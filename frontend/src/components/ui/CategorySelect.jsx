"use client";

import { useMemo, useState, useEffect } from "react";
import { Folder, ChevronRight, CheckCircle2 } from "lucide-react";

// Helper to reliably extract string ID/slug from parentId (whether string, ObjectId, or populated object)
const getParentIdString = (p) => {
  if (!p) return "";
  if (typeof p === "object") {
    return String(p._id || p.id || p.slug || "");
  }
  return String(p);
};

export default function CategorySelect({
  categories = [],
  value = "",
  onChange,
  error,
  label = "Category *",
  className = "",
}) {
  // Normalize categories list into root categories and subcategories mapping
  const { rootCategories, subCategoriesMap } = useMemo(() => {
    if (!Array.isArray(categories)) return { rootCategories: [], subCategoriesMap: new Map() };

    // 1. Flatten all categories (in case categories is already a tree)
    const allFlatCategories = [];
    const collect = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach((item) => {
        if (item) {
          allFlatCategories.push(item);
          if (Array.isArray(item.children) && item.children.length > 0) {
            collect(item.children);
          }
        }
      });
    };
    collect(categories);

    const roots = [];
    const subMap = new Map();

    // Initialize subMap entries with any embedded children arrays first
    allFlatCategories.forEach((cat) => {
      const pId = getParentIdString(cat.parentId);
      if (!pId) {
        if (!roots.some((r) => r.slug === cat.slug || String(r._id) === String(cat._id))) {
          roots.push(cat);
        }
      }
      const children = Array.isArray(cat.children) ? cat.children : [];
      if (children.length > 0) {
        subMap.set(cat.slug, [...children]);
        subMap.set(String(cat._id), [...children]);
      }
    });

    // Link flat child categories to their parent categories via parentId
    allFlatCategories.forEach((cat) => {
      const pId = getParentIdString(cat.parentId);
      if (pId) {
        const parent = allFlatCategories.find(
          (p) => String(p._id) === pId || p.slug === pId
        );
        if (parent) {
          const keys = [parent.slug, String(parent._id)].filter(Boolean);
          keys.forEach((key) => {
            const existing = subMap.get(key) || [];
            if (!existing.some((c) => c.slug === cat.slug || String(c._id) === String(cat._id))) {
              subMap.set(key, [...existing, cat]);
            }
          });
        }
      }
    });

    return { rootCategories: roots.length > 0 ? roots : categories, subCategoriesMap: subMap };
  }, [categories]);

  // Find initial parent and child based on current value slug or ID
  const { parentCat, childCat } = useMemo(() => {
    if (!value || !Array.isArray(categories)) {
      return { parentCat: null, childCat: null };
    }

    const valStr = String(value);

    // Search flattened categories
    const allFlat = [];
    const collect = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach((item) => {
        if (item) {
          allFlat.push(item);
          if (Array.isArray(item.children)) collect(item.children);
        }
      });
    };
    collect(categories);

    const match = allFlat.find((c) => c.slug === valStr || String(c._id) === valStr);
    if (!match) return { parentCat: null, childCat: null };

    const pId = getParentIdString(match.parentId);
    if (!pId) {
      return { parentCat: match, childCat: null };
    }

    const parent = allFlat.find((p) => String(p._id) === pId || p.slug === pId);
    return { parentCat: parent || match, childCat: match };
  }, [value, categories]);

  const [selectedParentSlug, setSelectedParentSlug] = useState("");
  const [selectedChildSlug, setSelectedChildSlug] = useState("");

  // Sync internal state when `value` or `categories` change
  useEffect(() => {
    if (parentCat) {
      setSelectedParentSlug(parentCat.slug || String(parentCat._id));
      setSelectedChildSlug(childCat ? (childCat.slug || String(childCat._id)) : "");
    } else if (!value) {
      setSelectedParentSlug("");
      setSelectedChildSlug("");
    }
  }, [value, parentCat, childCat]);

  // Handle Main Category Change
  const handleParentChange = (e) => {
    const parentSlug = e.target.value;
    setSelectedParentSlug(parentSlug);
    setSelectedChildSlug("");
    if (onChange) {
      onChange(parentSlug);
    }
  };

  // Handle Subcategory Change
  const handleChildChange = (e) => {
    const childSlug = e.target.value;
    setSelectedChildSlug(childSlug);
    if (onChange) {
      onChange(childSlug || selectedParentSlug);
    }
  };

  // Current active children list
  const activeChildren = useMemo(() => {
    if (!selectedParentSlug) return [];
    if (subCategoriesMap.has(selectedParentSlug)) {
      return subCategoriesMap.get(selectedParentSlug) || [];
    }
    return [];
  }, [selectedParentSlug, subCategoriesMap]);

  const activeParent = useMemo(() => {
    if (!selectedParentSlug) return null;
    return (
      rootCategories.find(
        (p) => p.slug === selectedParentSlug || String(p._id) === String(selectedParentSlug)
      ) || parentCat
    );
  }, [selectedParentSlug, rootCategories, parentCat]);

  const activeChild = useMemo(() => {
    if (!selectedChildSlug) return null;
    return (
      activeChildren.find(
        (c) => c.slug === selectedChildSlug || String(c._id) === String(selectedChildSlug)
      ) || childCat
    );
  }, [selectedChildSlug, activeChildren, childCat]);

  const hasChildren = activeChildren.length > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-foreground">
          {label}
        </label>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {/* Main Category Selector */}
        <div>
          <select
            value={selectedParentSlug}
            onChange={handleParentChange}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-xs sm:text-sm outline-none transition-colors focus:border-ring ${
              error ? "border-destructive" : "border-border"
            }`}
          >
            <option value="">-- Select Main Category --</option>
            {rootCategories.map((parent, pIdx) => (
              <option key={parent._id || `${parent.slug}-${pIdx}`} value={parent.slug || String(parent._id)}>
                {parent.name || parent.slug}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory Selector */}
        <div>
          <select
            value={selectedChildSlug}
            onChange={handleChildChange}
            disabled={!selectedParentSlug || !hasChildren}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-xs sm:text-sm outline-none transition-colors focus:border-ring ${
              !selectedParentSlug || !hasChildren
                ? "opacity-60 cursor-not-allowed border-border"
                : error
                ? "border-destructive"
                : "border-border"
            }`}
          >
            {!selectedParentSlug ? (
              <option value="">Select Main Category First</option>
            ) : !hasChildren ? (
              <option value="">(No Subcategories)</option>
            ) : (
              <>
                <option value="">Select Subcategory (Optional)...</option>
                {activeChildren.map((child, cIdx) => (
                  <option key={child._id || `${selectedParentSlug}-${child.slug}-${cIdx}`} value={child.slug || String(child._id)}>
                    ↳ {child.name || child.slug}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Selected Category Breadcrumb Badge */}
      {selectedParentSlug && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
          <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
            <Folder className="size-3" />
            {activeParent?.name || selectedParentSlug}
          </span>
          {selectedChildSlug && (
            <>
              <ChevronRight className="size-3 text-muted-foreground" />
              <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-accent px-2 py-0.5 rounded-md">
                <CheckCircle2 className="size-3 text-emerald-500" />
                {activeChild?.name || selectedChildSlug}
              </span>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
