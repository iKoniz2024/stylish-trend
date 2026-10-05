"use client";

import { compressImage } from "@/utils/compressImage";
import Link from 'next/link';
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Eye, Trash2, X, Package, Camera, ImagePlus, Search, ChevronLeft, ChevronRight, Tag, Sliders, Layers, Sparkles, ShieldCheck } from "lucide-react";

import { getProducts, createProduct, deleteProduct } from "@/services/product.api";
import { formatBDT } from "@/utils/currency";
import { getCategories } from "@/services/category.api";
import { resolveCategoryAttributes } from "@/utils/categoryAttributes";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CategorySelect from "@/components/ui/CategorySelect";
import { Helmet } from "react-helmet-async";
import useSettings from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

const productSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  discountPercentage: z.coerce.number().min(0).max(100).optional().default(0),
  stock: z.coerce.number().min(0, "Stock cannot be negative"),
  brand: z.string().optional().default(""),
  tags: z.string().optional().default(""),
  warrantyInformation: z.string().optional().default(""),
  shippingInformation: z.string().optional().default(""),
  returnPolicy: z.string().optional().default(""),
});

function ProductSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

function getAllCategorySlugs(categories) {
  const slugs = [];
  for (const parent of categories) {
    if (parent.slug) slugs.push(parent.slug);
    for (const child of parent.children ?? []) {
      if (child.slug) slugs.push(child.slug);
    }
  }
  return [...new Set(slugs)];
}

import usePageTitle from "@/hooks/usePageTitle";

