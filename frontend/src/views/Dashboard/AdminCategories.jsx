"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Trash2, X, FolderTree, ChevronRight, ChevronDown, Pencil, Save, Upload, Sliders } from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/services/category.api";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet-async";
import useSettings from "@/hooks/useSettings";
import { compressImage } from "@/utils/compressImage";

const toBase64 = (file) => compressImage(file);

const attributeDefSchema = z.object({
  key: z.string().optional().default(""),
  label: z.string().optional().default(""),
  type: z.string().optional().default("text"),
  options: z.union([z.string(), z.array(z.string())]).optional().default([]),
  required: z.boolean().optional().default(false),
  unit: z.string().optional().default(""),
  useAsVariant: z.boolean().optional().default(false),
});

const createCategorySchema = z.object({
  name: z.string().min(2, "Category name is required"),
  slug: z.string().min(2, "Slug is required"),
  parentId: z.string().optional().nullable().default(null),
  attributes: z.array(attributeDefSchema).optional().default([]),
  children: z.array(z.any()).optional().default([]),
});

const updateCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  slug: z.string().min(2, "Slug must be at least 2 characters").optional(),
  parentId: z.string().optional().nullable(),
  attributes: z.array(attributeDefSchema).optional(),
  children: z.array(z.any()).optional(),
});