export default function AdminProducts({ children }) {
  const { siteName } = useSettings();
  const { user } = useAuth();
  usePageTitle(user?.role === "vendor" ? "My Shop Products" : "Admin Products");
  const queryClient = useQueryClient();

  const isVendor = user?.role === "vendor";
  const vendorUserId = user?._id || user?.id;
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [imagePreviews, setImagePreviews] = useState([]);
  const [thumbnailDrag, setThumbnailDrag] = useState(false);
  const [imagesDrag, setImagesDrag] = useState(false);
  const thumbnailInputRef = useRef(null);
  const imagesInputRef = useRef(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [discountFilter, setDiscountFilter] = useState("");
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [sizeMeasurements, setSizeMeasurements] = useState({});
  const [measurementFields, setMeasurementFields] = useState([
    { key: "chest", label: "Chest (বুক)", placeholder: "e.g. 38" },
    { key: "long", label: "Length (দৈর্ঘ্য)", placeholder: "e.g. 28" },
    { key: "shoulder", label: "Shoulder (কাধ)", placeholder: "e.g. 17" },
  ]);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [colorVariants, setColorVariants] = useState([]);
  const [colorNameInput, setColorNameInput] = useState("");
  const [colorFile, setColorFile] = useState(null);
  const [colorPreview, setColorPreview] = useState("");
  const colorInputRef = useRef(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: getProducts,
    staleTime: 5 * 60 * 1000,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesData ?? [];
  const categorySlugs = getAllCategorySlugs(categories);

  const products = useMemo(() => data?.products ?? [], [data]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, stockFilter, discountFilter]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    // Strict separation: Vendors ONLY see products explicitly owned by them
    if (isVendor) {
      if (!product.vendorId || String(product.vendorId) !== String(vendorUserId)) {
        return false;
      }
    }
    const searchLower = search.trim().toLowerCase();
    const matchesSearch = !searchLower || (
      (product.title && String(product.title).toLowerCase().includes(searchLower)) ||
      (product.brand && String(product.brand).toLowerCase().includes(searchLower)) ||
      (product.category && String(product.category).toLowerCase().includes(searchLower)) ||
      (product.primaryCategory && String(product.primaryCategory).toLowerCase().includes(searchLower)) ||
      (product.sku && String(product.sku).toLowerCase().includes(searchLower)) ||
      (Array.isArray(product.tags) && product.tags.some(t => typeof t === "string" && t.toLowerCase().includes(searchLower)))
    );

    const catFilterLower = categoryFilter.trim().toLowerCase();
    const matchesCategory = !catFilterLower || (
      (product.category && String(product.category).toLowerCase() === catFilterLower) ||
      (product.primaryCategory && String(product.primaryCategory).toLowerCase() === catFilterLower) ||
      (Array.isArray(product.categories) && product.categories.some(c => String(c).toLowerCase() === catFilterLower))
    );

    const matchesStock =
      stockFilter === "" ||
      (stockFilter === "in-stock" && product.stock > 10) ||
      (stockFilter === "low-stock" && product.stock > 0 && product.stock <= 10) ||
      (stockFilter === "out-of-stock" && product.stock === 0);

    const matchesDiscount =
      discountFilter === "" ||
      (discountFilter === "with-discount" && product.discountPercentage > 0) ||
      (discountFilter === "no-discount" && product.discountPercentage === 0);

    return matchesSearch && matchesCategory && matchesStock && matchesDiscount;
  }), [products, search, categoryFilter, stockFilter, discountFilter, isVendor, vendorUserId]);

  const totalPages = Math.ceil(filteredProducts.length / limit);
  const paginatedProducts = filteredProducts.slice((page - 1) * limit, page * limit);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      price: 0,
      discountPercentage: 0,
      stock: 0,
      brand: "",
      tags: "",
      warrantyInformation: "",
      shippingInformation: "",
      returnPolicy: "",
    },
  });

  const selectedCategorySlug = watch("category");

  useEffect(() => {
    if (selectedCategorySlug) {
      const slug = selectedCategorySlug.toLowerCase();
      if (slug.includes("shoe") || slug.includes("footwear") || slug.includes("slipper") || slug.includes("sandal")) {
        setMeasurementFields([
          { key: "footLength", label: "Foot Length (পায়ের দৈর্ঘ্য)", placeholder: "e.g. 26 cm" },
          { key: "euSize", label: "EU/UK Size", placeholder: "e.g. EU 41" }
        ]);
      } else if (slug.includes("pant") || slug.includes("pajama") || slug.includes("trouser") || slug.includes("bottom") || slug.includes("jeans") || slug.includes("shorts")) {
        setMeasurementFields([
          { key: "waist", label: "Waist (কোমর)", placeholder: "e.g. 32" },
          { key: "long", label: "Length (দৈর্ঘ্য)", placeholder: "e.g. 40" },
          { key: "hip", label: "Hip (হিপ)", placeholder: "e.g. 38" },
          { key: "thigh", label: "Thigh (রান)", placeholder: "e.g. 22" }
        ]);
      } else {
        setMeasurementFields([
          { key: "chest", label: "Chest (বুক)", placeholder: "e.g. 38" },
          { key: "long", label: "Length (দৈর্ঘ্য)", placeholder: "e.g. 28" },
          { key: "shoulder", label: "Shoulder (কাধ)", placeholder: "e.g. 17" }
        ]);
      }
    }
  }, [selectedCategorySlug]);

  const { allAttributes: currentCategoryAttributes, specifications: categorySpecifications, variants: categoryVariants } = useMemo(
    () => resolveCategoryAttributes(selectedCategorySlug, categories),
    [selectedCategorySlug, categories]
  );

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (res, variables) => {
      toast.success("Product created successfully");
      queryClient.setQueryData(["admin-products"], (old) => {
        if (!old) return old;
        const newProduct = {
          _id: res?.insertedId || res?._id || Date.now().toString(),
          ...variables,
        };
        return {
          ...old,
          products: [newProduct, ...(old.products || [])],
          totalProducts: (old.totalProducts || 0) + 1,
        };
      });
      queryClient.invalidateQueries();
      setShowForm(false);
      resetForm();
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        data.errors.forEach((e) => {
          const field = e.path?.[e.path.length - 1];
          if (field) setError(field, { message: e.message });
        });
        toast.error("Please fix the errors below");
      } else {
        toast.error(data?.message || data?.error || "Failed to create product");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin-products"] });
      const previous = queryClient.getQueryData(["admin-products"]);
      queryClient.setQueryData(["admin-products"], (old) => {
        if (!old || !old.products) return old;
        return {
          ...old,
          products: old.products.filter((p) => p._id !== id),
          totalProducts: Math.max(0, (old.totalProducts || 0) - 1),
        };
      });
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["admin-products"], context.previous);
      }
      toast.error(err?.response?.data?.message || "Failed to delete product");
    },
    onSuccess: () => {
      toast.success("Product deleted successfully");
      setDeletingId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries();
    },
  });



  const toBase64 = (file) => compressImage(file);



  const [dynamicAttributes, setDynamicAttributes] = useState({});

  const resetForm = () => {
    setThumbnailFile(null);
    setImageFiles([]);
    setThumbnailPreview("");
    setImagePreviews([]);
    setSelectedSizes([]);
    setSizeMeasurements({});
    setColorVariants([]);
    setColorNameInput("");
    setColorFile(null);
    setColorPreview("");
    setDynamicAttributes({});
    reset();
  };

  const handleAddColorVariant = async () => {
    if (!colorNameInput.trim()) {
      toast.error("Please enter a color name");
      return;
    }
    if (!colorFile && !colorPreview) {
      toast.error("Please upload an image for this color");
      return;
    }
    let imgStr = colorPreview;
    if (colorFile) {
      imgStr = await toBase64(colorFile);
    }
    setColorVariants((prev) => [...prev, { name: colorNameInput.trim(), image: imgStr }]);
    setColorNameInput("");
    setColorFile(null);
    setColorPreview("");
  };

  const handleRemoveColorVariant = (index) => {
    setColorVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (formData) => {
    const activeFields = measurementFields || [];
    if (selectedSizes.length > 0) {
      for (const size of selectedSizes) {
        const m = sizeMeasurements[size];
        const hasAnyValue = activeFields.some((f) => m?.[f.key]?.toString().trim());
        if (!hasAnyValue) {
          toast.error(`Please provide measurements for size ${size}`);
          return;
        }
      }
    }

    let thumbnail = "";
    let images = [];

    if (thumbnailFile) {
      thumbnail = await toBase64(thumbnailFile);
    }

    if (imageFiles.length > 0) {
      images = await Promise.all(imageFiles.map((f) => toBase64(f)));
    }

    const processedColors = await Promise.all(
      colorVariants.map(async (c) => ({
        name: c.name,
        image: c.file ? await toBase64(c.file) : c.image,
      }))
    );

    if (!thumbnail && processedColors.length > 0) {
      thumbnail = processedColors[0].image;
    } else if (!thumbnail && images.length > 0) {
      thumbnail = images[0];
    }

    const payload = {
      ...formData,
      attributes: dynamicAttributes,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      sizes: selectedSizes,
      sizeMeasurements: (selectedSizes || []).map((s) => {
        const mData = sizeMeasurements[s] || {};
        const measurementObj = { size: s };
        activeFields.forEach((f) => {
          if (mData[f.key] !== undefined && mData[f.key] !== "") {
            measurementObj[f.key] = mData[f.key];
          }
        });
        return measurementObj;
      }),
      colors: processedColors,
      thumbnail,
      images,
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{`Admin Products | ${siteName}`}</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Products ({filteredProducts.length})</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" data-icon="inline-start" />
          Add Product
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="">All Categories</option>
              {categories.map((parent, pIndex) => (
                <optgroup key={parent._id || `${parent.slug}-${pIndex}`} label={parent.name || parent.slug}>
                  <option value={parent.slug}>{parent.name || parent.slug} (Main)</option>
                  {parent.children?.map((child, cIndex) => (
                    <option key={child._id || `${parent.slug}-${child.slug}-${cIndex}`} value={child.slug}>
                      &nbsp;&nbsp;↳ {child.name || child.slug}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="">All Stock</option>
              <option value="in-stock">In Stock (&gt;10)</option>
              <option value="low-stock">Low Stock (1-10)</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
            <select
              value={discountFilter}
              onChange={(e) => setDiscountFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="">All Discounts</option>
              <option value="with-discount">With Discount</option>
              <option value="no-discount">No Discount</option>
            </select>
          </div>
        </div>
      </motion.div>

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
              className="relative max-h-[90vh] w-full max-w-4xl flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Plus className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Add New Product</h2>
                    <p className="text-xs text-muted-foreground">Fill in the details below to add a new product to your store catalog</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="flex size-8 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* CARD 1: Basic Information */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-sm font-bold text-foreground">
                    <Package className="size-4 text-primary" />
                    <span>Basic Information</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Title *</label>
                      <Input {...register("title")} placeholder="Product title (e.g. Premium Cotton Shirt)" className={errors.title ? "border-destructive" : ""} />
                      {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <CategorySelect
                        categories={categories}
                        value={watch("category")}
                        onChange={(slug) => setValue("category", slug, { shouldValidate: true })}
                        error={errors.category?.message}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Brand</label>
                      <Input {...register("brand")} placeholder="Brand name (optional)" />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Description *</label>
                      <textarea
                        {...register("description")}
                        rows={3}
                        placeholder="Detailed product description..."
                        className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring ${errors.description ? "border-destructive" : ""}`}
                      />
                      {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>}
                    </div>
                  </div>
                </div>

                {/* CARD 2: Pricing & Inventory */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-sm font-bold text-foreground">
                    <Tag className="size-4 text-primary" />
                    <span>Pricing & Stock</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Price (৳) *</label>
                      <Input {...register("price")} type="number" step="0.01" placeholder="৳0.00" className={errors.price ? "border-destructive" : ""} />
                      {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price.message}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Discount (%)</label>
                      <Input {...register("discountPercentage")} type="number" step="0.1" min="0" max="100" placeholder="0" />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Stock *</label>
                      <Input {...register("stock")} type="number" min="0" placeholder="0" className={errors.stock ? "border-destructive" : ""} />
                      {errors.stock && <p className="mt-1 text-xs text-destructive">{errors.stock.message}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Min Order Qty</label>
                      <Input {...register("minimumOrderQuantity")} type="number" min="1" placeholder="1" />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Weight (g)</label>
                      <Input {...register("weight")} type="number" step="0.1" placeholder="0" />
                    </div>

                    <div className="lg:col-span-3">
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Tags (comma separated)</label>
                      <Input {...register("tags")} placeholder="e.g. shirt, cotton, casual, summer" />
                    </div>
                  </div>
                </div>

                {/* CARD 3: Category Specs & Variants */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-sm font-bold text-foreground">
                    <Sliders className="size-4 text-primary" />
                    <span>Specifications, Sizes & Variants</span>
                  </div>

                  {/* Dynamic Category Specifications & Variants */}
                  {!selectedCategorySlug ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground bg-muted/10">
                      Please select a category above to view specifications & attributes.
                    </div>
                  ) : currentCategoryAttributes.length > 0 ? (
                    <div className="space-y-5">
                      {/* Product Specifications Section */}
                      {categorySpecifications.length > 0 && (
                        <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/20">
                          <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <h4 className="text-xs font-bold tracking-wide uppercase text-foreground flex items-center gap-1.5">
                              <Tag className="size-3.5 text-blue-500" /> Product Specifications
                            </h4>
                            <span className="text-[11px] text-muted-foreground">{categorySpecifications.length} specs</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {categorySpecifications.map((attr) => {
                              const optionsList = Array.isArray(attr.options) ? attr.options : (typeof attr.options === "string" && attr.options.trim() ? attr.options.split(",").map(s => s.trim()) : []);

                              if (attr.type === "select") {
                                return (
                                  <div key={attr.key} className="space-y-1">
                                    <label className="text-xs font-medium text-foreground">{attr.label} {attr.unit ? `(${attr.unit})` : ''} {attr.required && "*"}</label>
                                    <select
                                      value={dynamicAttributes[attr.key] || ""}
                                      onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-ring font-medium"
                                    >
                                      <option value="">Select {attr.label}</option>
                                      {optionsList.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              }

                              if (attr.type === "multi-select") {
                                const selectedValues = Array.isArray(dynamicAttributes[attr.key]) ? dynamicAttributes[attr.key] : [];
                                return (
                                  <div key={attr.key} className="sm:col-span-2 space-y-2">
                                    <label className="text-xs font-medium text-foreground">{attr.label} {attr.unit ? `(${attr.unit})` : ''} {attr.required && "*"}</label>
                                    <div className="flex flex-wrap gap-2">
                                      {optionsList.map((opt) => {
                                        const isSelected = selectedValues.includes(opt);
                                        return (
                                          <button
                                            key={opt}
                                            type="button"
                                            onClick={() => {
                                              const next = isSelected ? selectedValues.filter(v => v !== opt) : [...selectedValues, opt];
                                              setDynamicAttributes(prev => ({ ...prev, [attr.key]: next }));
                                            }}
                                            className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${isSelected
                                              ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                                              : "border-border bg-background text-foreground hover:border-muted-foreground"
                                              }`}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }

                              if (attr.type === "boolean") {
                                return (
                                  <div key={attr.key} className="flex items-center gap-2 pt-2">
                                    <input
                                      type="checkbox"
                                      id={`attr-${attr.key}`}
                                      checked={Boolean(dynamicAttributes[attr.key])}
                                      onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.checked }))}
                                      className="rounded border-border size-4 accent-primary"
                                    />
                                    <label htmlFor={`attr-${attr.key}`} className="text-xs font-medium text-foreground cursor-pointer">
                                      {attr.label}
                                    </label>
                                  </div>
                                );
                              }

                              return (
                                <div key={attr.key} className="space-y-1">
                                  <label className="text-xs font-medium text-foreground">{attr.label} {attr.unit ? `(${attr.unit})` : ''} {attr.required && "*"}</label>
                                  <Input
                                    type={attr.type === "number" ? "number" : "text"}
                                    placeholder={`Enter ${attr.label}`}
                                    value={dynamicAttributes[attr.key] || ""}
                                    onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                                    className="h-9 text-xs"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Product Option Variants Section */}
                      {categoryVariants.length > 0 && (
                        <div className="space-y-4 rounded-xl border border-border p-4 bg-secondary/30">
                          <div className="flex items-center justify-between border-b border-border pb-2">
                            <h4 className="text-xs font-bold tracking-wide uppercase text-primary flex items-center gap-1.5">
                              <Sparkles className="size-3.5 text-primary" /> Product Option Variants
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {categoryVariants.map((attr) => {
                              const optionsList = Array.isArray(attr.options) ? attr.options : (typeof attr.options === "string" && attr.options.trim() ? attr.options.split(",").map(s => s.trim()) : []);
                              const isSizeVariant = attr.key === "size" || attr.key === "sizes" || attr.key === "shoe_size";
                              const selectedValues = isSizeVariant ? selectedSizes : (Array.isArray(dynamicAttributes[attr.key]) ? dynamicAttributes[attr.key] : []);

                              return (
                                <div key={attr.key} className="sm:col-span-2 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">{attr.label} {attr.required && "*"}</label>
                                    <span className="text-[10px] text-primary font-bold">Variant</span>
                                  </div>

                                  {optionsList.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {optionsList.map((opt) => {
                                        const isSelected = selectedValues.includes(opt);
                                        return (
                                          <button
                                            key={opt}
                                            type="button"
                                            onClick={() => {
                                              if (isSizeVariant) {
                                                const nextSizes = isSelected ? selectedSizes.filter(s => s !== opt) : [...selectedSizes, opt];
                                                setSelectedSizes(nextSizes);
                                                setDynamicAttributes(prev => ({ ...prev, [attr.key]: nextSizes }));
                                              } else {
                                                const next = isSelected ? selectedValues.filter(v => v !== opt) : [...selectedValues, opt];
                                                setDynamicAttributes(prev => ({ ...prev, [attr.key]: next }));
                                              }
                                            }}
                                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${isSelected
                                              ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                                              : "border-border bg-background text-foreground hover:border-primary/50"
                                              }`}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <Input
                                      placeholder={`Enter ${attr.label} variant choices (comma separated)`}
                                      value={dynamicAttributes[attr.key] || ""}
                                      onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                                      className="h-9 text-xs"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Size Measurements Chart Builder if sizes are selected */}
                      {selectedSizes.length > 0 && (
                        <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/20">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                            <div>
                              <label className="block text-xs font-bold text-foreground">Size Measurements Chart Builder</label>
                              <p className="text-[11px] text-muted-foreground">Enter garment or variant measurements per size</p>
                            </div>

                            {/* Dynamic Field Shortcuts */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Quick Fields:</span>
                              <button
                                type="button"
                                onClick={() => setMeasurementFields([
                                  { key: "chest", label: "Chest (বুক)", placeholder: "e.g. 38" },
                                  { key: "long", label: "Length (দৈর্ঘ্য)", placeholder: "e.g. 28" },
                                  { key: "shoulder", label: "Shoulder (কাধ)", placeholder: "e.g. 17" },
                                  { key: "sleeve", label: "Sleeve (হাতা)", placeholder: "e.g. 24" }
                                ])}
                                className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
                              >
                                Tops
                              </button>
                              <button
                                type="button"
                                onClick={() => setMeasurementFields([
                                  { key: "waist", label: "Waist (কোমর)", placeholder: "e.g. 32" },
                                  { key: "long", label: "Length (দৈর্ঘ্য)", placeholder: "e.g. 40" },
                                  { key: "hip", label: "Hip (হিপ)", placeholder: "e.g. 38" },
                                  { key: "thigh", label: "Thigh (রান)", placeholder: "e.g. 22" }
                                ])}
                                className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
                              >
                                Bottoms
                              </button>
                              <button
                                type="button"
                                onClick={() => setMeasurementFields([
                                  { key: "footLength", label: "Foot Length (পায়ের দৈর্ঘ্য)", placeholder: "e.g. 26 cm" },
                                  { key: "euSize", label: "EU/UK Size", placeholder: "e.g. EU 41" }
                                ])}
                                className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors"
                              >
                                Footwear
                              </button>
                            </div>
                          </div>

                          {/* Dynamic Custom Field Addition Input */}
                          <div className="flex items-center gap-2 pt-1 pb-2 border-b border-border/30">
                            <Input
                              placeholder="Add custom measurement field (e.g. Inseam, Weight, Volume, Height)..."
                              value={newFieldLabel}
                              onChange={(e) => setNewFieldLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (newFieldLabel.trim()) {
                                    const label = newFieldLabel.trim();
                                    const key = label.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                                    if (!measurementFields.some(f => f.key === key)) {
                                      setMeasurementFields(prev => [...prev, { key, label, placeholder: `e.g. Value` }]);
                                    }
                                    setNewFieldLabel("");
                                  }
                                }
                              }}
                              className="h-8 text-xs max-w-sm bg-background"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => {
                                if (newFieldLabel.trim()) {
                                  const label = newFieldLabel.trim();
                                  const key = label.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                                  if (!measurementFields.some(f => f.key === key)) {
                                    setMeasurementFields(prev => [...prev, { key, label, placeholder: `e.g. Value` }]);
                                  }
                                  setNewFieldLabel("");
                                }
                              }}
                            >
                              <Plus className="size-3.5" /> Add Field
                            </Button>
                          </div>

                          {/* Active Measurement Fields Grid Matrix */}
                          <div className="space-y-3">
                            {selectedSizes.map((size) => {
                              return (
                                <div key={size} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-border/60 bg-background p-3 shadow-2xs">
                                  <div className="size-9 shrink-0 font-bold text-xs bg-primary text-primary-foreground rounded-lg flex items-center justify-center shadow-xs">{size}</div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 w-full">
                                    {measurementFields.map((f) => (
                                      <div key={f.key} className="space-y-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <label className="text-[11px] font-medium text-muted-foreground block truncate">{f.label}</label>
                                          <button
                                            type="button"
                                            onClick={() => setMeasurementFields(prev => prev.filter(item => item.key !== f.key))}
                                            className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                                            title="Remove field"
                                          >
                                            <X className="size-3" />
                                          </button>
                                        </div>
                                        <Input
                                          placeholder={f.placeholder}
                                          value={sizeMeasurements[size]?.[f.key] || ""}
                                          onChange={(e) =>
                                            setSizeMeasurements((prev) => ({
                                              ...prev,
                                              [size]: { ...prev[size], [f.key]: e.target.value },
                                            }))
                                          }
                                          className="h-8 text-xs bg-background"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground bg-muted/10">
                      No custom attributes configured for this category.
                    </div>
                  )}

                  {/* Color Family Variants */}
                  <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/10">
                    <div>
                      <label className="block text-xs font-bold text-foreground">Color Variants (Color Family with Image)</label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <Input
                        placeholder="Color name (e.g. Navy Blue, Olive Green)"
                        value={colorNameInput}
                        onChange={(e) => setColorNameInput(e.target.value)}
                        className="flex-1 text-xs"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        ref={colorInputRef}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setColorFile(file);
                            setColorPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => colorInputRef.current?.click()}
                        className="shrink-0 text-xs rounded-lg"
                      >
                        <Camera className="size-3.5 mr-1" />
                        {colorPreview ? "Image Selected" : "Upload Color Image"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddColorVariant}
                        className="shrink-0 text-xs rounded-lg"
                      >
                        Add Variant
                      </Button>
                    </div>
                    {colorPreview && (
                      <div className="flex items-center gap-2 pt-1">
                        <img src={colorPreview} alt="Color preview" className="size-10 rounded-lg border object-cover shadow-xs" />
                        <span className="text-xs text-muted-foreground">Image preview for {colorNameInput || "new color"}</span>
                      </div>
                    )}

                    {colorVariants.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2.5 pt-2 border-t border-border/50">
                        {colorVariants.map((c, index) => (
                          <div key={index} className="flex items-center gap-2 rounded-xl border border-border bg-background p-1.5 pr-3 shadow-xs">
                            <img src={c.image} alt={c.name} className="size-8 rounded-lg object-cover border" />
                            <span className="text-xs font-semibold text-foreground">{c.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveColorVariant(index)}
                              className="ml-1 flex size-5 items-center justify-center rounded-full text-destructive hover:bg-destructive/15 transition-colors"
                              title="Remove color variant"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Policy and Logistics */}
                  <div className="grid gap-4 sm:grid-cols-3 pt-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Warranty Info</label>
                      <Input {...register("warrantyInformation")} placeholder="e.g. 1 Year Warranty" />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Shipping Info</label>
                      <Input {...register("shippingInformation")} placeholder="e.g. Delivery within 2-3 days" />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-foreground">Return Policy</label>
                      <Input {...register("returnPolicy")} placeholder="e.g. 7 Days Return Policy" />
                    </div>
                  </div>
                </div>

                {/* CARD 4: Media & Uploads */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-sm font-bold text-foreground">
                    <ImagePlus className="size-4 text-primary" />
                    <span>Product Media</span>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* Thumbnail Image */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-foreground">Main Thumbnail Image *</label>
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setThumbnailFile(file);
                            setThumbnailPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <div
                        onClick={() => thumbnailInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setThumbnailDrag(true); }}
                        onDragLeave={() => setThumbnailDrag(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setThumbnailDrag(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith("image/")) {
                            setThumbnailFile(file);
                            setThumbnailPreview(URL.createObjectURL(file));
                          }
                        }}
                        className={`flex min-h-[140px] cursor-pointer items-center justify-center gap-4 rounded-xl border-2 border-dashed p-4 transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 ${thumbnailDrag ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-muted/10"}`}
                      >
                        {thumbnailPreview ? (
                          <div className="flex items-center gap-3">
                            <img src={thumbnailPreview} alt="Thumbnail" className="size-24 rounded-xl object-cover ring-2 ring-primary/20 shadow-xs" />
                            <div className="text-xs">
                              <span className="font-semibold text-primary block">Thumbnail Uploaded</span>
                              <span className="text-muted-foreground block text-[11px] mt-0.5">Click to replace</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center p-2">
                            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Camera className="size-5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">Upload Cover Image</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG up to 5MB</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gallery Images */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-foreground">Gallery Images (Multiple)</label>
                      <input
                        ref={imagesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          setImageFiles((prev) => [...prev, ...files]);
                          setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
                          e.target.value = "";
                        }}
                      />
                      <div
                        onClick={() => imagesInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setImagesDrag(true); }}
                        onDragLeave={() => setImagesDrag(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setImagesDrag(false);
                          const files = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith("image/"));
                          if (files.length > 0) {
                            setImageFiles((prev) => [...prev, ...files]);
                            setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
                          }
                        }}
                        className={`flex min-h-[140px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-4 transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 ${imagesDrag ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-muted/10"}`}
                      >
                        {imagePreviews.length > 0 ? (
                          <div className="flex flex-wrap gap-2.5">
                            {imagePreviews.map((src, i) => (
                              <div key={i} className="relative group">
                                <img src={src} alt="" className="size-16 rounded-xl object-cover ring-2 ring-primary/40 shadow-xs" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveNewImage(i);
                                  }}
                                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xs hover:scale-110 transition-transform"
                                  title="Remove image"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ))}
                            <div className="flex size-16 items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-primary">
                              <Plus className="size-5" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center p-2">
                            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <ImagePlus className="size-5" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">Upload Product Gallery</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Select multiple images or drag & drop</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-border bg-background/95 p-4 backdrop-blur-md">
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} className="rounded-xl px-6 font-bold shadow-md">
                    <Plus className="size-4 mr-1.5" />
                    {createMutation.isPending ? "Creating Product..." : "Create Product"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card shadow-sm"
      >
        {isLoading ? (
          <div className="p-5"><ProductSkeleton /></div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="mx-auto size-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              {products.length === 0 ? "No products yet." : "No products match your filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm table-fixed min-w-[750px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-5 py-3 font-medium w-[30%]">Product</th>
                  <th className="px-5 py-3 font-medium w-[18%]">Category</th>
                  <th className="px-5 py-3 font-medium w-[15%]">Price</th>
                  <th className="px-5 py-3 font-medium w-[12%]">Stock</th>
                  <th className="px-5 py-3 font-medium w-[10%]">Discount</th>
                  <th className="px-5 py-3 font-medium text-right w-[15%] min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.thumbnail || product.images?.[0] || undefined}
                          alt={product.title}
                          className="size-10 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{product.title}</p>
                          {product.brand && <p className="truncate text-[11px] text-muted-foreground">{product.brand}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary" className="text-[11px]">{product.category}</Badge>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{formatBDT(product.price)}</td>
                    <td className="px-5 py-3">
                      <span className={`font-medium ${product.stock <= 10 ? "text-foreground" : "text-foreground"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {product.discountPercentage > 0 ? (
                        <Badge variant="secondary" className="text-[11px]">{product.discountPercentage}%</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/products/${product._id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        {deletingId === product._id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(product._id)}
                              className="h-7 text-xs px-2"
                            >
                              {deleteMutation.isPending ? "..." : "Delete"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(null)}
                              className="h-7 text-xs px-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive font-medium"
                            onClick={() => setDeletingId(product._id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, filteredProducts.length)} of {filteredProducts.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