function generateSlug(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function AdminCategories({ children }) {
  const { siteName } = useSettings();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [createImage, setCreateImage] = useState("");
  const [editImage, setEditImage] = useState("");
  const [expandedIds, setExpandedIds] = useState({});

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const expandAll = () => {
    const allObj = {};
    (categories || []).forEach((c) => {
      if (c._id) allObj[c._id] = true;
    });
    setExpandedIds(allObj);
  };

  const collapseAll = () => {
    const allObj = {};
    (categories || []).forEach((c) => {
      if (c._id) allObj[c._id] = false;
    });
    setExpandedIds(allObj);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getCategories,
  });

  const categories = data ?? [];

  const {
    register: regCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: errCreate },
    reset: resetCreate,
    setError: setErrorCreate,
    control: controlCreate,
    watch: watchCreate,
    setValue: setValueCreate,
  } = useForm({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: "", slug: "", parentId: "", attributes: [], children: [] },
  });

  const { fields: createAttrFields, append: createAttrAppend, remove: createAttrRemove } = useFieldArray({
    control: controlCreate,
    name: "attributes",
  });

  const {
    register: regUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: errUpdate },
    reset: resetUpdate,
    setError: setErrorUpdate,
    control: controlUpdate,
    watch: watchUpdate,
    setValue: setValueUpdate,
  } = useForm({
    resolver: zodResolver(updateCategorySchema),
  });

  const { fields: updateAttrFields, append: updateAttrAppend, remove: updateAttrRemove } = useFieldArray({
    control: controlUpdate,
    name: "attributes",
  });

  const updateCategoryCaches = (updaterFn) => {
    queryClient.setQueryData(["admin-categories"], updaterFn);
    queryClient.setQueryData(["categories"], updaterFn);
  };

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (res, variables) => {
      toast.success("Category created");
      const newCategory = res?.category || {
        _id: res?.insertedId || res?.category?._id || Date.now().toString(),
        ...variables,
        attributes: variables.attributes || [],
        children: variables.children || [],
      };
      updateCategoryCaches((old) => {
        const currentOld = Array.isArray(old) ? old : [];
        if (variables.parentId) {
          const insertChildInTree = (items) => {
            return items.map((item) => {
              if (String(item._id) === String(variables.parentId) || String(item.slug) === String(variables.parentId)) {
                return { ...item, children: [...(item.children || []), newCategory] };
              }
              if (Array.isArray(item.children) && item.children.length > 0) {
                return { ...item, children: insertChildInTree(item.children) };
              }
              return item;
            });
          };
          return insertChildInTree(currentOld);
        }
        return [...currentOld, newCategory];
      });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-counts"] });
      queryClient.invalidateQueries({ queryKey: ["topCategoriesWithCounts"] });
      setShowForm(false);
      resetCreate();
      setCreateImage("");
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        data.errors.forEach((e) => {
          const field = e.path?.[e.path.length - 1];
          if (field) setErrorCreate(field, { message: e.message });
        });
        toast.error("Please fix the errors below");
      } else {
        toast.error(data?.message || data?.error || "Failed to create category");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateCategory(id, payload),
    onSuccess: (res, variables) => {
      toast.success(res?.message || "Category updated successfully");
      const freshCat = res?.category;
      updateCategoryCaches((old) => {
        if (!Array.isArray(old)) return old;
        const targetIdStr = String(variables.id);
        const targetSlug = variables.payload?.slug;
        const newAttrs = Array.isArray(variables.payload?.attributes) ? variables.payload.attributes : undefined;

        const updateNodeInTree = (items) => {
          return items.map((c) => {
            const isTarget = String(c._id) === targetIdStr || 
                             String(c.slug) === targetIdStr || 
                             String(c.id) === targetIdStr ||
                             (targetSlug && c.slug === targetSlug);

            let updatedCat = c;
            if (isTarget) {
              updatedCat = {
                ...c,
                ...variables.payload,
                ...(freshCat || {}),
                attributes: newAttrs !== undefined ? newAttrs : (c.attributes || []),
                slug: variables.payload.slug || c.slug,
              };
            }
            if (Array.isArray(c.children) && c.children.length > 0) {
              updatedCat = { ...updatedCat, children: updateNodeInTree(c.children) };
            }
            return updatedCat;
          });
        };
        return updateNodeInTree(old);
      });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-counts"] });
      queryClient.invalidateQueries({ queryKey: ["topCategoriesWithCounts"] });
      setEditingId(null);
      setShowEditModal(false);
      resetUpdate();
      setEditImage("");
    },
    onError: (err) => {
      console.error("Update Category Error:", err);
      const data = err?.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        data.errors.forEach((e) => {
          const field = e.path?.[e.path.length - 1];
          if (field) setErrorUpdate(field, { message: e.message });
        });
        toast.error("Please fix the errors below");
      } else {
        toast.error(data?.message || data?.error || "Failed to update category");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["admin-categories"] });
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const previousAdminCats = queryClient.getQueryData(["admin-categories"]);
      const previousCats = queryClient.getQueryData(["categories"]);
      const targetStr = String(deletedId);

      const removeFromTree = (items) => {
        if (!Array.isArray(items)) return [];
        return items
          .filter((c) => String(c._id) !== targetStr && String(c.slug) !== targetStr && String(c.id) !== targetStr)
          .map((c) => ({
            ...c,
            children: Array.isArray(c.children) ? removeFromTree(c.children) : [],
          }));
      };

      updateCategoryCaches((old) => removeFromTree(old));
      return { previousAdminCats, previousCats };
    },
    onError: (err, deletedId, context) => {
      if (context?.previousAdminCats) {
        queryClient.setQueryData(["admin-categories"], context.previousAdminCats);
      }
      if (context?.previousCats) {
        queryClient.setQueryData(["categories"], context.previousCats);
      }
      toast.error(err?.response?.data?.message || "Failed to delete category");
    },
    onSuccess: () => {
      toast.success("Category deleted");
      setDeletingId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-counts"] });
      queryClient.invalidateQueries({ queryKey: ["topCategoriesWithCounts"] });
    },
  });

  const processAttributes = (attrs) => {
    if (!Array.isArray(attrs)) return [];
    return attrs
      .filter((attr) => attr && (attr.label || attr.key))
      .map((attr) => {
        const label = (attr.label || "").trim();
        const rawKey = (attr.key || "").trim();
        const key = rawKey.length > 0
          ? rawKey.toLowerCase().replace(/[^a-z0-9_]/g, "_")
          : label.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        return {
          key: key || "attr_" + Date.now(),
          label: label || key || "Attribute",
          type: attr.type || "text",
          options: typeof attr.options === "string"
            ? attr.options.split(",").map((s) => s.trim()).filter(Boolean)
            : (Array.isArray(attr.options) ? attr.options : []),
          required: Boolean(attr.required),
          unit: (attr.unit || "").trim(),
          useAsVariant: Boolean(attr.useAsVariant),
        };
      });
  };

  const getFirstErrorMessage = (errObj) => {
    if (!errObj || typeof errObj !== "object") return null;
    if (errObj.message && typeof errObj.message === "string") return errObj.message;
    for (const key of Object.keys(errObj)) {
      const found = getFirstErrorMessage(errObj[key]);
      if (found) return found;
    }
    return null;
  };

  const onFormError = (errors) => {
    console.error("Form Validation Errors:", errors);
    const firstErr = getFirstErrorMessage(errors) || "Please check all required fields and try again";
    toast.error(`Validation Error: ${firstErr}`);
  };

  const onCreateSubmit = (formData) => {
    const payload = {
      name: formData.name,
      slug: formData.slug.toLowerCase().replace(/\s+/g, "-"),
      parentId: formData.parentId ? String(formData.parentId) : null,
      image: createImage,
      attributes: processAttributes(formData.attributes),
      children: (formData.children || []).map((child) => ({
        name: child.name,
        slug: child.slug.toLowerCase().replace(/\s+/g, "-"),
        categories: child.categories || [],
      })),
    };
    createMutation.mutate(payload);
  };

  const onUpdateSubmit = (formData) => {
    const payload = {
      name: formData.name,
      slug: formData.slug ? formData.slug.toLowerCase().replace(/\s+/g, "-") : "",
      parentId: formData.parentId ? String(formData.parentId) : null,
      image: editImage !== undefined ? editImage : "",
      attributes: processAttributes(formData.attributes),
      children: (formData.children || []).map((child) => ({
        ...child,
        name: child.name,
        slug: child.slug ? child.slug.toLowerCase().replace(/\s+/g, "-") : "",
        attributes: Array.isArray(child.attributes) ? child.attributes : [],
        categories: child.categories || [],
      })),
    };
    updateMutation.mutate({ id: editingId, payload });
  };

  const handleCreateImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }
    const base64 = await toBase64(file);
    setCreateImage(base64);
  };

  const handleEditImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }
    const base64 = await toBase64(file);
    setEditImage(base64);
  };

  const startEdit = (cat) => {
    setEditingId(cat._id || cat.slug);
    setEditImage(cat.image || "");
    const parentIdVal = cat.parentId ? (typeof cat.parentId === "object" ? cat.parentId._id : cat.parentId) : "";
    resetUpdate({
      name: cat.name || "",
      slug: cat.slug || "",
      parentId: parentIdVal ? String(parentIdVal) : "",
      attributes: (cat.attributes ?? []).map((a) => ({
        ...a,
        key: a.key || "",
        label: a.label || "",
        type: a.type || "text",
        options: Array.isArray(a.options) ? a.options.join(", ") : (a.options || ""),
        useAsVariant: Boolean(a.useAsVariant),
      })),
      children: (cat.children ?? []).map((child) => ({
        ...child,
        name: child.name,
        slug: child.slug,
        attributes: child.attributes || [],
        categories: child.categories ?? [],
      })),
    });
    setShowEditModal(true);
  };

  const topCategoriesCount = (categories || []).filter((c) => {
    const pId = typeof c.parentId === "object" ? c.parentId?._id : c.parentId;
    return !pId;
  }).length;

  const subCategoriesCount = (categories || []).filter((c) => {
    const pId = typeof c.parentId === "object" ? c.parentId?._id : c.parentId;
    return Boolean(pId);
  }).length;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{`Admin Categories | ${siteName}`}</title>
      </Helmet>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Categories Hierarchy ({topCategoriesCount} Main Categories, {subCategoriesCount} Sub-Categories)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage main categories and nested sub-categories in expandable tree view
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={expandAll} className="h-9 text-xs">
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="h-9 text-xs">
            Collapse All
          </Button>
          <Button onClick={() => { resetCreate(); setValueCreate("parentId", ""); setCreateImage(""); setShowForm(true); }} className="h-9 text-xs gap-1.5 rounded-lg">
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowForm(false)}
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
              >
                <X className="size-4" />
              </button>

              <h2 className="mb-6 text-lg font-semibold text-foreground">Add New Category</h2>

              <form onSubmit={handleSubmitCreate(onCreateSubmit, onFormError)} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Name *</label>
                    <Input
                      {...regCreate("name")}
                      placeholder="e.g. Menswear, Womenswear, Bags & Accessories"
                      className={errCreate.name ? "border-destructive" : ""}
                      onChange={(e) => {
                        regCreate("name").onChange(e);
                        const val = e.target.value;
                        if (val) {
                          setValueCreate("slug", generateSlug(val), { shouldValidate: true, shouldDirty: true });
                        }
                      }}
                    />
                    {errCreate.name && <p className="mt-1 text-xs text-destructive">{errCreate.name.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Slug *</label>
                    <Input
                      {...regCreate("slug")}
                      placeholder="e.g. fashion-apparel"
                      className={errCreate.slug ? "border-destructive" : ""}
                    />
                    {errCreate.slug && <p className="mt-1 text-xs text-destructive">{errCreate.slug.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Category Level / Parent Category</label>
                  <select
                    {...regCreate("parentId")}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="">Main Category (Top Level - No Parent)</option>
                    {categories
                      .filter((cat) => {
                        const pId = typeof cat.parentId === "object" ? cat.parentId?._id : cat.parentId;
                        return !pId;
                      })
                      .map((cat) => (
                        <option key={cat._id} value={String(cat._id)}>
                          Sub-Category under: {cat.name} ({cat.slug})
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keep as <strong>Main Category</strong> for top categories (like Menswear, Womenswear, Accessories). Select a parent only if this is a sub-category.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Category Image</label>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/50">
                    {createImage ? (
                      <img src={createImage} alt="Preview" className="h-20 w-20 rounded-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Upload className="size-8" />
                        <p className="text-sm">Click to upload image</p>
                        <p className="text-xs">PNG, JPG up to 2MB</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleCreateImageUpload} />
                  </label>
                  {createImage && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-destructive hover:text-foreground"
                      onClick={() => setCreateImage("")}
                    >
                      Remove image
                    </button>
                  )}
                </div>

                {/* Category Dynamic Attribute Definitions Section */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="space-y-2 border-b border-border/40 pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Sliders className="size-4 text-primary" />
                        Dynamic Category Attribute Builder
                      </h3>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => createAttrAppend({ key: "", label: "", type: "text", options: "", required: false, unit: "", useAsVariant: false })}
                      >
                        <Plus className="size-3 mr-1" /> Custom Attribute
                      </Button>
                    </div>

                    {/* Quick Add Presets (Multi-Vendor General Store) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground mr-1">Quick Presets:</span>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-pink-600 border-pink-200 hover:bg-pink-50" onClick={() => createAttrAppend({ key: "size", label: "Clothing Size", type: "multi-select", options: "S, M, L, XL, XXL, 3XL", required: false, unit: "", useAsVariant: true })}>+ Clothing Size (S-3XL)</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => createAttrAppend({ key: "color", label: "Color", type: "multi-select", options: "Black, White, Red, Blue, Navy, Green, Grey, Gold, Silver", required: false, unit: "", useAsVariant: true })}>+ Color</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => createAttrAppend({ key: "shoe_size", label: "Shoe Size", type: "multi-select", options: "EU 38, EU 39, EU 40, EU 41, EU 42, EU 43, EU 44, EU 45", required: false, unit: "", useAsVariant: true })}>+ Shoe Size (38-45)</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-violet-600 border-violet-200 hover:bg-violet-50" onClick={() => createAttrAppend({ key: "accessory_type", label: "Accessory Type", type: "select", options: "Bags & Wallets, Jewelry & Ornaments, Watches, Belts, Sunglasses, Hats & Caps, Scarves, Hair Accessories", required: false, unit: "", useAsVariant: true })}>+ Accessory Type</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-teal-600 border-teal-200 hover:bg-teal-50" onClick={() => createAttrAppend({ key: "gender", label: "Target / Gender", type: "select", options: "Men, Women, Unisex, Kids, Baby", required: false, unit: "", useAsVariant: false })}>+ Target / Gender</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => createAttrAppend({ key: "season", label: "Season / Occasion", type: "select", options: "Summer, Winter, Eid Collection, Party Wear, Casual, Formal", required: false, unit: "", useAsVariant: false })}>+ Season/Occasion</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => createAttrAppend({ key: "fit", label: "Fit / Cut Style", type: "select", options: "Slim Fit, Regular Fit, Oversized, Loose Fit, Tailored", required: false, unit: "", useAsVariant: true })}>+ Fit/Style</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => createAttrAppend({ key: "warranty", label: "Warranty", type: "select", options: "No Warranty, 6 Months, 1 Year, 2 Years, 3 Years", required: false, unit: "", useAsVariant: false })}>+ Warranty</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10" onClick={() => createAttrAppend({ key: "brand", label: "Brand", type: "text", options: "", required: false, unit: "", useAsVariant: false })}>+ Brand</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10" onClick={() => createAttrAppend({ key: "fabric", label: "Fabric / Material", type: "select", options: "100% Cotton, Linen, Denim, Silk, Polyester, Leather, Metal, Gold, Silver", required: false, unit: "", useAsVariant: false })}>+ Fabric/Material</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10" onClick={() => createAttrAppend({ key: "weight", label: "Net Weight / Volume", type: "text", options: "", required: false, unit: "kg", useAsVariant: false })}>+ Weight / Volume</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => createAttrAppend({ key: "baby_size", label: "Baby / Kids Size", type: "multi-select", options: "0-3M, 3-6M, 6-12M, 1-2Y, 2-4Y, 4-6Y, 6-8Y", required: false, unit: "", useAsVariant: true })}>+ Baby/Kids Size</Button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {createAttrFields.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg bg-background">
                        No category attributes configured yet.
                      </p>
                    )}

                    {createAttrFields.map((field, index) => {
                      const currentType = watchCreate(`attributes.${index}.type`);
                      const isVariant = watchCreate(`attributes.${index}.useAsVariant`);
                      const needsOptions = currentType === "select" || currentType === "multi-select";
                      return (
                        <div key={field.id} className="relative rounded-xl border border-border/80 bg-background p-3.5 space-y-3 shadow-xs">
                          <input type="hidden" {...regCreate(`attributes.${index}.key`)} />
                          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">#{index + 1}</span>
                              {isVariant ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                  Option Variant
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                  Product Specification
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => createAttrRemove(index)}
                              className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                              title="Remove attribute"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-foreground block mb-1">
                                Attribute Title / Field Name
                              </label>
                              <Input
                                {...regCreate(`attributes.${index}.label`)}
                                placeholder="e.g. Clothing Size, Color, Age Group"
                                className="h-9 text-xs"
                                onChange={(e) => {
                                  regCreate(`attributes.${index}.label`).onChange(e);
                                  const val = e.target.value;
                                  const generatedKey = val.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/\s+/g, "_");
                                  setValueCreate(`attributes.${index}.key`, generatedKey, { shouldDirty: true });
                                }}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-foreground block mb-1">Input / Display Type</label>
                              <select
                                {...regCreate(`attributes.${index}.type`)}
                                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-ring font-medium"
                              >
                                <option value="multi-select">Multi-Select Pills (Size / Color choices)</option>
                                <option value="select">Dropdown Menu (Single Select)</option>
                                <option value="text">Text Input (Text Field)</option>
                                <option value="number">Number Input (Number Field)</option>
                                <option value="boolean">Checkbox (Yes / No)</option>
                              </select>
                            </div>
                          </div>

                          {needsOptions && (
                            <div>
                              <label className="text-xs font-semibold text-foreground block mb-1">
                                Options List (comma separated)
                              </label>
                              <Input {...regCreate(`attributes.${index}.options`)} placeholder="e.g. 0-3M, 3-6M, 6-12M, 1-2Y, 2-3Y, 4-5Y" className="h-9 text-xs" />
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40 text-xs items-center">
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Unit (optional)</label>
                              <Input {...regCreate(`attributes.${index}.unit`)} placeholder="e.g. Yrs, cm, kg" className="h-8 text-xs bg-muted/20" />
                            </div>
                            <div className="sm:col-span-2 flex items-center justify-start sm:justify-end gap-4 pt-2 sm:pt-0">
                              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
                                <input type="checkbox" {...regCreate(`attributes.${index}.required`)} className="rounded border-border size-3.5 accent-primary" />
                                <span>Required Field</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400 cursor-pointer bg-purple-500/10 px-2.5 py-1.5 rounded-lg border border-purple-500/20">
                                <input type="checkbox" {...regCreate(`attributes.${index}.useAsVariant`)} className="rounded border-purple-400 size-3.5 accent-purple-600" />
                                <span>Use as Variant</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={createMutation.isPending} className="rounded-lg">
                    {createMutation.isPending ? "Creating..." : "Create Category"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setShowForm(false); resetCreate(); setCreateImage(""); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Category Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => { setShowEditModal(false); setEditingId(null); resetUpdate(); setEditImage(""); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setShowEditModal(false); setEditingId(null); resetUpdate(); setEditImage(""); }}
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
              >
                <X className="size-4" />
              </button>

              <h2 className="mb-6 text-lg font-semibold text-foreground">Edit Category</h2>

              <form onSubmit={handleSubmitUpdate(onUpdateSubmit, onFormError)} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Name *</label>
                    <Input
                      {...regUpdate("name")}
                      placeholder="e.g. Menswear, Womenswear, Bags & Accessories"
                      className={errUpdate.name ? "border-destructive" : ""}
                      onChange={(e) => {
                        regUpdate("name").onChange(e);
                        const val = e.target.value;
                        if (val) {
                          setValueUpdate("slug", generateSlug(val), { shouldValidate: true, shouldDirty: true });
                        }
                      }}
                    />
                    {errUpdate.name && <p className="mt-1 text-xs text-destructive">{errUpdate.name.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Slug *</label>
                    <Input
                      {...regUpdate("slug")}
                      placeholder="e.g. fashion-apparel"
                      className={errUpdate.slug ? "border-destructive" : ""}
                    />
                    {errUpdate.slug && <p className="mt-1 text-xs text-destructive">{errUpdate.slug.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Category Level / Parent Category</label>
                  <select
                    {...regUpdate("parentId")}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="">Main Category (Top Level - No Parent)</option>
                    {categories
                      .filter((c) => String(c._id) !== String(editingId))
                      .map((cat) => (
                        <option key={cat._id} value={String(cat._id)}>
                          Sub-Category under: {cat.name} ({cat.slug})
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keep as <strong>Main Category</strong> for top categories (like Clothing, Toys). Select a parent only if this is a sub-category.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Category Image</label>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/50">
                    {editImage ? (
                      <img src={editImage} alt="Preview" className="h-20 w-20 rounded-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Upload className="size-8" />
                        <p className="text-sm">Click to upload image</p>
                        <p className="text-xs">PNG, JPG up to 2MB</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditImageUpload} />
                  </label>
                  {editImage && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-destructive hover:text-foreground"
                      onClick={() => setEditImage("")}
                    >
                      Remove image
                    </button>
                  )}
                </div>

                {/* Category Dynamic Attribute Definitions Section */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="space-y-2 border-b border-border/40 pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <Sliders className="size-4 text-primary" />
                        Dynamic Category Attribute Builder
                      </h3>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => updateAttrAppend({ key: "", label: "", type: "text", options: "", required: false, unit: "", useAsVariant: false })}
                      >
                        <Plus className="size-3 mr-1" /> Custom Attribute
                      </Button>
                    </div>

                    {/* Quick Add Presets (Multi-Vendor General Store) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground mr-1">Quick Presets:</span>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-pink-600 border-pink-200 hover:bg-pink-50" onClick={() => updateAttrAppend({ key: "size", label: "Clothing Size", type: "multi-select", options: "S, M, L, XL, XXL, 3XL", required: false, unit: "", useAsVariant: true })}>+ Clothing Size (S-3XL)</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => updateAttrAppend({ key: "color", label: "Color", type: "multi-select", options: "Black, White, Red, Blue, Navy, Green, Grey, Gold", required: false, unit: "", useAsVariant: true })}>+ Color</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => updateAttrAppend({ key: "shoe_size", label: "Shoe Size", type: "multi-select", options: "EU 38, EU 39, EU 40, EU 41, EU 42, EU 43, EU 44, EU 45", required: false, unit: "", useAsVariant: true })}>+ Shoe Size (38-45)</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => updateAttrAppend({ key: "season", label: "Season / Occasion", type: "select", options: "Summer, Winter, Eid Collection, Party Wear, Casual, Formal", required: false, unit: "", useAsVariant: false })}>+ Season/Occasion</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => updateAttrAppend({ key: "fit", label: "Fit / Cut Style", type: "select", options: "Slim Fit, Regular Fit, Oversized, Loose Fit, Tailored", required: false, unit: "", useAsVariant: true })}>+ Fit/Style</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => updateAttrAppend({ key: "warranty", label: "Warranty", type: "select", options: "No Warranty, 6 Months, 1 Year, 2 Years, 3 Years", required: false, unit: "", useAsVariant: false })}>+ Warranty</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10" onClick={() => updateAttrAppend({ key: "brand", label: "Brand", type: "text", options: "", required: false, unit: "", useAsVariant: false })}>+ Brand</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10" onClick={() => updateAttrAppend({ key: "fabric", label: "Fabric / Material", type: "select", options: "100% Cotton, Linen, Denim, Silk, Polyester, Leather, Metal, Plastic", required: false, unit: "", useAsVariant: false })}>+ Fabric/Material</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10" onClick={() => updateAttrAppend({ key: "weight", label: "Net Weight / Volume", type: "text", options: "", required: false, unit: "kg", useAsVariant: false })}>+ Weight / Volume</Button>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2 bg-background hover:bg-primary/10 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => updateAttrAppend({ key: "baby_size", label: "Baby / Kids Size", type: "multi-select", options: "0-3M, 3-6M, 6-12M, 1-2Y, 2-4Y, 4-6Y, 6-8Y", required: false, unit: "", useAsVariant: true })}>+ Baby/Kids Size</Button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {updateAttrFields.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg bg-background">
                        No category attributes configured yet.
                      </p>
                    )}

                    {updateAttrFields.map((field, index) => {
                      const currentType = watchUpdate(`attributes.${index}.type`);
                      const isVariant = watchUpdate(`attributes.${index}.useAsVariant`);
                      const needsOptions = currentType === "select" || currentType === "multi-select";
                      return (
                        <div key={field.id} className="relative rounded-xl border border-border/80 bg-background p-3.5 space-y-3 shadow-xs">
                          <input type="hidden" {...regUpdate(`attributes.${index}.key`)} />
                          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">#{index + 1}</span>
                              {isVariant ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                  Option Variant
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                  Product Specification
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => updateAttrRemove(index)}
                              className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                              title="Remove attribute"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-foreground block mb-1">
                                Attribute Title / Field Name
                              </label>
                              <Input
                                {...regUpdate(`attributes.${index}.label`)}
                                placeholder="e.g. Clothing Size, Color, Age Group"
                                className="h-9 text-xs"
                                onChange={(e) => {
                                  regUpdate(`attributes.${index}.label`).onChange(e);
                                  const val = e.target.value;
                                  const generatedKey = val.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/\s+/g, "_");
                                  setValueUpdate(`attributes.${index}.key`, generatedKey, { shouldDirty: true });
                                }}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-foreground block mb-1">Input / Display Type</label>
                              <select
                                {...regUpdate(`attributes.${index}.type`)}
                                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-ring font-medium"
                              >
                                <option value="multi-select">Multi-Select Pills (Size / Color choices)</option>
                                <option value="select">Dropdown Menu (Single Select)</option>
                                <option value="text">Text Input (Text Field)</option>
                                <option value="number">Number Input (Number Field)</option>
                                <option value="boolean">Checkbox (Yes / No)</option>
                              </select>
                            </div>
                          </div>

                          {needsOptions && (
                            <div>
                              <label className="text-xs font-semibold text-foreground block mb-1">
                                Options List (comma separated)
                              </label>
                              <Input {...regUpdate(`attributes.${index}.options`)} placeholder="e.g. 0-3M, 3-6M, 6-12M, 1-2Y, 2-3Y, 4-5Y" className="h-9 text-xs" />
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40 text-xs items-center">
                            <div>
                              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Unit (optional)</label>
                              <Input {...regUpdate(`attributes.${index}.unit`)} placeholder="e.g. Yrs, cm, kg" className="h-8 text-xs bg-muted/20" />
                            </div>
                            <div className="sm:col-span-2 flex items-center justify-start sm:justify-end gap-4 pt-2 sm:pt-0">
                              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground cursor-pointer">
                                <input type="checkbox" {...regUpdate(`attributes.${index}.required`)} className="rounded border-border size-3.5 accent-primary" />
                                <span>Required Field</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400 cursor-pointer bg-purple-500/10 px-2.5 py-1.5 rounded-lg border border-purple-500/20">
                                <input type="checkbox" {...regUpdate(`attributes.${index}.useAsVariant`)} className="rounded border-purple-400 size-3.5 accent-purple-600" />
                                <span>Use as Variant</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setShowEditModal(false); setEditingId(null); resetUpdate(); setEditImage(""); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} className="rounded-lg">
                    <Save className="size-4 mr-1.5" />
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center">
          <FolderTree className="mx-auto size-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No categories yet.</p>
        </div>
      ) : (() => {
        // Group categories into Main/Top-Level and Sub-Categories
        const topCategories = categories.filter((c) => {
          const pId = typeof c.parentId === "object" ? c.parentId?._id : c.parentId;
          return !pId;
        });

        const getSubCategoriesForParent = (parent) => {
          const parentIdStr = String(parent._id || parent.slug);

          const dbSubCats = categories.filter((c) => {
            const pId = typeof c.parentId === "object" ? c.parentId?._id : c.parentId;
            return pId && (String(pId) === parentIdStr || String(pId) === String(parent._id) || String(pId) === String(parent.slug));
          });

          const embeddedChildren = (parent.children || []).map((child) => ({
            _id: child._id || child.id || child.slug,
            name: child.name,
            slug: child.slug,
            attributes: Array.isArray(child.attributes) ? child.attributes : [],
            parentId: parent._id || parent.slug,
            isEmbedded: true,
          }));

          const combined = [];
          const processedKeys = new Set();

          dbSubCats.forEach((dbSub) => {
            const matchingEmbedded = (parent.children || []).find(
              (ch) => ch.slug === dbSub.slug || String(ch._id || ch.id) === String(dbSub._id)
            );

            const attributes = matchingEmbedded && Array.isArray(matchingEmbedded.attributes)
              ? matchingEmbedded.attributes
              : (Array.isArray(dbSub.attributes) ? dbSub.attributes : []);

            combined.push({
              ...dbSub,
              attributes,
            });
            if (dbSub.slug) processedKeys.add(dbSub.slug);
            if (dbSub._id) processedKeys.add(String(dbSub._id));
          });

          embeddedChildren.forEach((emb) => {
            const embIdStr = String(emb._id || emb.slug);
            if (!processedKeys.has(emb.slug) && !processedKeys.has(embIdStr)) {
              combined.push(emb);
            }
          });

          return combined;
        };

        const displayTopCategories = topCategories.length > 0 ? topCategories : categories;

        return (
          <div className="space-y-3">
            {displayTopCategories.map((cat, i) => {
              const isEditing = editingId === cat._id;
              const isDeleting = deletingId === cat._id;
              const subCats = getSubCategoriesForParent(cat);
              const isExpanded = expandedIds[cat._id] ?? true;

              return (
                <motion.div
                  key={cat._id || cat.slug}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden"
                >
                  {/* Top Level Category Card Header */}
                  <div className="p-4 bg-card hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {subCats.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(cat._id)}
                            className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/40 hover:bg-primary/10 hover:text-primary transition-colors text-foreground shrink-0"
                            title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                          >
                            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </button>
                        ) : (
                          <div className="size-7 shrink-0 flex items-center justify-center">
                            <span className="size-2 rounded-full bg-muted-foreground/30" />
                          </div>
                        )}

                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary border border-primary/20">
                          {cat.image ? (
                            <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                          ) : (
                            <FolderTree className="size-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground text-base">{cat.name}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                              Main Category
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span className="font-mono text-muted-foreground/80">/{cat.slug}</span>
                            <span>•</span>
                            <span className="font-semibold text-foreground">{subCats.length} subcategories</span>
                            <span>•</span>
                            <span className="font-semibold text-primary">{cat.attributes?.length ?? 0} dynamic attributes</span>
                          </div>
                          {cat.attributes && cat.attributes.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                              {cat.attributes.map((attr, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/80 text-foreground border border-border">
                                  <span>{attr.label || attr.key}</span>
                                  {attr.useAsVariant && (
                                    <span className="text-[9px] bg-purple-500/20 text-purple-700 dark:text-purple-300 px-1 rounded font-bold">Variant</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1 hover:bg-primary/10 hover:text-primary border-primary/30"
                          onClick={() => {
                            resetCreate();
                            setValueCreate("parentId", String(cat._id));
                            setShowForm(true);
                          }}
                        >
                          <Plus className="size-3.5" /> Subcategory
                        </Button>

                        {!isDeleting && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 size-8 p-0"
                            disabled={editingId !== null && !isEditing}
                            onClick={() => (isEditing ? (setEditingId(null), resetUpdate()) : startEdit(cat))}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}

                        {!isEditing && (
                          <>
                            {!isDeleting ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 size-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={editingId !== null}
                                onClick={() => setDeletingId(cat._id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5">
                                <span className="text-xs text-foreground">Delete?</span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={deleteMutation.isPending}
                                  onClick={() => deleteMutation.mutate(cat._id)}
                                >
                                  {deleteMutation.isPending ? "..." : "Yes"}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
                                  No
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>



                  {/* Subcategories Collapsible Section */}
                  {isExpanded && subCats.length > 0 && (
                    <div className="border-t border-border/60 bg-muted/10 p-3 sm:p-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2.5 flex items-center gap-1.5">
                        <FolderTree className="size-3.5 text-primary" />
                        Subcategories under {cat.name} ({subCats.length})
                      </div>

                      <div className="border-l-2 border-primary/30 pl-3 sm:pl-4 space-y-2">
                        {subCats.map((sub) => {
                          const subId = sub._id || sub.slug;
                          const isSubEditing = editingId === subId;
                          const isSubDeleting = deletingId === subId;

                          return (
                            <div
                              key={subId}
                              className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs hover:border-primary/40 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/5 text-primary border border-primary/10">
                                    {sub.image ? (
                                      <img src={sub.image} alt={sub.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <FolderTree className="size-3.5" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-foreground text-sm">{sub.name}</span>
                                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-mono">
                                        /{sub.slug}
                                      </span>
                                      <span className="text-[10px] font-medium text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                        Sub-Category
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {sub.attributes?.length ?? 0} dynamic attributes
                                    </p>
                                    {sub.attributes && sub.attributes.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap mt-1">
                                        {sub.attributes.map((attr, idx) => (
                                          <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border/60">
                                            <span>{attr.label || attr.key}</span>
                                            {attr.useAsVariant && (
                                              <span className="text-[8px] bg-purple-500/20 text-purple-700 dark:text-purple-300 px-0.5 rounded font-bold">Variant</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {!isSubDeleting && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 size-7 p-0"
                                      disabled={editingId !== null && !isSubEditing}
                                      onClick={() => (isSubEditing ? (setEditingId(null), resetUpdate()) : startEdit(sub))}
                                    >
                                      <Pencil className="size-3.5" />
                                    </Button>
                                  )}

                                  {!isSubEditing && (
                                    <>
                                      {!isSubDeleting ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 size-7 p-0 text-destructive hover:bg-destructive/10"
                                          disabled={editingId !== null}
                                          onClick={() => setDeletingId(subId)}
                                        >
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      ) : (
                                        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1">
                                          <span className="text-[11px] text-foreground">Delete?</span>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-6 px-2 text-[10px]"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => deleteMutation.mutate(subId)}
                                          >
                                            {deleteMutation.isPending ? "..." : "Yes"}
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => setDeletingId(null)}>
                                            No
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
